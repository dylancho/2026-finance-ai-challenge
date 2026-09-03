import type { Question } from "../types";

/**
 * 코어 챕터 — 공통 필수. 11문항 / 약 3분.
 *
 * 옛 트랙 A(일상 지출·공과금)를 승격했다. 신탁·후견을 한 번도 언급하지 않는다.
 * 코어만 답해도 지출설계서가 나오고, 나머지 챕터(투자·상속·의료)는 선택이다.
 *
 * 배열 순서가 곧 인터뷰 순서다. /ledger 에서 "지금까지 해온 것"을 본 직후에
 * 들어오는 돈 → 갖고 있는 돈 → 나가는 돈 → 생활비 → 지급 방식 → 보호 장치
 * → 사람 → 예외 경로 순으로 물어, 관찰에서 선언으로 서사가 이어지게 한다.
 * 질문 ID 는 설계 엔진·대조 규칙이 문자열로 참조하므로 재번호하지 않는다.
 */
export const coreQuestions: Question[] = [
  {
    id: "A09",
    track: "daily",
    chapter: "core",
    section: "현황",
    prompt: "매달 들어오는 돈은 대략 얼마인가요?",
    helper:
      "연금·임대료·이자·가족 지원을 모두 합한 금액입니다. 나가는 돈과 비교할 기준이 됩니다.",
    type: "amount",
    min: 0,
    max: 10_000_000,
    step: 100_000,
    presets: [500_000, 1_000_000, 2_000_000, 3_000_000],
    mapsTo: [{ doc: "expense", clause: "§6", label: "월 수입" }],
  },
  {
    id: "A10",
    track: "daily",
    chapter: "core",
    section: "현황",
    prompt: "지금 바로 쓸 수 있는 돈(예금·현금)은 대략 얼마인가요?",
    helper:
      "이 금액으로 몇 년 버틸 수 있는지 그래프를 그립니다. 부동산처럼 당장 현금화하기 어려운 것은 빼고 적어 주세요.",
    type: "amount",
    optional: true,
    min: 0,
    max: 1_000_000_000,
    step: 10_000_000,
    presets: [50_000_000, 100_000_000, 300_000_000, 500_000_000],
    mapsTo: [{ doc: "expense", clause: "§6", label: "자산 소진 추정" }],
  },
  {
    id: "A01",
    track: "daily",
    chapter: "core",
    section: "현황",
    prompt: "매달 반드시 빠져나가야 하는 돈은 무엇인가요?",
    helper:
      "여기서 고른 항목이 자동이체 매트릭스의 각 행이 됩니다. 금액은 대략이어도 괜찮아요.",
    type: "multi",
    withAmount: true,
    options: [
      { value: "utility", label: "전기·가스·수도" },
      { value: "maintenance", label: "아파트 관리비" },
      { value: "telecom", label: "통신비 (휴대폰·인터넷)" },
      { value: "insurance", label: "보험료" },
      { value: "rent", label: "월세" },
      { value: "loan", label: "대출 원리금·이자" },
      { value: "tax", label: "세금·사회보험 (재산세, 건강보험료 등)" },
      { value: "subscription", label: "정기 구독 서비스" },
      { value: "care", label: "요양·간병 비용" },
      { value: "hospital", label: "병원 정기 치료비" },
      { value: "support", label: "가족 정기 지원" },
    ],
    mapsTo: [{ doc: "expense", clause: "§2", label: "자동이체 매트릭스" }],
  },
  {
    id: "A02",
    track: "daily",
    chapter: "core",
    section: "현황",
    prompt: "고정지출 말고, 생활비는 매달 얼마면 충분할까요?",
    helper:
      "식비·교통비처럼 손에 쥐고 쓰는 돈입니다. 병원비는 뒤에서 따로 설계하니 여기 넣지 않아도 됩니다.",
    type: "amount",
    min: 300_000,
    max: 8_000_000,
    step: 100_000,
    presets: [1_000_000, 1_500_000, 2_000_000, 3_000_000],
    mapsTo: [{ doc: "expense", clause: "§1", label: "생활계좌 유입액" }],
  },
  {
    id: "A03",
    track: "daily",
    chapter: "core",
    section: "지급 방식",
    prompt: "생활비를 어떤 주기로 받고 싶으세요?",
    helper: "한 번에 많이 받으면 편하지만, 나눠 받으면 사기 피해 규모가 줄어듭니다.",
    type: "choice",
    options: [
      { value: "monthly", label: "매달 1일에 한 번", hint: "가장 일반적" },
      { value: "biweekly", label: "2주에 한 번" },
      { value: "weekly", label: "매주", hint: "피해 규모 최소화" },
      {
        value: "ondemand",
        label: "필요할 때 청구해서",
        warn: "청구를 잊으면 생활비가 끊깁니다. 정기 지급에 청구를 얹는 방식을 권합니다.",
      },
    ],
    mapsTo: [{ doc: "expense", clause: "§1", label: "지급 주기" }],
  },
  {
    id: "A04",
    track: "daily",
    chapter: "core",
    section: "지급 방식",
    prompt: "자동이체가 잔액 부족으로 실패하면 어떻게 할까요?",
    helper:
      "연체는 신용도와 공과금 할증으로 이어집니다. 실패 시 조치를 미리 정해두는 항목입니다.",
    type: "choice",
    options: [
      { value: "auto_cover", label: "예비계좌에서 자동으로 채워 결제", hint: "권장" },
      { value: "notify_guardian", label: "지정한 사람에게도 함께 알리기" },
      {
        value: "notify_only",
        label: "나에게 알림만 보내기",
        warn: "알림을 확인하지 못하는 날이 바로 위험한 날입니다.",
      },
      { value: "hold", label: "결제를 보류하고 승인 요청" },
    ],
    mapsTo: [{ doc: "expense", clause: "§2", label: "이체 실패 시 조치" }],
  },
  {
    id: "A05",
    track: "daily",
    chapter: "core",
    section: "보호 장치",
    prompt: "한 번에 이체할 수 있는 최대 금액을 얼마로 할까요?",
    helper:
      "이 금액을 넘는 이체는 보류되고 확인 절차를 거칩니다. 1일 한도(1회의 2배)와 월 한도는 여기서 자동으로 산정해 §3에 채웁니다.",
    type: "amount",
    min: 100_000,
    max: 30_000_000,
    step: 100_000,
    presets: [500_000, 1_000_000, 3_000_000, 5_000_000],
    mapsTo: [{ doc: "expense", clause: "§3", label: "1회 이체 한도" }],
  },
  {
    id: "A06",
    track: "daily",
    chapter: "core",
    section: "보호 장치",
    prompt: "다음 거래는 기본으로 막아 둡니다. 빼고 싶은 것이 있나요?",
    helper:
      "선택된 항목이 이상거래 룰셋에서 활성화됩니다. 빼면 그 거래는 그대로 통과합니다.",
    type: "multi",
    defaults: [
      "new_payee",
      "night",
      "loan",
      "remote",
      "overseas",
      "deposit_break",
      "burst",
    ],
    options: [
      { value: "new_payee", label: "처음 보는 계좌로 큰 금액 보내기" },
      { value: "night", label: "밤 11시~새벽 6시 사이 고액 이체" },
      { value: "loan", label: "대출·카드 현금서비스 실행" },
      { value: "remote", label: "원격제어 앱이 켜진 상태의 이체" },
      { value: "overseas", label: "해외 송금" },
      { value: "deposit_break", label: "정기예금 중도해지" },
      { value: "burst", label: "월 지급액의 3배가 넘는 인출·이체" },
    ],
    mapsTo: [{ doc: "expense", clause: "§4", label: "이상거래 룰셋" }],
  },
  {
    id: "A07",
    track: "daily",
    chapter: "core",
    section: "사람",
    prompt: "이상 상황이 생기면 누구에게 알릴까요?",
    helper:
      "본인 외 최소 1명을 두는 것을 권합니다. 본인이 판단하기 어려운 상황이 바로 위험한 상황이기 때문입니다.",
    type: "person",
    mapsTo: [{ doc: "expense", clause: "§5", label: "알림 대상" }],
  },
  {
    id: "A11",
    track: "daily",
    chapter: "core",
    section: "사람",
    prompt: "그분이 12시간 안에 응답하지 못하면, 다음으로 누구에게 연락할까요?",
    helper:
      "없으면 해당 거래는 자동 차단됩니다. 차단이 늘 안전한 것은 아니어서, 두 번째 사람을 두면 막힘과 방치를 함께 줄일 수 있습니다.",
    type: "person",
    optional: true,
    mapsTo: [{ doc: "expense", clause: "§5", label: "2차 승인자(감독)" }],
  },
  {
    id: "A08",
    track: "daily",
    chapter: "core",
    section: "예외 경로",
    prompt: "병원비처럼 갑작스러운 큰 지출은 어떻게 처리할까요?",
    helper:
      "막기만 하면 정작 필요할 때 돈이 안 나갑니다. 예외 경로를 함께 설계합니다.",
    type: "choice",
    options: [
      {
        value: "reserve",
        label: "의료예비계좌를 따로 만들어 거기서 집행",
        hint: "권장",
      },
      { value: "auto_within", label: "정해둔 한도 안에서는 자동으로 집행" },
      { value: "approve", label: "지정한 사람의 승인을 받고 집행" },
      { value: "notify_after", label: "먼저 집행하고 바로 통보" },
    ],
    mapsTo: [
      { doc: "expense", clause: "§1", label: "의료예비계좌" },
      { doc: "expense", clause: "§5", label: "예외 승인 경로" },
    ],
  },
];
