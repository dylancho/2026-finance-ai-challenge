"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FraudShieldModal, { ruleReport, type FraudReportUI } from "../FraudShieldModal";
import {
  readRule,
  RULE_CHOICES,
  RULE_OPTIONS,
  RULE_SCENARIO,
  saveRule,
  type RuleChoice,
  type RuleReview,
} from "../../lib/fraud/rule";
import type { FraudTransaction } from "../../lib/fraud/score";

/**
 * 인터뷰의 마지막 단계: 금융 보호 룰.
 *
 * 설계서 질문이 모두 끝난 자리에서, 평소와 다른 거래가 들어왔을 때 NEXT가 따를 원칙을
 * 하나 정한다. 답은 /monthly-review 와 같은 저장소에 들어가고, 매월 다시 묻는다.
 * 정한 뒤에는 그 원칙이 실제 판정에서 어떻게 보이는지 바로 미리 볼 수 있다.
 */

/** 미리보기에 쓰는 보이스피싱 정황 거래. /fraud-shield 의 첫 시나리오와 같다. */
const PREVIEW_TX: FraudTransaction = {
  transactionId: "TX_99218", amount: 8_000_000, targetAccount: "356-0012-9981",
  isNewTargetAccount: true, requestTime: "02:15 AM", pinErrorCount: 2,
  biometricAnomalyScore: 0.89, isNewDevice: true,
};

interface Props {
  name: string;
  /** 인터뷰에서 지정한 보호자 이름. 없으면 "{name}님의 보호자" 로 부른다. */
  guardian?: string;
  onDecided?: (choice: RuleChoice) => void;
}

export default function FraudShieldStep({ name, guardian: guardianName, onDecided }: Props) {
  const [review, setReview] = useState<RuleReview | null>(null);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<RuleChoice | null>(null);
  const [preview, setPreview] = useState<FraudReportUI | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReview(readRule());
    setReady(true);
  }, []);

  function decide() {
    if (!picked) return;
    setReview(saveRule(picked));
    onDecided?.(picked);
  }

  async function openPreview() {
    setLoading(true);
    const guardian = guardianName ?? `${name}님의 보호자`;
    try {
      const res = await fetch("/api/fds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transaction_id: PREVIEW_TX.transactionId,
          amount: PREVIEW_TX.amount,
          target_account: PREVIEW_TX.targetAccount,
          is_new_target_account: PREVIEW_TX.isNewTargetAccount,
          request_time: PREVIEW_TX.requestTime,
          pin_error_count: PREVIEW_TX.pinErrorCount,
          biometric_anomaly_score: PREVIEW_TX.biometricAnomalyScore,
          is_new_device: PREVIEW_TX.isNewDevice,
        }),
      });
      if (!res.ok) throw new Error(`fds ${res.status}`);
      const report = (await res.json()) as FraudReportUI;
      if (report.approval) report.approval = { ...report.approval, guardian };
      setPreview(report);
    } catch {
      setPreview(ruleReport(PREVIEW_TX, guardian));
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="chapter-propose fade-in fds-step">
      <div className="eyebrow">마지막 단계 · 금융 보호</div>
      <h2>평소와 다른 거래가 들어오면 어떻게 할까요?</h2>
      <p className="section-lede">
        설계서와 별개로, NEXT는 {name}님의 평소 거래 습관을 학습해 두었다가 위험 신호가 겹칠 때만
        거래를 멈춥니다. 그때 따를 원칙을 하나 정해 두세요. 매월 한 번 다시 여쭤봅니다.
      </p>

      {!review ? (
        <>
          <article className="monthly-scenario">
            <span>AI가 구성한 상황</span>
            <h3>{RULE_SCENARIO.title}</h3>
            <p>{RULE_SCENARIO.body(name)}</p>
          </article>

          <div className="gate-cards stacked">
            {RULE_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                className="gate-card gate-card-side"
                aria-pressed={picked === choice}
                onClick={() => setPicked(choice)}
              >
                <span className="gate-card-text">
                  <span className="t">{RULE_OPTIONS[choice].title}</span>
                  <span className="d">{RULE_OPTIONS[choice].description}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="gate-nav">
            <Link href="/plan" className="btn ghost">
              나중에 정하기
            </Link>
            <button type="button" className="btn" disabled={!picked} onClick={decide}>
              {picked ? "이 원칙으로 정하기" : "원칙을 골라 주세요"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="monthly-updated">
            <div>
              <span>보호 룰이 정해졌습니다</span>
              <b>{RULE_OPTIONS[review.choice].rule}</b>
              <p>이 룰은 이상거래 분석과 보호자 승인 흐름에 반영됩니다. 다음 점검은 다음 달에 준비됩니다.</p>
            </div>
            <i>✓</i>
          </div>
          <div className="gate-nav">
            <button type="button" className="btn ghost" onClick={() => setReview(null)}>
              다시 고르기
            </button>
            <Link href="/fraud-shield" className="btn outline">
              보호 현황 전체 보기
            </Link>
            <button type="button" className="btn" disabled={loading} onClick={openPreview}>
              {loading ? "분석 중…" : "위험 거래 판정 미리보기"}
            </button>
          </div>
        </>
      )}

      <FraudShieldModal report={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
