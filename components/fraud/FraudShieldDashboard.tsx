"use client";

import { useEffect, useState } from "react";
import FraudShieldModal, { mockFraudReport, type FraudReportUI } from "../FraudShieldModal";

const PEOPLE = ["서연", "민준", "지우", "도윤", "하은", "준서"];

function allowedReport(): FraudReportUI {
  return {
    status: "ALLOW", risk_score: 8, decision: "평소 수취계좌·이용 시간·인증 행동 범위 안의 거래입니다. 안전하게 처리할 수 있습니다.",
    transaction: { transactionId: "TX_99219", amount: 180_000, targetAccount: "110-123-456789", requestTime: "11:42 AM" },
    signals: [
      { key: "amount", label: "거래 금액", level: "normal", score: 0, observed: "180,000원", baseline: "상위 5% 470,000원", detail: "평소 고액 이체 범위 안입니다." },
      { key: "recipient", label: "거래 대상", level: "normal", score: 0, observed: "기등록 수취계좌", baseline: "최근 10년 거래 이력 있음", detail: "반복 거래 이력이 확인된 계좌입니다." },
      { key: "time", label: "사용 시간", level: "normal", score: 0, observed: "11:42 AM", baseline: "평소 09:00–20:00", detail: "평소 이용 시간대입니다." },
      { key: "pin", label: "로그인·인증 행동", level: "normal", score: 0, observed: "비밀번호 오류 없음", baseline: "평균 0회", detail: "인증 실패 패턴이 없습니다." },
      { key: "biometric", label: "사용자 행동 패턴", level: "normal", score: 8, observed: "터치 패턴 이탈 14%", baseline: "평균 이탈 12%", detail: "등록된 행동 패턴 범위입니다." },
      { key: "device", label: "접속 환경", level: "normal", score: 0, observed: "등록 기기", baseline: "최근 사용 기기", detail: "기기 신뢰 이력이 있습니다." },
    ],
  };
}

export default function FraudShieldDashboard() {
  // 첫 HTML부터 소개 화면을 그린 뒤, 마운트 후 이번 방문의 페르소나로 갱신한다.
  // 네트워크나 자바스크립트 초기화가 늦어도 빈 화면이 되지 않는다.
  const [name, setName] = useState(PEOPLE[0]);
  const [entered, setEntered] = useState(false);
  const [index, setIndex] = useState(0);
  const [detail, setDetail] = useState<FraudReportUI | null>(null);
  useEffect(() => setName(PEOPLE[Math.floor(Math.random() * PEOPLE.length)]), []);
  if (!entered) return <div className="fraud-entry shell-wide">
    <section className="fraud-entry-hero">
      <p className="eyebrow">NEXT SAFE · 개인화 이상거래 보호</p>
      <span className="fraud-entry-orb" aria-hidden>NS</span>
      <h1>{name}님의 일상을 먼저 배우고,<br />위험한 거래만 멈춥니다.</h1>
      <p>서비스 가입 시점부터 AI는 자주 거래하는 계좌, 평소 이용 시간, 인증과 입력 행동을 기준으로 개인의 금융 습관을 학습합니다. 한도 하나로 거절하지 않고, 평소와 다른 신호가 함께 나타날 때만 보호를 시작합니다.</p>
      <button className="btn" onClick={() => setEntered(true)}>내 금융 보호 시작하기</button>
      <small>보호가 활성화되면 의심 거래는 일시 정지되고, 보호자 확인 후에만 재개됩니다.</small>
    </section>
    <section className="fraud-entry-steps"><div><span>01</span><b>일상 학습</b><p>거래 대상과 이용 습관을 기준선으로 만듭니다.</p></div><div><span>02</span><b>맥락 분석</b><p>금액·시간·인증·행동 신호를 함께 판단합니다.</p></div><div><span>03</span><b>필요할 때 보호</b><p>위험하면 멈추고 보호자에게 확인을 요청합니다.</p></div></section>
  </div>;

  const blocked = mockFraudReport();
  blocked.approval = { status: "PENDING", guardian: `${name}님의 보호자`, requestedAt: "방금 전", resendCount: 0 };
  const records = [blocked, allowedReport()];
  const record = records[index];
  const isBlocked = record.status === "BLOCKED";

  return <div className="fraud-page shell-wide">
    <section className="fraud-intro">
      <div><p className="eyebrow">NEXT SAFE · 개인화 이상거래 보호</p><h1>{name}님의 금융 습관을 배워,<br />위험한 순간에만 멈춥니다.</h1><p>서비스 가입 시점부터 거래 대상, 이용 시간, 인증 행동, 기기와 입력 패턴을 학습합니다. 평소와 같은 거래는 방해하지 않고, 낯선 맥락이 겹칠 때만 보호를 시작합니다.</p></div>
      <aside><span>보호 상태</span><b>학습 중 · 보호 활성화</b><p>가입 후 47일 · 보호자 1명 연결</p></aside>
    </section>

    <section className="fraud-learning"><div><span>AI가 학습하는 것</span><b>주로 거래하는 계좌</b><b>평소 이용 시간</b><b>인증·입력 행동</b></div><p>개인의 일상 패턴을 기준선으로 만들고, 하나의 신호가 아닌 여러 이탈 신호를 함께 판단합니다.</p></section>

    <section className="fraud-record" aria-label="거래별 보호 판단">
      <div className="fraud-record-head"><div><p className="eyebrow">TODAY&apos;S PROTECTION</p><h2>거래를 한 건씩 확인하세요.</h2></div><span>{index + 1} / {records.length}</span></div>
      <article className={`fraud-record-card ${isBlocked ? "blocked" : "allowed"}`}>
        <div className="fraud-record-status"><span>{isBlocked ? "차단됨" : "정상 처리"}</span><b>위험도 {record.risk_score}%</b></div>
        <h3>{isBlocked ? "평소와 다른 신호가 동시에 감지됐습니다." : "평소 패턴 안의 거래입니다."}</h3>
        <p>{record.transaction.requestTime} · {record.transaction.targetAccount} · {record.transaction.amount.toLocaleString("ko-KR")}원</p>
        <div className="fraud-record-actions"><button className="btn outline" disabled={index === 0} onClick={() => setIndex(0)}>이전 거래</button><button className="btn outline" disabled={index === records.length - 1} onClick={() => setIndex(1)}>다음 거래</button><button className="btn" onClick={() => setDetail(record)}>판단 근거 보기</button></div>
      </article>
    </section>

    <section className="fraud-process"><p className="eyebrow">WHEN RISK IS HIGH</p><h2>위험 신호가 겹치면 이렇게 보호합니다.</h2><ol><li>거래를 감지합니다.</li><li>개인 기준선과 거래 맥락을 분석합니다.</li><li>거래를 일시 정지합니다.</li><li>보호자에게 비상 승인 요청을 보냅니다.</li><li>확인 전까지 출금과 이체를 제한합니다.</li></ol></section>
    <FraudShieldModal report={detail} onClose={() => setDetail(null)} />
  </div>;
}
