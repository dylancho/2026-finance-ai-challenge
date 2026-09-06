"use client";

import { useEffect, useState } from "react";
import { FraudAnalysisDetails, mockFraudReport, type FraudReportUI } from "../FraudShieldModal";

const PEOPLE = ["민준", "서연", "지훈", "수빈", "현우", "지민"];

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

function TodayTransactions({ records, expandedReports, onToggle }: { records: FraudReportUI[]; expandedReports: Record<string, boolean>; onToggle: (id: string) => void }) {
  return <section className="fraud-record" aria-label="거래별 보호 판단">
    <div className="fraud-record-head"><div><p className="eyebrow">TODAY&apos;S PROTECTION</p><h2>오늘의 거래</h2></div><span>2건 분석 완료</span></div>
    <div className="fraud-record-grid">{records.map((record) => { const isBlocked = record.status === "BLOCKED"; return <article className={`fraud-record-card ${isBlocked ? "blocked" : "allowed"}`} key={record.transaction.transactionId}><div className="fraud-record-status"><span>{isBlocked ? "차단됨" : "정상 인정"}</span><b>위험도 {record.risk_score}%</b></div><h3>{isBlocked ? "평소와 다른 신호가 동시에 감지됐습니다." : "평소 패턴 안의 거래입니다."}</h3><p>{record.transaction.requestTime} · {record.transaction.targetAccount} · {record.transaction.amount.toLocaleString("ko-KR")}원</p></article>; })}</div>
    <section className="fraud-analysis-list" aria-labelledby="fraud-analysis-title"><div className="fraud-analysis-list-head"><div><p className="eyebrow">WHY THIS DECISION</p><h3 id="fraud-analysis-title">위험 분석 상세 정보</h3></div><p>각 거래를 평소 금융 패턴과 비교한 결과입니다.</p></div>{records.map((record) => { const id = record.transaction.transactionId; return <FraudAnalysisDetails report={record} expanded={expandedReports[id]} onToggle={() => onToggle(id)} key={`analysis-${id}`} />; })}</section>
  </section>;
}

