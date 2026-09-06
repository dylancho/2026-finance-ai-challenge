"use client";

import { useEffect, useState } from "react";
import { FraudAnalysisDetails, ruleReport, type FraudReportUI } from "../FraudShieldModal";
import { scoreTransaction, type FraudScore, type FraudTransaction } from "../../lib/fraud/score";
import { DEFAULT_POLICY, policyFromProfile, type FraudPolicy } from "../../lib/fraud/policy";
import { personOf, readProfile } from "../../lib/profile";
import { isTouring } from "../../lib/demo/tour";
import { readLedgerState, saveLedgerState, setProof } from "../../lib/ledger/store";
import type { ProofKind } from "../../lib/types";

/*
 * 금융 보호 화면 (2026-09-07, origin/fsd 11378df 이지수의 3단계 안내 흐름을 main 구조 위에 이식).
 *
 * 입구 화면("내 금융 보호 시작하기")을 없애고, 보호가 어떤 조건에서 작동하는지를 한 페이지에서
 * 01 준비 → 02 돌봄 상태 업데이트 → 03 보호자 공동 승인 순서로 보여 준다. 오늘의 거래와 판단
 * 근거는 2단계를 마친 뒤에만 나타난다 — 보호는 등급이 확인된 사람에게 켜지는 것이지 처음부터
 * 켜져 있는 것이 아니라는 순서를 화면이 그대로 따른다.
 *
 * 데이터는 main 의 것이다: 거래는 SCENARIOS/TOUR_SCENARIOS 를 scoreTransaction 이 인터뷰의
 * 보호 원칙(policyFromProfile)으로 채점하고, 둘러보기 중에는 김영수와 설문의 보호자(A07)를 쓴다.
 */

/** 둘러보기가 아닐 때 4초마다 바뀌는 예시 이름 (fsd 원본의 순서 그대로). */
const PEOPLE = ["민준", "서연", "지훈", "수빈", "현우", "지민"];

/**
 * 2단계 "확인된 상태" 선택지와 이력 저장소의 증빙 종류(MedicalProof.kind) 대응.
 * 셋째 항목은 진단서와 인정서가 둘 다 있는 경우인데 MedicalProof 는 한 종류만 담으므로
 * 진단서로 기록한다.
 */
const CARE_STATUSES: { label: string; kind: ProofKind }[] = [
  { label: "치매·인지장애 진단 확인", kind: "diagnosis" },
  { label: "장기요양 인정등급 확인", kind: "ltci" },
  { label: "치매 진단 및 장기요양 등급 확인", kind: "diagnosis" },
];

/**
 * 2026-09-06 둘러보기(김영수)의 당일 거래. docs/demo-data-plan.md "이상거래 시연용 거래 두 건".
 * 둘 다 처음 보는 계좌라서 금액과 맥락 중 무엇이 판정을 갈랐는지 나란히 비교된다.
 *   A 250만 — 1회 한도(A05 300만)는 통과하지만 신규 계좌 기준(S02 200만)에 걸린다.
 *   B 760만 — 이력의 과거 최대 이체와 같은 금액. 새벽·비밀번호 오류·새 기기가 겹친다.
 */
const TOUR_SCENARIOS: FraudTransaction[] = [
  {
    transactionId: "TX_K_0250", amount: 2_500_000, targetAccount: "352-1188-0427-13",
    isNewTargetAccount: true, requestTime: "02:00 PM", pinErrorCount: 0,
    biometricAnomalyScore: 0.1, isNewDevice: false,
  },
  {
    transactionId: "TX_K_0760", amount: 7_600_000, targetAccount: "356-0012-9981",
    isNewTargetAccount: true, requestTime: "02:15 AM", pinErrorCount: 2,
    biometricAnomalyScore: 0.86, isNewDevice: true,
  },
];

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

/** 카드(룰 점수·원칙 메모)와 인라인 근거(리포트)를 한 거래 단위로 묶는다. */
interface ProtectionRecord {
  tx: FraudTransaction;
  score: FraudScore;
  report: FraudReportUI;
}

/**
 * 오늘의 거래. 카드 두 장을 나란히 놓고(이전/다음 버튼 없음), 바로 아래에 거래마다 판단 근거를
 * 펼친다. 판단 이유가 모달 뒤에 숨어 있지 않아야 한다는 것이 fsd 쪽의 결정이다.
 */
