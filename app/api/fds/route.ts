import { NextResponse } from "next/server";

type SignalLevel = "critical" | "warning" | "normal";
interface Signal { key: string; label: string; level: SignalLevel; score: number; observed: string; baseline: string; detail: string }

const BASELINE = {
  averageAmount: 286_000, p95Amount: 470_000, usualHours: "09:00–20:00",
  knownAccounts: ["110-123-456789", "3333-01-9988231", "1002-987-654321"],
  typicalPinErrors: 0, typicalBiometricDeviation: 0.12,
};

function hourOf(value: string) { const match = value.match(/(\d{1,2}):/); return match ? Number(match[1]) : 12; }
function level(score: number): SignalLevel { return score >= 18 ? "critical" : score > 0 ? "warning" : "normal"; }

/** 단일 한도가 아닌 거래·수취인·시간·인증·행동·기기를 합산하는 설명 가능한 데모 FDS. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const tx = {
    transactionId: String(body.transaction_id ?? "TX_99218"), amount: Number(body.amount ?? 8_000_000),
    targetAccount: String(body.target_account ?? "356-0012-9981"), isNewTargetAccount: Boolean(body.is_new_target_account ?? true),
    requestTime: String(body.request_time ?? "02:15 AM"), pinErrorCount: Number(body.pin_error_count ?? 2),
    biometricAnomalyScore: Number(body.biometric_anomaly_score ?? 0.89), isNewDevice: Boolean(body.is_new_device ?? true),
  };
  const ratio = tx.amount / BASELINE.p95Amount;
  const scores = {
    amount: ratio >= 10 ? 30 : ratio >= 4 ? 20 : ratio >= 2 ? 10 : 0,
    recipient: tx.isNewTargetAccount ? 19 : 0,
    time: hourOf(tx.requestTime) < 9 || hourOf(tx.requestTime) > 20 ? 14 : 0,
    pin: tx.pinErrorCount >= 2 ? 13 : tx.pinErrorCount === 1 ? 6 : 0,
    biometric: tx.biometricAnomalyScore >= 0.7 ? 17 : tx.biometricAnomalyScore >= 0.4 ? 8 : 0,
    device: tx.isNewDevice ? 7 : 0,
  };
  const riskScore = Math.min(99, Object.values(scores).reduce((sum, value) => sum + value, 0));
  const status = riskScore >= 65 ? "BLOCKED" : riskScore >= 35 ? "REVIEW" : "ALLOW";
  const signals: Signal[] = [
    { key: "amount", label: "거래 금액", score: scores.amount, level: level(scores.amount), observed: `${tx.amount.toLocaleString("ko-KR")}원`, baseline: `상위 5% ${BASELINE.p95Amount.toLocaleString("ko-KR")}원`, detail: scores.amount ? `평소 고액 이체 기준의 ${ratio.toFixed(1)}배입니다.` : "평소 고액 이체 범위 안입니다." },
    { key: "recipient", label: "거래 대상", score: scores.recipient, level: level(scores.recipient), observed: tx.isNewTargetAccount ? "신규 개인 수취계좌" : "기등록 수취계좌", baseline: "최근 10년 거래 이력 없음", detail: tx.isNewTargetAccount ? "평소 거래 계좌가 아니며, 최근 10년간 송금 이력이 없는 신규 개인 계좌입니다." : "거래 이력이 확인된 계좌입니다." },
    { key: "time", label: "사용 시간", score: scores.time, level: level(scores.time), observed: tx.requestTime, baseline: `평소 ${BASELINE.usualHours}`, detail: scores.time ? "평소 모바일뱅킹 활동 시간 밖의 요청입니다." : "평소 이용 시간대입니다." },
    { key: "pin", label: "로그인·인증 행동", score: scores.pin, level: level(scores.pin), observed: `비밀번호 오입력 ${tx.pinErrorCount}회`, baseline: `평균 ${BASELINE.typicalPinErrors}회`, detail: scores.pin ? "송금 직전 인증 실패가 반복되었습니다." : "인증 실패 패턴이 없습니다." },
    { key: "biometric", label: "사용자 행동 패턴", score: scores.biometric, level: level(scores.biometric), observed: `터치 패턴 이탈 ${Math.round(tx.biometricAnomalyScore * 100)}%`, baseline: `평균 이탈 ${Math.round(BASELINE.typicalBiometricDeviation * 100)}%`, detail: scores.biometric ? "평소 터치 속도·압력·입력 리듬과 차이가 큽니다." : "등록된 행동 패턴 범위입니다." },
    { key: "device", label: "접속 환경", score: scores.device, level: level(scores.device), observed: tx.isNewDevice ? "신규 기기" : "등록 기기", baseline: "최근 사용 기기", detail: tx.isNewDevice ? "이 기기에서의 최근 거래 이력이 없습니다." : "기기 신뢰 이력이 있습니다." },
  ];
  return NextResponse.json({
    status, risk_score: riskScore, transaction: tx, baseline: BASELINE, signals,
    approval: { status: "PENDING", guardian: "김하나", requestedAt: "방금 전", resendCount: 0 },
    summary_reasons: signals.filter((signal) => signal.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((signal) => signal.detail),
    decision: status === "BLOCKED" ? "보이스피싱 명의 도용 또는 타인의 강요에 의한 부당 인출 가능성이 매우 높습니다. 거래를 일시 정지하고 보호자 확인을 요청했습니다." : status === "REVIEW" ? "추가 인증 또는 보호자 확인이 필요합니다." : "현재 거래는 승인 가능한 범위입니다.",
  });
}
