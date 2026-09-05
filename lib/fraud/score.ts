/**
 * Smart Fraud Shield 룰 엔진.
 *
 * 단일 한도가 아니라 금액·수취인·시간·인증·행동·기기 신호를 합산해 위험도를 낸다.
 * 여기서 나온 숫자는 결정론적이고, 서버·클라이언트 어디서든 같은 결과가 나온다.
 * 서술(왜 이런 판단인지)은 app/api/fds 에서 Claude 가 이 결과를 받아 쓴다.
 * 숫자는 여기서만 계산한다. 판정층이 숫자를 고쳐 쓰면 화면의 근거와 어긋난다.
 */

import { DEFAULT_POLICY, type FraudPolicy } from "./policy";

export type SignalLevel = "critical" | "warning" | "normal";
export type FraudStatus = "BLOCKED" | "REVIEW" | "ALLOW";

export interface FraudSignal {
  key: string;
  label: string;
  level: SignalLevel;
  score: number;
  observed: string;
  baseline: string;
  detail: string;
}

export interface FraudTransaction {
  transactionId: string;
  amount: number;
  targetAccount: string;
  isNewTargetAccount: boolean;
  requestTime: string;
  pinErrorCount: number;
  biometricAnomalyScore: number;
  isNewDevice: boolean;
}

export interface FraudScore {
  status: FraudStatus;
  risk_score: number;
  transaction: FraudTransaction;
  baseline: typeof BASELINE;
  signals: FraudSignal[];
  /** 적용된 보호 원칙(금융 보호 챕터). 어떤 원칙이 상태를 결정했는지 서술에 쓴다. */
  policy: FraudPolicy;
  /** 원칙이 룰 점수 판정을 바꿨으면 그 이유 */
  policyNote?: string;
}

/** 데모용 사용자 기준선. 실제 서비스라면 최근 3개월 거래 로그에서 학습한다. */
export const BASELINE = {
  averageAmount: 286_000,
  p95Amount: 470_000,
  usualHours: "09:00–20:00",
  knownAccounts: ["110-123-456789", "3333-01-9988231", "1002-987-654321"],
  typicalPinErrors: 0,
  typicalBiometricDeviation: 0.12,
};

/** API 바디(snake_case, 일부 누락 가능)를 거래 객체로 정규화한다. 기본값은 차단 시나리오. */
export function parseTransaction(body: Record<string, unknown>): FraudTransaction {
  return {
    transactionId: String(body.transaction_id ?? "TX_99218"),
    amount: Number(body.amount ?? 8_000_000),
    targetAccount: String(body.target_account ?? "356-0012-9981"),
    isNewTargetAccount: Boolean(body.is_new_target_account ?? true),
    requestTime: String(body.request_time ?? "02:15 AM"),
    pinErrorCount: Number(body.pin_error_count ?? 2),
    biometricAnomalyScore: Number(body.biometric_anomaly_score ?? 0.89),
    isNewDevice: Boolean(body.is_new_device ?? true),
  };
}

function hourOf(value: string): number {
  const match = value.match(/(\d{1,2}):/);
  if (!match) return 12;
  let hour = Number(match[1]);
  const upper = value.toUpperCase();
  if (upper.includes("PM") && hour < 12) hour += 12;
  if (upper.includes("AM") && hour === 12) hour = 0;
  return hour;
}

function level(score: number): SignalLevel {
  return score >= 18 ? "critical" : score > 0 ? "warning" : "normal";
}

