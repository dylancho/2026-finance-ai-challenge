"use client";

import { useEffect, useState } from "react";
import { FraudAnalysisDetails, ruleReport, type FraudReportUI } from "../FraudShieldModal";
import { scoreTransaction, type FraudScore, type FraudStatus, type FraudTransaction } from "../../lib/fraud/score";
import { DEFAULT_POLICY, policyFromProfile, type FraudPolicy } from "../../lib/fraud/policy";
import { josa, won } from "../../lib/format";
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
 *
 * 2026-09-07 문구: 구조와 정보는 이지수의 것 그대로 두고 말만 바꿨다 (docs/writing-style.md).
 * 해요체, 영어 소제목 제거, 레벨 1/2 → "1단계 · 보호 준비" / "2단계 · 보호자와 함께 승인",
 * 포트폴리오 → 투자 자산, 리밸런싱 → 투자 비중 조정, 공동 승인 모드 리포트 → 함께 승인하는 방식.
 *
 * 2026-09-07 서류를 알린 뒤의 화면만 지출설계서(components/plan/ExpenseDoc.tsx)의 모양으로 옮겼다.
 * 카드 한 장에 메시지 하나, 큰 숫자 하나와 그 숫자를 설명하는 한 문장이 먼저 오고 세부는 목록 행으로
 * 내려간다. 03 카드는 "서류 확인 → 지금 → 다음에 기다리는 것" 세 칸 타임라인이 되어 어디까지 왔는지
 * 한눈에 읽힌다. 서류를 올리는 01·02 카드와 데이터 흐름은 그대로다. 스타일은 app/globals.css 의
 * .pr-* 규칙이고, .xd-* 는 지출설계서 것이라 손대지 않았다.
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

/** 거래 한 건의 상태별 라벨과 제목 끝말. 상태가 곧 그 카드의 메시지다. */
const TX_TONE: Record<FraudStatus, { tag: string; tone: string; verb: string; lede: string }> = {
  BLOCKED: { tag: "막았어요", tone: "blocked", verb: "이체를 멈췄어요", lede: "평소와 다른 신호가 여러 개 함께 보였어요." },
  REVIEW: { tag: "확인이 더 필요해요", tone: "review", verb: "이체를 잠시 세워 뒀어요", lede: "일부 신호가 평소와 달라요." },
  ALLOW: { tag: "평소대로예요", tone: "allowed", verb: "이체를 그대로 보냈어요", lede: "평소 하던 대로의 거래예요." },
};

/**
 * 오늘의 거래. 거래 한 건이 카드 한 장이다. 금액이 제목이고 한 문장이 따라오고, 시각·계좌·다음
 * 단계는 목록 행으로 내려간다. 판단 근거는 같은 카드 안에서 이어진다 — 판단 이유가 모달 뒤에
 * 숨어 있지 않아야 한다는 것이 fsd 쪽의 결정이고, 이제 그 근거가 거래 카드에 붙어 있다.
 */
