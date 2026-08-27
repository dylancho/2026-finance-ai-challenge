"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionInput from "./QuestionInput";
import ObservationCard from "./ObservationCard";
import Badge from "../common/Badge";
import {
  activeQuestions,
  findQuestion,
  isAnswered,
  nextQuestion,
  overallProgress,
  sectionProgress,
  TRACK_META,
} from "../../lib/questions";
import { engine } from "../../lib/ai/engine";
import { answerToLabel, docName } from "../../lib/ai/rules";
import { demoProfile, readProfile, saveProfile, setAnswer } from "../../lib/profile";
import {
  analyze,
  buildContrasts,
  contrastFor,
  applyDemoLedger,
  emptyLedgerState,
  observationFor,
  readLedgerState,
  saveLedgerState,
  setResolution,
} from "../../lib/ledger";
import type {
  AnswerValue,
  Contrast,
  Extraction,
  LedgerState,
  Profile,
  Question,
  Resolution,
} from "../../lib/types";

interface Bubble {
  id: string;
  role: "ai" | "user";
  text: string;
  helper?: string;
  source?: "rule" | "llm";
}

export default function InterviewShell() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pending, setPending] = useState<Extraction[]>([]);
  const [freeText, setFreeText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());
  const streamRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef<string | null>(null);

  /* ── 초기화 ── */
  useEffect(() => {
    // 정적 프리렌더 페이지에서는 useSearchParams 가 최초 렌더에 비어 있을 수 있어
    // 마운트 후 실제 URL 을 읽는다. (?demo=, ?q= 딥링크가 /start 로 튕기는 문제)
    const query = new URLSearchParams(window.location.search);
    const demo = query.get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setProfile(d);
        setLedgerState(applyDemoLedger(demo));
        const dq = query.get("q");
        if (dq) setJumpTo(dq);
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
    const q = query.get("q");
    if (q) setJumpTo(q);
  }, [router]);

  /* ── 관찰 (이력이 연동돼 있을 때만) ── */
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

  const resolveContrast = useCallback(
    (c: Contrast, r: Resolution) => {
      setLedgerState((s) => saveLedgerState(setResolution(s, c.qid, r)));
      // Ledger 가 Profile 을 건드리는 유일한 경로.
      if (r === "observed" && c.observedValue) {
        setProfile((p) => (p ? saveProfile(setAnswer(p, c.qid, c.observedValue!)) : p));
      }
    },
    [],
  );

  const current: Question | null = useMemo(() => {
    if (!profile) return null;
    if (jumpTo) {
      const q = findQuestion(jumpTo);
      if (q && q.track === profile.track) return q;
    }
    return nextQuestion(profile);
  }, [profile, jumpTo]);

  /* ── 질문 제시 ── */
  useEffect(() => {
    if (!current) return;
    if (askedRef.current === current.id) return;
    askedRef.current = current.id;
    setBubbles((prev) => [
      ...prev,
      {
        id: `q-${current.id}-${prev.length}`,
        role: "ai",
        text: current.prompt,
        helper: current.helper,
      },
    ]);
    setPending([]);
  }, [current]);

  useEffect(() => {
    streamRef.current?.scrollTo({
      top: streamRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [bubbles, pending]);

  /* ── 답변 확정 ── */
  const commit = useCallback(
    (q: Question, value: AnswerValue, echo?: string) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const next = saveProfile(setAnswer(prev, q.id, value));
        return next;
      });
      setBubbles((prev) => [
        ...prev,
        {
          id: `a-${q.id}-${prev.length}`,
          role: "user",
          text: echo ?? answerToLabel(value, q),
        },
      ]);
      const ref = q.mapsTo[0];
      setBubbles((prev) => [
        ...prev,
        {
          id: `r-${q.id}-${prev.length}`,
          role: "ai",
          text: ref
            ? `${docName(ref.doc)} ${ref.clause} ${ref.label}에 반영했습니다.`
            : "기록했습니다.",
        },
      ]);
      setPending([]);
      setJumpTo(null);
    },
    [],
  );

  /* ── 자유 입력 ── */
  async function sendFree() {
    if (!current || !freeText.trim() || thinking) return;
    const text = freeText.trim();
    setFreeText("");
    setBubbles((prev) => [
      ...prev,
      { id: `u-${prev.length}`, role: "user", text },
    ]);
    setThinking(true);

    const result = await engine.respond(text, current, profile!);

    setBubbles((prev) => [
      ...prev,
      {
        id: `ai-${prev.length}`,
        role: "ai",
        text: result.reply,
        source: result.source,
      },
    ]);
    setPending(result.extracted);
    setThinking(false);
  }

  function applyChip(e: Extraction) {
    if (!current) return;
    commit(current, e.value, undefined);
  }

  function dropChip(idx: number) {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  }

  if (!profile || !profile.track) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">설계 정보를 불러오는 중입니다…</p>
      </div>
    );
  }

  const meta = TRACK_META[profile.track];
  const sections = sectionProgress(profile);
  const progress = overallProgress(profile);
  const done = !current;

  /* 조항 피드 */
  const feed = activeQuestions(profile)
    .filter((q) => isAnswered(profile, q.id))
    .flatMap((q) =>
      q.mapsTo.map((ref) => ({
        key: `${q.id}-${ref.doc}-${ref.clause}`,
        ref: `${docName(ref.doc)} ${ref.clause}`,
        label: ref.label,
        value: answerToLabel(profile.answers[q.id], q),
        qid: q.id,
      })),
    )
    .reverse();

  return (
    <div className="interview shell-wide">
      {/* 좌: 섹션 진행 */}
      <aside className="iv-nav">
        <h4>{meta.short} · 진행</h4>
        <ul className="iv-sections">
          {sections.map((s) => (
            <li
              key={s.section}
              className={s.complete ? "done" : s.active ? "active" : ""}
            >
              <span className="dot" aria-hidden />
              <span>{s.section}</span>
              <span className="cnt">
                {s.done}/{s.total}
              </span>
            </li>
          ))}
        </ul>
        <div className="iv-progress">
          <div className="t">
            <span>전체</span>
            <span>
              {progress.done}/{progress.total}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
        </div>
        {progress.done > 0 && (
          <Link
            href="/plan"
            className="btn outline sm"
            style={{ width: "100%", marginTop: 18 }}
          >
            지금까지의 설계서 보기
          </Link>
        )}
      </aside>

      {/* 중앙: 채팅 */}
      <section className="iv-main">
        <div className="iv-head">
          <div className="who">
            <div className="avatar" aria-hidden>
              NX
            </div>
            <div>
              <div className="name">NEXT AI</div>
              <div className="sec">
                {current ? current.section : "모든 질문 완료"} · {meta.name}
              </div>
            </div>
          </div>
          {current && <Badge tone="info">{current.id}</Badge>}
        </div>

        <div className="iv-stream" ref={streamRef}>
          {bubbles.map((b) => (
            <div key={b.id} className={`msg ${b.role} fade-in`}>
              {b.role === "ai" && (
                <div className="avatar" aria-hidden>
                  NX
                </div>
              )}
              <div>
                <div className="bubble">{b.text}</div>
                {b.helper && <div className="helper">{b.helper}</div>}
                {b.source && (
                  <div className="src">
                    {b.source === "llm" ? "AI 추출" : "규칙 추출"}
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="msg ai fade-in">
              <div className="avatar" aria-hidden>
                NX
              </div>
              <div className="bubble muted">답변을 해석하고 있습니다…</div>
            </div>
          )}
        </div>

        <div className="iv-input">
          {pending.length > 0 && (
            <div className="chips">
              {pending.map((e, i) => (
                <span className="chip" key={`${e.qid}-${i}`}>
                  <button
                    onClick={() => applyChip(e)}
                    style={{ padding: 0, fontSize: "inherit", opacity: 1 }}
                    title="이 값으로 확정"
                  >
                    {e.label}
                  </button>
                  <button onClick={() => dropChip(i)} aria-label="삭제">
                    ×
                  </button>
                </span>
              ))}
              <span className="muted" style={{ fontSize: 12, alignSelf: "center" }}>
                눌러서 확정하거나 ×로 지우세요
              </span>
            </div>
          )}

          {done ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/plan" className="btn">
                설계서 확인하기
              </Link>
              <Link href="/simulation" className="btn outline">
                시뮬레이션 돌려보기
              </Link>
            </div>
          ) : (
            current && (
              <>
                <QuestionInput
                  key={current.id}
                  question={current}
                  initial={profile.answers[current.id]}
                  onSubmit={(v) => commit(current, v)}
                />
                {current.type !== "open" && (
                  <div className="free-row" style={{ marginTop: 14 }}>
                    <textarea
                      rows={2}
                      value={freeText}
                      placeholder="선택지가 마땅치 않으면 그냥 편하게 말씀해 주세요. 예) 주식은 급하게 팔지 말고 생활비는 삼백이면 돼요"
                      aria-label="자유 입력"
                      onChange={(e) => setFreeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendFree();
                        }
                      }}
                    />
                    <button
                      className="btn outline"
                      onClick={() => void sendFree()}
                      disabled={!freeText.trim() || thinking}
                    >
                      보내기
                    </button>
                  </div>
                )}
                {current.optional && (
                  <button
                    className="btn ghost sm"
                    style={{ marginTop: 10 }}
                    onClick={() => commit(current, { kind: "open", text: "" }, "건너뜀")}
                  >
                    이 질문 건너뛰기
                  </button>
                )}
              </>
            )
          )}
        </div>
      </section>

      {/* 우: 관측 카드 + 조항 피드 */}
      <aside className="iv-feed">
        {current && insight && ledgerState.ledger && (
          <ObservationCard
            observation={observationFor(current.id, insight, ledgerState.ledger)}
            contrast={contrastFor(contrasts, current.id)}
            onResolve={resolveContrast}
          />
        )}

        <h4>작성 중인 조항</h4>
        {feed.length === 0 ? (
          <p className="feed-empty">
            답변할 때마다 이곳에 조항이 쌓입니다. 지금 하고 계신 것은 설문 작성이 아니라 문서
            작성입니다.
          </p>
        ) : (
          feed.map((f) => (
            <div className="feed-item set" key={f.key}>
              <div className="ref">{f.ref}</div>
              <div className="lab">{f.label}</div>
              <div className="val">{f.value}</div>
            </div>
          ))
        )}
      </aside>
    </div>
  );
}
