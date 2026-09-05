"use client";

import { useState } from "react";
import {
  fallbackDecision,
  scoreTransaction,
  topReasons,
  type FraudSignal,
  type FraudStatus,
  type FraudTransaction,
} from "../lib/fraud/score";

export type FraudSignalUI = FraudSignal;

/** /api/fds 응답과 같은 모양. narrator 가 "rule" 이면 Claude 없이 룰 문장으로 완주한 것. */
export interface FraudReportUI {
  status: FraudStatus;
  risk_score: number;
  decision: string;
  guardian_message?: string;
  summary_reasons?: string[];
  transaction: Pick<FraudTransaction, "transactionId" | "amount" | "targetAccount" | "requestTime">;
  signals: FraudSignalUI[];
  approval?: { status: "PENDING"; guardian: string; requestedAt: string; resendCount: number };
  narrator?: string;
  error?: string;
  details?: string;
}

interface Props { report: FraudReportUI | null; onClose?: () => void }

const STATUS: Record<FraudStatus, { label: string; className: string }> = {
  BLOCKED: { label: "이체 일시 차단", className: "blocked" },
  REVIEW: { label: "추가 확인 필요", className: "review" },
  ALLOW: { label: "거래 승인", className: "allow" },
};

/** 서버 없이도 같은 화면을 그리기 위한 룰 기반 리포트. API 가 실패하면 이걸로 대체한다. */
export function ruleReport(tx: FraudTransaction, guardian = "김하나"): FraudReportUI {
  const score = scoreTransaction(tx);
  return {
    status: score.status,
    risk_score: score.risk_score,
    decision: fallbackDecision(score.status),
    summary_reasons: topReasons(score.signals),
    transaction: score.transaction,
    signals: score.signals,
    approval:
      score.status === "ALLOW"
        ? undefined
        : { status: "PENDING", guardian, requestedAt: "방금 전", resendCount: 0 },
    narrator: "rule",
  };
}

export default function FraudShieldModal({ report, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [checked, setChecked] = useState(false);
  if (!report) return null;
  if (report.error) {
    return (
      <div className="backdrop" role="dialog" aria-modal="true">
        <section className="fds-modal fds-error">
          <p className="eyebrow">SMART FRAUD SHIELD</p>
          <h2>분석을 완료하지 못했습니다.</h2>
          <p>{report.error}</p>
          <button className="btn" onClick={onClose}>닫기</button>
        </section>
      </div>
    );
  }
  const status = STATUS[report.status];
  const guardian = report.approval?.guardian ?? "김하나";
  const pending = report.status !== "ALLOW";
  const aiNarrated = report.narrator && report.narrator !== "rule";

  return (
    <div className="backdrop" role="dialog" aria-modal="true" aria-label="스마트 이상거래 분석 결과">
      <section className="fds-modal">
        <header className="fds-head">
          <div>
            <p className="eyebrow">SMART FRAUD SHIELD · 실시간 맥락 분석{aiNarrated ? " · AI 해설" : ""}</p>
            <h2>단일 한도가 아닌, 거래 맥락을 확인했습니다.</h2>
          </div>
          <button className="fds-close" onClick={onClose} aria-label="닫기">×</button>
        </header>

        <div className={`fds-verdict ${status.className}`}>
          <div>
            <span className="fds-status">{status.label}</span>
            <strong>위험도 {report.risk_score}<small>/ 100</small></strong>
          </div>
          <p>{report.decision}</p>
        </div>

        <section className="fds-transaction" aria-label="거래 정보">
          <div><span>요청 금액</span><b>{report.transaction.amount.toLocaleString("ko-KR")}원</b></div>
          <div><span>수취 계좌</span><b>{report.transaction.targetAccount}</b></div>
          <div><span>요청 시각</span><b>{report.transaction.requestTime}</b></div>
          <div><span>거래 ID</span><b>{report.transaction.transactionId}</b></div>
        </section>

        {pending && (
          <section className="fds-approval" aria-live="polite">
            <div>
              <span className="fds-pending-dot" />
              <div>
                <p>보호자 승인 대기</p>
                <b>{guardian}님에게 비상 승인 요청을 보냈습니다.</b>
                <small>
                  {report.guardian_message
                    ? `보낸 내용: ${report.guardian_message}`
                    : resendCount
                      ? `요청을 ${resendCount}회 다시 보냈습니다.`
                      : "보호자 확인 전까지 이체와 출금은 제한됩니다."}
                </small>
              </div>
            </div>
            <div className="fds-approval-actions">
              <button className="btn outline sm" onClick={() => setResendCount((c) => c + 1)}>
                보호자 승인 요청 다시 보내기{resendCount ? ` (${resendCount})` : ""}
              </button>
              <button className="btn sm" onClick={() => setChecked(true)}>거래 상태 확인</button>
            </div>
            {checked && <p className="fds-check-result">현재 상태: 거래 동결 유지 · 보호자 승인 대기 중</p>}
          </section>
        )}

        <section className="fds-analysis">
          <button className="fds-detail-toggle" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}>
            <span><p className="eyebrow">WHY THIS DECISION</p><h3>위험 분석 상세 정보</h3></span>
            <b>{showDetails ? "접기 −" : "펼치기 +"}</b>
          </button>
          {showDetails && (
            <div className="fds-signals">
              {report.signals.map((signal) => (
                <article className={`fds-signal ${signal.level}`} key={signal.key}>
                  <div className="fds-signal-top"><h4>{signal.label}</h4><span>{signal.score ? `+${signal.score}` : "정상"}</span></div>
                  <p>{signal.detail}</p>
                  <dl>
                    <div><dt>이번 거래</dt><dd>{signal.observed}</dd></div>
                    <div><dt>평소 기준</dt><dd>{signal.baseline}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="fds-footer">
          <p>
            <b>자동 조치</b> · {pending ? "거래 일시 정지 → 보호자 알림 → 보호자가 허용하면 이체 재개" : "정상 처리 · 학습 기준선에 반영"}
          </p>
          <button className="btn" onClick={onClose}>분석 결과 확인</button>
        </footer>
      </section>
    </div>
  );
}
