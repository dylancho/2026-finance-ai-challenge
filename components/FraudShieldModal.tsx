"use client";

import { useState } from "react";

export interface FraudSignalUI { key: string; label: string; level: "critical" | "warning" | "normal"; score: number; observed: string; baseline: string; detail: string }
export interface FraudReportUI {
  status: "BLOCKED" | "REVIEW" | "ALLOW"; risk_score: number; decision: string;
  transaction: { transactionId: string; amount: number; targetAccount: string; requestTime: string };
  signals: FraudSignalUI[]; approval?: { status: "PENDING"; guardian: string; requestedAt: string; resendCount: number }; error?: string; details?: string;
}
interface Props { report: FraudReportUI | null; onClose?: () => void }
const STATUS = { BLOCKED: { label: "이체 일시 차단", className: "blocked" }, REVIEW: { label: "추가 확인 필요", className: "review" }, ALLOW: { label: "거래 승인", className: "allow" } } as const;

/** API 연결 전에도 동일한 사용자 흐름을 시연하기 위한 클라이언트 목업. */
export function mockFraudReport(): FraudReportUI {
  return {
    status: "BLOCKED", risk_score: 99,
    decision: "보이스피싱 명의 도용 또는 타인의 강요에 의한 부당 인출 가능성이 매우 높습니다. 거래를 일시 정지하고 보호자 확인을 요청했습니다.",
    transaction: { transactionId: "TX_99218", amount: 8_000_000, targetAccount: "356-0012-9981", requestTime: "02:15 AM" },
    approval: { status: "PENDING", guardian: "김하나", requestedAt: "방금 전", resendCount: 0 },
    signals: [
      { key: "amount", label: "거래 금액", level: "critical", score: 30, observed: "8,000,000원", baseline: "상위 5% 470,000원", detail: "평소 고액 이체 기준의 17.0배입니다." },
      { key: "recipient", label: "거래 대상", level: "critical", score: 19, observed: "신규 개인 수취계좌", baseline: "최근 10년 거래 이력 없음", detail: "평소 거래 계좌가 아니며, 최근 10년간 송금 이력이 없는 신규 개인 계좌입니다." },
      { key: "time", label: "사용 시간", level: "warning", score: 14, observed: "02:15 AM", baseline: "평소 09:00–20:00", detail: "평소 모바일뱅킹 활동 시간 밖의 요청입니다." },
      { key: "pin", label: "로그인·인증 행동", level: "warning", score: 13, observed: "비밀번호 오입력 2회", baseline: "평균 0회", detail: "송금 직전 인증 실패가 반복되었습니다." },
      { key: "biometric", label: "사용자 행동 패턴", level: "warning", score: 17, observed: "터치 패턴 이탈 89%", baseline: "평균 이탈 12%", detail: "평소 터치 속도·압력·입력 리듬과 차이가 큽니다." },
      { key: "device", label: "접속 환경", level: "normal", score: 7, observed: "신규 기기", baseline: "최근 사용 기기", detail: "이 기기에서의 최근 거래 이력이 없습니다." },
    ],
  };
}

export default function FraudShieldModal({ report, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [checked, setChecked] = useState(false);
  if (!report) return null;
  if (report.error) return <div className="backdrop" role="dialog" aria-modal="true"><section className="fds-modal fds-error"><p className="eyebrow">SMART FRAUD SHIELD</p><h2>분석을 완료하지 못했습니다.</h2><p>{report.error}</p><button className="btn" onClick={onClose}>닫기</button></section></div>;
  const status = STATUS[report.status];
  const guardian = report.approval?.guardian ?? "김하나";
  return <div className="backdrop" role="dialog" aria-modal="true" aria-label="스마트 이상거래 분석 결과">
    <section className="fds-modal">
      <header className="fds-head"><div><p className="eyebrow">SMART FRAUD SHIELD · 실시간 맥락 분석</p><h2>단일 한도가 아닌, 거래 맥락을 확인했습니다.</h2></div><button className="fds-close" onClick={onClose} aria-label="닫기">×</button></header>
      <div className={`fds-verdict ${status.className}`}><div><span className="fds-status">{status.label}</span><strong>위험도 {report.risk_score}<small>/ 100</small></strong></div><p>{report.decision}</p></div>
      <section className="fds-transaction" aria-label="거래 정보"><div><span>요청 금액</span><b>{report.transaction.amount.toLocaleString("ko-KR")}원</b></div><div><span>수취 계좌</span><b>{report.transaction.targetAccount}</b></div><div><span>요청 시각</span><b>{report.transaction.requestTime}</b></div><div><span>거래 ID</span><b>{report.transaction.transactionId}</b></div></section>
      <section className="fds-approval" aria-live="polite"><div><span className="fds-pending-dot" /><div><p>보호자 승인 대기</p><b>{guardian}님에게 비상 승인 요청을 보냈습니다.</b><small>{resendCount ? `요청을 ${resendCount}회 다시 보냈습니다.` : "보호자 확인 전까지 이체와 출금은 제한됩니다."}</small></div></div><div className="fds-approval-actions"><button className="btn outline sm" onClick={() => setResendCount((count) => count + 1)}>보호자 승인 요청 다시 보내기</button><button className="btn sm" onClick={() => setChecked(true)}>거래 상태 확인</button></div>{checked && <p className="fds-check-result">현재 상태: 거래 동결 유지 · 보호자 승인 대기 중</p>}</section>
      <section className="fds-analysis"><button className="fds-detail-toggle" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails}><span><p className="eyebrow">WHY THIS DECISION</p><h3>위험 분석 상세 정보</h3></span><b>{showDetails ? "접기 −" : "펼치기 +"}</b></button>{showDetails && <div className="fds-signals">{report.signals.map((signal) => <article className={`fds-signal ${signal.level}`} key={signal.key}><div className="fds-signal-top"><h4>{signal.label}</h4><span>{signal.score ? `+${signal.score}` : "정상"}</span></div><p>{signal.detail}</p><dl><div><dt>이번 거래</dt><dd>{signal.observed}</dd></div><div><dt>평소 기준</dt><dd>{signal.baseline}</dd></div></dl></article>)}</div>}</section>
      <footer className="fds-footer"><p><b>자동 조치</b> · 거래 일시 정지 → 보호자 알림 → 보호자가 허용하면 이체 재개</p><button className="btn" onClick={onClose}>분석 결과 확인</button></footer>
    </section>
  </div>;
}
