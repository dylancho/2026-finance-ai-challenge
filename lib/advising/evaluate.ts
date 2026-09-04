import type { Chapter, LedgerInsight, Profile } from "../types";
import type { Advice, Candidate, DeclaredObserved, EventKind, LifeEvent } from "./types";
import { amountOf, choiceOf, firstAmount, firstPerson, multiOf, personOf } from "../profile";
import { buildExpenseDesign, projectRunway } from "../design/expense";
import { buildTrustDesign } from "../design/trust";
import { hasChapter, isUnified } from "../questions";
import { ASSET_CLASS_LABEL, RISK_CAP_PCT } from "../questions/invest";
import { personLabel, won } from "../format";

/**
 * 결정론적 룰 엔진.
 *
 * 후보의 숫자는 전부 여기서 계산한다. 설계서 제6조 과 같은 projectRunway 를 쓰므로
 * "현상 유지" 후보의 소진 시점은 설계서의 추정과 같다. LLM 은 이 숫자를 인용만 한다.
 *
 * 하드 제약: I01 금지 자산군에 걸리는 후보는 만들지 않는다.
 */

export const EVENTS: LifeEvent[] = [
  {
    id: "ev-diagnosis",
    kind: "diagnosis",
    label: "치매 진단을 받았습니다",
    params: {},
  },
  {
    id: "ev-windfall",
    kind: "windfall",
    label: "목돈 3억이 들어왔습니다",
    params: { amount: 300_000_000 },
  },
  {
    id: "ev-crash",
    kind: "market_crash",
    label: "시장이 25% 급락했습니다",
    params: { dropPct: 25 },
  },
];

export const EVENT_META: Record<
  EventKind,
  { caption: string; exposureLabel: string; exposureHelp: string }
> = {
  diagnosis: {
    caption: "전문의 진단서가 나왔습니다. 설계서에 적어 둔 발동 조건이 채워진 시점입니다.",
    exposureLabel: "한 번에 빠져나갈 수 있는 금액",
    exposureHelp: "한도나 승인 절차를 거치지 않고 하루 안에 인출하거나 이체할 수 있는 최대 금액",
  },
  windfall: {
    caption: "집을 팔았거나 보험금을 받아 목돈이 생겼습니다. 어디에 둘지는 아직 정하지 않았습니다.",
    exposureLabel: "보호 장치 밖에 남는 금액",
    exposureHelp: "보전계좌, 승인 절차, 지급 약정 어디에도 묶여 있지 않아 사기나 충동적인 처분에 노출되는 금액",
  },
  market_crash: {
    caption: "갖고 있던 위험자산이 하루 만에 25% 떨어졌습니다. 미리 정해 둔 원칙과 예전에 실제로 했던 행동을 나란히 놓고 봅니다.",
    exposureLabel: "추가 하락에 노출되는 위험자산",
    exposureHelp: "이 후보를 택한 뒤에도 시장에 남아 있는 위험자산 평가액(하락 반영)",
  },
};

const DROP = 0.25;

interface Ctx {
  p: Profile;
  insight: LedgerInsight | null;
  assets: number;
  monthlyNet: number;
  living: number;
  bump: number;
  careAt: number;
  perTx?: number;
  medicalReserve: number;
  forbidden: Set<string>;
  riskCapPct?: number;
  trustAvailable: boolean;
}

function ctxOf(p: Profile, insight: LedgerInsight | null): Ctx {
  const expense = buildExpenseDesign(p);
  const bump = amountOf(p, "B08") ?? 0;
  const cap = choiceOf(p, "I02");
  const trust = buildTrustDesign(p);
  return {
    p,
    insight,
    assets: expense.sustainability.assets,
    monthlyNet: expense.sustainability.monthlyNet,
    living: expense.cashflow.living,
    bump,
    careAt: bump > 0 ? 5 : Infinity,
    perTx: firstAmount(p, "A05", "B14"),
    medicalReserve: expense.cashflow.medicalReserve,
    forbidden: new Set(multiOf(p, "I01").filter((v) => v !== "none")),
    riskCapPct: cap !== undefined ? RISK_CAP_PCT[cap] : undefined,
    trustAvailable: !!trust?.available,
  };
}

const runway = (c: Ctx, assets: number, monthlyNet = c.monthlyNet) =>
  projectRunway(assets, monthlyNet, c.bump, c.careAt).years;

