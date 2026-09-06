"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LedgerChart from "./LedgerChart";
import PersonaCard from "./PersonaCard";
import BiomarkerCard from "./BiomarkerCard";
import Badge from "../common/Badge";
import { chapterCompleted, flowMeta, isUnified } from "../../lib/questions";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import {
  attachLedger,
  buildContrasts,
  applyDemoLedger,
  emptyLedgerState,
  generateLedger,
  narrate,
  readBiomarker,
  rulePersona,
  readLedgerState,
  saveLedgerState,
  tracksInvestment,
} from "../../lib/ledger";
import { insightFor } from "../../lib/insight";
import { won } from "../../lib/format";
import type { LedgerState, Persona, Profile } from "../../lib/types";

/**
 * Phase 1 — 적재와 복제.
 *
 * 선택 단계다. 2026-09-06 부터 게이트와 인터뷰 사이가 아니라 헤더의 "이력 연동"
 * 메뉴로 들어온다 — 인터뷰 전에도, 설계서를 본 뒤에도 올 수 있어서 마지막 CTA 는
 * 코어 완료 여부에 따라 인터뷰/설계서로 갈린다. 게이트를 거치지 않았으면(/start)
 * 상황(capacity)이 없어 시드를 만들 수 없으므로 게이트로 돌려보낸다.
 *
 * 통합 플로우는 챕터와 무관하게 소비·고정비·베이스라인·투자 성향을 모두 뽑는다 —
 * 투자 챕터를 나중에 답해도 대조할 이력이 있어야 한다.
 * 보류된 caregiver 데모는 "대리인은 대상자 마이데이터를 열 수 없다" 경고만 띄운다.
 */

