"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "../common/Badge";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import { applyDemoLedger, emptyLedgerState, readLedgerState } from "../../lib/ledger";
import { insightFor } from "../../lib/insight";
import { CHAPTER_META } from "../../lib/questions";
import {
  adviseEvent,
  EVENT_META,
  EVENTS,
  narrateAdvice,
  readDecisions,
  recordDecision,
  ruleAdviceNarration,
  yearsLabel,
  type Advice,
  type AdviceNarration,
  type Candidate,
  type DecisionRecord,
  type LifeEvent,
} from "../../lib/advising";
import { won } from "../../lib/format";
import type { LedgerState, Profile } from "../../lib/types";

/**
 * "상황이 바뀌었나요?" — 이벤트 → 판정 루프.
 *
 * 이벤트 3종(데모용 시뮬레이션)을 누르면 룰 엔진이 후보를 만들고, 판정층이 트레이드오프를
 * 서술한다. 후보를 고르는 것은 "실행" 이 아니라 판정 원장에 "검토 후보로 기록" 하는 것이다.
 * 어떤 버튼에도 "실행" 이라는 말을 쓰지 않는다.
 */

const DOC_PATH: Record<string, string> = {
  expense: "지출설계서",
  trust: "신탁설계서",
  guardianship: "후견설계서",
};

