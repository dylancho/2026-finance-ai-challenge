import type { Chapter } from "../types";

/**
 * 어드바이징 — 이벤트 → 판정 루프의 스키마.
 *
 * 시스템은 절대 하나를 고르지 않는다. 후보 3개 + "아무것도 하지 않음" 을 나란히,
 * 같은 단위(자산 소진 시점, 위험 노출액)로 비교하고 되돌릴 수 있는지 표시한다.
 * 특정 금융회사·상품명은 쓰지 않는다 — 자산군·상품 유형 수준까지만.
 */

export type EventKind = "diagnosis" | "windfall" | "market_crash";

export interface LifeEvent {
  id: string;
  kind: EventKind;
  label: string;
  /** 예: windfall.amount, crash.dropPct */
  params: Record<string, number | string>;
}

export interface CandidateImpact {
  /** 이 후보를 택했을 때의 자산 소진 시점(년). null 이면 30년 이상 유지. */
  runwayYears?: number | null;
  /**
   * 위험 노출액(원). 이벤트마다 정의가 다르므로 화면은 EVENT_META.exposureLabel 을 함께 쓴다.
   * 진단: 한도·승인 절차 없이 한 번에 빠져나갈 수 있는 금액.
   * 목돈: 보호 장치(보전계좌·승인 절차) 밖에 남는 금액.
   * 급락: 추가 하락에 그대로 노출되는 위험자산.
   */
  riskExposure?: number;
}

export interface Candidate {
  id: string;
  /** 예: "예금 일부를 월지급식 유형으로 전환 검토" */
  title: string;
  /** 근거가 된 조항·선언 (예: "제3조 위험자산 상한 20%", "I01 금지: 파생상품") */
  basis: string[];
  /** 결정론적 재계산 결과 */
  impact: CandidateImpact;
  reversible: boolean;
  isDoNothing?: boolean;
  /** 이 후보가 건드리는 자산군. I01 금지 자산군과 겹치면 후보를 만들지 않는다. */
  assetClasses?: string[];
  /** 관련 설계서 조항 (화면의 링크·근거 표시용) */
  clause?: { doc: "expense" | "trust" | "guardianship"; ref: string };
}

/** 선언(인터뷰)과 관측(이력)을 나란히 두는 한 줄 */
export interface DeclaredObserved {
  title: string;
  declared: string;
  observed: string;
  /** 이력에서 인용한 실제 행동과 결과 */
  evidence: { label: string; detail: string }[];
}

export interface Advice {
  event: LifeEvent;
  candidates: Candidate[];
  /** 이 판단에 필요한데 아직 선언하지 않은 챕터 — 재진입 카드가 된다 */
  reentry: Chapter[];
  contrast: DeclaredObserved | null;
  /** 현재 설계서 기준(이벤트 전) 소진 시점 — 후보 impact 와 같은 함수로 계산 */
  baselineRunwayYears: number | null;
}

/** LLM 서술. 숫자를 다시 계산하지 않고 받은 impact 만 인용한다. */
export interface AdviceNarration {
  summary: { text: string; source: "rule" | "llm" };
  tradeoffs: Record<string, { text: string; source: "rule" | "llm" }>;
  contrastNote?: { text: string; source: "rule" | "llm" };
}

/** 판정 원장 한 줄 — 실행이 아니라 "검토 후보로 기록" 이다. */
export interface DecisionRecord {
  id: string;
  at: number;
  eventKind: EventKind;
  eventLabel: string;
  candidateId: string;
  candidateTitle: string;
  basis: string[];
  clause?: Candidate["clause"];
}
