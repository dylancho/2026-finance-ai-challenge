"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "../common/Badge";
import AdviceBlock, { DOC_PATH } from "./AdviceBlock";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import { applyDemoLedger, emptyLedgerState, readLedgerState } from "../../lib/ledger";
import { insightFor } from "../../lib/insight";
import { CHAPTER_META } from "../../lib/questions";
import {
  EVENTS,
  eventContextOf,
  eventOf,
  interpretEvent,
  readDecisions,
  recordDecision,
  type Candidate,
  type DecisionRecord,
  type EventChatMessage,
  type EventInterpretation,
  type EventKind,
  type InterpretSource,
  type LifeEvent,
} from "../../lib/advising";
import { kindOfText } from "../../lib/advising/interpret";
import type { LedgerState, Profile } from "../../lib/types";

/**
 * "상황이 바뀌었나요?" — 이벤트 → 판정 루프.
 *
 * 2026-09-06: 이벤트 3종 버튼을 대화형 입력으로 바꿨다. 사용자가 무슨 일이 있었는지 말로
 * 적으면 Claude(/api/ai/event)가 세 이벤트 중 하나로 대응시키고 문장에서 숫자를 뽑는다.
 * 뽑힌 숫자는 룰 엔진(adviseEvent)으로 흘러가 후보의 소진 시점·노출액이 결정론적으로
 * 계산된다. 키가 없거나 라우트가 죽으면 룰 해석기(interpretByRule)가 같은 모양을 내서
 * 데모가 멈추지 않는다. 칩 3종은 그 문장을 대신 입력해 주는 것뿐이다.
 *
 * 후보를 고르는 것은 "실행" 이 아니라 판정 원장에 "검토 후보로 기록" 하는 것이다.
 * 어떤 버튼에도 "실행" 이라는 말을 쓰지 않는다.
 */

type Turn =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "ai";
      text: string;
      source?: InterpretSource;
      interp?: EventInterpretation;
      /** 세 이벤트로 확정됐을 때. 이 턴 아래에 AdviceBlock 이 붙는다. */
      event?: LifeEvent;
    };

const INTRO: Turn = {
  id: "intro",
  role: "ai",
  text: "어떤 일이 있었는지 말씀해 주세요. 예를 들어 '집을 팔아 3억이 생겼어요', '주식이 하루에 25% 빠졌어요', '치매 진단을 받았어요'처럼요.",
};

const RESOLVED: readonly string[] = ["diagnosis", "windfall", "market_crash"];

