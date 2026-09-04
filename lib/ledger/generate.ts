import type {
  Institution,
  DrawdownWindow,
  Incident,
  Ledger,
  LedgerPreset,
  MonthRoll,
  TradeEvent,
} from "../types";

/**
 * 시드 고정 합성 이력 생성기.
 *
 * 같은 시드 → 항상 같은 10년치. 심사 중 새로고침해도 숫자가 바뀌지 않는다.
 * 실제 마이데이터 연동은 이 모듈을 대체하며, Ledger 스키마는 그대로 쓴다.
 */

/* ── 결정론적 난수 ─────────────────────────────────── */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 */
function makeRng(seed: string) {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

const between = (r: Rng, lo: number, hi: number) => lo + r() * (hi - lo);
const jitter = (r: Rng, base: number, pct: number) =>
  Math.round(base * (1 + between(r, -pct, pct)));
const pick = <T,>(r: Rng, xs: T[]): T => xs[Math.floor(r() * xs.length)];

/* ── 프리셋 ────────────────────────────────────────── */

interface PresetRule {
  /** 낙폭 때 매도할 확률 */
  sellProb: number;
  /** 매도 시 보유분 중 처분 비중 */
  portion: [number, number];
  /** 낙폭 시작 후 매도까지 일수 */
  days: [number, number];
  /** 최근 자산 중 주식 비중 */
  equityShare: number;
  /** 월 생활비 기준선 */
  living: number;
}

const PRESETS: Record<LedgerPreset, PresetRule> = {
  // 선언은 보수적인데 실제로는 낙폭 초기에 던진다. B트랙 데모의 모순 원천.
  panic_seller: {
    sellProb: 0.82,
    portion: [0.55, 1.0],
    days: [3, 18],
    equityShare: 0.52,
    living: 2_100_000,
  },
  holder: {
    sellProb: 0.2,
    portion: [0.15, 0.35],
    days: [40, 95],
    equityShare: 0.46,
    living: 3_400_000,
  },
  cautious: {
    sellProb: 0.5,
    portion: [0.3, 0.6],
    days: [15, 45],
    equityShare: 0.28,
    living: 2_600_000,
  },
  spender: {
    sellProb: 0.25,
    portion: [0.2, 0.5],
    days: [10, 40],
    equityShare: 0.12,
    living: 1_900_000,
  },
};

/* ── 고정비 ────────────────────────────────────────── */

export const FIXED_SPEC: {
  key: string;
  label: string;
  base: number;
  day: number;
  winter?: number;
}[] = [
  { key: "utility", label: "전기·가스·수도", base: 145_000, day: 25, winter: 1.7 },
  { key: "maintenance", label: "아파트 관리비", base: 240_000, day: 25, winter: 1.25 },
  { key: "telecom", label: "통신비", base: 86_000, day: 15 },
  { key: "insurance", label: "보험료", base: 318_000, day: 5 },
];

/** 결제는 계속 나가는데 이용 흔적이 없는 항목 */
const SUBSCRIPTIONS: { label: string; amount: number }[] = [
  { label: "OTT 구독", amount: 13_900 },
  { label: "음원 스트리밍", amount: 8_900 },
  { label: "클라우드 저장소", amount: 11_000 },
  { label: "헬스장 멤버십", amount: 79_000 },
];

/* ── 시장 낙폭 (startYear 기준 상대 배치) ──────────── */

const DRAWDOWN_SPEC: { offsetY: number; month: number; depth: number; label: string; span: number }[] = [
  { offsetY: 2, month: 10, depth: -0.14, label: "무역분쟁 조정", span: 3 },
  { offsetY: 4, month: 2, depth: -0.28, label: "감염병 급락", span: 2 },
  { offsetY: 6, month: 1, depth: -0.22, label: "금리 인상기", span: 6 },
  { offsetY: 8, month: 8, depth: -0.11, label: "캐리 청산", span: 2 },
  { offsetY: 9, month: 4, depth: -0.09, label: "관세 충격", span: 2 },
];

/* ── 헬퍼 ──────────────────────────────────────────── */

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function addDays(y: number, m: number, d: number, add: number) {
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + add);
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export interface GenerateOptions {
  preset?: LedgerPreset;
  years?: number;
  startYear?: number;
  baselineYears?: number;
  /** 후반부에 인지 저하 신호를 심는다 */
  decline?: boolean;
  /** decline 이 시작되는 지점 (년차, 1-based) */
  declineFromYear?: number;
}

/**
 * 합성 이력의 거래 기관.
 *
 * trustDesk 가 false 인 기관을 섞어 둔다. 주거래가 인터넷은행이면 그쪽에는 신탁 창구가
 * 없고, 그 사실을 알려주는 것이 이 데이터의 쓸모다. 전부 취급 기관으로 채우면 판정이
 * 늘 같은 답을 내고 로직이 있으나 마나 해진다.
 */
const BANKS: { name: string; trustDesk: boolean }[] = [
  { name: "하나은행", trustDesk: true },
  { name: "KB국민은행", trustDesk: true },
  { name: "신한은행", trustDesk: true },
  { name: "우리은행", trustDesk: true },
  { name: "카카오뱅크", trustDesk: false },
  { name: "토스뱅크", trustDesk: false },
];

function pickInstitutions(rng: () => number): Institution[] {
  const pool = [...BANKS];
  const picked: { name: string; trustDesk: boolean }[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  // 주거래에 힘을 실어 비중을 벌린다
  const raw = picked.map((_, i) => 6 - i * 2 + rng());
  const sum = raw.reduce((a, b) => a + b, 0);
  return picked
    .map((b, i) => ({ ...b, share: Math.round((raw[i] / sum) * 100) / 100 }))
    .sort((a, b) => b.share - a.share);
}

export function generateLedger(seed: string, opts: GenerateOptions = {}): Ledger {
  const preset = opts.preset ?? "cautious";
  const years = opts.years ?? 10;
  const startYear = opts.startYear ?? 2016;
  const baselineYears = opts.baselineYears ?? 5;
  const decline = opts.decline ?? false;
  const declineFrom = opts.declineFromYear ?? Math.max(1, years - 2);

  const rule = PRESETS[preset];
  const rng = makeRng(seed);

  const months: MonthRoll[] = [];
  const incidents: Incident[] = [];

  /* ── 월별 집계 ── */
  for (let yi = 0; yi < years; yi++) {
    const year = startYear + yi;
    const inDecline = decline && yi + 1 >= declineFrom;
    // 저하 진행도 0~1
    const declineDepth = inDecline
      ? (yi + 1 - declineFrom + 1) / Math.max(1, years - declineFrom + 1)
      : 0;

    for (let m = 1; m <= 12; m++) {
      const winter = m === 12 || m === 1 || m === 2;
      const holiday = m === 1 || m === 9; // 설·추석 경조사

      // 물가 상승 반영
      const drift = 1 + yi * 0.021;
      let living = jitter(rng, rule.living * drift, 0.09);
      if (holiday) living += jitter(rng, 900_000, 0.25);

      const fixed: Record<string, number> = {};
      for (const f of FIXED_SPEC) {
        const mult = winter && f.winter ? f.winter : 1;
        fixed[f.key] = jitter(rng, f.base * mult * drift, 0.06);
      }
      for (const s of SUBSCRIPTIONS) fixed[`sub_${s.label}`] = s.amount;

      const base = {
        txnCount: 46,
        nightRatio: 0.02,
        newPayees: 1,
        latePayments: 0,
      };

      const txnCount = Math.round(
        jitter(rng, base.txnCount, 0.14) + declineDepth * between(rng, -8, 14),
      );
      const nightRatio = Math.min(
        0.4,
        Math.max(0, jitter(rng, base.nightRatio * 100, 0.5) / 100 + declineDepth * between(rng, 0, 0.11)),
      );
      const newPayees = Math.max(
        0,
        Math.round(between(rng, 0, 2) + declineDepth * between(rng, 0, 4)),
      );
      const latePayments =
        declineDepth > 0.35 && rng() < declineDepth * 0.55 ? (rng() < 0.25 ? 2 : 1) : 0;

      const maxTransfer =
        rng() < 0.12
          ? jitter(rng, 6_500_000, 0.5)
          : jitter(rng, 1_450_000, 0.45);

      months.push({
        ym: ym(year, m),
        living,
        fixed,
        txnCount,
        avgTxn: Math.round(living / Math.max(1, txnCount)),
        nightRatio: Number(nightRatio.toFixed(4)),
        newPayees,
        maxTransfer,
        latePayments,
      });

      /* 이상징후 */
      if (latePayments > 0) {
        incidents.push({
          date: ymd(year, m, 26),
          type: "late_payment",
          note: `고정비 ${latePayments}건 납기 초과`,
        });
      }
      if (declineDepth > 0.3 && rng() < declineDepth * 0.4) {
        incidents.push({
          date: ymd(year, m, Math.floor(between(rng, 3, 27))),
          type: "balance_error",
          note: `잔액 조회 ${Math.floor(between(rng, 3, 7))}회 반복 후 이체 취소`,
        });
      }
      if (declineDepth > 0.4 && rng() < declineDepth * 0.3) {
        const amount = jitter(rng, 420_000, 0.5);
        incidents.push({
          date: ymd(year, m, Math.floor(between(rng, 3, 27))),
          type: "duplicate_transfer",
          amount,
          note: "동일 수취인에게 같은 금액 2회 이체",
        });
      }
      if (nightRatio > 0.12 && rng() < 0.4) {
        incidents.push({
          date: ymd(year, m, Math.floor(between(rng, 3, 27))),
          type: "night_large",
          amount: jitter(rng, 2_800_000, 0.4),
          note: "심야 시간대 고액 이체",
        });
      }
      if (newPayees >= 3 && rng() < 0.45) {
        incidents.push({
          date: ymd(year, m, Math.floor(between(rng, 3, 27))),
          type: "new_payee_large",
          amount: jitter(rng, 3_400_000, 0.5),
          note: "처음 보는 계좌로 고액 이체",
        });
      }
    }
  }

  /* ── 미사용 구독 ── */
  const unusedCount = Math.floor(between(rng, 1, 3.99));
  for (let i = 0; i < unusedCount; i++) {
    const s = SUBSCRIPTIONS[i];
    incidents.push({
      date: ym(startYear + years - 1, 12) + "-01",
      type: "unused_subscription",
      amount: s.amount,
      note: `${s.label} — ${Math.floor(between(rng, 8, 30))}개월간 이용 내역 없음`,
    });
  }

  /* ── 낙폭과 매매 ── */
  const drawdowns: DrawdownWindow[] = [];
  const trades: TradeEvent[] = [];

  // 평시 적립 매수
  for (let yi = 0; yi < years; yi++) {
    const year = startYear + yi;
    for (const m of [3, 9]) {
      if (rng() < 0.7) {
        trades.push({
          date: ymd(year, m, 12),
          kind: "buy",
          bucket: rng() < 0.75 ? "equity" : "fund",
          amount: jitter(rng, 4_200_000, 0.4),
          marketDrawdown: 0,
        });
      }
    }
  }

  for (const spec of DRAWDOWN_SPEC) {
    if (spec.offsetY >= years) continue;
    const year = startYear + spec.offsetY;
    const start = ymd(year, spec.month, 6);
    const endDate = addDays(year, spec.month, 6, spec.span * 30);
    drawdowns.push({ start, end: endDate, depth: spec.depth, label: spec.label });

    if (rng() >= rule.sellProb) continue;

    const days = Math.round(between(rng, rule.days[0], rule.days[1]));
    const portion = Number(between(rng, rule.portion[0], rule.portion[1]).toFixed(3));

    trades.push({
      date: addDays(year, spec.month, 6, days),
      kind: "sell",
      bucket: "equity",
      amount: jitter(rng, 28_000_000 * portion, 0.3),
      marketDrawdown: spec.depth,
      portionSold: portion,
      daysFromDrawdownStart: days,
    });
  }

  // 판정층이 맥락으로 쓸 재료. 가장 깊은 낙폭 때의 매도에 의료비를 겹쳐 둔다.
  // "패닉셀인가, 현금이 필요했던 것인가" 를 숫자만으로는 못 가리게 만든다.
  const deepest = [...trades]
    .filter((t) => t.kind === "sell")
    .sort((a, b) => a.marketDrawdown - b.marketDrawdown)[0];
  if (deepest && rng() < 0.75) {
    deepest.coincidingOutflow = {
      label: pick(rng, ["배우자 수술비", "부모 입원비", "본인 시술비"]),
      amount: jitter(rng, 42_000_000, 0.25),
    };
  }

  trades.sort((a, b) => a.date.localeCompare(b.date));
  incidents.sort((a, b) => a.date.localeCompare(b.date));

  /* ── 최근 자산 비중 ── */
  const equity = rule.equityShare;
  const bond = between(rng, 0.12, 0.24);
  const cash = Math.max(0.05, 1 - equity - bond);
  const total = equity + bond + cash;

  return {
    version: 1,
    seed,
    source: "synthetic",
    preset,
    startYear,
    years,
    baselineYears,
    months,
    trades,
    institutions: pickInstitutions(rng),
    incidents,
    drawdowns,
    holdings: {
      equity: Math.round((equity / total) * 100),
      bond: Math.round((bond / total) * 100),
      cash: Math.round((cash / total) * 100),
    },
    generatedAt: 0,
  };
}

/* ── 데모 시드 ─────────────────────────────────────────
 * DEMO_PROFILES 의 A~D 와 짝을 이룬다.
 * C(caregiver) 는 대리인이 대상자 마이데이터를 열 수 없으므로 시드가 없다.
 */

export const DEMO_LEDGER_SEEDS: Record<string, GenerateOptions & { seed: string }> = {
  A: { seed: "demo-A-spender", preset: "spender", decline: false },
  B: { seed: "demo-B-panic", preset: "panic_seller", decline: true, declineFromYear: 8 },
  D: { seed: "demo-D-holder", preset: "holder", decline: false },
};

export function demoLedger(key: string): Ledger | null {
  const spec = DEMO_LEDGER_SEEDS[key.toUpperCase()];
  if (!spec) return null;
  const { seed, ...opts } = spec;
  return generateLedger(seed, opts);
}
