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
    label: "치매 진단을 받았어요",
    params: {},
  },
  {
    id: "ev-windfall",
    kind: "windfall",
    label: "목돈 3억이 들어왔어요",
    params: { amount: 300_000_000 },
  },
  {
    id: "ev-crash",
    kind: "market_crash",
    label: "시장이 25% 급락했어요",
    params: { dropPct: 25 },
  },
];

export const EVENT_META: Record<
  EventKind,
  { caption: string; exposureLabel: string; exposureHelp: string }
> = {
  diagnosis: {
    caption: "전문의 진단서가 나왔어요. 설계서에 적어 둔 시작 조건이 채워진 때예요.",
    exposureLabel: "한 번에 빠져나갈 수 있는 금액",
    exposureHelp: "한도나 승인 절차를 거치지 않고 하루 안에 인출하거나 이체할 수 있는 최대 금액",
  },
  windfall: {
    caption: "집을 팔았거나 보험금을 받아 목돈이 생겼어요. 어디에 둘지는 아직 정하지 않았어요.",
    exposureLabel: "보호 밖에 남는 돈",
    exposureHelp: "보전계좌, 승인 절차, 지급 약정 어디에도 묶이지 않아 사기나 충동적인 처분으로 빠져나갈 수 있는 돈",
  },
  market_crash: {
    caption: "갖고 있던 위험자산이 하루 만에 크게 떨어졌어요. 미리 정해 둔 원칙과 실제로 해 온 행동을 나란히 놓고 봐요.",
    exposureLabel: "시장에 남는 위험자산",
    exposureHelp: "이 선택지를 고른 뒤에도 시장에 남아 더 떨어질 수 있는 위험자산 평가액(하락 반영)",
  },
};

/* 2026-09-06: 이벤트는 이제 자유 입력에서 해석되므로 숫자는 event.params 로 들어온다.
 * 문장에 숫자가 없을 때만 아래 기본값을 쓴다 (칩 3종도 이 값이다). */
export const DEFAULT_WINDFALL_AMOUNT = 300_000_000;
export const DEFAULT_DROP_PCT = 25;

/** event.params 에서 숫자를 꺼낸다. 문자열로 들어와도 숫자로, 못 읽으면 기본값. */
export function windfallAmountOf(event: LifeEvent): number {
  const n = Number(event.params.amount);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDFALL_AMOUNT;
}

