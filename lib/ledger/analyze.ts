import type {
  Baseline,
  BehaviorSelf,
  DecisionSelf,
  DrawdownReaction,
  Ledger,
  LedgerInsight,
  MonthRoll,
  Track,
} from "../types";
import { FIXED_SPEC } from "./generate";

/**
 * 측정층. 전부 결정론적이다.
 *
 * 여기서 나온 숫자가 판정층(LLM)의 근거가 되고, 화면에서 판정 문장과 나란히
 * 표시된다. 그래서 이 층은 흔들리면 안 된다. LLM 을 쓰지 않는 이유다.
 */

/* ── 통계 헬퍼 ─────────────────────────────────────── */

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)));
  return s[idx];
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

/* ── 행동적 자아 ───────────────────────────────────── */

export function analyzeBehavior(ledger: Ledger): BehaviorSelf {
  const living = ledger.months.map((m) => m.living);
  const recent = ledger.months.slice(-12);

  const fixed = FIXED_SPEC.map((spec) => ({
    key: spec.key,
    label: spec.label,
    amount: Math.round(mean(recent.map((m) => m.fixed[spec.key] ?? 0))),
    day: spec.day,
  })).filter((f) => f.amount > 0);

  // 계절 피크는 최근 3년에서 찾는다. 오래된 피크는 지금의 생활과 무관하다.
  const window = ledger.months.slice(-36);
  let peak: BehaviorSelf["seasonalPeak"] = null;
  if (window.length) {
    const top = window.reduce((a, b) => (b.living > a.living ? b : a));
    const base = median(window.map((m) => m.living));
    if (top.living > base * 1.25) {
      const mm = Number(top.ym.slice(5, 7));
      peak = {
        ym: top.ym,
        amount: top.living,
        note:
          mm === 1 || mm === 2
            ? "설 연휴 경조사"
            : mm === 9 || mm === 10
              ? "추석 연휴 경조사"
              : "일시적 지출 증가",
      };
    }
  }

  const unusedSubscriptions = ledger.incidents
    .filter((i) => i.type === "unused_subscription")
    .map((i) => {
      const m = /^(.+?) — (\d+)개월/.exec(i.note);
      return {
        label: m?.[1] ?? "구독 서비스",
        amount: i.amount ?? 0,
        months: Number(m?.[2] ?? 0),
      };
    });

  return {
    livingMedian: median(living),
    livingP90: percentile(living, 0.9),
    fixed,
    seasonalPeak: peak,
    unusedSubscriptions,
  };
}

/* ── 의사결정 자아 (투자 성향) ─────────────────────── */

/** 낙폭 구간과 그 구간의 매도를 짝짓는다. 매도가 없으면 sold=false 로 남는다. */
export function reactionsOf(ledger: Ledger): DrawdownReaction[] {
  return ledger.drawdowns.map((dd) => {
    const sell = ledger.trades.find(
      (t) => t.kind === "sell" && t.date >= dd.start && t.date <= dd.end,
    );
    return {
      date: sell?.date ?? dd.start,
      label: dd.label,
      drawdown: dd.depth,
      sold: Boolean(sell),
      portionSold: sell?.portionSold ?? 0,
      reactionDays: sell?.daysFromDrawdownStart ?? 0,
      coincidingOutflow: sell?.coincidingOutflow,
    };
  });
}

/**
 * 낙폭 대비 매도비중의 회귀 기울기 (원점 통과 최소자승).
 * 얕은 낙폭에 많이 던질수록 커진다. 5.0 을 상한으로 0~1 정규화한다.
 */
export function riskAversionOf(reactions: DrawdownReaction[]): number {
  let sxy = 0;
  let sxx = 0;
  for (const r of reactions) {
    const x = Math.abs(r.drawdown);
    sxy += x * r.portionSold;
    sxx += x * x;
  }
  if (sxx === 0) return 0;
  const slope = sxy / sxx;
  return Number(Math.min(1, Math.max(0, slope / 5)).toFixed(3));
}

export function analyzeDecision(ledger: Ledger): DecisionSelf | null {
  const reactions = reactionsOf(ledger);
  if (!reactions.length) return null;

  const sells = reactions.filter((r) => r.sold);

  return {
    riskAversion: riskAversionOf(reactions),
    realizedStopLoss: sells.length
      ? Number(
          (
            [...sells.map((s) => s.drawdown)].sort((a, b) => a - b)[
              sells.length >> 1
            ] ?? 0
          ).toFixed(4),
        )
      : 0,
    holdRate: Number(
      ((reactions.length - sells.length) / reactions.length).toFixed(3),
    ),
    reactionDays: sells.length
      ? Math.round(mean(sells.map((s) => s.reactionDays)))
      : 0,
    allocation: ledger.holdings,
    reactions,
  };
}

/* ── 베이스라인 ────────────────────────────────────── */

/**
 * 건강기 앞 구간만 사용한다.
 *
 * 10년 전체 평균으로 기준선을 잡으면 말년의 이상 신호가 기준선에 섞여 들어가
 * 정작 감지가 무뎌진다. 이 함수가 `ledger.baselineYears` 를 지키는지가
 * 바이오마커 전체의 민감도를 결정한다.
 */
export function baselineMonths(ledger: Ledger): MonthRoll[] {
  const n = Math.min(ledger.months.length, ledger.baselineYears * 12);
  return ledger.months.slice(0, n);
}

export function computeBaseline(ledger: Ledger): Baseline {
  const ms = baselineMonths(ledger);
  const yearsUsed = Math.max(1, ms.length / 12);

  return {
    txnPerMonth: Number(mean(ms.map((m) => m.txnCount)).toFixed(1)),
    avgTxn: Math.round(mean(ms.map((m) => m.avgTxn))),
    nightRatio: Number(mean(ms.map((m) => m.nightRatio)).toFixed(4)),
    newPayeesPerMonth: Number(mean(ms.map((m) => m.newPayees)).toFixed(2)),
    latePerYear: Number(
      (ms.reduce((a, m) => a + m.latePayments, 0) / yearsUsed).toFixed(2),
    ),
    maxTransfer: ms.length ? Math.max(...ms.map((m) => m.maxTransfer)) : 0,
    span: { from: ms[0]?.ym ?? "", to: ms[ms.length - 1]?.ym ?? "" },
  };
}

/* ── 조립 ──────────────────────────────────────────── */

/** 투자 성향까지 뽑는 트랙. daily · caregiver 는 소비·베이스라인만 본다. */
export function tracksInvestment(track: Track | null): boolean {
  return track === "future" || track === "estate";
}

export function analyze(ledger: Ledger, track: Track | null): LedgerInsight {
  return {
    behavior: analyzeBehavior(ledger),
    decision: tracksInvestment(track) ? analyzeDecision(ledger) : null,
    baseline: computeBaseline(ledger),
    persona: null,
  };
}