function TodayTransactions({
  records,
  guardian,
  expanded,
  onToggle,
}: {
  records: ProtectionRecord[];
  guardian: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="pr-group" aria-label="거래별 보호 판단">
      <header className="pr-head">
        <p className="pr-no">오늘의 거래</p>
        <h2>거래 {records.length}건을 하나씩 살펴봤어요</h2>
        <p className="pr-lede">평소 돈 쓰는 방식과 비교했어요. 카드마다 왜 그렇게 판단했는지 같이 적어 뒀어요.</p>
      </header>
      {records.map(({ tx, score, report }) => {
        const tone = TX_TONE[score.status];
        const pending = score.status !== "ALLOW";
        return (
          <article className="pr-card pr-tx" key={tx.transactionId}>
            <div className="pr-no">
              <span className={`pr-tag ${tone.tone}`}>{tone.tag}</span>
              <span>위험도 {score.risk_score}%</span>
            </div>
            <h3><em>{won(tx.amount)}</em> {tone.verb}</h3>
            <p className="pr-lede">
              {score.status === "BLOCKED" && score.policyNote ? "금액은 한도 안이지만, 내가 정한 원칙에 걸렸어요." : tone.lede}
            </p>
            {/* 룰 점수만으로는 통과했을 거래를 원칙(S01·S02)이 막았을 때 그 이유를 카드에 바로 적는다. */}
            {score.policyNote && <p className="pr-note">{score.policyNote}</p>}
            <ul className="pr-list">
              <li className="pr-row">
                <div className="pr-row-main">
                  <div className="l">보낸 시각</div>
                  <div className="s">평소 쓰는 시간은 {score.baseline.usualHours}</div>
                </div>
                <span className="pr-val">{tx.requestTime}</span>
              </li>
              <li className="pr-row">
                <div className="pr-row-main">
                  <div className="l">받는 계좌</div>
                  <div className="s">{tx.isNewTargetAccount ? "처음 보는 계좌예요" : "전에도 보낸 계좌예요"}</div>
                </div>
                <span className="pr-val">{tx.targetAccount}</span>
              </li>
              <li className="pr-row">
                <div className="pr-row-main">
                  <div className="l">다음 단계</div>
                  <div className="s">{pending ? `${guardian}에게 알렸어요. 승인하면 그때 나가요.` : "그대로 나갔어요"}</div>
                </div>
                <span className={`pr-val ${pending ? "" : "muted"}`}>{pending ? "보호자 승인" : "없어요"}</span>
              </li>
            </ul>
            <div className="pr-evidence">
              <div className="pr-no">판단 근거</div>
              <FraudAnalysisDetails
                report={report}
                expanded={!!expanded[tx.transactionId]}
                onToggle={() => onToggle(tx.transactionId)}
              />
            </div>
          </article>
        );
      })}
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
    ? `${[guardianPerson.relation, `${guardianPerson.name}님`].filter(Boolean).join(" · ")}과 함께 승인해요`
    : touring
      ? `${name}님의 보호자와 함께 승인해요`
      : "자녀 · 김하나님과 함께 승인해요";

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

  // 제출 뒤 화면의 큰 숫자. 아직 나가지 못하고 승인을 기다리는 돈이 오늘의 한 줄 요약이다.
  const pendingRecords = records.filter((r) => r.score.status !== "ALLOW");
  const pendingCount = pendingRecords.length;
  const pendingAmount = pendingRecords.reduce((sum, r) => sum + r.tx.amount, 0);
  // 이력에서 증빙을 읽어 온 경우에는 고른 항목이 없으므로 일반적인 이름으로 적는다.
  const careLabel = careStatus || "치매·장기요양 상태";

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
          <p className="eyebrow">금융 보호</p>
          <h1>{name}님의 금융 보호</h1>
          <p>{careStatusUpdated ? "치매·장기요양 상태를 확인했어요. 보호가 작동하고 있어요." : "지금 보호 상태와 보호가 시작되는 조건을 순서대로 안내해요."}</p>
        </div>
        <aside>
          <span>지금 보호 상태</span>
          {/* 레벨 1/2 라는 이름은 두되 무엇인지 말로 적는다 */}
          <b>{careStatusUpdated ? "2단계 · 보호자와 함께 승인" : "1단계 · 보호 준비"}</b>
          <p>{careStatusUpdated ? guardianAside : "진단서나 등급 확인을 기다리고 있어요"}</p>
        </aside>
      </section>

      <section className="protection-guide" aria-labelledby="protection-guide-title">
        <div className="protection-guide-head">
          <div><p className="eyebrow">보호가 시작되는 순서</p><h2 id="protection-guide-title">이 화면에서 보호를 시작해요</h2></div>
          <p>지금 상태를 확인하고, 필요하면 돌봄 상태를 알려 주세요. 같은 화면에서 2단계 보호가 시작돼요.</p>
        </div>
        <div className="protection-progress" aria-label={`보호 단계 ${guideStep + 1} / 3`}>
          <span className={guideStep >= 0 ? "done" : ""}>01</span><i>→</i>
          <span className={guideStep >= 1 ? "done" : ""}>02</span><i>→</i>
          <span className={guideStep >= 2 ? "done" : ""}>03</span>
        </div>

        {guideStep === 0 && (
          <article className="protection-stage" key="level-one">
            <span>01 · 1단계 · 보호 준비</span>
            <h3>앱이 내 금융 원칙을 미리 익히는 단계</h3>
            <p>거래 계좌, 이용 시간, 투자 원칙, 보호자 정보를 정리해요. 이 단계에서 앱은 제안만 준비해요. 거래를 막거나 투자 자산을 바꾸지 않아요.</p>
            <button className="btn" onClick={() => setGuideStep(1)}>다음 단계로 <i aria-hidden>↓</i></button>
          </article>
        )}

        {guideStep === 1 && (
          <article className="protection-stage protection-document-stage" key="care-update">
            <span>02 · 돌봄 상태 알리기</span>
            <h3>치매나 장기요양 등급 서류를 알려 주세요</h3>
            <p>알려 주신 돌봄 상태를 기준으로 보호자와 함께 승인하는 방식이 시작돼요. 이 단계부터 위험한 상황에 맞는 승인 절차를 준비해요.</p>
            <div className="care-document-update">
              <div>
                <label htmlFor="care-status">확인된 상태</label>
                <select id="care-status" value={careStatus} onChange={(e) => setCareStatus(e.target.value)}>
                  <option value="" disabled>상태를 골라 주세요</option>
                  {CARE_STATUSES.map((s) => <option key={s.label} value={s.label}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="care-document">서류</label>
                <label className="care-document-upload" htmlFor="care-document">
                  <span>파일 선택</span>
                  <small>{careFileName || "진단서 또는 장기요양 인정서"}</small>
                  <input id="care-document" type="file" accept=".pdf,image/*" onChange={(e) => setCareFileName(e.target.files?.[0]?.name ?? "")} />
                </label>
              </div>
            </div>
            <p className="care-document-note">올린 서류는 이 예시 화면에서 저장하거나 보내지 않아요. 보호가 시작되는 흐름을 보기 위한 입력이에요.</p>
            {/* 상태를 고르기 전에는 남길 증빙 종류가 없으므로 완료를 막는다. */}
            <button className="btn" disabled={!careStatus} onClick={completeCareUpdate}>서류 확인 완료 · 보호 시작 <i aria-hidden>↓</i></button>
          </article>
        )}

        {/* 서류를 아직 안 알린 채로 03 에 와 있으면(이력에 증빙이 없을 때) 02 로 돌려보낸다. */}
        {guideStep === 2 && !careStatusUpdated && (
          <article className="protection-stage" key="level-two-wait">
            <span>03 · 2단계 · 보호자와 함께 승인</span>
            <h3>서류를 알려 주시면 보호가 시작돼요</h3>
            <p>2단계에서는 함께 승인하는 방식과 평소와 다른 거래 보호를 볼 수 있어요. 먼저 02에서 치매나 장기요양 등급 서류를 알려 주세요.</p>
            <div className="protection-stage-actions">
              <button className="btn outline" onClick={() => setGuideStep(1)}>← 서류 단계로</button>
            </div>
          </article>
        )}

        {/* 서류를 알린 뒤의 화면. 지금 어디까지 왔고 다음에 무엇을 기다리는지가 카드 한 장에 있다. */}
        {guideStep === 2 && careStatusUpdated && (
          <article className="pr-card pr-stage" key="level-two">
            <div className="pr-no">
              <span className="pr-tag on">보호 켜짐</span>
              <span>2단계 · 보호자와 함께 승인</span>
            </div>
            <h3>
              {pendingCount > 0 ? (
                <>오늘 <em>{won(pendingAmount)}</em>을 멈춰 두고 승인을 기다려요</>
              ) : (
                <>오늘 거래 <em>{records.length}건</em>이 모두 평소대로였어요</>
              )}
            </h3>
            <p className="pr-lede">
              {pendingCount > 0
                ? "멈춘 돈은 보호자가 승인해야 나가요. 나머지 거래는 그대로 진행했어요."
                : "앱이 오늘 거래를 모두 확인했어요. 지금 기다리는 승인은 없어요."}
            </p>

            <ol className="pr-steps" aria-label="지금까지 온 곳과 기다리는 것">
              <li className="done">
                <span className="dot" aria-hidden>✓</span>
                <div>
                  <div className="l">서류 확인</div>
                  <div className="s">{josa(careLabel, "을를")} 알려 주셨어요</div>
                </div>
              </li>
              <li className="gap"><span className="dot line" aria-hidden /><div className="s">그래서 지금은</div></li>
              <li className="now">
                <span className="dot" aria-hidden>2</span>
                <div>
                  <div className="l">앱이 거래를 지켜봐요</div>
                  <div className="s">평소와 다른 거래와 투자 자산의 위험 신호를 살펴요</div>
                </div>
              </li>
              <li className="gap"><span className="dot line" aria-hidden /><div className="s">다음에 기다리는 것</div></li>
              <li className="wait">
                <span className="dot" aria-hidden>3</span>
                <div>
                  <div className="l">{pendingCount > 0 ? `보호자 승인 ${pendingCount}건` : "기다리는 승인이 없어요"}</div>
                  <div className="s">{pendingCount > 0 ? `${guardian}에게 알렸어요. 승인하면 바로 나가요.` : "새 거래가 들어오면 다시 알려 드려요."}</div>
                </div>
              </li>
            </ol>

            <div className="pr-scope">
              <div><span className="k">일상 지출</span><span className="v">정기 지출은 원칙대로</span><p>예외 거래만 보호자와 함께 승인해요.</p></div>
              <div><span className="k">투자 자산</span><span className="v">앱이 초안을 제안</span><p>사고파는 것은 보호자가 승인한 뒤 진행해요.</p></div>
              <div><span className="k">상속 준비</span><span className="v">자산 이전 원칙을 기록</span><p>실제 이전은 전문가 확인과 승인을 거쳐요.</p></div>
            </div>

            <div className="pr-actions">
              <button className="pr-link" onClick={() => setGuideStep(1)}>← 서류 단계로</button>
              {/* 헤더에서 빠진 월간 시나리오 점검 진입로. 공동 승인 원칙은 여기서 매달 고친다. */}
              <a className="pr-link" href="/monthly-review">매달 하는 상황 점검 →</a>
            </div>
          </article>
        )}
      </section>

      {careStatusUpdated && (
        <div className="pr-col">
          <TodayTransactions
            records={records}
            guardian={guardian}
            expanded={expandedReports}
            onToggle={(id) => setExpandedReports((current) => ({ ...current, [id]: !current[id] }))}
          />

          <section className="pr-card" id="level-two-content" aria-labelledby="pr-learned-title">
            <div className="pr-no">앱이 익힌 것</div>
            <h3 id="pr-learned-title">다섯 가지를 기준으로 오늘 거래를 봤어요</h3>
            <p className="pr-lede">인터뷰에서 정한 것과 그동안 실제로 해 온 것을 같이 봐요.</p>
            <div className="pr-chips">
              <span className="pr-chip">거래 계좌</span>
              <span className="pr-chip">이용 시간</span>
              <span className="pr-chip">비밀번호 입력 습관</span>
              <span className="pr-chip">투자 원칙</span>
              <span className="pr-chip">돌봄 상태</span>
            </div>
          </section>

          <section className="pr-card" aria-labelledby="portfolio-report-title">
            <div className="pr-no">
              <span className="pr-tag on">지금 보호가 작동 중</span>
              <span>2단계 · 보호자와 함께 승인</span>
            </div>
            <h3 id="portfolio-report-title">투자 자산은 <em>사람이 승인해야</em> 움직여요</h3>
            <p className="pr-lede">앱은 초안을 만들고 위험 신호만 알려요. 일상 지출, 투자 비중 조정, 상속 관련 자산 이전 모두 미리 정한 승인 원칙대로 진행해요.</p>
            <button className="pr-more" onClick={() => setPortfolioExpanded((expanded) => !expanded)} aria-expanded={portfolioExpanded}>
              {portfolioExpanded ? "상황별 승인하는 사람 접기" : "상황별로 누가 승인하는지 보기"}
            </button>
            {portfolioExpanded && (
              <>
                <ul className="pr-list">
                  <li className="pr-row">
                    <div className="pr-row-main">
                      <div className="l">건강할 때</div>
                      <div className="s">앱이 인터뷰 답과 시장 상황을 익혀 투자 비중 조정안을 제안해요</div>
                    </div>
                    <span className="pr-val">본인이 6개월이나 1년에 한 번</span>
                  </li>
                  <li className="pr-row">
                    <div className="pr-row-main">
                      <div className="l">시장이 크게 흔들릴 때</div>
                      <div className="s">앱이 금융위기, 전쟁, 금리 급변 같은 큰 위험 신호를 찾아요</div>
                    </div>
                    <span className="pr-val">자산관리 전문가가 확인한 뒤 본인이</span>
                  </li>
                  <li className="pr-row">
                    <div className="pr-row-main">
                      <div className="l">판단이 흐려지기 시작할 때</div>
                      <div className="s">앱이 설계서 원칙대로 안전한 자산으로 옮기는 초안을 만들어요</div>
                    </div>
                    <span className="pr-val">미리 정한 보호자가 주문 전에</span>
                  </li>
                  <li className="pr-row">
                    <div className="pr-row-main">
                      <div className="l">중증이거나 특별한 상황</div>
                      <div className="s">앱이 병원비와 요양비에 필요한 현금이 얼마인지 계산해요</div>
                    </div>
                    <span className="pr-val">신탁회사나 법적 후견인이 서면으로</span>
                  </li>
                </ul>
                <p className="pr-note">투자 비중 조정과 사고파는 일은 이 서비스가 자동으로 실행하지 않아요. 필요한 승인을 거친 초안으로만 보여 드려요.</p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
