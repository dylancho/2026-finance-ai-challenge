"use client";

import { useEffect, useState } from "react";
import FraudShieldModal, { ruleReport, type FraudReportUI } from "../FraudShieldModal";
import { scoreTransaction, type FraudTransaction } from "../../lib/fraud/score";
import { DEFAULT_POLICY, policyFromProfile, type FraudPolicy } from "../../lib/fraud/policy";
import { readProfile } from "../../lib/profile";

const PEOPLE = ["서연", "민준", "지우", "도윤", "하은", "준서"];

/** 오늘의 거래 두 건. 첫 건은 보이스피싱 정황, 둘째 건은 평소 패턴 안의 이체. */
const SCENARIOS: FraudTransaction[] = [
  {
    transactionId: "TX_99218", amount: 8_000_000, targetAccount: "356-0012-9981",
    isNewTargetAccount: true, requestTime: "02:15 AM", pinErrorCount: 2,
    biometricAnomalyScore: 0.89, isNewDevice: true,
  },
  {
    transactionId: "TX_99219", amount: 180_000, targetAccount: "110-123-456789",
    isNewTargetAccount: false, requestTime: "11:42 AM", pinErrorCount: 0,
    biometricAnomalyScore: 0.14, isNewDevice: false,
  },
];

function toBody(tx: FraudTransaction) {
  return {
    transaction_id: tx.transactionId,
    amount: tx.amount,
    target_account: tx.targetAccount,
    is_new_target_account: tx.isNewTargetAccount,
    request_time: tx.requestTime,
    pin_error_count: tx.pinErrorCount,
    biometric_anomaly_score: tx.biometricAnomalyScore,
    is_new_device: tx.isNewDevice,
  };
}

export default function FraudShieldDashboard() {
  // 첫 HTML부터 소개 화면을 그린 뒤, 마운트 후 이번 방문의 페르소나로 갱신한다.
  // 네트워크나 자바스크립트 초기화가 늦어도 빈 화면이 되지 않는다.
  const [name, setName] = useState(PEOPLE[0]);
  const [entered, setEntered] = useState(false);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<FraudReportUI | null>(null);
  const [loading, setLoading] = useState(false);
  /** 인터뷰의 금융 보호 영역에서 선언한 원칙. 없으면 기본값. */
  const [policy, setPolicy] = useState<FraudPolicy>(DEFAULT_POLICY);
  useEffect(() => {
    setName(PEOPLE[Math.floor(Math.random() * PEOPLE.length)]);
    try {
      setPolicy(policyFromProfile(readProfile()) ?? DEFAULT_POLICY);
    } catch {
      /* 프로필이 없으면 기본 원칙 */
    }
  }, []);

  if (!entered) {
    return (
      <div className="fraud-entry shell-wide">
        <section className="fraud-entry-hero">
          <p className="eyebrow">NEXT SAFE · 개인화 이상거래 보호</p>
          <span className="fraud-entry-orb" aria-hidden>NS</span>
          <h1>{name}님의 일상을 먼저 배우고,<br />위험한 거래만 멈춥니다.</h1>
          <p>평소 금융 습관을 학습해, 위험 신호가 겹칠 때만 거래를 멈춥니다.</p>
          <button className="btn" onClick={() => setEntered(true)}>내 금융 보호 시작하기</button>
          <small>의심 거래는 멈추고, 보호자 확인 후 재개됩니다.</small>
        </section>
        <section className="fraud-entry-steps">
          <div><span>01</span><b>일상 학습</b><p>거래 대상과 이용 습관을 기준선으로 만듭니다.</p></div>
          <div><span>02</span><b>맥락 분석</b><p>금액·시간·인증·행동 신호를 함께 판단합니다.</p></div>
          <div><span>03</span><b>필요할 때 보호</b><p>위험하면 멈추고 보호자에게 확인을 요청합니다.</p></div>
        </section>
      </div>
    );
  }

  const guardian = `${name}님의 보호자`;
  const tx = SCENARIOS[index];
  const preview = scoreTransaction(tx, policy);
  const isBlocked = preview.status === "BLOCKED";

  // 룰 점수는 클라이언트에서 바로 나온다. 서버는 같은 점수 위에 Claude 해설을 얹는다.
  // 서버가 죽거나 키가 없어도 룰 문장으로 같은 화면을 완주한다.
  async function openDetail() {
    setLoading(true);
    try {
      const res = await fetch("/api/fds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...toBody(tx), policy }),
      });
      if (!res.ok) throw new Error(`fds ${res.status}`);
      const report = (await res.json()) as FraudReportUI;
      if (report.approval) report.approval = { ...report.approval, guardian };
      setDetail(report);
    } catch {
      setDetail(ruleReport(tx, guardian, policy));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fraud-page shell-wide">
      <section className="fraud-intro">
        <div><p className="eyebrow">NEXT SAFE</p><h1>{name}님의 금융 보호</h1><p>평소와 다른 거래만 분석하고 보호합니다.</p></div>
        <aside><span>보호 상태</span><b>보호 활성화</b><p>보호자 1명 연결</p></aside>
      </section>

      <section className="fraud-learning">
        <div><span>AI 학습 항목</span><b>거래 계좌</b><b>이용 시간</b><b>인증 행동</b></div>
        <a href="/monthly-review">이번 달 보호 룰 설정 →</a>
      </section>

      <section className="fraud-record" aria-label="거래별 보호 판단">
        <div className="fraud-record-head">
          <div><p className="eyebrow">TODAY&apos;S PROTECTION</p><h2>오늘의 거래</h2></div>
          <span>{index + 1} / {SCENARIOS.length}</span>
        </div>
        <article className={`fraud-record-card ${isBlocked ? "blocked" : "allowed"}`}>
          <div className="fraud-record-status">
            <span>{isBlocked ? "차단됨" : "정상 처리"}</span>
            <b>위험도 {preview.risk_score}%</b>
          </div>
          <h3>{isBlocked ? "평소와 다른 신호가 동시에 감지됐습니다." : "평소 패턴 안의 거래입니다."}</h3>
          <p>{tx.requestTime} · {tx.targetAccount} · {tx.amount.toLocaleString("ko-KR")}원</p>
          <div className="fraud-record-actions">
            <button className="btn outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>이전 거래</button>
            <button className="btn outline" disabled={index === SCENARIOS.length - 1} onClick={() => setIndex(index + 1)}>다음 거래</button>
            <button className="btn" disabled={loading} onClick={openDetail}>
              {loading ? "분석 중…" : "판단 근거 보기"}
            </button>
          </div>
        </article>
      </section>

      <section className="fraud-process">
        <p className="eyebrow">WHEN RISK IS HIGH</p>
        <h2>위험 시 자동 보호</h2>
        <ol><li>거래 감지</li><li>맥락 분석</li><li>거래 정지</li><li>보호자 요청</li><li>확인 전 제한</li></ol>
      </section>

      <FraudShieldModal report={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
