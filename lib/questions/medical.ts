import type { Question } from "../types";

/**
 * 의료·요양 챕터 (선택) — 옛 future/caregiver(B·C 트랙) 질문 중 의료·요양 재무 결정만
 * 선별해 이관했다. 4문항. ID·mapsTo 는 원래 그대로다.
 *
 * 선별 기준: "요양·치료 상황에서 돈이 어떻게 움직여야 하는가" 를 정하는 질문.
 * 트리거·관리자·감독인·종료 요건 같은 신탁·후견 구조 질문은 이관하지 않았다 —
 * 엔진의 fallback 체인은 그대로라, 답이 없으면 코어 답으로 자연히 넘어간다.
 *
 * 순서: 요양 형태 → 요양 진입 시 증액 → 의료비 상한 → 대신 결정할 신상 사무.
 */

export const B17: Question = {
  id: "B17",
  track: "future",
  chapter: "medical",
  section: "요양 방식",
  prompt: "요양과 치료 방식에 대해 미리 정해두고 싶은 것이 있나요?",
  helper: "돈만이 아니라 신상에 관한 결정도 후견 사무에 포함됩니다.",
  type: "choice",
  options: [
    { value: "home", label: "가능한 한 집에서 지내고 싶다" },
    { value: "facility", label: "전문 요양시설이 낫다고 본다" },
    { value: "family_decide", label: "그때 가족이 판단하도록" },
    { value: "undecided", label: "아직 생각해 보지 않았다" },
  ],
  mapsTo: [{ doc: "guardianship", clause: "제3조", label: "신상보호 선호" }],
};

export const B08: Question = {
  id: "B08",
  track: "future",
  chapter: "medical",
  section: "요양 재원",
  prompt: "요양시설에 들어가게 되면 월 지급액을 얼마나 올릴까요?",
  helper:
    "요양원 본인부담은 월 100~250만원대가 흔합니다. 증액 트리거를 미리 넣어두면 그때 가족이 다투지 않습니다.",
  type: "amount",
  min: 0,
  max: 5_000_000,
  step: 100_000,
  presets: [1_000_000, 1_500_000, 2_000_000],
  mapsTo: [{ doc: "trust", clause: "제5조", label: "증액 트리거" }],
};

export const B09: Question = {
  id: "B09",
  track: "future",
  chapter: "medical",
  section: "요양 재원",
  prompt: "치료비와 요양비는 어디까지 쓸까요?",
  helper:
    "상한이 없으면 자산이 빠르게 소진되고, 너무 낮으면 정작 치료를 못 받습니다. 수시지급 조항(제6조)입니다.",
  type: "choice",
  options: [
    { value: "unlimited", label: "필요하면 제한 없이" },
    { value: "total_cap", label: "누적 총액 상한을 두고" },
    { value: "yearly_cap", label: "연간 상한을 두고" },
    { value: "family", label: "매번 가족 합의를 거쳐서" },
  ],
  mapsTo: [{ doc: "trust", clause: "제6조", label: "의료비 지급 한도" }],
};

export const B18: Question = {
  id: "B18",
  track: "future",
  chapter: "medical",
  section: "대신 결정할 일",
  prompt: "후견인에게 맡길 신상 사무는 어디까지인가요?",
  helper: "고르지 않은 항목은 '제외'로 남고, 그 결정은 그때 아무도 대신할 수 없습니다.",
  type: "multi",
  options: [
    { value: "residence", label: "어디서 살지 결정" },
    { value: "medical", label: "의료행위 동의" },
    { value: "facility", label: "요양시설 입퇴소 계약" },
    { value: "visit", label: "면접교섭 (누가 만날 수 있는지)" },
    { value: "mail", label: "우편·통신물 관리" },
    { value: "eol", label: "연명의료 의사 확인" },
  ],
  mapsTo: [{ doc: "guardianship", clause: "제3조", label: "신상보호 사무범위" }],
};

export const medicalQuestions: Question[] = [B17, B08, B09, B18];
