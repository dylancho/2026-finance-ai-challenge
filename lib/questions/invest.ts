import type { Question } from "../types";

/**
 * 투자 챕터 (선택) — placeholder.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 질문 확정 시 이 파일만 교체한다.                                        │
 * │ 팀원이 설계 중인 투자 질문 세트가 확정되기 전이라 4문항을 임시로 둔다.    │
 * │ 단, I01(금지 자산군)과 I02(위험자산 상한)는 어드바이징(lib/advising)이   │
 * │ 하드 제약으로 읽는다. value 체계를 바꾸면 lib/advising/ 도 함께 고친다.   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 신규 ID 는 I01 부터. 기존 트랙 B 의 운용지침(B11)은 성격상 투자 원칙이라
 * 여기로 이관했고 ID 는 그대로다 (trust 제7조·대조 규칙이 문자열로 참조).
 *
 * 문구는 docs/writing-style.md 를 따른다. B11 preserve 의 "그대로 두고 팔지 않기" 와
 * I03 do_nothing 의 "팔지 않고 그대로 보유한다" 는 다른 모듈의 테스트가 문자열로
 * 확인하므로 그대로 둔다.
 */

/** 어드바이징이 자산군 후보를 거를 때 쓰는 값. 라벨은 화면용이다. */
export const ASSET_CLASS_LABEL: Record<string, string> = {
  deposit: "예금·적금",
  bond: "국공채·우량 채권",
  fund: "펀드·ETF",
  equity: "개별 주식",
  realestate: "부동산·리츠",
  derivative: "파생상품·레버리지",
  crypto: "가상자산",
};

/** I02 선택값 → 위험자산 최대 비중(%). */
export const RISK_CAP_PCT: Record<string, number> = {
  none: 0,
  low: 20,
  half: 50,
  high: 70,
};

/** 옛 트랙 B 의 운용지침. trust 제7조와 대조 규칙(stanceRule)이 "B11" 로 참조한다. */
export const B11: Question = {
  id: "B11",
  track: "future",
  chapter: "invest",
  section: "운용 넘기기",
  prompt: "투자 자산은 어떻게 관리되길 원하세요?",
  helper: "판단이 어려워진 뒤에 급하게 파는 것이 가장 큰 손실 원인이에요. 신탁설계서 제7조에 들어가요.",
  type: "choice",
  options: [
    { value: "preserve", label: "그대로 두고 팔지 않기" },
    { value: "phased", label: "생활비가 필요한 만큼만 조금씩 현금으로 바꾸기" },
    { value: "partial", label: "큰돈이 필요할 때만 일부 팔기" },
    { value: "delegate", label: "전문가에게 운용을 맡기기" },
  ],
  mapsTo: [{ doc: "trust", clause: "제7조", label: "운용지침" }],
};

export const investQuestions: Question[] = [
  {
    id: "I01",
    track: "future",
    chapter: "invest",
    section: "자산 종류",
    prompt: "앞으로 절대 손대지 않을 자산이 있나요?",
    helper: "여기서 고른 자산은 어떤 상황이 와도 선택지에 올리지 않아요. 고르지 않은 자산은 나중에 선택지로 남아요.",
    type: "multi",
    options: [
      { value: "derivative", label: "파생상품·레버리지" },
      { value: "crypto", label: "가상자산" },
      { value: "equity", label: "개별 주식" },
      { value: "fund", label: "펀드·ETF" },
      { value: "realestate", label: "부동산·리츠" },
      { value: "bond", label: "국공채·우량 채권" },
      { value: "deposit", label: "예금·적금" },
      { value: "none", label: "금지할 자산은 없어요" },
    ],
    mapsTo: [{ doc: "expense", clause: "제7조", label: "금지 자산군" }],
  },
  {
    id: "I02",
    track: "future",
    chapter: "invest",
    section: "자산 종류",
    prompt: "값이 오르내리는 자산은 전체의 얼마까지 두시겠어요?",
    helper: "주식이나 펀드처럼 값이 움직이는 자산을 어디까지 둘지예요. 목돈이 생기면 이 비중 안에서만 나누는 선택지를 만들어요.",
    type: "choice",
    options: [
      { value: "none", label: "0%, 값이 오르내리는 자산은 두지 않아요" },
      { value: "low", label: "20% 이하", hint: "조심스럽게" },
      { value: "half", label: "50% 정도" },
      { value: "high", label: "70% 이상", hint: "적극적으로" },
    ],
    mapsTo: [{ doc: "expense", clause: "제7조", label: "위험자산 상한" }],
  },
  {
    id: "I03",
    track: "future",
    chapter: "invest",
    section: "급락했을 때",
    prompt: "주가가 25% 넘게 떨어지면 어떻게 하기로 할까요?",
    helper: "막상 떨어졌을 때는 이 답을 차분히 고르기 어려워요. 그래서 지금 정해 둬요. 과거 이력이 있으면 옆에 함께 보여 드려요.",
    type: "choice",
    // 2026-09-07: "아무것도 하지 않는다" 는 설계서 제7조에 실리면 방치처럼 읽혔다. 값은 그대로 두고
    // 원칙 문장으로 바꾼다 — 하락 직후 매도하지 않는 것이 이 선택지의 뜻이다.
    options: [
      { value: "do_nothing", label: "팔지 않고 그대로 보유한다", hint: "권장" },
      { value: "reduce", label: "값이 오르내리는 자산을 일부 줄인다" },
      {
        value: "all_safe",
        label: "전부 안전한 자산으로 바꾼다",
        warn: "떨어진 직후에 전부 팔면 손실이 확정돼요. 회복하는 시기를 놓치는 경우가 많아요.",
      },
      { value: "consult", label: "정해 둔 사람과 상의한 뒤 정한다" },
    ],
    mapsTo: [{ doc: "expense", clause: "제7조", label: "급락 시 대응 원칙" }],
  },
  {
    id: "I04",
    track: "future",
    chapter: "invest",
    section: "운용 넘기기",
    prompt: "투자 판단이 어려워지면 운용을 누구에게 어떻게 넘길까요?",
    helper: "판단이 흐려진 뒤에 급하게 파는 것이 가장 큰 손실 원인이에요. 넘길 방식을 미리 정해 둬요.",
    type: "choice",
    options: [
      { value: "designee", label: "정해 둔 사람에게 맡긴다" },
      { value: "institution", label: "금융기관에 운용을 맡긴다" },
      { value: "freeze", label: "새로 사고파는 것을 멈추고 그대로 둔다" },
      { value: "undecided", label: "아직 정하지 못했어요" },
    ],
    mapsTo: [{ doc: "expense", clause: "제7조", label: "운용 이양 방식" }],
  },
  {
    id: "I05",
    track: "future",
    chapter: "invest",
    section: "운용 넘기기",
    prompt: "운용을 넘길 사람은 누구인가요?",
    helper: "앞 질문에서 '정해 둔 사람에게 맡긴다'를 고르셨을 때만 여쭤봐요.",
    type: "person",
    optional: true,
    showIf: (p) => p.answers["I04"]?.kind === "choice" && p.answers["I04"].value === "designee",
    mapsTo: [{ doc: "expense", clause: "제7조", label: "운용 이양 대상" }],
  },
  B11,
];
