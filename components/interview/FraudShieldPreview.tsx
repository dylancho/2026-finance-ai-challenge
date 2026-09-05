"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FraudShieldModal, { ruleReport, type FraudReportUI } from "../FraudShieldModal";
import { policyFromProfile, RULE_LABEL, type FraudPolicy } from "../../lib/fraud/policy";
import { saveRule } from "../../lib/fraud/rule";
import type { FraudTransaction } from "../../lib/fraud/score";
import { won } from "../../lib/format";
import type { Profile } from "../../lib/types";

/**
 * 금융 보호 챕터를 마친 직후의 미리보기.
 *
 * 방금 선언한 원칙(S01~S04)이 실제 위험 거래에서 어떻게 작동하는지 바로 보여준다.
 * 판정은 /api/fds 가 같은 policy 로 내리고, 서술은 Claude 가 쓴다. 서버가 없으면 룰 문장으로 완주.
 */

/** 보이스피싱 정황 거래. /fraud-shield 의 첫 시나리오와 같다. */
const PREVIEW_TX: FraudTransaction = {
  transactionId: "TX_99218", amount: 8_000_000, targetAccount: "356-0012-9981",
  isNewTargetAccount: true, requestTime: "02:15 AM", pinErrorCount: 2,
  biometricAnomalyScore: 0.89, isNewDevice: true,
};

interface Props {
  profile: Profile;
  name: string;
  guardian?: string;
}

export default function FraudShieldPreview({ profile, name, guardian: guardianName }: Props) {
  const [preview, setPreview] = useState<FraudReportUI | null>(null);
  const [loading, setLoading] = useState(false);
  const policy: FraudPolicy | null = policyFromProfile(profile);

  // /monthly-review 가 같은 원칙을 보게 한다.
  useEffect(() => {
    if (policy) saveRule(policy.rule);
  }, [policy?.rule]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!policy) return null;
  const guardian = guardianName ?? `${name}님의 보호자`;

  async function openPreview() {
    if (!policy) return;
    setLoading(true);
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
          policy,
        }),
      });
      if (!res.ok) throw new Error(`fds ${res.status}`);
      const report = (await res.json()) as FraudReportUI;
      if (report.approval) report.approval = { ...report.approval, guardian };
      setPreview(report);
    } catch {
      setPreview(ruleReport(PREVIEW_TX, guardian, policy));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fds-step fade-in">
      <div className="monthly-updated">
        <div>
          <span>금융 보호 원칙이 기록되었습니다</span>
          <b>
            처음 보는 계좌로 {won(policy.newAccountThreshold)} 이상 · {RULE_LABEL[policy.rule]}
          </b>
          <p>
            지출설계서 제4조에 맥락 룰로 들어갑니다. 이 원칙이 실제 위험 거래에서 어떻게 작동하는지
            바로 볼 수 있습니다.
          </p>
        </div>
        <i>✓</i>
      </div>
      <div className="gate-nav">
        <Link href="/fraud-shield" className="btn outline">
          보호 현황 전체 보기
        </Link>
        <button type="button" className="btn" disabled={loading} onClick={openPreview}>
          {loading ? "분석 중…" : "위험 거래 판정 미리보기"}
        </button>
      </div>
      <FraudShieldModal report={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