/** 한도·승인 절차 없이 하루 안에 빠져나갈 수 있는 최대 금액 */
const dailyExposure = (c: Ctx, perTx = c.perTx) =>
  perTx !== undefined ? Math.min(c.assets, perTx * 2) : c.assets;

const yearsLabel = (y: number | null) => (y === null ? "30년 이상" : `약 ${y}년`);

/* ── 1. 치매 진단 ────────────────────────────────── */

function diagnosisCandidates(c: Ctx): Candidate[] {
  const { p } = c;
  const out: Candidate[] = [];
  const base = dailyExposure(c);
  const baseRunway = runway(c, c.assets);

  if (c.perTx !== undefined) {
    const lowered = Math.max(100_000, Math.round(c.perTx / 2 / 100_000) * 100_000);
    out.push({
      id: "dx-lower-limit",
      title: "1회 이체 한도를 절반으로 낮춘다",
      basis: [
        `제3조 1회 이체 한도 ${won(c.perTx)} → ${won(lowered)} (1일 누적 한도는 그 2배로 자동 산정)`,
        "제5조 한도 초과 건은 1차 알림 대상에게 승인 요청",
      ],
      impact: { runwayYears: baseRunway, riskExposure: Math.min(c.assets, lowered * 2) },
      reversible: true,
      clause: { doc: "expense", ref: "제3조" },
    });
  } else {
    out.push({
      id: "dx-set-limit",
      title: "1회 이체 한도를 새로 둔다",
      basis: ["제3조 1회 이체 한도가 아직 없습니다. 피해 규모에 상한이 없는 상태입니다"],
      impact: {
        runwayYears: baseRunway,
        riskExposure: Math.min(c.assets, Math.max(500_000, c.living) * 2),
      },
      reversible: true,
      clause: { doc: "expense", ref: "제3조" },
    });
  }

  const inactive = buildExpenseDesign(p).fraudRules.filter((r) => !r.active);
  out.push({
    id: "dx-sensitivity",
    title: "꺼져 있는 이상거래 룰을 전부 켠다",
    basis: [
      inactive.length
        ? `제4조 꺼져 있는 룰 ${inactive.length}종: ${inactive.map((r) => r.condition).join(" / ")}`
        : "제4조 룰은 이미 모두 켜져 있습니다. 신규 수취인 보류 시간을 24시간에서 48시간으로 늘리는 정도가 남습니다",
      "노출 금액은 그대로이고, 보류·통보가 늘어 확인할 시간이 생깁니다",
    ],
    impact: { runwayYears: baseRunway, riskExposure: base },
    reversible: true,
    clause: { doc: "expense", ref: "제4조" },
  });

  if (c.trustAvailable && c.living > 0) {
    out.push({
      id: "dx-start-payout",
      title: "제4조 발동 조건이 채워졌으니 월 지급을 시작한다",
      basis: [
        `제5조 정기지급 월 ${won(c.living)}, 생활계좌 잔액 상한 ${won(Math.round(c.living * 1.5))}`,
        c.bump > 0
          ? `제5조 ② 요양시설 입소 시 월 ${won(c.bump)} 증액`
          : "제5조 ② 요양이 시작될 때 얼마를 올릴지는 아직 정하지 않았습니다",
        "한번 지급을 시작하면 제10조 종료 요건을 거쳐야 멈출 수 있습니다",
      ],
      impact: {
        runwayYears: baseRunway,
        riskExposure: Math.min(base, Math.round(c.living * 1.5)),
      },
      reversible: false,
      clause: { doc: "trust", ref: "제4조" },
    });
  } else {
    out.push({
      id: "dx-notify",
      title: "1차 알림 대상에게 알리고 승인 절차를 시작한다",
      basis: [
        `제5조 1차 대상 ${personLabel(firstPerson(p, "A07", "B12", "C07"))} · 12시간 후 ${personLabel(personOf(p, "A11") ?? personOf(p, "B06"))}`,
        "신탁 초안이 없어 월 지급 개시 후보는 만들지 않았습니다",
      ],
      impact: { runwayYears: baseRunway, riskExposure: base },
      reversible: true,
      clause: { doc: "expense", ref: "제5조" },
    });
  }

  out.push({
    id: "dx-nothing",
    title: "아무것도 하지 않음 (현재 설계서 그대로)",
    basis: [
      c.perTx !== undefined
        ? `제3조 1일 누적 한도 ${won(c.perTx * 2)}이 그대로 적용됩니다`
        : "제3조 한도가 없어 잔액 전체가 한 번에 노출됩니다",
      `제6조 지금 설정대로면 소진 시점은 ${yearsLabel(baseRunway)}`,
    ],
    impact: { runwayYears: baseRunway, riskExposure: base },
    reversible: true,
    isDoNothing: true,
    clause: { doc: "expense", ref: "제6조" },
  });

  return out;
}