export default function EventsShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());
  const [turns, setTurns] = useState<Turn[]>([INTRO]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  /** 직전 턴이 되묻기였을 때 그 이벤트 종류. 숫자만 온 답을 이어 붙이는 데 쓴다. */
  const [pendingKind, setPendingKind] = useState<EventKind | undefined>(undefined);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  /** `${event.id}:${candidate.id}` — 블록마다 따로 "기록됨" 을 표시한다 */
  const [recorded, setRecorded] = useState<Set<string>>(new Set());
  const lastTurnRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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

  const context = useMemo(
    () => (profile ? eventContextOf(profile, insight) : null),
    [profile, insight],
  );

  /* 새 턴이 붙으면 그 턴의 머리로 스크롤한다. 첫 인사말은 제외. */
  useEffect(() => {
    if (turns.length <= 1) return;
    lastTurnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [turns.length, busy]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy || !context) return;
    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", text };
    const next = [...turns, userTurn];
    setTurns(next);
    setInput("");
    setBusy(true);

    // 인사말을 뺀 대화 전체를 넘긴다. 되묻기 → 답 → 확정이 이어지려면 앞선 턴이 필요하다.
    const history: EventChatMessage[] = next
      .filter((t) => t.id !== "intro")
      .map((t) => ({ role: t.role === "ai" ? "assistant" : "user", text: t.text }));

    try {
      const interp = await interpretEvent(history, context, { pendingKind });
      let event: LifeEvent | undefined;
      if (RESOLVED.includes(interp.kind)) {
        event = eventOf(interp as Extract<EventInterpretation, { kind: EventKind }>);
        setPendingKind(undefined);
      } else if (interp.kind === "clarify") {
        setPendingKind(interp.pendingKind ?? kindOfText(text) ?? pendingKind);
      } else {
        setPendingKind(undefined);
      }
      setTurns((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "ai", text: interp.reply, source: interp.source, interp, event },
      ]);
    } finally {
      setBusy(false);
      // 다음 입력을 바로 받을 수 있게
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function record(event: LifeEvent, c: Candidate) {
    setDecisions(recordDecision(event, c));
    setRecorded((prev) => new Set(prev).add(`${event.id}:${c.id}`));
  }

  if (!profile) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">상황을 준비하는 중입니다…</p>
      </div>
    );
  }

  const lastIdx = turns.length - 1;

  return (
    <div className="shell-wide">
      <div className="plan-head">
        <div className="eyebrow">Event → Judgement</div>
        <h1>상황이 바뀌었나요?</h1>
        <p className="section-lede">
          설계서에 적어 둔 원칙은 상황이 바뀌었을 때 쓰라고 있는 것입니다. 무슨 일이 있었는지{" "}
          <b>자기 말로</b> 적어 주시면, AI가 그 상황을 읽고 설계서의 원칙을 근거로{" "}
          <b>검토할 후보</b>를 늘어놓습니다. NEXT는 후보를 늘어놓을 뿐 하나를 고르지 않습니다.
          결정은 사람이 합니다.
        </p>
        <p className="lg-note mono">
          데모용 시뮬레이션입니다. 여기 적는 상황은 실제로 일어난 일이 아니라 가정이며, 특정
          상품이나 금융회사를 추천하지 않습니다.
        </p>
      </div>

      {/* ── 대화 스트림 ── */}
      <div className="ev-chat" data-testid="ev-chat">
        {turns.map((t, i) => {
          const isLast = i === lastIdx;
          if (t.role === "user") {
            return (
              <div className="ev-turn user" key={t.id} ref={isLast ? lastTurnRef : undefined}>
                <div className="msg user fade-in">
                  <div>
                    <div className="bubble">{t.text}</div>
                  </div>
                </div>
              </div>
            );
          }
          const other = t.interp?.kind === "other" ? t.interp : null;
          return (
            <div className="ev-turn" key={t.id} ref={isLast ? lastTurnRef : undefined}>
              <div className="msg ai fade-in">
                <div className="avatar" aria-hidden>
                  NX
                </div>
                <div>
                  <div className="bubble">{t.text}</div>
                  {t.source && (
                    <div className="src" data-testid="ev-source">
                      {t.source === "llm" ? "AI 해석" : "규칙 해석"}
                    </div>
                  )}
                </div>
              </div>

              {/* 3종 밖의 상황: 숫자 없이 정성 항목만 */}
              {other && (
                <div className="ev-other fade-in" data-testid="ev-other">
                  <div className="ev-other-head">
                    <span className="k mono">살펴볼 점</span>
                    <Badge tone="info">수치 없음 · AI 정성 검토</Badge>
                  </div>
                  {other.considerations.length > 0 ? (
                    <ul>
                      {other.considerations.map((c, j) => (
                        <li key={j}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted" style={{ fontSize: 13 }}>
                      이 상황은 설계서의 특정 조항과 바로 닿지 않습니다.
                    </p>
                  )}
                  {other.chapter && (
                    <Link href={`/interview?chapter=${other.chapter}`} className="btn outline sm">
                      {CHAPTER_META[other.chapter].label} 영역 답하기
                    </Link>
                  )}
                </div>
              )}

              {/* 세 이벤트로 확정: 룰 엔진 후보 + 판정층 서술 */}
              {t.event && (
                <AdviceBlock
                  profile={profile}
                  insight={insight}
                  event={t.event}
                  recorded={
                    new Set(
                      [...recorded]
                        .filter((k) => k.startsWith(`${t.event!.id}:`))
                        .map((k) => k.slice(t.event!.id.length + 1)),
                    )
                  }
                  onRecord={record}
                />
              )}
            </div>
          );
        })}

        {busy && (
          <div className="ev-turn" data-testid="ev-pending">
            <div className="msg ai fade-in">
              <div className="avatar" aria-hidden>
                NX
              </div>
              <div>
                <div className="bubble muted">상황을 해석하는 중…</div>
                <div className="src">AI 해석 · 안 되면 규칙 해석으로</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 입력 ── */}
      <div className="ev-input">
        <div className="ev-chips" aria-label="예시 상황">
          {EVENTS.map((ev) => (
            <button
              key={ev.id}
              className="chip-btn"
              disabled={busy}
              onClick={() => send(ev.label)}
              title="이 문장을 대신 입력합니다"
            >
              {ev.label}
            </button>
          ))}
        </div>
        <div className="free-row">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            disabled={busy}
            placeholder="예: 집을 팔아서 2억 5천만원이 생겼어요"
            aria-label="상황 입력"
            data-testid="ev-input"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter 는 글자 확정이지 전송이 아니다
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            className="btn"
            disabled={busy || !input.trim()}
            onClick={() => void send(input)}
            data-testid="ev-send"
          >
            {busy ? "해석하는 중…" : "보내기"}
          </button>
        </div>
        <p className="hint">
          Enter 로 보내고 Shift+Enter 로 줄을 바꿉니다. 금액이나 하락률이 빠지면 한 번 되묻습니다.
        </p>
      </div>

      {/* ── 판정 원장 ── */}
      <section className="section">
        <div className="section-title">
          <h2>판정 원장</h2>
          <Badge tone="neutral">{decisions.length}건</Badge>
        </div>
        {decisions.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            아직 기록한 후보가 없습니다. 기록해 둔다고 실행되는 것은 아닙니다. 나중에 상담이나
            가족 회의에서 꺼내 볼 근거로 남을 뿐입니다.
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
        적어 주신 상황은 AI가 읽어 세 가지 이벤트 중 하나로 해석하며, 그 해석은 틀릴 수 있습니다
        (말풍선 아래 &lsquo;AI 해석&rsquo;·&lsquo;규칙 해석&rsquo; 표시). 후보의 숫자는 AI가 아니라
        설계서에 적힌 원칙과 합성 이력을 바탕으로 규칙에 따라 계산한 것이며 투자 자문이 아닙니다.
        어느 후보도 실행되지 않고, 특정 금융회사나 상품을 추천하지 않습니다.
      </p>
    </div>
  );
}