export default function LedgerShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<LedgerState>(emptyLedgerState());
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [narrating, setNarrating] = useState(false);
  /** 홈 카테고리 버튼에서 넘어온 관심 챕터. 인터뷰까지 그대로 넘긴다. */
  const [focus, setFocus] = useState<string | null>(null);

  /* ── 초기화 ── */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setFocus(query.get("focus"));
    const demo = query.get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setProfile(d);
        setState(applyDemoLedger(demo));
        return;
      }
    }
    const p = readProfile();
    if (!p.track) {
      router.replace("/start");
      return;
    }
    setProfile(p);
    setState(readLedgerState());
  }, [router]);

  const blocked = profile?.track === "caregiver";
  const ledger = state.ledger;

  const insight = useMemo(
    () => (ledger && profile ? insightFor(ledger, profile) : null),
    [ledger, profile],
  );

  const contrasts = useMemo(
    () =>
      profile && insight && ledger
        ? buildContrasts(profile, insight, ledger, state)
        : [],
    [profile, insight, ledger, state],
  );

  // 평소 패턴과 비교한 점수. 2026-09-07 미리보기에서 옮겨 왔다 — 보호자 알림 경로를 여는 신호가
  // 이력에서 나온다는 것을 이력 화면에서 바로 보여 준다.
  const reading = useMemo(() => (ledger ? readBiomarker(ledger) : null), [ledger]);

  /* ── 판정층 ── */
  useEffect(() => {
    if (!insight || !profile) return;
    let alive = true;
    // 룰 문장을 먼저 세운다. 판정층은 실측 15초가 걸려서, 기다리는 동안 화면을
    // 비워두면 심사 중에 그 시간이 고스란히 빈 카드로 보인다. /plan 이 이미
    // 쓰는 방식과 같다 — 규칙 기반 문장이 먼저 서고 AI 판정이 갈아끼운다.
    setPersona(rulePersona(insight));
    setNarrating(true);
    narrate(insight, contrasts, profile.track)
      .then((r) => {
        if (alive) setPersona(r.persona);
      })
      .finally(() => {
        if (alive) setNarrating(false);
      });
    return () => {
      alive = false;
    };
    // contrasts 는 insight 에서 파생되므로 의존성에 넣지 않는다 (해소할 때마다 재호출 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insight, profile?.track]);

  /* ── 연동 ── */
  const connect = useCallback(() => {
    if (!profile) return;
    setLoading(true);
    // 실제 마이데이터 연동이 들어갈 자리. 지금은 시드 고정 합성 이력을 만든다.
    // 통합 플로우의 시드는 트랙이 아니라 상황(capacity) + 고정 상수로 만든다.
    // 보류 트랙 데모(B/C/D)의 시드 경로는 그대로 둔다.
    const unified = isUnified(profile);
    const seed = unified
      ? `unified-${profile.capacity}`
      : `${profile.track}-${profile.subject}-${profile.capacity}`;
    const preset = unified
      ? "cautious"
      : profile.track === "estate"
        ? "holder"
        : "panic_seller";
    window.setTimeout(() => {
      const l = generateLedger(seed, {
        preset,
        decline: profile.capacity === "declining" || profile.capacity === "diagnosed",
        declineFromYear: 8,
      });
      setState((s) => saveLedgerState(attachLedger(s, l)));
      setLoading(false);
    }, 550);
  }, [profile]);

  if (!profile || !profile.track) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">이력을 준비하고 있어요…</p>
      </div>
    );
  }

  const meta = flowMeta(profile);
  const willExtract =
    isUnified(profile) || tracksInvestment(profile.track)
      // 화면에는 내부 지표 이름 대신 "이력에서 무엇을 읽는지" 를 사람 말로 적는다.
      ? ["평소 쓰는 돈", "매달 나가는 고정비", "평소 거래 기준", "주가가 떨어졌을 때 한 일"]
      : ["평소 쓰는 돈", "매달 나가는 고정비", "평소 거래 기준"];
  const interviewHref = focus ? `/interview?focus=${encodeURIComponent(focus)}` : "/interview";
  // 헤더에서 들어온 경우 이미 인터뷰를 마쳤을 수 있다. 코어가 끝났으면 이력은
  // 설계서의 대조 패널에 바로 반영되므로 인터뷰 대신 설계서로 보낸다.
  const coreDone = isUnified(profile) && chapterCompleted(profile, "core");
  const nextHref = coreDone ? "/plan" : interviewHref;

  return (
    <div className="shell-wide lg">
      <div className="plan-head">
        <div className="eyebrow">거래 기록</div>
        <h1>지금까지 어떻게 돈을 써 왔는지 불러와요</h1>
        <p className="section-lede">
          인터뷰에서 답하는 것은 <b>앞으로 하고 싶은 것</b>이에요. 여기서 불러오는 것은{" "}
          <b>지금까지 실제로 해 온 것</b>이에요. 둘을 나란히 두면 어긋나는 지점을 미리 찾을 수
          있어요.
        </p>
      </div>

      {/* ── ① 연동 ── */}
      {blocked ? (
        <div className="gate-warn" role="alert">
          <h4>이 경로에서는 이력을 불러올 수 없어요</h4>
          <p>
            {meta.name}에서는 준비하시는 분이 <b>본인이 아니에요.</b> 금융 이력은 본인 확인을
            거쳐야 열 수 있어요. 가족이 대신 부모님의 거래 이력을 열 수 있는 법적 방법은
            없어요.
            <br />
            <br />
            이것이 <b>미리 준비해야 하는 이유</b>이기도 해요. 본인이 판단할 수 있을 때
            불러와 두었다면 지금 10년치 기준이 남아 있었을 거예요. 지금은 인터뷰 답만으로
            설계서를 만들고, 부족한 부분은 통장 사본이나 거래내역 같은 서류로 대신해요.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link href={interviewHref} className="btn">
              인터뷰로 이동
            </Link>
          </div>
        </div>
      ) : !ledger ? (
        <div className="lg-import">
          <div className="lg-import-body">
            <h2>10년치 금융 이력 불러오기</h2>
            <p className="muted">
              이력에서 다음을 읽어요. 여기서 읽은 것으로 설계서를 만들지는 않아요. 답한
              내용을 실제와 비교하는 데만 써요.
            </p>
            <ul className="lg-extract">
              {willExtract.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="lg-note mono">
              예시 데이터예요. 실제 금융기관에는 접속하지 않아요.
            </p>
          </div>
          <div className="lg-import-actions">
            <button className="btn" onClick={connect} disabled={loading}>
              {loading ? "불러오는 중…" : "10년치 이력 불러오기"}
            </button>
            <Link href={nextHref} className="btn ghost">
              {coreDone ? "설계서로 돌아가기" : "건너뛰고 인터뷰 시작"}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── ② 적재 ── */}
          <section className="section">
            <div className="section-title">
              <h2>{ledger.years}년치 이력을 불러왔어요</h2>
              <Badge tone="ok">{ledger.months.length}개월</Badge>
            </div>

            <div className="lg-stats">
              <div className="kv-row">
                <span>거래</span>
                <span className="mono">
                  {ledger.months.reduce((a, m) => a + m.txnCount, 0).toLocaleString("ko-KR")}건
                </span>
              </div>
              <div className="kv-row">
                <span>사고팔기</span>
                <span className="mono">{ledger.trades.length}번</span>
              </div>
              <div className="kv-row">
                <span>평소와 다른 거래</span>
                <span className="mono">{ledger.incidents.length}건</span>
              </div>
              <div className="kv-row">
                <span>{ledger.years}년 생활비 합계</span>
                <span className="mono">
                  {won(ledger.months.reduce((a, m) => a + m.living, 0))}
                </span>
              </div>
            </div>

            <LedgerChart ledger={ledger} />
          </section>

          {/* ── ③ 성향 ── */}
          {insight && (
            <section className="section">
              <div className="section-title">
                <h2>지출 요약</h2>
              </div>
              <PersonaCard insight={insight} persona={persona} pending={narrating} />
            </section>
          )}

          {/* ── ④ 평소 패턴과 비교한 점수 ── */}
          <BiomarkerCard reading={reading} />

          <section className="cta-band">
            <div>
              <h2>
                {coreDone ? "이 이력은 설계서에 반영돼요" : "이제 앞으로의 원칙을 정할 차례예요"}
              </h2>
              <p>
                {coreDone
                  ? "이미 정한 원칙과 이 이력이 어긋나는 지점을 설계서에서 비교해 보여 드려요."
                  : "인터뷰 중에 관련 질문이 나오면 이 이력이 옆에 함께 보여요."}
                {contrasts.length > 0 &&
                  ` 지금 답 기준으로 비교할 항목이 ${contrasts.length}개 있어요.`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="btn ghost"
                onClick={() => {
                  setState(saveLedgerState(emptyLedgerState()));
                  setPersona(null);
                }}
              >
                이력 지우기
              </button>
              <Link href={nextHref} className="btn">
                {coreDone ? "설계서 보기" : "인터뷰 시작"}
              </Link>
            </div>
          </section>
        </>
      )}

      <p className="disclaimer">
        이 화면의 이력은 예시 데이터이며 실제 금융거래가 아닙니다. 습관 요약은 투자 자문이
        아니며, 어떤 판단도 진단을 대신하지 않습니다.
      </p>
    </div>
  );
}