export default function EventsShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());
  const [event, setEvent] = useState<LifeEvent | null>(null);
  const [narration, setNarration] = useState<AdviceNarration | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [justRecorded, setJustRecorded] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const demo = query.get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setProfile(d);
        setLedgerState(applyDemoLedger(demo));
        setDecisions(readDecisions());
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
    setDecisions(readDecisions());
  }, [router]);

  const insight = useMemo(
    () => (profile && ledgerState.ledger ? insightFor(ledgerState.ledger, profile) : null),
    [profile, ledgerState.ledger],
  );

  const advice: Advice | null = useMemo(
    () => (profile && event ? adviseEvent(profile, insight, event) : null),
    [profile, insight, event],
  );

  /* 판정층: 룰 문장을 먼저 세우고, LLM 결과가 오면 갈아끼운다. 키가 없으면 룰 문장으로 완주. */
  useEffect(() => {
    if (!advice) {
      setNarration(null);
      return;
    }
    let alive = true;
    setNarration(ruleAdviceNarration(advice));
    setNarrating(true);
    narrateAdvice(advice)
      .then((n) => {
        if (alive) setNarration(n);
      })
      .finally(() => {
        if (alive) setNarrating(false);
      });
    return () => {
      alive = false;
    };
  }, [advice]);

  function record(c: Candidate) {
    if (!event) return;
    setDecisions(recordDecision(event, c));
    setJustRecorded(c.id);
  }

  if (!profile) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">상황을 준비하는 중입니다…</p>
      </div>
    );
  }

  return (
    <div className="shell-wide">
      <div className="plan-head">
        <div className="eyebrow">Event → Judgement</div>
        <h1>상황이 바뀌었나요?</h1>
        <p className="section-lede">
          설계서는 선언입니다. 상황이 바뀌면 그 선언을 근거로 <b>검토 후보</b>를 만듭니다.
          NEXT는 후보를 정렬할 뿐 하나를 고르지 않습니다. 결정은 사람이 합니다.
        </p>
        <p className="lg-note mono">
          데모용 시뮬레이션 · 아래 상황은 실제 사건이 아니라 가정입니다. 특정 상품·금융회사를
          추천하지 않습니다.
        </p>
      </div>

      {/* ── 이벤트 3종 ── */}
      <div className="sim-picker">
        {EVENTS.map((ev) => (
          <button
            key={ev.id}
            className="sim-card"
            aria-pressed={event?.id === ev.id}
            onClick={() => {
              setJustRecorded(null);
              setEvent(ev);
            }}
          >
            <div className="t">{ev.label}</div>
            <div className="c">{EVENT_META[ev.kind].caption}</div>
          </button>
        ))}
      </div>

      {advice && (
        <div className="fade-in" key={advice.event.id}>
          {/* ── 재진입 카드 ── */}
          {advice.reentry.map((ch) => (
            <div className="gap-item chapter high" key={ch}>
              <div>
                <div className="r mono">이 판단에 필요한 선언이 없습니다</div>
                <div className="w">
                  이 판단에는 {CHAPTER_META[ch].label} 선언이 필요합니다
                </div>
                <div className="c">
                  {CHAPTER_META[ch].withoutIt} 아래 후보는 선언 없이 만든 것이라 근거가 약합니다.
                </div>
              </div>
              <Link href={`/interview?chapter=${ch}`} className="btn sm">
                이 영역 선언하기
              </Link>
            </div>
          ))}

          {/* ── 선언 vs 관측 (급락) ── */}
          {advice.contrast && (
            <section className="section ev-contrast">
              <div className="section-title">
                <h2>{advice.contrast.title}</h2>
              </div>
              <div className="ct-cols">
                <div className="ct-col">
                  <div className="k mono">선언 (인터뷰)</div>
                  <p>{advice.contrast.declared}</p>
                </div>
                <div className="ct-col">
                  <div className="k mono">관측 (이력)</div>
                  <p>{advice.contrast.observed}</p>
                </div>
              </div>
              {advice.contrast.evidence.length > 0 && (
                <ul className="obs-lines" style={{ marginTop: 12 }}>
                  {advice.contrast.evidence.map((e, i) => (
                    <li key={i}>
                      <span className="k">{e.label}</span>
                      <span className="v">{e.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
              {narration?.contrastNote && (
                <p className="ev-note">
                  {narration.contrastNote.text}{" "}
                  <span className="src mono">
                    {narration.contrastNote.source === "llm" ? "AI 판정" : "규칙 문장"}
                  </span>
                </p>
              )}
            </section>
          )}

          {/* ── 요약 ── */}
          <section className="section">
            <div className="section-title">
              <h2>검토 후보 {advice.candidates.length}개</h2>
              <Badge tone="neutral">
                현재 설계서 기준 소진 시점 {yearsLabel(advice.baselineRunwayYears)}
              </Badge>
            </div>
            {narration && (
              <p className="ev-summary">
                {narration.summary.text}{" "}
                <span className="src mono">
                  {narrating
                    ? "AI 판정을 기다리는 중 · 규칙 문장"
                    : narration.summary.source === "llm"
                      ? "AI 판정"
                      : "규칙 문장"}
                </span>
              </p>
            )}
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
              {EVENT_META[advice.event.kind].exposureLabel}: {EVENT_META[advice.event.kind].exposureHelp}.
              소진 시점은 설계서 §6 과 같은 방식(수익률·물가 미반영)으로 계산했습니다.
            </p>

            {/* ── 후보 카드. do-nothing 도 시각적으로 동급이다. ── */}
            <div className="cand-grid">
              {advice.candidates.map((c) => (
                <article className="cand" key={c.id}>
                  <header className="cand-head">
                    <h3>{c.title}</h3>
                    <div className="cand-badges">
                      {c.isDoNothing && <Badge tone="neutral">현상 유지</Badge>}
                      <Badge tone={c.reversible ? "ok" : "warn"}>
                        {c.reversible ? "되돌릴 수 있음" : "되돌리기 어려움"}
                      </Badge>
                    </div>
                  </header>

                  <div className="cand-impact">
                    <div className="kv-row">
                      <span>자산 소진 시점</span>
                      <span className="mono">
                        {yearsLabel(c.impact.runwayYears ?? null)}
                        {advice.baselineRunwayYears !== (c.impact.runwayYears ?? null) && (
                          <span className="muted"> (지금 {yearsLabel(advice.baselineRunwayYears)})</span>
                        )}
                      </span>
                    </div>
                    <div className="kv-row">
                      <span>{EVENT_META[advice.event.kind].exposureLabel}</span>
                      <span className="mono">{won(c.impact.riskExposure ?? 0)}</span>
                    </div>
                  </div>

                  <ul className="cand-basis">
                    {c.basis.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>

                  {narration?.tradeoffs[c.id] && (
                    <p className="cand-note">{narration.tradeoffs[c.id].text}</p>
                  )}

                  <footer className="cand-foot">
                    {c.clause && (
                      <Link href="/plan" className="clause-jump">
                        {DOC_PATH[c.clause.doc]} {c.clause.ref} 보기 →
                      </Link>
                    )}
                    {justRecorded === c.id ? (
                      <span className="cand-recorded mono">판정 원장에 기록됨</span>
                    ) : (
                      <button className="btn outline sm" onClick={() => record(c)}>
                        검토 후보로 기록
                      </button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── 판정 원장 ── */}
      <section className="section">
        <div className="section-title">
          <h2>판정 원장</h2>
          <Badge tone="neutral">{decisions.length}건</Badge>
        </div>
        {decisions.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            아직 기록된 검토 후보가 없습니다. 기록은 실행이 아닙니다 — 상담이나 가족 회의에서
            꺼내 볼 근거를 남기는 것입니다.
          </p>
        ) : (
          decisions.map((d) => (
            <div className="gap-item low" key={d.id}>
              <div>
                <div className="r mono">
                  {new Date(d.at).toLocaleString("ko-KR")} · {d.eventLabel}
                </div>
                <div className="w">{d.candidateTitle}</div>
                <div className="c">{d.basis[0]}</div>
              </div>
              {d.clause && (
                <Link href="/plan" className="btn outline sm">
                  {DOC_PATH[d.clause.doc]} {d.clause.ref}
                </Link>
              )}
            </div>
          ))
        )}
      </section>

      <p className="disclaimer">
        위 후보는 설계서의 선언과 합성 이력을 근거로 규칙에 따라 만든 검토 항목이며 투자 자문이
        아닙니다. 어떤 후보도 실행되지 않으며, 특정 금융회사·상품을 추천하지 않습니다.
      </p>
    </div>
  );
}
