import { statutesFor } from "./statutes";
import type {
  ActorKind,
  AuthorityState,
  AuthorityStep,
  DesignSet,
  Instrument,
  InstrumentKind,
  Profile,
  RoadmapStep,
} from "../types";

/**
 * 설계서에서 "이 조항을 집행하려면 무엇이 체결되어야 하는가" 를 파생한다.
 *
 * 새 콘텐츠를 쓰지 않는다. 제도 가부 판정은 이미 trust.ts · guardianship.ts 가
 * 끝냈고, 같은 판단을 두 곳에서 따로 쓰면 반드시 어긋난다.
 */

/** RoadmapStep 에는 주체가 없다. 제목과 서류에서 파생한다. */
const ACTOR_RULES: [RegExp, ActorKind][] = [
  [/가정법원|심판|감정|감독인 선임/, "법원"],
  [/공증|공정증서|등기/, "전문가"],
  [/금융기관|은행|신탁회사|계좌/, "금융기관"],
];

export function actorOf(title: string, docs: string[] = []): ActorKind {
  const hay = [title, ...docs].join(" ");
  for (const [re, actor] of ACTOR_RULES) if (re.test(hay)) return actor;
  return "본인";
}

function fromRoadmap(steps: RoadmapStep[]): AuthorityStep[] {
  return steps.map((s) => ({
    n: s.n,
    label: s.title,
    by: actorOf(s.title, s.docs),
    detail: s.detail,
    period: s.period,
  }));
}

/**
 * 본인이 단독으로 절차를 밟을 수 있는 상태인가.
 *
 * 진단을 받았거나 이미 사고가 있었다면 본인 단독 행위의 효력이 다투어질 수 있고,
 * 가족이 대리해 설계한 경우에는 애초에 본인이 실행 주체가 아니다.
 * trust.ts · guardianship.ts 가 diagnosed 와 incident 를 늘 같이 검사하는 것과 맞춘다.
 */
export function actsAlone(p: Profile): boolean {
  return (
    p.subject !== "family" &&
    p.capacity !== "diagnosed" &&
    p.capacity !== "incident"
  );
}

const CAUTION_DELEGATED =
  "본인의 의사능력이 충분하지 않은 상태에서 한 행위는 나중에 효력이 다투어질 수 있습니다. 보호자 또는 법정 청구권자가 대신 진행해야 합니다.";

const CAUTION_DECLINING =
  "판단에 어려움이 보이기 시작한 단계입니다. 이 시기에 한 행위는 나중에 의사능력을 두고 다투어질 수 있으므로, 전문의 소견서를 함께 받아두는 것이 일반적입니다.";

/** 본인이 못 하는 상태면 그 단계의 주체를 보호자로 바꾸고 이유를 붙인다. */
function resolveActors(steps: AuthorityStep[], p: Profile): AuthorityStep[] {
  const alone = actsAlone(p);
  return steps.map((s) => {
    if (s.by !== "본인") return s;
    if (!alone) return { ...s, by: "보호자" as const, caution: CAUTION_DELEGATED };
    if (p.capacity === "declining") return { ...s, caution: CAUTION_DECLINING };
    return s;
  });
}

const TRUST_STEPS: AuthorityStep[] = [
  {
    n: 1,
    label: "설계서를 신탁 취급 금융기관에 제출",
    by: "본인",
    detail: "핸드오프 패킷의 조항 초안과 미정 사항을 함께 전달합니다.",
  },
  {
    n: 2,
    label: "신탁회사·법무법인 검토 및 계약 체결",
    by: "전문가",
    detail:
      "조항의 유효성, 세무 효과, 기관별 최소 설정금액을 확인한 뒤 계약서를 작성합니다.",
  },
  {
    n: 3,
    label: "신탁재산 이전",
    by: "금융기관",
    detail:
      "금융자산은 신탁계좌로 이관하고, 부동산은 신탁등기를 마쳐야 합니다. 이전이 끝나야 신탁이 작동합니다.",
  },
];

const MANDATE_STEPS: AuthorityStep[] = [
  {
    n: 1,
    label: "자동이체·한도 설정 신청서 작성",
    by: "본인",
    detail: "지출설계서의 자동이체 매트릭스를 그대로 옮겨 적습니다.",
  },
  {
    n: 2,
    label: "금융기관에 대리인 지정 등록",
    by: "금융기관",
    detail:
      "본인이 직접 처리하기 어려워졌을 때 지정인이 대신 처리할 수 있으려면 사전 등록이 필요합니다.",
  },
];

/**
 * 지출설계서 전체를 위임장에 묶지 않는다.
 * 이상거래 차단(제4조)과 한도 축소(제3조)는 위임 없이 지금 당장 신청할 수 있고,
 * 신탁이 막힌 사용자에게 서비스가 권하는 즉시 조치가 바로 그것이다.
 * 대행이 필요한 항목만 건다.
 */
const MANDATE_COVERS = ["expense:제2조", "expense:제6조"];

export function buildInstruments(
  p: Profile,
  design: DesignSet,
  state?: AuthorityState,
): Instrument[] {
  const out: Instrument[] = [];
  const trust = design.trust;
  const g = design.guardianship;

  if (trust) {
    out.push(
      trust.available
        ? {
            kind: "trust",
            name: trust.type.name,
            stage: "draft",
            covers: ["trust:*"],
            effectRule: "신탁계약을 체결하고 신탁재산의 이전을 마친 때",
            steps: resolveActors(TRUST_STEPS, p),
            basis: statutesFor("trust", design),
          }
        : {
            kind: "trust",
            name: "신탁계약",
            stage: "unavailable",
            covers: ["trust:*"],
            effectRule: "신탁계약을 체결하고 신탁재산의 이전을 마친 때",
            steps: [],
            unavailableReason: trust.blockedReason,
            fallback: trust.type.alternatives,
            basis: [],
          },
    );
  }

  if (g && g.verdict.code !== "none") {
    const voluntary = g.verdict.code === "voluntary";
    out.push({
      kind: voluntary ? "voluntary_guardianship" : "legal_guardianship",
      name: g.verdict.name,
      stage: "draft",
      covers: ["guardianship:*"],
      effectRule: voluntary
        ? "가정법원이 임의후견감독인을 선임한 때"
        : "가정법원의 후견개시 심판이 확정된 때",
      steps: resolveActors(fromRoadmap(g.roadmap), p),
      basis: statutesFor(
        voluntary ? "voluntary_guardianship" : "legal_guardianship",
        design,
      ),
    });
  }

  // 신탁도 후견도 없는 트랙(daily)에서는 이것이 유일한 집행 근거다.
  out.push({
    kind: "bank_mandate",
    name: "금융기관 대리인 지정 · 자동이체 위임",
    stage: "draft",
    covers: MANDATE_COVERS,
    effectRule: "금융기관에 대리인 지정이 등록된 때",
    steps: resolveActors(MANDATE_STEPS, p),
    basis: [],
  });

  return out.map((i) => applyStage(i, state));
}

/** 저장된 단계를 얹는다. unavailable 은 저장값으로 뒤집을 수 없다. */
function applyStage(i: Instrument, state?: AuthorityState): Instrument {
  if (i.stage === "unavailable") return i;
  const saved = state?.stages?.[i.kind];
  return saved && saved !== "unavailable" ? { ...i, stage: saved } : i;
}

export function instrumentOf(
  instruments: Instrument[],
  kind: InstrumentKind,
): Instrument | undefined {
  return instruments.find((i) => i.kind === kind);
}