export function scoreTransaction(tx: FraudTransaction, policy: FraudPolicy = DEFAULT_POLICY): FraudScore {
  const ratio = tx.amount / BASELINE.p95Amount;
  const hour = hourOf(tx.requestTime);
  const watch = new Set(policy.signals);
  // 사용자가 보지 않기로 한 신호는 점수를 매기지 않는다 (S03).
  const scores = {
    amount: ratio >= 10 ? 30 : ratio >= 4 ? 20 : ratio >= 2 ? 10 : 0,
    recipient: tx.isNewTargetAccount ? 19 : 0,
    time: watch.has("time") && (hour < 9 || hour > 20) ? 14 : 0,
    pin: watch.has("pin") ? (tx.pinErrorCount >= 2 ? 13 : tx.pinErrorCount === 1 ? 6 : 0) : 0,
    biometric: watch.has("biometric")
      ? tx.biometricAnomalyScore >= 0.7 ? 17 : tx.biometricAnomalyScore >= 0.4 ? 8 : 0
      : 0,
    device: watch.has("device") && tx.isNewDevice ? 7 : 0,
  };
  const risk = Math.min(99, Object.values(scores).reduce((sum, v) => sum + v, 0));
  let status: FraudStatus = risk >= 65 ? "BLOCKED" : risk >= 35 ? "REVIEW" : "ALLOW";
  let policyNote: string | undefined;

  // 보호 원칙(S01·S02)은 점수와 별개로 상태의 하한을 정한다.
  if (tx.isNewTargetAccount) {
    if (policy.rule === "block") {
      if (status !== "BLOCKED") policyNote = "선언한 원칙: 신규 개인 계좌 송금은 금액과 관계없이 우선 차단";
      status = "BLOCKED";
    } else if (tx.amount >= policy.newAccountThreshold) {
      const floor: FraudStatus = policy.rule === "guardian" ? "BLOCKED" : "REVIEW";
      if (status === "ALLOW" || (status === "REVIEW" && floor === "BLOCKED")) {
        policyNote = `선언한 원칙: 신규 개인 계좌로 ${policy.newAccountThreshold.toLocaleString("ko-KR")}원 이상은 ${
          policy.rule === "guardian" ? "보호자 승인 후 진행" : "본인 재인증 후 진행"
        }`;
        status = floor;
      }
    }
  }
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

  const signals: FraudSignal[] = [
    {
      key: "amount", label: "거래 금액", score: scores.amount, level: level(scores.amount),
      observed: won(tx.amount), baseline: `상위 5% ${won(BASELINE.p95Amount)}`,
      detail: scores.amount ? `평소 고액 이체 기준의 ${ratio.toFixed(1)}배입니다.` : "평소 고액 이체 범위 안입니다.",
    },
    {
      key: "recipient", label: "거래 대상", score: scores.recipient, level: level(scores.recipient),
      observed: tx.isNewTargetAccount ? "신규 개인 수취계좌" : "기등록 수취계좌",
      baseline: tx.isNewTargetAccount ? "최근 10년 거래 이력 없음" : "최근 10년 거래 이력 있음",
      detail: tx.isNewTargetAccount
        ? "평소 거래 계좌가 아니며, 최근 10년간 송금 이력이 없는 신규 개인 계좌입니다."
        : "반복 거래 이력이 확인된 계좌입니다.",
    },
    {
      key: "time", label: "사용 시간", score: scores.time, level: level(scores.time),
      observed: tx.requestTime, baseline: `평소 ${BASELINE.usualHours}`,
      detail: scores.time ? "평소 모바일뱅킹 활동 시간 밖의 요청입니다." : "평소 이용 시간대입니다.",
    },
    {
      key: "pin", label: "로그인·인증 행동", score: scores.pin, level: level(scores.pin),
      observed: tx.pinErrorCount ? `비밀번호 오입력 ${tx.pinErrorCount}회` : "비밀번호 오류 없음",
      baseline: `평균 ${BASELINE.typicalPinErrors}회`,
      detail: scores.pin ? "송금 직전 인증 실패가 반복되었습니다." : "인증 실패 패턴이 없습니다.",
    },
    {
      key: "biometric", label: "사용자 행동 패턴", score: scores.biometric, level: level(scores.biometric),
      observed: `터치 패턴 이탈 ${Math.round(tx.biometricAnomalyScore * 100)}%`,
      baseline: `평균 이탈 ${Math.round(BASELINE.typicalBiometricDeviation * 100)}%`,
      detail: scores.biometric ? "평소 터치 속도·압력·입력 리듬과 차이가 큽니다." : "등록된 행동 패턴 범위입니다.",
    },
    {
      key: "device", label: "접속 환경", score: scores.device, level: level(scores.device),
      observed: tx.isNewDevice ? "신규 기기" : "등록 기기", baseline: "최근 사용 기기",
      detail: tx.isNewDevice ? "이 기기에서의 최근 거래 이력이 없습니다." : "기기 신뢰 이력이 있습니다.",
    },
  ];

  return { status, risk_score: risk, transaction: tx, baseline: BASELINE, signals, policy, policyNote };
}

/** 판정층이 없을 때 쓰는 룰 기반 서술. Claude 가 실패해도 화면은 이걸로 완주한다. */
export function fallbackDecision(status: FraudStatus): string {
  if (status === "BLOCKED") {
    return "평소 패턴과 다른 고위험 신호가 여러 개 겹쳤습니다. 명의 도용이나 타인의 강요에 의한 인출 가능성이 있어 거래를 일시 정지하고 보호자 확인을 요청했습니다.";
  }
  if (status === "REVIEW") {
    return "일부 신호가 평소와 다릅니다. 본인 재인증 또는 보호자 확인 후 진행할 수 있습니다.";
  }
  return "평소 수취계좌·이용 시간·인증 행동 범위 안의 거래입니다. 안전하게 처리할 수 있습니다.";
}

export function topReasons(signals: FraudSignal[], n = 3): string[] {
  return signals
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((s) => s.detail);
}