/* ── 2. 목돈 유입 ────────────────────────────────── */

function windfallCandidates(c: Ctx, amount: number): Candidate[] {
  const out: Candidate[] = [];
  const total = c.assets + amount;

  if (c.riskCapPct !== undefined) {
    const risky = Math.round((amount * c.riskCapPct) / 100);
    const safe = amount - risky;
    // 위험 몫은 펀드·ETF 유형, 안전 몫은 예금·채권 유형. 금지 자산군은 뺀다.
    const riskyClasses = ["fund", "equity"].filter((k) => !c.forbidden.has(k));
    const safeClasses = ["deposit", "bond"].filter((k) => !c.forbidden.has(k));
    const riskyPart = riskyClasses.length ? risky : 0;
    const safePart = amount - riskyPart;
    if (safeClasses.length) {
      out.push({
        id: "wf-allocate",
        title: `정해 둔 배분 원칙대로 나눈다 (위험자산 ${c.riskCapPct}% 이내)`,
        basis: [
          `제7조 ② 위험자산 상한 ${c.riskCapPct}% → 위험 몫 ${won(riskyPart)} (${riskyClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·") || "없음"})`,
          `안전 몫 ${won(safePart)}은 보전계좌로 (${safeClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·")}), 출금할 때 공동승인`,
          ...(c.forbidden.size
            ? [`제7조 ① 금지 자산군 제외: ${[...c.forbidden].map((k) => ASSET_CLASS_LABEL[k] ?? k).join(", ")}`]
            : []),
          ...(riskyPart !== risky ? ["위험 몫에 쓸 수 있는 자산군이 모두 금지돼 전액 안전 몫으로 돌렸습니다"] : []),
        ],
        impact: { runwayYears: runway(c, total), riskExposure: riskyPart },
        reversible: true,
        assetClasses: [...riskyClasses, ...safeClasses],
        clause: { doc: "expense", ref: "제7조" },
      });
    }
    void safe;
  }

  // 월지급식 유형: 20년 균등 지급 가정. 원금은 약정에 묶여 노출 0.
  const monthlyFromProduct = Math.round(amount / (20 * 12));
  out.push({
    id: "wf-payout-type",
    title: "월지급식 연금·신탁 유형으로 묶는다 (20년 균등 지급 가정)",
    basis: [
      `월 ${won(monthlyFromProduct)}이 제6조 월 수입에 더해집니다 (순인출 ${won(c.monthlyNet)} → ${won(Math.max(0, c.monthlyNet - monthlyFromProduct))})`,
      "약정 기간 중 해지는 손실이 따르므로 되돌리기 어려운 조치로 봅니다",
      "특정 상품이나 회사는 정하지 않습니다. 어떤 유형인지까지만 봅니다",
    ],
    impact: {
      runwayYears: runway(c, c.assets, Math.max(0, c.monthlyNet - monthlyFromProduct)),
      riskExposure: 0,
    },
    reversible: false,
    clause: { doc: "expense", ref: "제6조" },
  });

  const topUp = Math.min(amount, c.medicalReserve);
  out.push({
    id: "wf-medical-reserve",
    title: "의료예비계좌를 목표 잔액까지 채우고 나머지는 보전계좌에 둔다",
    basis: [
      `제1조 ② 의료예비계좌 목표 ${won(c.medicalReserve)} → ${won(topUp)} 충당`,
      `제1조 ③ 나머지 ${won(amount - topUp)}은 보전계좌에 두고 출금할 때 공동승인`,
      "의료예비계좌는 지정인이 승인해야 돈이 나가므로 보호 장치 안에 있습니다",
    ],
    impact: { runwayYears: runway(c, total), riskExposure: 0 },
    reversible: true,
    assetClasses: ["deposit"],
    clause: { doc: "expense", ref: "제1조" },
  });

  out.push({
    id: "wf-nothing",
    title: "아무것도 하지 않음 (들어온 계좌에 그대로 둔다)",
    basis: [
      `${won(amount)} 전액이 한도·승인 절차 밖의 일반 계좌에 머뭅니다`,
      c.perTx !== undefined
        ? "제3조 한도가 있어도 계좌 해지나 창구 인출처럼 이체 한도 밖 경로로는 전액을 꺼낼 수 있습니다"
        : "제3조 한도가 없어 전액이 한 번에 노출됩니다",
      `제6조 소진 시점 ${yearsLabel(runway(c, total))} (지금은 ${yearsLabel(runway(c, c.assets))})`,
    ],
    impact: { runwayYears: runway(c, total), riskExposure: amount },
    reversible: true,
    isDoNothing: true,
    clause: { doc: "expense", ref: "제6조" },
  });

  return out;
}