export default function FraudShieldDashboard() {
  const [nameIndex, setNameIndex] = useState(0);
  const name = PEOPLE[nameIndex];
  const [careStatusUpdated, setCareStatusUpdated] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  useEffect(() => {
    const interval = window.setInterval(() => setNameIndex((index) => (index + 1) % PEOPLE.length), 4000);
    return () => window.clearInterval(interval);
  }, []);

  const blocked = mockFraudReport();
  blocked.approval = { status: "PENDING", guardian: "김하나 (자녀)", requestedAt: "방금 전", resendCount: 0 };
  const records = [blocked, allowedReport()];

  return <div className="fraud-page shell-wide">
    <section className="fraud-intro">
      <div><p className="eyebrow">NEXT SAFE · FINANCIAL PROTECTION</p><h1>{name}님의 금융 보호</h1><p>{careStatusUpdated ? "치매·장기요양 상태 업데이트가 확인되어 보호 서비스가 작동 중입니다." : "현재 보호 상태와 서비스가 작동하는 조건을 단계별로 안내합니다."}</p></div>
      <aside><span>현재 보호 상태</span><b>{careStatusUpdated ? "레벨 2 · 보호 활성화" : "레벨 1 · 보호 준비"}</b><p>{careStatusUpdated ? "자녀 · 김하나님과 공동 승인 연결" : "등급 업데이트를 기다리는 중"}</p></aside>
    </section>

    <section className="protection-guide" aria-labelledby="protection-guide-title">
      <div className="protection-guide-head"><div><p className="eyebrow">HOW IT WORKS</p><h2 id="protection-guide-title">한 페이지에서 보호를 시작하세요</h2></div><p>현재 상태를 확인하고, 필요한 경우 돌봄 상태를 업데이트하면 같은 화면에서 레벨 2 보호 서비스가 시작됩니다.</p></div>
      <div className="protection-progress" aria-label={`보호 단계 ${guideStep + 1} / 3`}><span className={guideStep >= 0 ? "done" : ""}>01</span><i>→</i><span className={guideStep >= 1 ? "done" : ""}>02</span><i>→</i><span className={guideStep >= 2 ? "done" : ""}>03</span></div>
      {guideStep === 0 && <article className="protection-stage" key="level-one"><span>01 · LEVEL 1 · 보호 준비</span><h3>내 금융 원칙을 미리 학습하는 단계</h3><p>거래 계좌, 이용 시간, 자산 운용 원칙과 보호자 정보를 정리합니다. 이 단계에서는 AI가 제안을 준비하지만 거래를 제한하거나 포트폴리오를 변경하지 않습니다.</p><button className="btn" onClick={() => setGuideStep(1)}>다음 단계로 <i aria-hidden>↓</i></button></article>}
      {guideStep === 1 && <article className="protection-stage protection-document-stage" key="care-update"><span>02 · 상태 업데이트</span><h3>치매·장기요양 등급 문서를 업데이트하세요</h3><p>업데이트된 돌봄 상태를 기준으로 보호자 공동 승인 모드가 시작됩니다. 이 단계부터 위험 상황에 맞는 승인 절차를 준비합니다.</p><div className="care-document-update"><div><label htmlFor="care-status">확인된 상태</label><select id="care-status" defaultValue=""><option value="" disabled>상태를 선택하세요</option><option>치매·인지장애 진단 확인</option><option>장기요양 인정등급 확인</option><option>치매 진단 및 장기요양 등급 확인</option></select></div><div><label htmlFor="care-document">증빙 문서</label><label className="care-document-upload" htmlFor="care-document"><span>파일 선택</span><small>진단서 또는 장기요양 인정서</small><input id="care-document" type="file" accept=".pdf,image/*" /></label></div></div><p className="care-document-note">업로드한 문서는 이 데모에서 실제로 저장·전송되지 않으며, 보호 서비스 전환 흐름을 확인하기 위한 입력입니다.</p><button className="btn" onClick={() => { setCareStatusUpdated(true); setGuideStep(2); }}>문서 업데이트 완료 · 보호 시작 <i aria-hidden>↓</i></button></article>}
      {guideStep === 2 && <article className={`protection-stage ${careStatusUpdated ? "active" : ""}`} key="level-two"><span>03 · LEVEL 2 · 보호자 공동 승인</span><h3>{careStatusUpdated ? "보호 서비스가 작동 중입니다" : "문서 업데이트 후 보호 서비스가 시작됩니다"}</h3><p>{careStatusUpdated ? "AI가 이상거래와 포트폴리오 위험 신호를 감지하고, 본인·보호자·전문가에게 상황에 맞는 최종 승인을 요청합니다." : "레벨 2에서 제공하는 공동 승인 리포트와 이상거래 보호를 확인할 수 있습니다. 먼저 2단계에서 치매·장기요양 등급 문서를 업데이트해 주세요."}</p>{careStatusUpdated && <div className="level-two-scope"><article><span>일상 대리</span><b>정기 지출은 원칙대로 관리</b><p>예외 거래만 보호자와 공동 승인합니다.</p></article><article><span>포트폴리오 구성</span><b>AI가 초안을 제안</b><p>매수·매도는 보호자가 승인한 뒤 진행합니다.</p></article><article><span>상속 연계</span><b>자산 이전 원칙을 기록</b><p>실제 이전은 전문가 확인과 승인을 거칩니다.</p></article></div>}<div className="protection-stage-actions"><button className="btn outline" onClick={() => setGuideStep(1)}>← 문서 업데이트 단계</button>{careStatusUpdated && <b className="protection-stage-next">바로 아래에서 오늘의 거래를 확인하세요</b>}</div></article>}
    </section>

    {careStatusUpdated && <>
    <TodayTransactions records={records} expandedReports={expandedReports} onToggle={(id) => setExpandedReports((current) => ({ ...current, [id]: !current[id] }))} />
    <section className="fraud-learning" id="level-two-content"><div><span>AI 학습 항목</span><b>거래 계좌</b><b>이용 시간</b><b>인증 행동</b><b>포트폴리오 원칙</b><b>돌봄 상태</b></div></section>

    <section className="portfolio-report" aria-labelledby="portfolio-report-title">
      <div className="portfolio-report-head">
        <div><p className="eyebrow">LEVEL 2 · GUARDIAN CO-APPROVAL</p><h2 id="portfolio-report-title">보호자 공동 승인 모드 리포트</h2><p>AI는 제안과 위험 감지만 수행하며, 포트폴리오 변경은 상황에 맞는 사람이 최종 승인해야 실행됩니다.</p></div>
        <span className="portfolio-report-status"><i /> 현재 보호 서비스 작동 중</span>
      </div>
      <div className="portfolio-report-summary"><b>AI 제안 · 보호자 승인 · 필요 시 전문가 확인</b><p>일상 지출, 포트폴리오 조정, 상속 관련 자산 이전 모두 사전에 정한 공동 승인 원칙에 따라 진행됩니다.</p><button className="btn outline sm" onClick={() => setPortfolioExpanded((expanded) => !expanded)}>{portfolioExpanded ? "간략히 보기" : "자세히 보기"}</button></div>
      {portfolioExpanded && <div className="portfolio-approval-grid">
        <article><span>01 · 평시 / 건강기</span><h3>본인의 정기 승인</h3><p><b>AI</b> 인터뷰 데이터와 시장 상황을 학습해 리밸런싱 안을 제안합니다.</p><p><b>최종 승인</b> 본인이 6개월 또는 1년에 한 번 리포트를 검토한 뒤 적용합니다.</p></article>
        <article><span>02 · 시장 급변기</span><h3>PB 또는 AI 컨설턴트 검증</h3><p><b>AI</b> 금융위기·전쟁·금리 급변 같은 블랙스완 위험 신호를 탐지합니다.</p><p><b>최종 승인</b> 전문 자산관리사 또는 금융 전문가의 2차 검증과 본인 동의 후 수정안을 적용합니다.</p></article>
        <article><span>03 · 인지 저하 초기</span><h3>보호자의 리밸런싱 승인</h3><p><b>AI</b> NEXT Plan 원칙에 따라 안전 자산 전환 리포트를 자동으로 만듭니다.</p><p><b>최종 승인</b> 사전에 지정한 보호자(자녀·배우자)가 주문 전 최종 승인합니다.</p></article>
        <article><span>04 · 중증기 / 특수 상황</span><h3>신탁사·법적 후견인 서면 승인</h3><p><b>AI</b> 병원비·요양비에 따른 대규모 현금화 필요액을 계산합니다.</p><p><b>최종 승인</b> 신탁사 또는 법적 후견인이 증빙 서류를 확인한 뒤 승인합니다.</p></article>
      </div>}
      {portfolioExpanded && <p className="portfolio-report-note">리밸런싱·매수·매도는 이 서비스에서 자동 집행되지 않으며, 필요한 승인 절차를 거친 초안으로만 제시됩니다.</p>}
    </section>

    </>}
  </div>;
}
