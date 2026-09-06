/**
 * 보호 룰: 평소와 다른 거래가 들어왔을 때 NEXT가 따를 원칙.
 *
 * 인터뷰 마지막 단계와 /monthly-review 가 같은 저장소를 읽고 쓴다.
 * 매월 한 번 다시 묻는다는 전제라 월 단위로 저장한다.
 */

export const RULE_STORAGE_KEY = "next.safe.monthly-rule.v1";

export type RuleChoice = "guardian" | "block" | "reauth";

export interface RuleReview {
  month: string;
  choice: RuleChoice;
  updatedAt: number;
}

export const RULE_OPTIONS: Record<RuleChoice, { title: string; description: string; rule: string }> = {
  guardian: {
    title: "보호자 승인 후 진행",
    description: "보호자가 무슨 거래인지 확인한 뒤에만 진행해요.",
    rule: "처음 보는 개인 계좌로 300만원 이상 보낼 때는 보호자가 승인한 뒤 진행",
  },
  block: {
    title: "금액과 관계없이 우선 차단",
    description: "처음 보는 개인 계좌로 보내는 돈은 모두 멈추고 확인을 요청해요.",
    rule: "처음 보는 개인 계좌로 보낼 때는 금액과 관계없이 먼저 막고 확인",
  },
  reauth: {
    title: "본인 재인증 후 진행",
    description: "본인이 한 번 더 인증에 성공하면 거래를 다시 허용해요.",
    rule: "처음 보는 개인 계좌로 보낼 때는 본인이 한 번 더 인증한 뒤 진행",
  },
};

export const RULE_CHOICES = Object.keys(RULE_OPTIONS) as RuleChoice[];

export const RULE_SCENARIO = {
  title: "오랫동안 연락이 없던 지인이 1,200만원을 급히 빌려 달라고 했어요.",
  body: (name: string) =>
    `받는 계좌는 한 번도 보낸 적 없는 개인 계좌예요. 나중에 ${name}님이 이 거래를 직접 판단하기 어려운 상태라면, NEXT는 어떻게 해야 할까요?`,
};

export function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

/** 이번 달 선택만 돌려준다. 지난달 것이면 다시 묻는다. */
export function readRule(): RuleReview | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(RULE_STORAGE_KEY) ?? "null") as RuleReview | null;
    return saved?.month === currentMonth() ? saved : null;
  } catch {
    return null;
  }
}

export function saveRule(choice: RuleChoice): RuleReview {
  const next: RuleReview = { month: currentMonth(), choice, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(RULE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 화면은 계속 동작 */
  }
  return next;
}