/* ── 3. 시장 급락 ────────────────────────────────── */

function riskShareOf(c: Ctx): { share: number; basis: string } {
  const alloc = c.insight?.decision?.allocation;
  if (alloc && alloc.equity > 0) {
    return { share: alloc.equity / 100, basis: `이력 최근 3년 평균 주식 비중 ${alloc.equity}%` };
  }
  if (c.riskCapPct !== undefined && c.riskCapPct > 0) {
    return { share: c.riskCapPct / 100, basis: `제7조 ② 위험자산 상한 ${c.riskCapPct}%를 가득 채웠다고 가정` };
  }
  return { share: 0.3, basis: "이력도 정해 둔 원칙도 없어 위험자산 30%로 가정" };
}

function crashCandidates(c: Ctx, dropPct: number): Candidate[] {
  const drop = dropPct / 100;
  const { share, basis: shareBasis } = riskShareOf(c);
  const risky = Math.round(c.assets * share);
  const loss = Math.round(risky * drop);
  const riskyAfter = risky - loss;
  const after = c.assets - loss;
  const out: Candidate[] = [];
  const designee = personOf(c.p, "I05") ?? firstPerson(c.p, "A07", "B12", "D11");

  out.push({
    id: "cr-nothing",
    title: "아무것도 하지 않음 (그대로 보유)",
    basis: [
      shareBasis,
      `위험자산 ${won(risky)} 중 평가손 ${won(loss)}, 팔지 않으면 손실은 확정되지 않습니다`,
      "제7조 ③에서 권한 선택지",
    ],
    impact: { runwayYears: runway(c, after), riskExposure: riskyAfter },
    reversible: true,
    isDoNothing: true,
    clause: { doc: "expense", ref: "제7조" },
  });

  const safeClasses = ["deposit", "bond"].filter((k) => !c.forbidden.has(k));

  if (safeClasses.length) {
    out.push({
      id: "cr-reduce",
      title: "위험자산 절반을 안전자산으로 바꾼다",
      basis: [
        `평가손 ${won(Math.round(loss / 2))}이 확정되고, ${won(Math.round(riskyAfter / 2))}만 시장에 남습니다`,
        `안전자산 유형: ${safeClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·")}`,
        "확정된 손실은 되돌릴 수 없으므로 되돌리기 어려운 조치로 봅니다",
      ],
      impact: { runwayYears: runway(c, after), riskExposure: Math.round(riskyAfter / 2) },
      reversible: false,
      assetClasses: safeClasses,
      clause: { doc: "expense", ref: "제7조" },
    });
    out.push({
      id: "cr-all-safe",
      title: "전부 안전자산으로 바꾼다",
      basis: [
        `평가손 ${won(loss)} 전액이 확정됩니다`,
        "회복 구간을 놓치는 대신 추가 하락에는 더 노출되지 않습니다",
        `안전자산 유형: ${safeClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·")}`,
      ],
      impact: { runwayYears: runway(c, after), riskExposure: 0 },
      reversible: false,
      assetClasses: safeClasses,
      clause: { doc: "expense", ref: "제7조" },
    });
  }

  out.push({
    id: "cr-consult",
    title: `${personLabel(designee)}와 상의한 뒤 정한다 (그때까지는 보유)`,
    basis: [
      designee
        ? `제7조 ④, 제5조 지정인 ${personLabel(designee)}`
        : "상의할 사람이 없습니다. 제5조 알림 대상을 먼저 정해야 합니다",
      "결정을 미루는 동안 숫자는 '아무것도 하지 않음'과 같습니다",
    ],
    impact: { runwayYears: runway(c, after), riskExposure: riskyAfter },
    reversible: true,
    clause: { doc: "expense", ref: "제5조" },
  });

  return out;
}

