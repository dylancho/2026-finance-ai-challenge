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
 * 문구는 docs/writing-style.md 를 따른다.
 */

export const B17: Question = {
  id: "B17",
  track: "future",
  chapter: "medical",
  section: "요양 방식",
  prompt: "요양이나 치료 방식 중 미리 정해 두고 싶은 것이 있나요?",
  helper: "돈만이 아니라 어디서 어떻게 지낼지도 후견인이 대신 정하는 일에 들어가요.",
  type: "choice",
  options: [
    { value: "home", label: "가능한 한 집에서 지내고 싶어요" },
    { value: "facility", label: "전문 요양시설이 낫다고 봐요" },
    { value: "family_decide", label: "그때 가족이 판단하도록" },
    { value: "undecided", label: "아직 생각해 보지 않았어요" },
  ],
  mapsTo: [{ doc: "guardianship", clause: "제3조", label: "신상보호 선호" }],
};

export const B08: Question = {
  id: "B08",
  track: "future",
  chapter: "medical",
  section: "요양 비용",
  prompt: "요양시설에 들어가게 되면 매달 지급액을 얼마나 올릴까요?",
  helper: "요양원 본인 부담은 매달 100만원에서 250만원 사이가 흔해요. 올릴 금액을 미리 정해 두면 그때 가족이 다투지 않아요.",
  type: "amount",
  min: 0,
  max: 5_000_000,
  step: 100_000,
  presets: [1_000_000, 1_500_000, 2_000_000],
  mapsTo: [{ doc: "trust", clause: "제5조", label: "증액 조건" }],
};

export const B09: Question = {
  id: "B09",
  track: "future",
  chapter: "medical",
  section: "요양 비용",
  prompt: "치료비와 요양비는 어디까지 쓸까요?",
  helper: "상한이 없으면 자산이 빨리 바닥나요. 너무 낮으면 정작 치료를 못 받아요. 신탁설계서 제6조에 들어가요.",
  type: "choice",
  options: [
    { value: "unlimited", label: "필요하면 제한 없이" },
    { value: "total_cap", label: "전체 합계에 상한을 두고" },
    { value: "yearly_cap", label: "한 해 상한을 두고" },
    { value: "family", label: "매번 가족이 합의해서" },
  ],
  mapsTo: [{ doc: "trust", clause: "제6조", label: "의료비 지급 한도" }],
};

export const B18: Question = {
  id: "B18",
  track: "future",
  chapter: "medical",
  section: "대신 정할 일",
  prompt: "후견인이 나 대신 정해도 되는 일은 어디까지인가요?",
  helper: "고르지 않은 항목은 '제외'로 남아요. 그 일은 그때 아무도 대신 정할 수 없어요.",
  type: "multi",
  options: [
    { value: "residence", label: "어디서 살지 정하기" },
    { value: "medical", label: "치료나 수술에 동의하기" },
    { value: "facility", label: "요양시설에 들어가고 나오는 계약" },
    { value: "visit", label: "누가 나를 만날 수 있는지 정하기" },
    { value: "mail", label: "우편물 관리" },
    { value: "eol", label: "연명의료에 대한 뜻 확인" },
  ],
  mapsTo: [{ doc: "guardianship", clause: "제3조", label: "신상보호 사무범위" }],
};

export const medicalQuestions: Question[] = [B17, B08, B09, B18];
