"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionInput from "./QuestionInput";
import ObservationCard from "./ObservationCard";
import ChapterProposal from "./ChapterProposal";
import Badge from "../common/Badge";
import {
  activeQuestions,
  chapterCompleted,
  chapterQuestions,
  CHAPTER_META,
  CHAPTER_ORDER,
  findQuestion,
  flowMeta,
  isAnswered,
  isUnified,
  OPTIONAL_CHAPTERS,
  overallProgress,
  sectionProgress,
} from "../../lib/questions";
import { markChapterCompleted } from "../../lib/chapters";
import { engine } from "../../lib/ai/engine";
import { answerToLabel, docName } from "../../lib/ai/rules";
import { demoProfile, readProfile, saveProfile, setAnswer } from "../../lib/profile";
import {
  buildContrasts,
  contrastFor,
  applyDemoLedger,
  emptyLedgerState,
  observationFor,
  readLedgerState,
  saveLedgerState,
  setResolution,
} from "../../lib/ledger";
import { insightFor } from "../../lib/insight";
import type {
  AnswerValue,
  Chapter,
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

const isChapter = (v: string | null): v is Chapter =>
  !!v && (CHAPTER_ORDER as string[]).includes(v);

/**
 * 인터뷰.
 *
 * 통합 플로우는 챕터 단위로 진행한다: 코어(필수) → 챕터 제안 → 고른 챕터 → 다시 제안.
 * 챕터를 끝내면 Profile.chaptersCompleted 에 기록하고, 설계서의 공백 카드에서
 * ?chapter= 로 재진입하면 그 챕터만 답한 뒤 설계서로 돌아간다.
 *
 * 보류 트랙 데모(?demo=B/C/D)는 옛 트랙 질문 목록을 한 줄로 진행한다.
 */
export default function InterviewShell() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [pending, setPending] = useState<Extraction[]>([]);
  const [freeText, setFreeText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [jumpTo, setJumpTo] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());
  /** 통합 플로우에서 지금 진행 중인 챕터 */
  const [chapter, setChapter] = useState<Chapter>("core");
  /** 홈 카테고리 버튼에서 넘어온 관심 챕터 */
  const [focus, setFocus] = useState<Chapter | null>(null);
  /** 코어(또는 챕터)를 마치고 다음 챕터를 고르는 화면 */
  const [proposing, setProposing] = useState(false);
  /** 설계서의 공백 카드에서 챕터 하나만 채우러 들어온 경우 — 끝나면 설계서로 복귀 */
  const [reentry, setReentry] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef<string | null>(null);
  const completedRef = useRef<Chapter | null>(null);

  /* ── 초기화 ── */
  useEffect(() => {
    // 정적 프리렌더 페이지에서는 useSearchParams 가 최초 렌더에 비어 있을 수 있어
    // 마운트 후 실제 URL 을 읽는다. (?demo=, ?q= 딥링크가 /start 로 튕기는 문제)
    const query = new URLSearchParams(window.location.search);
    const focusParam = query.get("focus");
    if (isChapter(focusParam) && focusParam !== "core") setFocus(focusParam);

    let p: Profile | null = null;
    const demo = query.get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setLedgerState(applyDemoLedger(demo));
        p = d;
      }
    }
    if (!p) {
      const stored = readProfile();
      if (!stored.track) {
        router.replace("/start");
        return;
      }
      setLedgerState(readLedgerState());
      p = stored;
    }
    setProfile(p);

    const dq = query.get("q");
    const chapterParam = query.get("chapter");
    if (isUnified(p)) {
      if (isChapter(chapterParam)) {
        setChapter(chapterParam);
        setReentry(chapterParam !== "core");
      } else if (dq) {
        const target = findQuestion(dq);
        if (target?.chapter) setChapter(target.chapter);
      }
    }
    if (dq) setJumpTo(dq);
  }, [router]);

  const unified = !!profile && isUnified(profile);

  /* ── 관찰 (이력이 연동돼 있을 때만) ── */
  const insight = useMemo(
    () => (profile && ledgerState.ledger ? insightFor(ledgerState.ledger, profile) : null),
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

  /** 지금 진행 중인 질문 순서. 통합 플로우는 현재 챕터, 보류 트랙은 트랙 전체. */
  const activeList = useMemo(() => {
    if (!profile) return [];
    return isUnified(profile) ? chapterQuestions(profile, chapter) : activeQuestions(profile);
  }, [profile, chapter]);

  const current: Question | null = useMemo(() => {
    if (!profile) return null;
    if (jumpTo) {
      const inActive = activeList.find((q) => q.id === jumpTo);
      if (inActive) return inActive;
      // showIf 로 빠졌거나 다른 챕터의 질문에 딥링크로 들어온 경우까지는 허용한다.
      const q = findQuestion(jumpTo);
      if (q && (isUnified(profile) ? !!q.chapter : q.track === profile.track)) return q;
    }
    return (
      activeList.find((q) => !isAnswered(profile, q.id) && !skipped.has(q.id)) ?? null
    );
  }, [profile, activeList, jumpTo, skipped]);

  /* ── 앞뒤 이동 ──
   * jumpTo 를 "지금 보고 있는 질문" 의 단일 오버라이드로 쓴다.
   * jumpTo 가 비면 언제나 "답 안 한 첫 질문" 으로 돌아온다. 이것이 복귀 지점이다. */
  const cursor = useMemo(
    () => (current ? activeList.findIndex((q) => q.id === current.id) : -1),
    [activeList, current],
  );
  const prevQuestion = cursor > 0 ? activeList[cursor - 1] : null;
  const nextQuestion = cursor >= 0 ? activeList[cursor + 1] ?? null : null;

  /** 이미 답한 질문을 보고 있으면 편집 모드다. */
  const editing = !!current && !!profile && isAnswered(profile, current.id);

  const goTo = useCallback((qid: string) => {
    setJumpTo(qid);
    setPending([]);
    setFreeText("");
    setProposing(false);
  }, []);

  /** 복귀 지점(답 안 한 첫 질문)으로 돌아간다. */
  const resume = useCallback(() => {
    setJumpTo(null);
    setPending([]);
    setFreeText("");
  }, []);

  const goToSection = useCallback(
    (section: string) => {
      if (!profile) return;
      const inSection = activeList.filter((q) => q.section === section);
      if (!inSection.length) return;
      const target = inSection.find((q) => !isAnswered(profile, q.id)) ?? inSection[0];
      goTo(target.id);
    },
    [activeList, profile, goTo],
  );

  /** 챕터 제안 화면 또는 왼쪽 챕터 목록에서 챕터를 골랐다. */
  const startChapter = useCallback((ch: Chapter) => {
    setChapter(ch);
    setProposing(false);
    setSkipped(new Set());
    setJumpTo(null);
    setPending([]);
    setBubbles((prev) => [
      ...prev,
      {
        id: `ch-${ch}-${prev.length}`,
        role: "ai",
        text: `${CHAPTER_META[ch].label} 영역으로 넘어갑니다. ${CHAPTER_META[ch].caption}`,
      },
    ]);
  }, []);

  /* ── 챕터 완료 처리 ──
   * 현재 챕터에 더 물을 질문이 없으면 완료로 기록한다. 재진입이면 설계서로 돌아가고,
   * 아니면 남은 챕터를 제안한다. 같은 챕터를 두 번 처리하지 않도록 ref 로 막는다. */
  useEffect(() => {
    if (!profile || !isUnified(profile) || current || proposing) return;
    if (completedRef.current === chapter) return;
    completedRef.current = chapter;

    const next = chapterCompleted(profile, chapter)
      ? profile
      : saveProfile(markChapterCompleted(profile, chapter));
    if (next !== profile) setProfile(next);

    if (reentry) {
      router.push("/plan");
      return;
    }
    const remaining = OPTIONAL_CHAPTERS.filter((ch) => !chapterCompleted(next, ch));
    if (remaining.length) setProposing(true);
  }, [profile, current, chapter, proposing, reentry, router]);

  /* ── 질문 제시 ── */
  useEffect(() => {
    if (!current) return;
    if (askedRef.current === current.id) return;
    askedRef.current = current.id;
    const revisit = !!profile && isAnswered(profile, current.id);
    setBubbles((prev) => [
      ...prev,
      {
        id: `q-${current.id}-${prev.length}`,
        role: "ai",
        text: revisit ? `다시 여쭤보겠습니다. ${current.prompt}` : current.prompt,
        helper: revisit
          ? "이미 답하신 질문입니다. 새로 답하시면 해당 조항이 갱신됩니다."
          : current.helper,
      },
    ]);
    setPending([]);
    // profile 은 재질문 여부 판단에만 쓴다. askedRef 가 중복 추가를 막는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    streamRef.current?.scrollTo({
      top: streamRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [bubbles, pending]);

  /* ── 건너뛰기 ──
   * 답으로 저장하지 않는다. optional 질문에 빈 답을 저장하면 isAnswered 가
   * false 라 같은 질문이 계속 다시 나오고, gaps·조항 피드도 오염된다.
   * 이 세션 동안만 기억하므로 새로고침하면 다시 물어본다. */
  const skip = useCallback((q: Question) => {
    setSkipped((prev) => new Set(prev).add(q.id));
    setBubbles((prev) => [
      ...prev,
      { id: `s-${q.id}-${prev.length}`, role: "user", text: "건너뜀" },
    ]);
    setPending([]);
    setJumpTo(null);
  }, []);

  /* ── 답변 확정 ── */
  const commit = useCallback(
    (q: Question, value: AnswerValue, echo?: string) => {
      if (q.optional && value.kind === "open" && !value.text.trim()) {
        skip(q);
        return;
      }
      const wasAnswered = !!profile && isAnswered(profile, q.id);
      setProfile((prev) => {
        if (!prev) return prev;
        const next = saveProfile(setAnswer(prev, q.id, value));
        return next;
      });
      // 건너뛴 질문에 뒤늦게 답한 경우, 다시 건너뜀 상태로 남겨두지 않는다.
      setSkipped((prev) => {
        if (!prev.has(q.id)) return prev;
        const next = new Set(prev);
        next.delete(q.id);
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
      const verb = wasAnswered ? "갱신했습니다" : "반영했습니다";
      setBubbles((prev) => [
        ...prev,
        {
          id: `r-${q.id}-${prev.length}`,
          role: "ai",
          text: ref
            ? `${docName(ref.doc)} ${ref.clause} ${ref.label}을(를) ${verb}.`
            : wasAnswered
              ? "수정했습니다."
              : "기록했습니다.",
        },
      ]);
      setPending([]);
      // 편집을 마치면 복귀 지점(답 안 한 첫 질문)으로 돌아간다.
      setJumpTo(null);
    },
    [skip, profile],
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

  const meta = flowMeta(profile);
  const sections = sectionProgress(profile, activeList);
  const progress = overallProgress(profile, activeList);
  const done = !current && !proposing;
  const remainingChapters = OPTIONAL_CHAPTERS.filter((ch) => !chapterCompleted(profile, ch));
  const headline = unified ? CHAPTER_META[chapter].label : meta.name;

  /* 조항 피드 — 코어 + 선언한 챕터에서 답한 것 전부 */
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
      {/* 좌: 챕터 + 섹션 진행 */}
      <aside className="iv-nav">
        {unified && (
          <>
            <h4>영역</h4>
            <ul className="iv-chapters">
              {CHAPTER_ORDER.map((ch) => {
                const doneCh = chapterCompleted(profile, ch);
                const here = ch === chapter && !proposing;
                return (
                  <li key={ch} className={here ? "here" : doneCh ? "done" : ""}>
                    <button
                      type="button"
                      className="iv-sec"
                      onClick={() => (here ? resume() : startChapter(ch))}
                      title={`${CHAPTER_META[ch].label} 영역으로 이동`}
                    >
                      <span className="dot" aria-hidden />
                      <span className="nm">{CHAPTER_META[ch].label}</span>
                      <span className="cnt">
                        {doneCh ? "선언됨" : ch === "core" ? "필수" : "선택"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <h4>{unified ? CHAPTER_META[chapter].short : meta.short} · 진행</h4>
        <ul className="iv-sections">
          {sections.map((s) => (
            <li
              key={s.section}
              className={s.complete ? "done" : s.active ? "active" : ""}
            >
              <button
                type="button"
                className="iv-sec"
                onClick={() => goToSection(s.section)}
                title={`${s.section} 섹션으로 이동`}
              >
                <span className="dot" aria-hidden />
                <span className="nm">{s.section}</span>
                <span className="cnt">
                  {s.done}/{s.total}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="iv-progress">
          <div className="t">
            <span>{unified ? "이 영역" : "전체"}</span>
            <span>
              {progress.done}/{progress.total}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
        </div>
        {feed.length > 0 && (
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
                {proposing
                  ? "다음 영역 고르기"
                  : current
                    ? current.section
                    : "모든 질문 완료"}{" "}
                · {headline}
              </div>
            </div>
          </div>
          {current && !proposing && <Badge tone="info">{current.id}</Badge>}
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

          {proposing ? (
            <ChapterProposal profile={profile} focus={focus} onPick={startChapter} />
          ) : done ? (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/plan" className="btn">
                  설계서 확인하기
                </Link>
                <Link href="/simulation" className="btn outline">
                  시뮬레이션 돌려보기
                </Link>
                {unified && (
                  <Link href="/events" className="btn outline">
                    상황이 바뀌면
                  </Link>
                )}
                {unified && remainingChapters.length > 0 && (
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => setProposing(true)}
                  >
                    다른 영역 더 답하기
                  </button>
                )}
                {activeList.length > 0 && (
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => goTo(activeList[activeList.length - 1].id)}
                  >
                    답변 다시 보기
                  </button>
                )}
              </div>
              <p className="iv-hint">
                {unified && remainingChapters.length === 0
                  ? "모든 영역을 선언하셨습니다. "
                  : ""}
                오른쪽 조항이나 왼쪽 섹션을 누르면 그 질문으로 돌아가 답을 고칠 수 있습니다.
              </p>
            </>
          ) : (
            current && (
              <>
                <div className="iv-move">
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => prevQuestion && goTo(prevQuestion.id)}
                    disabled={!prevQuestion}
                    title={prevQuestion ? `${prevQuestion.id} 로 돌아가기` : "첫 질문입니다"}
                  >
                    ← 이전 질문
                  </button>
                  {editing && (
                    <>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => nextQuestion && goTo(nextQuestion.id)}
                        disabled={!nextQuestion}
                      >
                        다음 질문 →
                      </button>
                      <span className="iv-editing">
                        이미 답하신 질문입니다
                        <button type="button" className="btn ghost sm" onClick={resume}>
                          작성하던 곳으로 ↩
                        </button>
                      </span>
                    </>
                  )}
                </div>
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
                    onClick={() => skip(current)}
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
        {current && !proposing && insight && ledgerState.ledger && (
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
            <button
              type="button"
              className={`feed-item set${current?.id === f.qid ? " here" : ""}`}
              key={f.key}
              onClick={() => goTo(f.qid)}
              title={`${f.qid} 질문으로 돌아가 이 조항을 고칩니다`}
            >
              <div className="ref">
                {f.ref}
                <span className="edit">수정 →</span>
              </div>
              <div className="lab">{f.label}</div>
              <div className="val">{f.value}</div>
            </button>
          ))
        )}
      </aside>
    </div>
  );
}
