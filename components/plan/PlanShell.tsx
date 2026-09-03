"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TrustDoc from "./TrustDoc";
import GuardianshipDoc from "./GuardianshipDoc";
import ExpenseDoc from "./ExpenseDoc";
import ConsultationModal from "./ConsultationModal";
import ContrastPanel from "./ContrastPanel";
import Badge from "../common/Badge";
import { buildDesign, findGaps, readinessAxes } from "../../lib/design";
import { flowMeta } from "../../lib/questions";
import {
  demoProfile,
  firstPerson,
  firstAmount,
  readProfile,
  saveProfile,
  setAnswer,
} from "../../lib/profile";
import {
  analyze,
  buildContrasts,
  applyDemoLedger,
  narrate,
  openContrasts,
  readLedgerState,
  ruleNarration,
  saveLedgerState,
  setResolution,
  clearResolution,
} from "../../lib/ledger";
import { personLabel, won } from "../../lib/format";
import type { Contrast, LedgerState, Profile, Resolution } from "../../lib/types";
import { emptyLedgerState } from "../../lib/ledger";

type TabKey = "trust" | "guardianship" | "expense" | "gaps" | "contrast";

export default function PlanShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<TabKey>("expense");
  const [modal, setModal] = useState(false);
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());
  const [interpretations, setInterpretations] = useState<
    Record<string, { text: string; source: "rule" | "llm" }>
  >({});

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setProfile(d);
        setLedgerState(applyDemoLedger(demo));
        return;
      }
    }
    const p = readProfile();
    if (!p.track) {
      router.replace("/start");
      return;
    }
    setProfile(p);
    setLedgerState(readLedgerState());
  }, [router]);

  const design = useMemo(() => (profile ? buildDesign(profile) : null), [profile]);
  const gaps = useMemo(
    () => (profile && design ? findGaps(profile, design) : []),
    [profile, design],
  );

  const insight = useMemo(
    () => (profile && ledgerState.ledger ? analyze(ledgerState.ledger, profile.track) : null),
    [profile, ledgerState.ledger],
  );

  const contrasts = useMemo(
    () =>
      profile && insight && ledgerState.ledger
        ? buildContrasts(profile, insight, ledgerState.ledger, ledgerState)
        : [],
    [profile, insight, ledgerState],
  );

  /* 판정층. 해소 버튼을 누를 때마다 다시 부르지 않도록 이력·트랙에만 반응한다. */
  useEffect(() => {
    if (!profile || !insight || !ledgerState.ledger) return;
    let alive = true;
    const base = buildContrasts(profile, insight, ledgerState.ledger);
    setInterpretations(ruleNarration(insight, base).interpretations);
    narrate(insight, base, profile.track).then((r) => {
      if (alive) setInterpretations(r.interpretations);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insight, profile?.track]);

  useEffect(() => {
    if (!design) return;
    setTab(design.trust ? "trust" : design.guardianship ? "guardianship" : "expense");
  }, [design]);

  const resolve = (c: Contrast, r: Resolution) => {
    setLedgerState((s) => saveLedgerState(setResolution(s, c.qid, r)));
    // "이력대로" 를 고른 경우에만 선언(Profile)을 갱신한다.
    // 이것이 Ledger 가 Profile 을 건드리는 유일한 경로다.
    if (r === "observed" && c.observedValue && profile) {
      const next = setAnswer(profile, c.qid, c.observedValue);
      saveProfile(next);
      setProfile(next);
    }
  };

  const undo = (c: Contrast) => {
    setLedgerState((s) => saveLedgerState(clearResolution(s, c.qid)));
  };

  if (!profile || !profile.track || !design) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">설계서를 불러오는 중입니다…</p>
      </div>
    );
  }

  const axes = readinessAxes(design);
  const meta = flowMeta(profile);
  const manager = firstPerson(profile, "B12", "C07", "A07", "D11");
  const monthly = firstAmount(profile, "B07", "A02", "D09");

  const summary = [
    `목적: ${meta.name}`,
    `대상: ${profile.subject === "family" ? `${profile.subjectRelation ?? "가족"} (대리 준비)` : "본인"}`,
    `의사능력 상태: ${
      { full: "스스로 판단 가능", declining: "판단력 저하 조짐", diagnosed: "진단 받음", incident: "금융 사고 발생" }[
        profile.capacity ?? "full"
      ]
    }`,
    design.trust
      ? design.trust.available
        ? `검토 구조: ${design.trust.type.name} (완성도 ${design.trust.completeness}%)`
        : "신탁: 신규 설정 곤란 — 사유 확인 필요"
      : "신탁 설계 해당 없음",
    design.guardianship
      ? `후견 판정: ${design.guardianship.verdict.name}`
      : "후견 설계 해당 없음",
    manager ? `1차 관리자: ${personLabel(manager)}` : "1차 관리자 미지정",
    monthly ? `월 생활비: ${won(monthly)}` : "월 생활비 미설정",
    `미결정 항목 ${gaps.length}건`,
  ];

  const tabs: { key: TabKey; label: string; n?: string }[] = [];
  if (design.trust) tabs.push({ key: "trust", label: "신탁설계서", n: design.trust.available ? `${design.trust.completeness}%` : "제한" });
  if (design.guardianship)
    tabs.push({
      key: "guardianship",
      label: "후견설계서",
      n: `${design.guardianship.completeness}%`,
    });
  tabs.push({ key: "expense", label: "지출설계서", n: `${design.expense.completeness}%` });
  tabs.push({ key: "gaps", label: "공백 목록", n: `${gaps.length}` });
  tabs.push({
    key: "contrast",
    label: "이력 대조",
    n: ledgerState.ledger ? `${openContrasts(contrasts).length}` : "—",
  });

  return (
    <div className="shell-wide">
      <div className="plan-head">
        <div className="eyebrow">Your design documents</div>
        <h1>미래의 나에게 남기는 금융 사용 설명서</h1>
        <p className="section-lede">
          {meta.name} 트랙 · {meta.docs.join(" · ")}. 아래 문서는 AI가 답변을 조항 단위로 정리한
          초안이며 법적 효력이 없습니다.
        </p>

        <div className="axes">
          {axes.map((a) => (
            <div className="axis" key={a.key}>
              <div className="lab">
                <span>{a.label}</span>
                <span className="pct">{a.available ? `${a.pct}%` : "—"}</span>
              </div>
              <div className="bar">
                <i style={{ width: `${a.available ? a.pct : 0}%` }} />
              </div>
              <div className="sub">
                {a.available ? `미결정 ${a.missing}항목` : a.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            className="tab"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.n && <span className="n">{t.n}</span>}
          </button>
        ))}
      </div>

      <div className="fade-in" key={tab}>
        {tab === "trust" && design.trust && <TrustDoc design={design.trust} />}
        {tab === "guardianship" && design.guardianship && (
          <GuardianshipDoc design={design.guardianship} profile={profile} />
        )}
        {tab === "expense" && <ExpenseDoc design={design.expense} profile={profile} />}
        {tab === "gaps" && (
          <div>
            {gaps.length === 0 ? (
              <div className="clause set">
                <header className="clause-head">
                  <span className="ti">비어 있는 항목이 없습니다</span>
                  <Badge tone="ok">완료</Badge>
                </header>
                <ul className="clause-body">
                  <li>
                    모든 필수 질문에 답하셨습니다. 시뮬레이션에서 흐름이 끝까지 이어지는지
                    확인해 보세요.
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <p className="section-lede" style={{ marginBottom: 18 }}>
                  아래 항목이 비어 있으면 미래의 특정 시점에 결정을 내릴 근거가 없습니다.
                  시뮬레이션은 바로 그 지점에서 멈춥니다.
                </p>
                {gaps.map((g) => (
                  <div className={`gap-item ${g.severity}`} key={g.qid}>
                    <div>
                      <div className="r mono">
                        {g.qid} · {g.clause}
                      </div>
                      <div className="w">{g.what}</div>
                      <div className="c">{g.consequence}</div>
                    </div>
                    <Link href={`/interview?q=${g.qid}`} className="btn outline sm">
                      채우러 가기
                    </Link>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {tab === "contrast" && (
          <ContrastPanel
            contrasts={contrasts}
            interpretations={interpretations}
            onResolve={resolve}
            onUndo={undo}
          />
        )}
      </div>

      <section className="cta-band">
        <div>
          <h2>이제 실제 준비를 시작해볼까요?</h2>
          <p>
            정리된 설계서를 가지고 상담하면, 처음부터 상황을 설명할 필요가 없습니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/simulation" className="btn outline">
            먼저 시뮬레이션 보기
          </Link>
          <button className="btn" onClick={() => setModal(true)}>
            전문가 상담 준비하기
          </button>
        </div>
      </section>

      {modal && (
        <ConsultationModal
          design={design}
          summary={summary}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}
