"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  fallbackDecision,
  scoreTransaction,
  topReasons,
  type FraudSignal,
  type FraudStatus,
  type FraudTransaction,
} from "../lib/fraud/score";
import type { FraudPolicy } from "../lib/fraud/policy";

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
  BLOCKED: { label: "이체를 잠시 멈췄어요", className: "blocked" },
  REVIEW: { label: "확인이 더 필요해요", className: "review" },
  ALLOW: { label: "평소대로 진행해요", className: "allow" },
};

/** 서버 없이도 같은 화면을 그리기 위한 룰 기반 리포트. API 가 실패하면 이걸로 대체한다. */
export function ruleReport(tx: FraudTransaction, guardian = "김하나", policy?: FraudPolicy): FraudReportUI {
  const score = scoreTransaction(tx, policy);
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

/** 인라인 분석 상단의 거래 한 줄 라벨. 모달의 STATUS 와 달리 거래 자체를 가리킨다. */
const TRANSACTION_LABEL: Record<FraudStatus, { label: string; className: string }> = {
  BLOCKED: { label: "막은 거래", className: "blocked" },
  REVIEW: { label: "확인이 더 필요한 거래", className: "review" },
  ALLOW: { label: "평소대로 진행한 거래", className: "allowed" },
};

/**
 * 모달을 열지 않고 페이지 안에 바로 펼치는 판단 근거 (2026-09-07, origin/fsd 11378df 이지수).
 * 금융 보호 화면은 "오늘의 거래" 카드 아래에 거래마다 이 블록을 나열한다.
 * 기본은 주요 근거 3개만 보이고, 토글로 나머지를 연다 — 판단 이유를 찾으러 클릭할 필요가 없어야 한다.
 * REVIEW(추가 확인)는 그녀의 원본에 없던 상태라 라벨과 색을 따로 둔다.
 * 2026-09-07 문구: 해요체, 영어 소제목 제거 (docs/writing-style.md). 구조는 그대로.
 */
export function FraudAnalysisDetails({
  report,
  expanded = false,
  onToggle,
}: {
  report: FraudReportUI;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const signals = expanded ? report.signals : report.signals.slice(0, 3);
  const label = TRANSACTION_LABEL[report.status];
  const rest = report.signals.length - 3;
  return (
    <section className="inline-fraud-analysis" aria-label="판단 근거">
      <div className={`inline-fraud-analysis-transaction ${label.className}`}>
        <span>{label.label}</span>
        <b>{report.transaction.requestTime} · {report.transaction.targetAccount} · {report.transaction.amount.toLocaleString("ko-KR")}원</b>
      </div>
      <p className="inline-fraud-analysis-decision">{report.decision}</p>
      <p className="inline-fraud-analysis-count">{expanded ? `근거 ${report.signals.length}개 전부` : "주요 근거 3개"}</p>
      <div className="fds-signals">
        {signals.map((signal) => (
          <article className={`fds-signal ${signal.level}`} key={signal.key}>
            <div className="fds-signal-top"><h4>{signal.label}</h4><span>{signal.score ? `+${signal.score}` : "평소대로"}</span></div>
            <p>{signal.detail}</p>
            <dl>
              <div><dt>이번 거래</dt><dd>{signal.observed}</dd></div>
              <div><dt>평소 기준</dt><dd>{signal.baseline}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      {rest > 0 && onToggle && (
        <button className="inline-fraud-analysis-toggle" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? "주요 근거만 보기" : `나머지 근거 ${rest}개 보기`} <span aria-hidden>{expanded ? "↑" : "↓"}</span>
        </button>
      )}
    </section>
  );
}

/**
 * 모달은 body 에 포털로 띄운다.
 * 인터뷰 패널처럼 transform 애니메이션이 끝난 채 남아 있는 조상 아래에서는
 * position: fixed 가 그 조상에 갇혀 화면 뒤로 깔린다.
 */
export default function FraudShieldModal({ report, onClose }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!report || !mounted) return null;
  if (report.error) {
    return createPortal(
      <div className="backdrop" role="dialog" aria-modal="true">
        <section className="fds-modal fds-error">
          <p className="eyebrow">금융 보호</p>
          <h2>분석을 마치지 못했어요.</h2>
          <p>{report.error}</p>
          <button className="btn" onClick={onClose}>닫기</button>
        </section>
      </div>,
      document.body,
    );
  }
  const status = STATUS[report.status];
  const guardian = report.approval?.guardian ?? "김하나";
  const pending = report.status !== "ALLOW";
  const aiNarrated = report.narrator && report.narrator !== "rule";

  return createPortal(
    <div className="backdrop" role="dialog" aria-modal="true" aria-label="평소와 다른 거래 분석 결과">
      <section className="fds-modal">
        <header className="fds-head">
          <div>
            <p className="eyebrow">금융 보호 · 거래 상황 분석{aiNarrated ? " · AI 해설" : ""}</p>
            <h2>금액 한도만이 아니라 거래 상황을 함께 봤어요.</h2>
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
          <div><span>보내려는 금액</span><b>{report.transaction.amount.toLocaleString("ko-KR")}원</b></div>
          <div><span>받는 계좌</span><b>{report.transaction.targetAccount}</b></div>
          <div><span>요청 시각</span><b>{report.transaction.requestTime}</b></div>
          <div><span>거래 번호</span><b>{report.transaction.transactionId}</b></div>
        </section>

        {pending && (
          <section className="fds-approval" aria-live="polite">
            <div>
              <span className="fds-pending-dot" />
              <div>
                <p>보호자 확인을 기다리는 중</p>
                <b>{guardian}님에게 확인 요청을 보냈어요.</b>
                <small>
                  {report.guardian_message
                    ? `보낸 내용: ${report.guardian_message}`
                    : resendCount
                      ? `요청을 ${resendCount}번 다시 보냈어요.`
                      : "보호자가 확인할 때까지 이체와 출금을 멈춰요."}
                </small>
              </div>
            </div>
            <div className="fds-approval-actions">
              <button className="btn outline sm" onClick={() => setResendCount((c) => c + 1)}>
                보호자에게 다시 요청하기{resendCount ? ` (${resendCount})` : ""}
              </button>
              <button className="btn sm" onClick={() => setChecked(true)}>거래 상태 확인</button>
            </div>
            {checked && <p className="fds-check-result">지금 상태: 거래를 계속 멈춰 두고 있어요 · 보호자 확인을 기다리는 중</p>}
          </section>
        )}

        <section className="fds-analysis">
          <button className="fds-detail-toggle" onClick={() => setShowDetails((v) => !v)} aria-expanded={showDetails}>
            <span><p className="eyebrow">왜 이렇게 판단했나</p><h3>판단 근거</h3></span>
            <b>{showDetails ? "접기 −" : "펼치기 +"}</b>
          </button>
          {showDetails && (
            <div className="fds-signals">
              {report.signals.map((signal) => (
                <article className={`fds-signal ${signal.level}`} key={signal.key}>
                  <div className="fds-signal-top"><h4>{signal.label}</h4><span>{signal.score ? `+${signal.score}` : "평소대로"}</span></div>
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
            <b>앱이 한 일</b> · {pending ? "거래를 잠시 멈추고 보호자에게 알렸어요. 보호자가 허용하면 이체를 다시 진행해요" : "평소대로 처리하고, 평소 기준에 반영했어요"}
          </p>
          <button className="btn" onClick={onClose}>확인했어요</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
