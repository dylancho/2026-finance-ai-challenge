import type {
  Contrast,
  Ledger,
  LedgerInsight,
  LedgerState,
  Profile,
} from "../types";
import { amountOf, choiceOf, multiOf } from "../profile";
import { findQuestion } from "../questions";
import { won } from "../format";

/**
 * 대조. 인터뷰의 "선언" 과 이력의 "관찰" 을 문항 단위로 맞대어 본다.
 *
 * 관찰 가능한 문항에만 붙는다. 이력으로 검증할 수 없는 문항은 여기 오지 않는다.
 * 예를 들어 B15(금지행위)·D13(처분금지)은 합성 이력에 대응하는 사건이 없으므로
 * 규칙을 두지 않았다. 근거 없이 판정하는 것보다 침묵하는 편이 낫다.
 */

const PCT_TOLERANCE = 0.2;

type Rule = (
  p: Profile,
  insight: LedgerInsight,
  ledger: Ledger,
) => Contrast | null;

const labelOf = (qid: string) => findQuestion(qid)?.prompt ?? qid;

function optionLabel(qid: string, value: string | undefined): string {
  if (!value) return "답 없음";
  return findQuestion(qid)?.options?.find((o) => o.value === value)?.label ?? value;
}

function optionLabels(qid: string, values: string[]): string[] {
  const q = findQuestion(qid);
  return values.map((v) => q?.options?.find((o) => o.value === v)?.label ?? v);
}

/** 트랙마다 같은 뜻의 문항 id 가 다르다. 먼저 답이 있는 것을 쓴다. */
function firstAnswered(p: Profile, qids: string[]): string | null {
  return qids.find((q) => p.answers[q]) ?? null;
}

/* ── 1. 생활비 ─────────────────────────────────────── */

const livingRule: Rule = (p, insight) => {
  const qid = firstAnswered(p, ["B07", "A02", "D09"]);
  if (!qid) return null;
  const declared = amountOf(p, qid);
  if (declared === undefined) return null;

  const observed = insight.behavior.livingMedian;
  if (!observed) return null;

  const gap = (declared - observed) / observed;
  const agreement =
    Math.abs(gap) <= PCT_TOLERANCE
      ? "aligned"
      : Math.abs(gap) <= PCT_TOLERANCE * 2
        ? "tension"
        : "contradiction";

  const dir = gap > 0 ? "높게" : "낮게";

  return {
    qid,
    clause: findQuestion(qid)!.mapsTo[0],
    title: "월 생활비",
    declared: won(declared),
    observed: `${won(observed)} (10년 가운데값)`,
    agreement,
    reason:
      agreement === "aligned"
        ? "실제 지출과 어긋나지 않아요."
        : `실제 지출보다 ${Math.abs(Math.round(gap * 100))}% ${dir} 잡으셨어요.` +
          (gap < 0
            ? " 이 금액으로는 지금 생활이 유지되지 않을 수 있어요."
            : " 필요한 것보다 많이 묶이면 다른 데 쓸 여력이 줄어요."),
    evidence: [
      {
        label: "가운데값",
        detail: `${won(observed)} · 많이 쓴 달 ${won(insight.behavior.livingP90)}`,
      },
      ...(insight.behavior.seasonalPeak
        ? [
            {
              label: "지출이 뛴 때",
              detail: `${insight.behavior.seasonalPeak.ym} ${won(
                insight.behavior.seasonalPeak.amount,
              )}, ${insight.behavior.seasonalPeak.note}`,
            },
          ]
        : []),
    ],
    observedValue: { kind: "amount", value: observed },
  };
};

/* ── 2. 이체 한도 ──────────────────────────────────── */