/* ── 조립 ────────────────────────────────────────── */

const CRASH_POLICY_LABEL: Record<string, string> = {
  do_nothing: "아무것도 하지 않는다",
  reduce: "일부를 줄인다",
  all_safe: "전량 안전자산으로 바꾼다",
  consult: "지정한 사람과 상의한 뒤 정한다",
};

function crashContrast(c: Ctx): DeclaredObserved | null {
  const declared = choiceOf(c.p, "I03");
  const d = c.insight?.decision;
  if (!declared && !d) return null;
  const sold = d?.reactions.filter((r) => r.sold) ?? [];
  const avgPortion = sold.length
    ? Math.round((sold.reduce((a, r) => a + r.portionSold, 0) / sold.length) * 100)
    : 0;
  return {
    title: "급락 때 하기로 한 것과 실제로 한 것",
    declared: declared ? `제7조 ③ ${CRASH_POLICY_LABEL[declared]}` : "아직 정하지 않음",
    observed: d
      ? sold.length
        ? `하락 ${d.reactions.length}회 중 ${sold.length}회 매도 · 평균 ${d.reactionDays}일 만에 보유분 ${avgPortion}% 매도`
        : `하락 ${d.reactions.length}회 모두 보유 유지`
      : "이력 없음",
    evidence: (d?.reactions ?? []).map((r) => ({
      label: `${r.date.slice(0, 7)} ${r.label} ${(r.drawdown * 100).toFixed(0)}%`,
      detail: r.sold
        ? `하락 시작 ${r.reactionDays}일 뒤 보유분 ${Math.round(r.portionSold * 100)}% 매도` +
          (r.coincidingOutflow
            ? `. 같은 시점에 ${r.coincidingOutflow.label} ${won(r.coincidingOutflow.amount)} 지출`
            : "")
        : "매도 없음, 회복 구간까지 보유",
    })),
  };
}

/** 금지 자산군(I01)에 걸리는 후보를 걸러낸다. 하드 제약. */
export function applyForbidden(cands: Candidate[], forbidden: Set<string>): Candidate[] {
  return cands.filter(
    (cd) => !cd.assetClasses || cd.assetClasses.every((k) => !forbidden.has(k)),
  );
}

/**
 * 이벤트 → 후보. 반드시 "아무것도 하지 않음" 을 포함하고, 그 후보에도 impact 를 넣는다.
 */
export function evaluateEvent(
  p: Profile,
  insight: LedgerInsight | null,
  event: LifeEvent,
): Candidate[] {
  const c = ctxOf(p, insight);
  let cands: Candidate[];
  switch (event.kind) {
    case "diagnosis":
      cands = diagnosisCandidates(c);
      break;
    case "windfall":
      cands = windfallCandidates(c, Number(event.params.amount ?? 300_000_000));
      break;
    case "market_crash":
      cands = crashCandidates(c, Number(event.params.dropPct ?? 25));
      break;
  }
  return applyForbidden(cands, c.forbidden);
}

/** 후보에 더해 재진입 챕터·선언 대 관측 대조·기준 소진 시점까지 묶는다. */
export function adviseEvent(
  p: Profile,
  insight: LedgerInsight | null,
  event: LifeEvent,
): Advice {
  const c = ctxOf(p, insight);
  const reentry: Chapter[] = [];
  if (isUnified(p)) {
    if (event.kind === "diagnosis" && !hasChapter(p, "medical")) reentry.push("medical");
    if (event.kind === "windfall" && !hasChapter(p, "invest")) reentry.push("invest");
    if (event.kind === "market_crash" && !choiceOf(p, "I03")) reentry.push("invest");
  }
  return {
    event,
    candidates: evaluateEvent(p, insight, event),
    reentry,
    contrast: event.kind === "market_crash" ? crashContrast(c) : null,
    baselineRunwayYears: runway(c, c.assets),
  };
}

export { yearsLabel };
