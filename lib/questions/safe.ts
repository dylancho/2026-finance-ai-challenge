import type { Question } from "../types";

/**
 * 금융 보호 챕터 (선택) — Smart Fraud Shield.
 *
 * 코어의 A05(1회 한도)·A06(기본 차단 목록)이 "한도" 기준이라면, 이 챕터는 "맥락" 기준이다.
 * 한도 안의 금액이라도 처음 보는 계좌·새벽·인증 실패·터치 패턴 이탈이 겹치면 어떻게 할지를
 * 미리 정한다. 답은 지출설계서 제4조(이상거래 룰셋)에 맥락 룰로 더해지고, /api/fds 의
 * 판정 엔진이 policy 로 받아 실제 판정에 쓴다.
 *
 * ID 는 S01 부터. 순서: 대응 원칙 → 확인 기준액 → 감시 신호 → 보호자 무응답 시.
 */

export const S01: Question = {
  id: "S01",
  track: "daily",
  chapter: "safe",
  section: "보호 원칙",
  prompt: "평소와 다른 거래가 감지되면 어떻게 할까요?",
  helper:
    "예: 오랫동안 연락이 없던 지인이 처음 보는 계좌로 1,200만원을 급히 보내 달라고 합니다. 나중에 직접 판단하기 어려운 상태라면 NEXT가 따를 원칙입니다.",
  type: "choice",
  options: [
    {
      value: "guardian",
      label: "보호자 승인 후 진행",
      hint: "권장",
    },
    {
      value: "block",
      label: "금액과 관계없이 우선 차단",
    },
    {
      value: "reauth",
      label: "본인 재인증 후 진행",
      warn: "강요당하는 상황에서는 본인 인증도 통과될 수 있습니다.",
    },
  ],
  mapsTo: [{ doc: "expense", clause: "제4조", label: "이상거래 대응 원칙" }],
};

export const S02: Question = {
  id: "S02",
  track: "daily",
  chapter: "safe",
  section: "확인 기준",
  prompt: "처음 보는 개인 계좌로 얼마 이상 보낼 때 확인을 거칠까요?",
  helper:
    "이 금액 미만이면 신호가 겹쳐도 알림만 보냅니다. 1회 이체 한도(제3조)와 별개로, 신규 계좌에만 적용되는 기준입니다.",
  type: "amount",
  min: 0,
  max: 20_000_000,
  step: 500_000,
  presets: [1_000_000, 3_000_000, 5_000_000],
  mapsTo: [{ doc: "expense", clause: "제4조", label: "신규 계좌 확인 기준액" }],
};

export const S03: Question = {
  id: "S03",
  track: "daily",
  chapter: "safe",
  section: "감시 신호",
  prompt: "금액 말고 어떤 신호를 함께 볼까요?",
  helper:
    "신호가 겹칠수록 위험도가 올라갑니다. 빼면 그 신호는 판정에 쓰지 않습니다.",
  type: "multi",
  defaults: ["time", "pin", "biometric", "device"],
  options: [
    { value: "time", label: "평소 이용하지 않는 시간대 (새벽 등)" },
    { value: "pin", label: "이체 직전 비밀번호 오입력 반복" },
    { value: "biometric", label: "평소와 다른 터치 속도·리듬" },
    { value: "device", label: "처음 쓰는 기기에서의 접속" },
  ],
  mapsTo: [{ doc: "expense", clause: "제4조", label: "맥락 감시 신호" }],
};

export const S04: Question = {
  id: "S04",
  track: "daily",
  chapter: "safe",
  section: "보호자 무응답",
  prompt: "보호자가 12시간 안에 응답하지 않으면 어떻게 할까요?",
  helper: "차단된 거래가 언제까지 묶여 있어야 하는지에 대한 답입니다.",
  type: "choice",
  options: [
    { value: "hold", label: "응답할 때까지 계속 차단", hint: "권장" },
    { value: "reauth", label: "본인 재인증에 성공하면 해제" },
    {
      value: "small_ok",
      label: "확인 기준액 미만이면 진행",
      warn: "기준액 아래로 쪼개서 여러 번 보내는 수법에 취약합니다.",
    },
  ],
  mapsTo: [{ doc: "expense", clause: "제4조", label: "보호자 무응답 시 조치" }],
};

export const safeQuestions: Question[] = [S01, S02, S03, S04];
