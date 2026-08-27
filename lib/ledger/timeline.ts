import type {
  ApprovalTier,
  DesignSet,
  Ledger,
  LedgerInsight,
  Profile,
  TimelineAction,
  TimelinePhase,
  TriggerGate,
} from "../types";
import { scenariosFor } from "../design/scenario";
import { won } from "../format";

/**
 * 30년 축.
 *
 * 기존 시나리오(lib/design/scenario.ts)는 손대지 않는다. 여기서는 상위 뷰만
 * 만들고, 각 Phase 안에서 scenariosFor() 결과를 구간별로 나눠 재사용한다.
 */

/* ── 권한 3단계 (회의록 "결정된 내용") ─────────────── */

export const TIER_LABEL: Record<ApprovalTier, string> = {
  1: "AI 독자 처리",
  2: "보호자 동의",
  3: "법적 후견인 · 전문가 승인",
};

export const TIER_CAPTION: Record<ApprovalTier, string> = {
  1: "자산 변동이 없는 일상 편의와 이상거래 방지",
  2: "자산 운용의 안전성 확보. 주체적 의사결정 유지",
  3: "법적 분쟁 예방과 자산의 근본적 보호",
};

/** 어느 Phase 에서도 참조하는 권한 카탈로그 */
export const TIER_ACTIONS: Record<ApprovalTier, string[]> = {
  1: [
    "정기 공과금 자동 납부",
    "미사용 구독 정리",
    "이상거래 1차 일시 블록",
  ],
  2: [
    "평시 포트폴리오 정기 리밸런싱 (본인 승인)",
    "안전자산 전환 (보호자 승인)",
    "한도 초과 의료비 결제 (보호자 승인)",
  ],
  3: [
    "부동산 매각 · 담보대출",
    "포트폴리오 대규모 원금 인출",
    "고액 상속 · 사전 증여",
    "핵심 금융계약 중도 해지",
  ],
};

/* ── 시나리오 배치 ─────────────────────────────────── */

/** 어느 구간에서 실제로 일어날 법한 사건인가 */
const SCENARIO_PHASE: Record<string, 1 | 2 | 3> = {
  shortfall: 1,
  phishing: 1,
  dementia: 2,
  accident: 2,
  hospital: 2,
  care: 3,
  spouse_death: 3,
};

/* ── 조립 ──────────────────────────────────────────── */

export interface TimelineInput {
  profile: Profile;
  design: DesignSet;
  ledger: Ledger | null;
  insight: LedgerInsight | null;
  gate: TriggerGate | null;
}

export function buildTimeline({
  profile,
  design,
  ledger,
  insight,
  gate,
}: TimelineInput): TimelinePhase[] {
  const ids = scenariosFor(profile).map((s) => s.id);
  const inPhase = (n: 1 | 2 | 3) => ids.filter((id) => (SCENARIO_PHASE[id] ?? 2) === n);

  const startYear = ledger?.startYear ?? new Date().getFullYear() - 10;
  const span = (from: number, to: number) =>
    `${startYear + from}~${startYear + to} · ${from + 1}~${to + 1}년차`;

  const fired = gate?.fired ?? false;
  const alerted = gate?.aiAlert ?? false;

  /* Phase 1 — 적재와 복제 */
  const p1Actions: TimelineAction[] = TIER_ACTIONS[1].map((label) => ({
    label,
    tier: 1 as ApprovalTier,
    approver: "AI",
  }));
  if (insight?.behavior.unusedSubscriptions.length) {
    const subs = insight.behavior.unusedSubscriptions;
    const monthly = subs.reduce((a, s) => a + s.amount, 0);
    p1Actions.push({
      label: `미사용 구독 ${subs.length}건 정리 대상 — 월 ${won(monthly)}`,
      tier: 1,
      approver: "AI",
    });
  }
  if (insight?.decision) {
    p1Actions.push({
      label: "평시 포트폴리오 리밸런싱 제안 (연 1~2회, 본인 승인)",
      tier: 2,
      approver: "본인",
    });
  }

  /* Phase 2 — 감지와 전환 */
  const p2Actions: TimelineAction[] = [
    {
      label: "금융 바이오마커 경보 발령 · 보호자 알림",
      tier: 1,
      approver: "AI",
    },
    {
      label: "안전자산 전환 리밸런싱안 생성",
      tier: 2,
      approver: "보호자",
      clause: { doc: "trust", clause: "제7조", label: "운용지침" },
    },
    {
      label: "한도 초과 의료비 결제",
      tier: 2,
      approver: "보호자",
      clause: { doc: "trust", clause: "제6조", label: "의료비 지급 한도" },
    },
    {
      label: "맞춤형 신탁 · 후견 계약서 초안 이관",
      tier: 3,
      approver: "법무법인 · 신탁사",
    },
  ];

  /* Phase 3 — 대행 */
  const p3Actions: TimelineAction[] = [
    {
      label: "병원비 · 요양비 · 공과금 자동 배분 결제",
      tier: 1,
      approver: "AI",
      clause: { doc: "expense", clause: "§2", label: "자동이체 매트릭스" },
    },
    {
      label: "주차별 소액 생활비만 지급 — 갈취 · 보이스피싱 구조적 차단",
      tier: 1,
      approver: "AI",
      clause: { doc: "expense", clause: "§1", label: "생활계좌" },
    },
    ...TIER_ACTIONS[3].map((label) => ({
      label,
      tier: 3 as ApprovalTier,
      approver: "법적 후견인 · 신탁사",
    })),
  ];
  if (design.trust?.clauses.some((c) => c.no === "제11조")) {
    p3Actions.push({
      label: "잔여재산 귀속 집행",
      tier: 3,
      approver: "신탁사",
      clause: { doc: "trust", clause: "제11조", label: "잔여재산의 귀속" },
    });
  }

  return [
    {
      phase: 1,
      title: "적재와 복제",
      span: span(0, 9),
      caption: ledger
        ? "금융 행동을 기록해 '가장 건강할 때의 판단 기준'을 만든다."
        : "이력을 연동하면 이 구간이 채워집니다.",
      state: ledger ? "done" : "future",
      actions: p1Actions,
      scenarioIds: inPhase(1),
    },
    {
      phase: 2,
      title: "감지와 전환",
      span: span(10, 14),
      caption: alerted
        ? "평소 패턴과 달라진 지점이 관측됐습니다. 서류가 확인되면 전환이 시작됩니다."
        : "베이스라인에서 벗어나는 신호를 감시하는 구간입니다.",
      state: fired ? "active" : alerted ? "locked" : "future",
      actions: p2Actions,
      scenarioIds: inPhase(2),
    },
    {
      phase: 3,
      title: "대행",
      span: span(15, 29),
      caption: "복제된 원칙에 따라 일상 케어와 자산 집행이 이어진다.",
      state: fired ? "future" : "locked",
      actions: p3Actions,
      scenarioIds: inPhase(3),
    },
  ];
}
