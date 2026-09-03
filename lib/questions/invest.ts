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
  section: "운용 이양",
  prompt: "투자자산은 어떻게 관리되길 원하세요?",
  helper: "판단이 어려워진 시점에 급하게 파는 것이 가장 큰 손실 원인입니다. 운용지침(제7조)입니다.",
  type: "choice",
  options: [
    { value: "preserve", label: "그대로 두고 팔지 않기" },
    { value: "phased", label: "생활비가 필요한 만큼만 단계적으로 현금화" },
    { value: "partial", label: "큰돈이 필요할 때만 일부 매도" },
    { value: "delegate", label: "전문가에게 운용을 맡기기" },
  ],
  mapsTo: [{ doc: "trust", clause: "제7조", label: "운용지침" }],
};

export const investQuestions: Question[] = [
  {
    id: "I01",
    track: "future",
    chapter: "invest",
    section: "자산군",
    prompt: "앞으로 절대 손대지 않을 자산이 있나요?",
    helper:
      "여기서 고른 자산군은 어떤 상황이 와도 검토 후보에서 제외됩니다. 고르지 않은 자산군은 나중에 선택지로 남습니다.",
    type: "multi",
    options: [
      { value: "derivative", label: "파생상품·레버리지" },
      { value: "crypto", label: "가상자산" },
      { value: "equity", label: "개별 주식" },
      { value: "fund", label: "펀드·ETF" },
      { value: "realestate", label: "부동산·리츠" },
      { value: "bond", label: "국공채·우량 채권" },
      { value: "deposit", label: "예금·적금" },
      { value: "none", label: "금지할 자산군은 없습니다" },
    ],
    mapsTo: [{ doc: "expense", clause: "§7", label: "금지 자산군" }],
  },
  {
    id: "I02",
    track: "future",
    chapter: "invest",
    section: "자산군",
    prompt: "위험자산은 전체 자산의 얼마까지 두시겠어요?",
    helper:
      "주식·펀드처럼 값이 오르내리는 자산의 상한입니다. 목돈이 생겼을 때 이 비중 안에서만 배분 후보를 만듭니다.",
    type: "choice",
    options: [
      { value: "none", label: "0% — 위험자산은 두지 않는다" },
      { value: "low", label: "20% 이하", hint: "보수적" },
      { value: "half", label: "50% 수준" },
      { value: "high", label: "70% 이상", hint: "공격적" },
    ],
    mapsTo: [{ doc: "expense", clause: "§7", label: "위험자산 상한" }],
  },
  {
    id: "I03",
    track: "future",
    chapter: "invest",
    section: "급락 대응",
    prompt: "시장이 25% 넘게 떨어지면 어떻게 하기로 정하시겠어요?",
    helper:
      "지금 정해 두는 이유는, 실제로 떨어졌을 때는 이 답을 차분히 고를 수 없기 때문입니다. 과거 이력이 있으면 옆에 함께 보여드립니다.",
    type: "choice",
    options: [
      { value: "do_nothing", label: "아무것도 하지 않는다", hint: "권장" },
      { value: "reduce", label: "일부를 줄인다" },
      {
        value: "all_safe",
        label: "전량 안전자산으로 바꾼다",
        warn: "하락 직후 전량 매도는 손실을 확정합니다. 회복 구간을 놓치는 경우가 많습니다.",
      },
      { value: "consult", label: "지정한 사람과 상의한 뒤 정한다" },
    ],
    mapsTo: [{ doc: "expense", clause: "§7", label: "급락 시 대응 원칙" }],
  },
  {
    id: "I04",
    track: "future",
    chapter: "invest",
    section: "운용 이양",
    prompt: "투자 판단이 어려워지면 운용을 어떻게 넘기시겠어요?",
    helper: "판단이 흐려진 뒤에 급하게 파는 것이 가장 큰 손실 원인입니다. 넘길 방식을 미리 정해 둡니다.",
    type: "choice",
    options: [
      { value: "designee", label: "지정한 사람에게 맡긴다" },
      { value: "institution", label: "금융기관 일임 운용으로 넘긴다" },
      { value: "freeze", label: "새 매매를 멈추고 그대로 둔다" },
      { value: "undecided", label: "아직 정하지 못했다" },
    ],
    mapsTo: [{ doc: "expense", clause: "§7", label: "운용 이양 방식" }],
  },
  {
    id: "I05",
    track: "future",
    chapter: "invest",
    section: "운용 이양",
    prompt: "운용을 넘길 사람은 누구인가요?",
    helper: "I04 에서 '지정한 사람' 을 고르셨을 때만 묻습니다.",
    type: "person",
    optional: true,
    showIf: (p) => p.answers["I04"]?.kind === "choice" && p.answers["I04"].value === "designee",
    mapsTo: [{ doc: "expense", clause: "§7", label: "운용 이양 대상" }],
  },
  B11,
];
