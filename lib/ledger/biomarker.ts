import type {
  Baseline,
  BiomarkerBand,
  BiomarkerPoint,
  BiomarkerReading,
  BiomarkerSignal,
  Ledger,
  MedicalProof,
  MonthRoll,
  TriggerGate,
} from "../types";
import { won } from "../format";
import { computeBaseline } from "./analyze";

/**
 * 금융 바이오마커.
 *
 * 베이스라인(건강기 앞 구간) 대비 이탈도를 가중합한다. 진단이 아니다.
 * 화면 어디에서도 "인지장애입니다" 라고 쓰지 않는다.
 * "평소 패턴과 달라진 지점이 관측됩니다" 까지만 쓴다.
 */

const WINDOW_MONTHS = 12;

export const BANDS: { band: BiomarkerBand; from: number; label: string }[] = [
  { band: "normal", from: 0, label: "정상 범위" },
  { band: "watch", from: 31, label: "주의" },
  { band: "alert", from: 61, label: "경보" },
];

export function bandOf(score: number): BiomarkerBand {
  if (score >= 61) return "alert";
  if (score >= 31) return "watch";
  return "normal";
}

export function bandLabel(band: BiomarkerBand): string {
  return BANDS.find((b) => b.band === band)!.label;
}

/** 0~1 로 자르는 비율 이탈. 기준이 0 이면 절대 건수로 환산한다. */
function deviation(observed: number, base: number, absScale: number): number {
  if (base <= 0) return Math.min(1, observed / absScale);
  return Math.min(1, Math.max(0, (observed - base) / (base * 2)));
}

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

interface SignalSpec {
  key: string;
  label: string;
  weight: number;
  /** 관측 구간에서 값을 뽑는다 */
  observe: (ms: MonthRoll[], l: Ledger) => number;
  /** 베이스라인에서 기준값을 뽑는다 */
  base: (b: Baseline) => number;
  /** 기준이 0 일 때 1.0 이탈로 볼 절대값 */
  absScale: number;
  fmt: (v: number) => string;
}

const SIGNALS: SignalSpec[] = [
  {
    key: "late_payment",
    label: "정기 공과금 연체",
    weight: 0.26,
    observe: (ms) => ms.reduce((a, m) => a + m.latePayments, 0),
    base: (b) => b.latePerYear,
    absScale: 4,
    fmt: (v) => `연 ${v.toFixed(1)}건`,
  },
  {
    key: "balance_error",
    label: "잔액 확인 반복 · 이체 취소",
    weight: 0.24,
    observe: (ms, l) => {
      const from = ms[0]?.ym ?? "";
      return l.incidents.filter(
        (i) => i.type === "balance_error" && i.date.slice(0, 7) >= from,
      ).length;
    },
    base: () => 0,
    absScale: 6,
    fmt: (v) => `${v.toFixed(0)}건`,
  },
  {
    key: "duplicate_transfer",
    label: "동일 수취인 중복 이체",
    weight: 0.2,
    observe: (ms, l) => {
      const from = ms[0]?.ym ?? "";
      return l.incidents.filter(
        (i) => i.type === "duplicate_transfer" && i.date.slice(0, 7) >= from,
      ).length;
    },
    base: () => 0,
    absScale: 4,
    fmt: (v) => `${v.toFixed(0)}건`,
  },
  {
    key: "night_ratio",
    label: "심야 시간대 거래 비중",
    weight: 0.16,
    observe: (ms) => mean(ms.map((m) => m.nightRatio)),
    base: (b) => b.nightRatio,
    absScale: 0.2,
    fmt: (v) => `${(v * 100).toFixed(1)}%`,
  },
  {
    key: "new_payee",
    label: "신규 수취인 빈도",
    weight: 0.14,
    observe: (ms) => mean(ms.map((m) => m.newPayees)),
    base: (b) => b.newPayeesPerMonth,
    absScale: 3,
    fmt: (v) => `월 ${v.toFixed(1)}명`,
  },
];

/** 특정 월 기준 직전 12개월을 관측 구간으로 스코어를 낸다. */
function scoreAt(ledger: Ledger, base: Baseline, endIdx: number): number {
  const from = Math.max(0, endIdx - WINDOW_MONTHS + 1);
  const ms = ledger.months.slice(from, endIdx + 1);
  if (!ms.length) return 0;

  let total = 0;
  for (const s of SIGNALS) {
    const observed = s.observe(ms, ledger);
    total += s.weight * deviation(observed, s.base(base), s.absScale);
  }
  return Math.round(Math.min(100, total * 100));
}