const limitRule: Rule = (p, insight) => {
  const qid = firstAnswered(p, ["A05", "B14"]);
  if (!qid) return null;
  const declared = amountOf(p, qid);
  if (declared === undefined) return null;

  const observed = insight.baseline.maxTransfer;
  if (!observed) return null;

  const blocks = declared < observed;

  return {
    qid,
    clause: findQuestion(qid)!.mapsTo[0],
    title: qid === "A05" ? "1회 이체 한도" : "관리자가 혼자 정할 수 있는 상한",
    declared: won(declared),
    observed: `과거 최대 ${won(observed)}`,
    agreement: blocks ? "contradiction" : "aligned",
    reason: blocks
      ? "건강할 때 실제로 하시던 이체가 이 한도에 막혀요. 병원비·전세금처럼 정당한 큰 지출까지 함께 멈춰요."
      : "과거 이체 규모를 모두 담는 한도예요.",
    evidence: [
      {
        label: "평소 기준 최대 이체",
        detail: `${won(observed)} · ${insight.baseline.span.from}~${insight.baseline.span.to} 구간`,
      },
    ],
    observedValue: blocks ? { kind: "amount", value: observed } : undefined,
  };
};

/* ── 3. 이상거래 룰셋 ──────────────────────────────── */

/** 합성 이력에서 실제로 관찰 가능한 패턴만 대조한다. */
const OBSERVABLE_PATTERNS: {
  value: string;
  label: string;
  detect: (l: Ledger, i: LedgerInsight) => string | null;
}[] = [
  {
    value: "new_payee",
    label: "처음 보는 계좌로 큰 금액",
    detect: (l) => {
      const hits = l.incidents.filter((x) => x.type === "new_payee_large");
      return hits.length
        ? `${hits.length}번 있었어요 · 최근 ${hits[hits.length - 1].date}`
        : null;
    },
  },
  {
    value: "night",
    label: "새벽에 큰 금액 이체",
    detect: (l) => {
      const hits = l.incidents.filter((x) => x.type === "night_large");
      return hits.length
        ? `${hits.length}번 있었어요 · 최근 ${hits[hits.length - 1].date}`
        : null;
    },
  },
];

const fraudRule: Rule = (p, insight, ledger) => {
  const qid = "A06";
  if (!p.answers[qid]) return null;
  const declared = multiOf(p, qid);

  const seen = OBSERVABLE_PATTERNS.map((pt) => ({
    ...pt,
    hit: pt.detect(ledger, insight),
  })).filter((pt) => pt.hit);

  const missing = seen.filter((pt) => !declared.includes(pt.value));
  if (!seen.length) return null;

  return {
    qid,
    clause: findQuestion(qid)!.mapsTo[0],
    title: "기본으로 막는 거래",
    declared: declared.length ? optionLabels(qid, declared).join(", ") : "선택 없음",
    observed: seen.map((s) => s.label).join(", "),
    agreement: missing.length ? "tension" : "aligned",
    reason: missing.length
      ? `실제 이력에 있던 거래 ${missing.length}가지가 보호 규칙에서 꺼져 있어요. 꺼진 규칙은 그 거래를 막지 않아요.`
      : "실제 이력에 있던 거래가 모두 보호 규칙에 들어 있어요.",
    evidence: seen.map((s) => ({ label: s.label, detail: s.hit! })),
    observedValue: missing.length
      ? { kind: "multi", values: [...new Set([...declared, ...missing.map((m) => m.value)])] }
      : undefined,
  };
};

/* ── 4. 고정지출 누락 ──────────────────────────────── */

/** 고정비 카테고리 키 → 문항 옵션 value */
const FIXED_TO_OPTION: Record<string, string> = {
  utility: "utility",
  maintenance: "maintenance",
  telecom: "telecom",
  insurance: "insurance",
};