export function dropPctOf(event: LifeEvent): number {
  const n = Number(event.params.dropPct);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : DEFAULT_DROP_PCT;
}

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
/** "소진" 대신 사람 말로. null 은 30년 뒤에도 남는다는 뜻이라 "30년 이상 뒤에 바닥나요" 로 읽히지 않게 따로 쓴다. */
const runoutLabel = (y: number | null) =>
  y === null ? "30년 뒤에도 자산이 남아요" : `약 ${y}년 뒤에 자산이 바닥나요`;

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
      title: "1회 이체 한도를 절반으로 낮추기",
      basis: [
        `제3조 1회 이체 한도를 ${won(c.perTx)}에서 ${won(lowered)}으로 낮춰요 (하루 누적 한도는 그 2배)`,
        "제5조 한도를 넘는 건은 먼저 알릴 사람에게 승인을 요청해요",
      ],
      impact: { runwayYears: baseRunway, riskExposure: Math.min(c.assets, lowered * 2) },
      reversible: true,
      clause: { doc: "expense", ref: "제3조" },
    });
  } else {
    out.push({
      id: "dx-set-limit",
      title: "1회 이체 한도를 새로 두기",
      basis: ["제3조 1회 이체 한도가 아직 없어요. 피해 금액에 상한이 없는 상태예요"],
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
    title: "꺼져 있는 보호 규칙을 전부 켜기",
    basis: [
      inactive.length
        ? `제4조 꺼져 있는 규칙 ${inactive.length}가지: ${inactive.map((r) => r.condition).join(" / ")}`
        : "제4조 규칙은 이미 모두 켜져 있어요. 처음 보내는 계좌의 보류 시간을 24시간에서 48시간으로 늘리는 정도가 남아요",
      "빠져나갈 수 있는 돈은 그대로예요. 보류와 통보가 늘어 확인할 시간이 생겨요",
    ],
    impact: { runwayYears: baseRunway, riskExposure: base },
    reversible: true,
    clause: { doc: "expense", ref: "제4조" },
  });

  if (c.trustAvailable && c.living > 0) {
    out.push({
      id: "dx-start-payout",
      title: "시작 조건이 채워졌으니 매달 지급 시작하기",
      basis: [
        `제5조 매달 ${won(c.living)} 지급, 생활계좌 잔액 상한 ${won(Math.round(c.living * 1.5))}`,
        c.bump > 0
          ? `제5조 ② 요양시설에 들어가면 매달 ${won(c.bump)} 더 지급`
          : "제5조 ② 요양이 시작될 때 얼마를 올릴지는 아직 정하지 않았어요",
        "한번 지급을 시작하면 제10조 종료 요건을 거쳐야 멈출 수 있어요",
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
      title: "먼저 알릴 사람에게 알리고 승인 절차 시작하기",
      basis: [
        `제5조 먼저 알릴 사람 ${personLabel(firstPerson(p, "A07", "B12", "C07"))} · 12시간 뒤 ${personLabel(personOf(p, "A11") ?? personOf(p, "B06"))}`,
        "신탁 초안이 없어 매달 지급을 시작하는 선택지는 만들지 않았어요",
      ],
      impact: { runwayYears: baseRunway, riskExposure: base },
      reversible: true,
      clause: { doc: "expense", ref: "제5조" },
    });
  }

  out.push({
    id: "dx-nothing",
    title: "아무것도 하지 않기 (지금 설계서 그대로)",
    basis: [
      c.perTx !== undefined
        ? `제3조 하루 누적 한도 ${won(c.perTx * 2)}이 그대로 적용돼요`
        : "제3조 한도가 없어 잔액 전체가 한 번에 빠져나갈 수 있어요",
      `제6조 지금 설정대로면 ${runoutLabel(baseRunway)}`,
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
        title: `정해 둔 배분 원칙대로 나누기 (위험자산 ${c.riskCapPct}% 이내)`,
        basis: [
          `제7조 ② 위험자산 상한 ${c.riskCapPct}%: 위험 몫 ${won(riskyPart)} (${riskyClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·") || "없음"})`,
          `안전 몫 ${won(safePart)}은 보전계좌에 두고 (${safeClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·")}), 꺼낼 때 함께 승인해요`,
          ...(c.forbidden.size
            ? [`제7조 ① 금지 자산군 제외: ${[...c.forbidden].map((k) => ASSET_CLASS_LABEL[k] ?? k).join(", ")}`]
            : []),
          ...(riskyPart !== risky ? ["위험 몫에 쓸 수 있는 자산군이 모두 금지돼 전액 안전 몫으로 돌렸어요"] : []),
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
    title: "매달 받는 연금·신탁 유형으로 묶기 (20년 나눠 받는다고 가정)",
    basis: [
      `매달 ${won(monthlyFromProduct)}이 제6조 월 수입에 더해져요 (매달 꺼내 쓰는 돈 ${won(c.monthlyNet)}에서 ${won(Math.max(0, c.monthlyNet - monthlyFromProduct))}으로)`,
      "약정 기간 중에 해지하면 손실이 따라요. 그래서 되돌리기 어려운 조치로 봐요",
      "특정 상품이나 회사는 정하지 않아요. 어떤 유형인지까지만 봐요",
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
    title: "의료예비계좌를 목표까지 채우고 나머지는 보전계좌에 두기",
    basis: [
      `제1조 ② 의료예비계좌 목표 ${won(c.medicalReserve)} 중 ${won(topUp)}을 채워요`,
      `제1조 ③ 나머지 ${won(amount - topUp)}은 보전계좌에 두고 꺼낼 때 함께 승인해요`,
      "의료예비계좌는 지정한 사람이 승인해야 돈이 나가요. 보호 안에 있는 돈이에요",
    ],
    impact: { runwayYears: runway(c, total), riskExposure: 0 },
    reversible: true,
    assetClasses: ["deposit"],
    clause: { doc: "expense", ref: "제1조" },
  });

  out.push({
    id: "wf-nothing",
    title: "아무것도 하지 않기 (들어온 계좌에 그대로 두기)",
    basis: [
      `${won(amount)} 전액이 한도와 승인 절차 밖의 일반 계좌에 머물러요`,
      c.perTx !== undefined
        ? "제3조 한도가 있어도 계좌 해지나 창구 인출처럼 이체 한도 밖 경로로는 전액을 꺼낼 수 있어요"
        : "제3조 한도가 없어 전액이 한 번에 빠져나갈 수 있어요",
      // 목돈이 들어와도 바닥나는 때가 그대로면(둘 다 30년 이상) 괄호를 붙일 이유가 없다
      `제6조 ${runoutLabel(runway(c, total))}` +
        (runway(c, total) !== runway(c, c.assets) ? ` (지금은 ${yearsLabel(runway(c, c.assets))})` : ""),
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
    return { share: c.riskCapPct / 100, basis: `제7조 ② 위험자산 상한 ${c.riskCapPct}%를 가득 채웠다고 봤어요` };
  }
  return { share: 0.3, basis: "이력도 정해 둔 원칙도 없어 위험자산 30%로 봤어요" };
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
  // 제7조 ③에 적어 둔 급락 원칙. 후보마다 "정해 둔 것과 같다/다르다" 를 한 줄로 밝힌다 (2026-09-07).
  const declared = choiceOf(c.p, "I03");

  out.push({
    id: "cr-nothing",
    title: "아무것도 하지 않기 (그대로 보유)",
    basis: [
      shareBasis,
      `${dropPct}% 하락 반영: 위험자산 ${won(risky)} 중 평가손 ${won(loss)}. 팔지 않으면 손실은 확정되지 않아요`,
      declared === "do_nothing"
        ? "제7조 ③에 정해 둔 원칙 그대로예요"
        : "제7조 ③에 정한 원칙은 아니지만, 손실을 확정하지 않는 기준선으로 함께 둬요",
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
      title: "위험자산 절반을 안전자산으로 바꾸기",
      basis: [
        `평가손 ${won(Math.round(loss / 2))}이 확정되고, ${won(Math.round(riskyAfter / 2))}만 시장에 남아요`,
        `안전자산 유형: ${safeClasses.map((k) => ASSET_CLASS_LABEL[k]).join("·")}`,
        "확정된 손실은 되돌릴 수 없어요. 그래서 되돌리기 어려운 조치로 봐요",
      ],
      impact: { runwayYears: runway(c, after), riskExposure: Math.round(riskyAfter / 2) },
      reversible: false,
      assetClasses: safeClasses,
      clause: { doc: "expense", ref: "제7조" },
    });
    out.push({
      id: "cr-all-safe",
      title: "전부 안전자산으로 바꾸기",
      basis: [
        `평가손 ${won(loss)} 전액이 확정돼요`,
        "회복 구간을 놓치는 대신, 더 떨어져도 더 잃지는 않아요",
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
    title: `${personLabel(designee)}와 상의한 뒤 정하기 (그때까지는 보유)`,
    basis: [
      designee
        ? declared === "consult"
          ? `제7조 ③에 정해 둔 원칙이에요. 상의할 사람은 ${personLabel(designee)}`
          : `제7조 ④, 제5조에서 지정한 사람 ${personLabel(designee)}`
        : "상의할 사람이 없어요. 제5조 알릴 사람을 먼저 정해야 해요",
      "결정을 미루는 동안 숫자는 '아무것도 하지 않기'와 같아요",
    ],
    impact: { runwayYears: runway(c, after), riskExposure: riskyAfter },
    reversible: true,
    clause: { doc: "expense", ref: "제5조" },
  });

  return out;
}

/* ── 조립 ────────────────────────────────────────── */

// lib/questions/invest.ts I03 라벨과 같은 문장. 설계서 제7조(lib/design/expense.ts)와도 맞춘다.
const CRASH_POLICY_LABEL: Record<string, string> = {
  do_nothing: "팔지 않고 그대로 보유한다",
  reduce: "위험자산 일부를 줄인다",
  all_safe: "전량 안전자산으로 바꾼다",
  consult: "지정한 사람과 상의한 뒤 정한다",
};

function crashContrast(c: Ctx): DeclaredObserved | null {
  const declared = choiceOf(c.p, "I03");
  const d = c.insight?.decision;
  if (!declared && !d) return null;
  const designee = personOf(c.p, "I05");
  const declaredLabel =
    declared === "consult" && designee
      ? `${personLabel(designee)}의 의견을 듣고 정한다`
      : declared
        ? CRASH_POLICY_LABEL[declared]
        : undefined;
  const sold = d?.reactions.filter((r) => r.sold) ?? [];
  const avgPortion = sold.length
    ? Math.round((sold.reduce((a, r) => a + r.portionSold, 0) / sold.length) * 100)
    : 0;
  return {
    title: "급락 때 하기로 한 것과 실제로 한 것",
    declared: declaredLabel ? `제7조 ③ ${declaredLabel}` : "아직 정하지 않았어요",
    observed: d
      ? sold.length
        ? `하락 ${d.reactions.length}회 중 ${sold.length}회는 팔았어요 (평균 ${d.reactionDays}일 만에 보유분 ${avgPortion}%)`
        : `하락 ${d.reactions.length}회 모두 팔지 않았어요`
      : "이력이 없어요",
    evidence: (d?.reactions ?? []).map((r) => ({
      label: `${r.date.slice(0, 7)} ${r.label} ${(r.drawdown * 100).toFixed(0)}%`,
      detail: r.sold
        ? `하락 시작 ${r.reactionDays}일 뒤 보유분 ${Math.round(r.portionSold * 100)}%를 팔았어요` +
          (r.coincidingOutflow
            ? `. 같은 때 ${r.coincidingOutflow.label} ${won(r.coincidingOutflow.amount)}을 썼어요`
            : "")
        : "팔지 않고 회복할 때까지 보유했어요",
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
      cands = windfallCandidates(c, windfallAmountOf(event));
      break;
    case "market_crash":
      cands = crashCandidates(c, dropPctOf(event));
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

export { runoutLabel, yearsLabel };