export function readBiomarker(ledger: Ledger): BiomarkerReading {
  const base = computeBaseline(ledger);

  // 베이스라인 구간이 끝난 다음 달부터 그린다. 그 이전은 기준선 자체다.
  const startIdx = Math.min(
    ledger.months.length - 1,
    ledger.baselineYears * 12,
  );

  const series: BiomarkerPoint[] = [];
  for (let i = startIdx; i < ledger.months.length; i++) {
    series.push({ ym: ledger.months[i].ym, score: scoreAt(ledger, base, i) });
  }

  const lastIdx = ledger.months.length - 1;
  const from = Math.max(0, lastIdx - WINDOW_MONTHS + 1);
  const window = ledger.months.slice(from, lastIdx + 1);

  const signals: BiomarkerSignal[] = SIGNALS.map((s) => {
    const observed = s.observe(window, ledger);
    const b = s.base(base);
    return {
      key: s.key,
      label: s.label,
      weight: s.weight,
      baseline: s.fmt(b),
      observed: s.fmt(observed),
      deviation: Number(deviation(observed, b, s.absScale).toFixed(3)),
    };
  }).sort((a, b) => b.deviation * b.weight - a.deviation * a.weight);

  const score = series.length ? series[series.length - 1].score : 0;

  return { score, band: bandOf(score), series, signals };
}

/* ── 트리거 게이트 ─────────────────────────────────────
 *
 * 회의록 "논의 완료" 항목.
 *   AI 바이오마커 스코어 경보로 위험 알림을 준 후,
 *   최근 한달 이내의 의사의 공식 진단서나 장기요양보험 등급 발행서를 필수 첨부
 *
 * AI 경보 단독으로는 절대 발동하지 않는다. 이 불변식이 깨지면
 * "AI 가 판단해서 남의 자산을 옮긴다" 가 되어 서비스 논리가 붕괴한다.
 */

export const PROOF_FRESH_DAYS = 30;

export const PROOF_LABEL: Record<MedicalProof["kind"], string> = {
  diagnosis: "의사 공식 진단서",
  ltci: "장기요양보험 등급 발행서",
};

/** asOf 는 테스트를 위해 주입한다. 미지정 시 오늘. */
export function evaluateTrigger(
  reading: BiomarkerReading,
  proof: MedicalProof | null,
  asOf?: Date,
): TriggerGate {
  const aiAlert = reading.band === "alert";

  let proofFresh = false;
  if (proof) {
    const issued = new Date(proof.issuedAt + "T00:00:00Z");
    const now = asOf ?? new Date();
    const days = (now.getTime() - issued.getTime()) / 86_400_000;
    proofFresh = days >= 0 && days <= PROOF_FRESH_DAYS;
  }

  const blockedBy: string[] = [];
  if (!aiAlert) {
    blockedBy.push(
      `바이오마커가 아직 경보 구간이 아닙니다 (현재 ${reading.score}, 경보 61 이상)`,
    );
  }
  if (!proof) {
    blockedBy.push("의사 진단서 또는 장기요양보험 등급 발행서가 첨부되지 않았습니다");
  } else if (!proofFresh) {
    blockedBy.push(
      `첨부된 서류가 최근 ${PROOF_FRESH_DAYS}일 이내 발행분이 아닙니다 (${proof.issuedAt})`,
    );
  }

  return {
    aiAlert,
    aiScore: reading.score,
    proof,
    proofFresh,
    fired: aiAlert && proofFresh,
    blockedBy,
  };
}

/** 경보 시점에 사용자에게 보여줄 요약 (단정 금지) */
export function biomarkerSummary(reading: BiomarkerReading): string {
  const top = reading.signals[0];
  if (reading.band === "normal") {
    return "평소 패턴과 크게 달라진 지점은 관측되지 않았습니다.";
  }
  const head =
    reading.band === "alert"
      ? "평소 패턴과 뚜렷하게 달라진 지점이 관측됩니다."
      : "평소 패턴과 달라지기 시작한 지점이 관측됩니다.";
  return `${head} 가장 크게 벌어진 항목은 ${top.label}입니다 (기준 ${top.baseline} → 최근 ${top.observed}). 이것은 진단이 아니며, 판정은 의료기관의 몫입니다.`;
}

/** 최근 12개월 이상거래 총액 — 화면 보조 지표 */
export function recentIncidentAmount(ledger: Ledger): number {
  const from = ledger.months[Math.max(0, ledger.months.length - WINDOW_MONTHS)]?.ym ?? "";
  return ledger.incidents
    .filter((i) => i.date.slice(0, 7) >= from && i.amount)
    .reduce((a, i) => a + (i.amount ?? 0), 0);
}

export const wonLabel = won;