const fixedRule: Rule = (p, insight) => {
  const qid = firstAnswered(p, ["A01", "B10", "C09"]);
  if (!qid) return null;
  const declared = multiOf(p, qid);
  const q = findQuestion(qid)!;
  const available = new Set(q.options?.map((o) => o.value) ?? []);

  const observed = insight.behavior.fixed
    .map((f) => ({ ...f, option: FIXED_TO_OPTION[f.key] }))
    .filter((f) => f.option && available.has(f.option));

  // B10·C09 는 관리비가 utility 에 합쳐져 있다. 옵션에 없으면 건너뛴다.
  const missing = observed.filter((o) => !declared.includes(o.option));
  if (!observed.length) return null;

  const monthly = missing.reduce((a, m) => a + m.amount, 0);

  return {
    qid,
    clause: q.mapsTo[0],
    title: "매달 자동으로 나가는 돈",
    declared: declared.length ? optionLabels(qid, declared).join(", ") : "선택 없음",
    observed: observed.map((o) => o.label).join(", "),
    agreement: missing.length ? "tension" : "aligned",
    reason: missing.length
      ? `매달 나가고 있는데 목록에 없는 항목이 ${missing.length}개(매달 ${won(monthly)}) 있어요. 여기 없는 항목은 그때 누군가 손으로 처리해야 해요.`
      : "실제로 내고 있는 고정비가 모두 들어 있어요.",
    evidence: observed.map((o) => ({
      label: o.label,
      detail: `매달 ${won(o.amount)} · ${o.day}일`,
    })),
    observedValue: missing.length
      ? {
          kind: "multi",
          values: [...new Set([...declared, ...missing.map((m) => m.option)])],
        }
      : undefined,
  };
};

/* ── 5. 운용지침 — 핵심 대조 ───────────────────────── */

const stanceRule: Rule = (p, insight) => {
  const qid = "B11";
  const declared = choiceOf(p, qid);
  const d = insight.decision;
  if (!declared || !d) return null;
  // 위임은 과거 이력으로 검증되는 성질이 아니다.
  if (declared === "delegate") return null;

  const sold = d.reactions.filter((r) => r.sold);
  const soldPct = Math.round((1 - d.holdRate) * 100);

  let agreement: Contrast["agreement"] = "aligned";
  let reason = "";

  if (declared === "preserve") {
    if (d.holdRate < 0.5) {
      agreement = "contradiction";
      reason = `팔지 않겠다고 하셨지만, 주가가 떨어진 ${d.reactions.length}번 중 ${sold.length}번은 파셨어요. 평균 ${d.reactionDays}일 만에 움직이셨어요.`;
    } else if (d.holdRate < 0.8) {
      agreement = "tension";
      reason = `대체로 버티셨지만 ${sold.length}번은 파셨어요.`;
    } else {
      reason = "정한 것과 실제가 같아요. 주가가 떨어져도 대부분 팔지 않으셨어요.";
    }
  } else if (declared === "phased" || declared === "partial") {
    if (d.riskAversion > 0.7) {
      agreement = "tension";
      reason = `조금씩 팔겠다고 하셨는데, 실제로는 얕은 하락에서도 큰 비중을 한 번에 파신 적이 있어요.`;
    } else {
      reason = "정한 방식과 실제가 크게 어긋나지 않아요.";
    }
  }

  const withContext = sold.filter((s) => s.coincidingOutflow);
  if (withContext.length && agreement !== "aligned") {
    reason += ` 다만 ${withContext.length}건은 같은 때 큰 지출이 겹쳐 있어, 판단이 아니라 현금 필요였을 수 있어요.`;
  }

  return {
    qid,
    clause: findQuestion(qid)!.mapsTo[0],
    title: "투자 자산을 어떻게 할지",
    declared: optionLabel(qid, declared),
    observed:
      `하락 ${d.reactions.length}회 중 ${sold.length}회 매도 · ` +
      `실제로 판 하락폭 ${(d.realizedStopLoss * 100).toFixed(1)}% · 평균 ${d.reactionDays}일`,
    agreement,
    reason,
    evidence: d.reactions.map((r) => ({
      label: `${r.date.slice(0, 7)} ${r.label} ${(r.drawdown * 100).toFixed(0)}%`,
      detail: r.sold
        ? `갖고 있던 것의 ${Math.round(r.portionSold * 100)}% 매도 (하락 시작 ${r.reactionDays}일 뒤)` +
          (r.coincidingOutflow
            ? ` · 같은 때 ${r.coincidingOutflow.label} ${won(r.coincidingOutflow.amount)}`
            : "")
        : "팔지 않았어요",
    })),
    // 관찰된 행동에 대응하는 선택지가 B11 에 없다. 억지로 매핑하지 않는다.
    // 화면은 "선언 유지" 와 "절충(조항에 손절 규칙 명문화)" 만 제공한다.
    observedValue: undefined,
  };
};

/* ── 조립 ──────────────────────────────────────────── */