function TodayTransactions({
  records,
  expanded,
  onToggle,
}: {
  records: ProtectionRecord[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="fraud-record" aria-label="거래별 보호 판단">
      <div className="fraud-record-head">
        <div><p className="eyebrow">TODAY&apos;S PROTECTION</p><h2>오늘의 거래</h2></div>
        <span>{records.length}건 분석 완료</span>
      </div>
      <div className="fraud-record-grid">
        {records.map(({ tx, score }) => {
          const isBlocked = score.status === "BLOCKED";
          const isReview = score.status === "REVIEW";
          return (
            <article className={`fraud-record-card ${isBlocked ? "blocked" : "allowed"}`} key={tx.transactionId}>
              <div className="fraud-record-status">
                <span>{isBlocked ? "차단됨" : isReview ? "추가 확인 필요" : "정상 인정"}</span>
                <b>위험도 {score.risk_score}%</b>
              </div>
              <h3>
                {isBlocked
                  ? score.policyNote
                    ? "금액은 한도 안이지만, 선언한 원칙에 걸렸습니다."
                    : "평소와 다른 신호가 동시에 감지됐습니다."
                  : isReview
                    ? "일부 신호가 평소와 다릅니다."
                    : "평소 패턴 안의 거래입니다."}
              </h3>
              <p>{tx.requestTime} · {tx.targetAccount} · {tx.amount.toLocaleString("ko-KR")}원</p>
              {/* 룰 점수만으로는 통과했을 거래를 원칙(S01·S02)이 막았을 때 그 이유를 카드에 바로 적는다. */}
              {score.policyNote && <p>{score.policyNote}</p>}
            </article>
          );
        })}
      </div>
      <section className="fraud-analysis-list" aria-labelledby="fraud-analysis-title">
        <div className="fraud-analysis-list-head">
          <div><p className="eyebrow">WHY THIS DECISION</p><h3 id="fraud-analysis-title">위험 분석 상세 정보</h3></div>
          <p>각 거래를 평소 금융 패턴과 비교한 결과입니다.</p>
        </div>
        {records.map(({ tx, report }) => (
          <FraudAnalysisDetails
            key={`analysis-${tx.transactionId}`}
            report={report}
            expanded={!!expanded[tx.transactionId]}
            onToggle={() => onToggle(tx.transactionId)}
          />
        ))}
      </section>
    </section>
  );
}

export default function FraudShieldDashboard() {
  // 첫 HTML 은 첫 번째 예시 이름·1단계로 그리고, 마운트 뒤 둘러보기·저장된 증빙에 맞춰 갱신한다.
  // 서버와 첫 클라이언트 렌더가 같아야 하이드레이션이 깨지지 않는다.
  const [touring, setTouring] = useState(false);
  const [nameIndex, setNameIndex] = useState(0);
  /** 인터뷰의 금융 보호 영역에서 선언한 원칙. 없으면 기본값. */
  const [policy, setPolicy] = useState<FraudPolicy>(DEFAULT_POLICY);
  /** 둘러보기 중에는 김영수의 거래 두 건과 설문의 보호자(A07)를 쓴다. */
  const [scenarios, setScenarios] = useState<FraudTransaction[]>(SCENARIOS);
  const [guardianPerson, setGuardianPerson] = useState<{ name: string; relation: string } | null>(null);

  const [guideStep, setGuideStep] = useState(0);
  const [careStatusUpdated, setCareStatusUpdated] = useState(false);
  const [careStatus, setCareStatus] = useState("");
  const [careFileName, setCareFileName] = useState("");
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  /** /api/fds 가 돌려준 Claude 해설. 없으면 룰 문장으로 같은 화면을 완주한다. */
  const [aiReports, setAiReports] = useState<Record<string, FraudReportUI>>({});

  useEffect(() => {
    try {
      const profile = readProfile();
      setPolicy(policyFromProfile(profile) ?? DEFAULT_POLICY);
      if (isTouring()) {
        setTouring(true);
        setScenarios(TOUR_SCENARIOS);
        const g = personOf(profile, "A07");
        if (g?.name) setGuardianPerson({ name: g.name, relation: g.relation ?? "" });
      }
    } catch {
      /* 프로필이 없으면 기본 원칙 */
    }
    // 이력 저장소에 의료 증빙이 이미 있으면 2단계는 끝난 것이다. 의뢰서·시뮬레이션에서 진단서를
    // 붙였든 이 화면에서 업데이트했든, 같은 사실을 두 번 묻지 않는다.
    if (readLedgerState().proof) {
      setCareStatusUpdated(true);
      setGuideStep(2);
    }
  }, []);

  // 둘러보기가 아닐 때만 예시 이름을 4초마다 돌린다. 둘러보기는 김영수 한 사람이다.
  useEffect(() => {
    if (touring) return;
    const interval = window.setInterval(() => setNameIndex((index) => (index + 1) % PEOPLE.length), 4000);
    return () => window.clearInterval(interval);
  }, [touring]);

  const name = touring ? "김영수" : PEOPLE[nameIndex];
  // 보호자: 둘러보기는 설문의 A07(관계 + 이름), 그 밖에는 fsd 원본의 고정 인물.
  const guardian = guardianPerson
    ? [guardianPerson.relation, guardianPerson.name].filter(Boolean).join(" ")
    : touring
      ? `${name}님의 보호자`
      : "김하나 (자녀)";
  const guardianAside = guardianPerson
    ? `${[guardianPerson.relation, `${guardianPerson.name}님`].filter(Boolean).join(" · ")}과 공동 승인 연결`
    : touring
      ? `${name}님의 보호자와 공동 승인 연결`
      : "자녀 · 김하나님과 공동 승인 연결";

  // 룰 점수는 클라이언트에서 바로 나온다. 서버는 같은 점수 위에 Claude 해설을 얹는다.
  // 거래가 화면에 나타난 뒤에 한 번만 요청하고, 서버가 죽거나 키가 없어도 룰 문장으로 완주한다.
  useEffect(() => {
    if (!careStatusUpdated) return;
    const controller = new AbortController();
    for (const tx of scenarios) {
      fetch("/api/fds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...toBody(tx), policy }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? (res.json() as Promise<FraudReportUI>) : Promise.reject(new Error(`fds ${res.status}`))))
        .then((report) => {
          if (report.error || !report.signals?.length) return;
          setAiReports((current) => ({ ...current, [tx.transactionId]: report }));
        })
        .catch(() => {
          /* 룰 리포트가 이미 화면에 있다 */
        });
    }
    return () => controller.abort();
  }, [careStatusUpdated, scenarios, policy]);

  const records: ProtectionRecord[] = scenarios.map((tx) => {
    const score = scoreTransaction(tx, policy);
    const ai = aiReports[tx.transactionId];
    const report = ai ? { ...ai, approval: ai.approval && { ...ai.approval, guardian } } : ruleReport(tx, guardian, policy);
    return { tx, score, report };
  });

  /**
   * 2026-09-07 2단계 완료 = 이력 저장소(next.ledger.v1)에 의료 증빙을 남기는 것.
   * 이 화면의 "치매·장기요양 상태 업데이트" 와 의뢰서·시뮬레이션의 "받아 둔 진단서 표시" 는 같은
   * 사실(TriggerGate.proof)이다. 여기서만 켜 두면 의뢰서 쪽은 여전히 증빙이 없다고 말하게 된다.
   * 파일은 저장·전송하지 않는다 — 앱이 판정하는 것이 아니라 받아 둔 서류를 알려주는 입력이다.
   */
  function completeCareUpdate() {
    const status = CARE_STATUSES.find((s) => s.label === careStatus);
    if (!status) return;
    // 발행일은 한국 날짜로 적는다. UTC 로 자르면 새벽에는 어제 날짜가 된다.
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    saveLedgerState(setProof(readLedgerState(), { kind: status.kind, issuedAt: today }));
    setCareStatusUpdated(true);
    setGuideStep(2);
  }

  return (
    <div className="fraud-page shell-wide">
      <section className="fraud-intro">
        <div>
          <p className="eyebrow">NEXT SAFE · FINANCIAL PROTECTION</p>
          <h1>{name}님의 금융 보호</h1>
          <p>{careStatusUpdated ? "치매·장기요양 상태 업데이트가 확인되어 보호 서비스가 작동 중입니다." : "현재 보호 상태와 서비스가 작동하는 조건을 단계별로 안내합니다."}</p>
        </div>
        <aside>
          <span>현재 보호 상태</span>
          <b>{careStatusUpdated ? "레벨 2 · 보호 활성화" : "레벨 1 · 보호 준비"}</b>
          <p>{careStatusUpdated ? guardianAside : "등급 업데이트를 기다리는 중"}</p>
        </aside>
      </section>

      <section className="protection-guide" aria-labelledby="protection-guide-title">
        <div className="protection-guide-head">
          <div><p className="eyebrow">HOW IT WORKS</p><h2 id="protection-guide-title">한 페이지에서 보호를 시작하세요</h2></div>
          <p>현재 상태를 확인하고, 필요한 경우 돌봄 상태를 업데이트하면 같은 화면에서 레벨 2 보호 서비스가 시작됩니다.</p>
        </div>
        <div className="protection-progress" aria-label={`보호 단계 ${guideStep + 1} / 3`}>
          <span className={guideStep >= 0 ? "done" : ""}>01</span><i>→</i>
          <span className={guideStep >= 1 ? "done" : ""}>02</span><i>→</i>
          <span className={guideStep >= 2 ? "done" : ""}>03</span>
        </div>

        {guideStep === 0 && (
          <article className="protection-stage" key="level-one">
            <span>01 · LEVEL 1 · 보호 준비</span>
            <h3>내 금융 원칙을 미리 학습하는 단계</h3>
            <p>거래 계좌, 이용 시간, 자산 운용 원칙과 보호자 정보를 정리합니다. 이 단계에서는 AI가 제안을 준비하지만 거래를 제한하거나 포트폴리오를 변경하지 않습니다.</p>
            <button className="btn" onClick={() => setGuideStep(1)}>다음 단계로 <i aria-hidden>↓</i></button>
          </article>
        )}

        {guideStep === 1 && (
          <article className="protection-stage protection-document-stage" key="care-update">
            <span>02 · 상태 업데이트</span>
            <h3>치매·장기요양 등급 문서를 업데이트하세요</h3>
            <p>업데이트된 돌봄 상태를 기준으로 보호자 공동 승인 모드가 시작됩니다. 이 단계부터 위험 상황에 맞는 승인 절차를 준비합니다.</p>
            <div className="care-document-update">
              <div>
                <label htmlFor="care-status">확인된 상태</label>
                <select id="care-status" value={careStatus} onChange={(e) => setCareStatus(e.target.value)}>
                  <option value="" disabled>상태를 선택하세요</option>
                  {CARE_STATUSES.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="care-document">증빙 문서</label>
                <label className="care-document-upload" htmlFor="care-document">
                  <span>파일 선택</span>
                  <small>{careFileName || "진단서 또는 장기요양 인정서"}</small>
                  <input id="care-document" type="file" accept=".pdf,image/*" onChange={(e) => setCareFileName(e.target.files?.[0]?.name ?? "")} />
                </label>
              </div>
            </div>
            <p className="care-document-note">업로드한 문서는 이 데모에서 실제로 저장·전송되지 않으며, 보호 서비스 전환 흐름을 확인하기 위한 입력입니다.</p>
            {/* 상태를 고르기 전에는 남길 증빙 종류가 없으므로 완료를 막는다. */}
            <button className="btn" disabled={!careStatus} onClick={completeCareUpdate}>문서 업데이트 완료 · 보호 시작 <i aria-hidden>↓</i></button>
          </article>
        )}

        {guideStep === 2 && (
          <article className={`protection-stage ${careStatusUpdated ? "active" : ""}`} key="level-two">
            <span>03 · LEVEL 2 · 보호자 공동 승인</span>
            <h3>{careStatusUpdated ? "보호 서비스가 작동 중입니다" : "문서 업데이트 후 보호 서비스가 시작됩니다"}</h3>
            <p>{careStatusUpdated ? "AI가 이상거래와 포트폴리오 위험 신호를 감지하고, 본인·보호자·전문가에게 상황에 맞는 최종 승인을 요청합니다." : "레벨 2에서 제공하는 공동 승인 리포트와 이상거래 보호를 확인할 수 있습니다. 먼저 2단계에서 치매·장기요양 등급 문서를 업데이트해 주세요."}</p>
            {careStatusUpdated && (
              <div className="level-two-scope">
                <article><span>일상 대리</span><b>정기 지출은 원칙대로 관리</b><p>예외 거래만 보호자와 공동 승인합니다.</p></article>
                <article><span>포트폴리오 구성</span><b>AI가 초안을 제안</b><p>매수·매도는 보호자가 승인한 뒤 진행합니다.</p></article>
                <article><span>상속 연계</span><b>자산 이전 원칙을 기록</b><p>실제 이전은 전문가 확인과 승인을 거칩니다.</p></article>
              </div>
            )}
            <div className="protection-stage-actions">
              <button className="btn outline" onClick={() => setGuideStep(1)}>← 문서 업데이트 단계</button>
              {/* 헤더에서 빠진 월간 시나리오 점검 진입로. 공동 승인 원칙은 여기서 매달 고친다. */}
              <a className="btn outline" href="/monthly-review">AI 월간 시나리오 점검 →</a>
              {careStatusUpdated && <b className="protection-stage-next">바로 아래에서 오늘의 거래를 확인하세요</b>}
            </div>
          </article>
        )}
      </section>

      {careStatusUpdated && (
        <>
          <TodayTransactions
            records={records}
            expanded={expandedReports}
            onToggle={(id) => setExpandedReports((current) => ({ ...current, [id]: !current[id] }))}
          />

          <section className="fraud-learning" id="level-two-content">
            <div><span>AI 학습 항목</span><b>거래 계좌</b><b>이용 시간</b><b>인증 행동</b><b>포트폴리오 원칙</b><b>돌봄 상태</b></div>
          </section>

          <section className="portfolio-report" aria-labelledby="portfolio-report-title">
            <div className="portfolio-report-head">
              <div>
                <p className="eyebrow">LEVEL 2 · GUARDIAN CO-APPROVAL</p>
                <h2 id="portfolio-report-title">보호자 공동 승인 모드 리포트</h2>
                <p>AI는 제안과 위험 감지만 수행하며, 포트폴리오 변경은 상황에 맞는 사람이 최종 승인해야 실행됩니다.</p>
              </div>
              <span className="portfolio-report-status"><i /> 현재 보호 서비스 작동 중</span>
            </div>
            <div className="portfolio-report-summary">
              <b>AI 제안 · 보호자 승인 · 필요 시 전문가 확인</b>
              <p>일상 지출, 포트폴리오 조정, 상속 관련 자산 이전 모두 사전에 정한 공동 승인 원칙에 따라 진행됩니다.</p>
              <button className="btn outline sm" onClick={() => setPortfolioExpanded((expanded) => !expanded)} aria-expanded={portfolioExpanded}>
                {portfolioExpanded ? "간략히 보기" : "자세히 보기"}
              </button>
            </div>
            {portfolioExpanded && (
              <div className="portfolio-approval-grid">
                <article><span>01 · 평시 / 건강기</span><h3>본인의 정기 승인</h3><p><b>AI</b> 인터뷰 데이터와 시장 상황을 학습해 리밸런싱 안을 제안합니다.</p><p><b>최종 승인</b> 본인이 6개월 또는 1년에 한 번 리포트를 검토한 뒤 적용합니다.</p></article>
                <article><span>02 · 시장 급변기</span><h3>PB 또는 AI 컨설턴트 검증</h3><p><b>AI</b> 금융위기·전쟁·금리 급변 같은 블랙스완 위험 신호를 탐지합니다.</p><p><b>최종 승인</b> 전문 자산관리사 또는 금융 전문가의 2차 검증과 본인 동의 후 수정안을 적용합니다.</p></article>
                <article><span>03 · 인지 저하 초기</span><h3>보호자의 리밸런싱 승인</h3><p><b>AI</b> NEXT Plan 원칙에 따라 안전 자산 전환 리포트를 자동으로 만듭니다.</p><p><b>최종 승인</b> 사전에 지정한 보호자(자녀·배우자)가 주문 전 최종 승인합니다.</p></article>
                <article><span>04 · 중증기 / 특수 상황</span><h3>신탁사·법적 후견인 서면 승인</h3><p><b>AI</b> 병원비·요양비에 따른 대규모 현금화 필요액을 계산합니다.</p><p><b>최종 승인</b> 신탁사 또는 법적 후견인이 증빙 서류를 확인한 뒤 승인합니다.</p></article>
              </div>
            )}
            {portfolioExpanded && <p className="portfolio-report-note">리밸런싱·매수·매도는 이 서비스에서 자동 집행되지 않으며, 필요한 승인 절차를 거친 초안으로만 제시됩니다.</p>}
          </section>
        </>
      )}
    </div>
  );
}
