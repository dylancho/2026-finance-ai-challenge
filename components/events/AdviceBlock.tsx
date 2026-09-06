"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "../common/Badge";
import { CHAPTER_META } from "../../lib/questions";
import {
  adviseEvent,
  EVENT_META,
  narrateAdvice,
  ruleAdviceNarration,
  yearsLabel,
  type Advice,
  type AdviceNarration,
  type Candidate,
  type LifeEvent,
} from "../../lib/advising";
import { won } from "../../lib/format";
import type { LedgerInsight, Profile } from "../../lib/types";

/**
 * 이벤트 하나에 대한 판정 출력 블록 (2026-09-06, EventsShell 에서 분리).
 *
 * 대화 스트림 안에서 AI 턴 아래에 붙는다. 룰 엔진(adviseEvent)이 후보와 숫자를 만들고,
 * 판정층(narrateAdvice)이 문장을 쓴다. 블록마다 자기 이벤트를 들고 있어서 새 이벤트가
 * 와도 앞선 블록은 그대로 남는다.
 *
 * 어떤 버튼에도 "실행" 이라는 말을 쓰지 않는다. 후보를 고르는 것은 판정 원장에
 * "검토 후보로 기록" 하는 것이다.
 */

export const DOC_PATH: Record<string, string> = {
  expense: "지출설계서",
  trust: "신탁설계서",
  guardianship: "후견설계서",
};

export default function AdviceBlock({
  profile,
  insight,
  event,
  recorded,
  onRecord,
}: {
  profile: Profile;
  insight: LedgerInsight | null;
  event: LifeEvent;
  /** 이 블록에서 이미 기록한 후보 id 들 */
  recorded: Set<string>;
  onRecord: (event: LifeEvent, c: Candidate) => void;
}) {
  const advice: Advice = useMemo(
    () => adviseEvent(profile, insight, event),
    [profile, insight, event],
  );
  const [narration, setNarration] = useState<AdviceNarration | null>(null);
  const [narrating, setNarrating] = useState(false);

  /* 판정층: 룰 문장을 먼저 세우고, LLM 결과가 오면 갈아끼운다. 키가 없으면 룰 문장으로 완주. */
  useEffect(() => {
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

  const meta = EVENT_META[advice.event.kind];

  return (
    <div className="ev-block fade-in" data-testid="ev-block" data-event-kind={event.kind}>
      <div className="ev-block-head">
        <span>Event → Judgement</span>
        <span className="ev-block-label">{event.label}</span>
      </div>

      {/* ── 재진입 카드 ── */}
      {advice.reentry.map((ch) => (
        <div className="gap-item chapter high" key={ch}>
          <div>
            <div className="r mono">먼저 정해야 할 것이 있습니다</div>
            <div className="w">이 판단에는 {CHAPTER_META[ch].label} 선언이 필요합니다</div>
            <div className="c">
              {CHAPTER_META[ch].withoutIt} 아래 후보는 그 기준 없이 만든 것이라 근거가 약합니다.
            </div>
          </div>
          <Link href={`/interview?chapter=${ch}`} className="btn sm">
            이 영역 답하기
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
              <div className="k mono">인터뷰에서 정한 것</div>
              <p>{advice.contrast.declared}</p>
            </div>
            <div className="ct-col">
              <div className="k mono">이력에서 보인 것</div>
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
                {narration.contrastNote.source === "llm" ? "AI 해설" : "규칙 문장"}
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
            지금 설계서대로면 {yearsLabel(advice.baselineRunwayYears)} 뒤 소진
          </Badge>
        </div>
        {narration && (
          <p className="ev-summary">
            {narration.summary.text}{" "}
            <span className="src mono">
              {narrating
                ? "규칙 문장 (AI 해설을 기다리는 중)"
                : narration.summary.source === "llm"
                  ? "AI 해설"
                  : "규칙 문장"}
            </span>
          </p>
        )}
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
          &lsquo;{meta.exposureLabel}&rsquo;은 {meta.exposureHelp}입니다. 소진 시점은 설계서
          제6조와 같은 방식으로, 수익률과 물가는 빼고 계산했습니다.
        </p>

        {/* ── 후보 카드. do-nothing 도 시각적으로 동급이다. ── */}
        <div className="cand-grid">
          {advice.candidates.map((c) => (
            <article className="cand" key={c.id} data-testid="cand">
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
                  <span>{meta.exposureLabel}</span>
                  <span className="mono" data-testid="cand-exposure">
                    {won(c.impact.riskExposure ?? 0)}
                  </span>
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
                {recorded.has(c.id) ? (
                  <span className="cand-recorded mono">판정 원장에 기록됨</span>
                ) : (
                  <button className="btn outline sm" onClick={() => onRecord(event, c)}>
                    검토 후보로 기록
                  </button>
                )}
              </footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