const RULES: Rule[] = [stanceRule, livingRule, limitRule, fraudRule, fixedRule];

const RANK: Record<Contrast["agreement"], number> = {
  contradiction: 0,
  tension: 1,
  aligned: 2,
};

export function buildContrasts(
  p: Profile,
  insight: LedgerInsight,
  ledger: Ledger,
  state?: LedgerState,
): Contrast[] {
  const out: Contrast[] = [];
  for (const rule of RULES) {
    const c = rule(p, insight, ledger);
    if (!c) continue;
    const resolution = state?.resolutions[c.qid];
    out.push(resolution ? { ...c, resolution } : c);
  }
  return out.sort((a, b) => RANK[a.agreement] - RANK[b.agreement]);
}

/** 아직 손대지 않은 불일치 */
export function openContrasts(cs: Contrast[]): Contrast[] {
  return cs.filter((c) => c.agreement !== "aligned" && !c.resolution);
}

/** 특정 문항에 대조가 붙는지 — 인터뷰 사이드 카드 노출 판단용 */
export function contrastFor(cs: Contrast[], qid: string): Contrast | undefined {
  return cs.find((c) => c.qid === qid);
}

export { labelOf };

/* ── 인터뷰 사이드 카드용 ──────────────────────────────
 * 대조는 "답한 뒤" 에만 생긴다. 인터뷰에서는 답하기 전에도 관련 이력을 보여줘야
 * 하므로, 문항 단위로 관찰값만 뽑는 별도 경로를 둔다.
 */

export interface Observation {
  title: string;
  lines: { label: string; detail: string }[];
}

export function observationFor(
  qid: string,
  insight: LedgerInsight,
  ledger: Ledger,
): Observation | null {
  const b = insight.behavior;

  if (["B07", "A02", "D09"].includes(qid)) {
    return {
      title: "실제 생활비",
      lines: [
        { label: "10년 가운데값", detail: won(b.livingMedian) },
        { label: "많이 쓴 달", detail: won(b.livingP90) },
        ...(b.seasonalPeak
          ? [{ label: b.seasonalPeak.note, detail: `${b.seasonalPeak.ym} ${won(b.seasonalPeak.amount)}` }]
          : []),
      ],
    };
  }

  if (["A05", "B14"].includes(qid)) {
    return {
      title: "과거 이체 규모",
      lines: [
        { label: "평소 기준 최대", detail: won(insight.baseline.maxTransfer) },
        {
          label: "기준 구간",
          detail: `${insight.baseline.span.from} ~ ${insight.baseline.span.to}`,
        },
      ],
    };
  }

  if (qid === "A06") {
    const seen = OBSERVABLE_PATTERNS.map((p) => ({ ...p, hit: p.detect(ledger, insight) })).filter(
      (p) => p.hit,
    );
    if (!seen.length) return null;
    return {
      title: "이력에 있던 위험 신호",
      lines: seen.map((s) => ({ label: s.label, detail: s.hit! })),
    };
  }

  if (["A01", "B10", "C09"].includes(qid)) {
    if (!b.fixed.length) return null;
    return {
      title: "실제로 내고 있는 고정비",
      lines: b.fixed.map((f) => ({ label: f.label, detail: `매달 ${won(f.amount)} · ${f.day}일` })),
    };
  }

  if (qid === "B11" && insight.decision) {
    const d = insight.decision;
    const sold = d.reactions.filter((r) => r.sold);
    return {
      title: "하락장에서 실제로 하신 것",
      lines: [
        {
          label: "판 횟수",
          detail: `하락 ${d.reactions.length}회 중 ${sold.length}회`,
        },
        {
          label: "실제로 판 하락폭",
          detail: `${(d.realizedStopLoss * 100).toFixed(1)}%`,
        },
        { label: "팔기까지 평균", detail: d.reactionDays ? `${d.reactionDays}일` : "—" },
        ...sold.slice(0, 3).map((r) => ({
          label: `${r.date.slice(0, 7)} ${r.label}`,
          detail: `${(r.drawdown * 100).toFixed(0)}% 떨어졌을 때 ${Math.round(r.portionSold * 100)}% 매도`,
        })),
      ],
    };
  }

  return null;
}
