"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LedgerChart from "./LedgerChart";
import PersonaCard from "./PersonaCard";
import Badge from "../common/Badge";
import { TRACK_META } from "../../lib/questions";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import {
  analyze,
  attachLedger,
  buildContrasts,
  applyDemoLedger,
  emptyLedgerState,
  generateLedger,
  narrate,
  readLedgerState,
  saveLedgerState,
  tracksInvestment,
} from "../../lib/ledger";
import { won } from "../../lib/format";
import type { LedgerState, Persona, Profile } from "../../lib/types";

/**
 * Phase 1 — 적재와 복제.
 *
 * 게이트 뒤에 온다. 트랙을 알아야 무엇을 뽑을지 정할 수 있고, caregiver 의
 * "대리인은 대상자 마이데이터를 열 수 없다" 경고도 트랙을 알아야 띄울 수 있다.
 */

export default function LedgerShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<LedgerState>(emptyLedgerState());
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [narrating, setNarrating] = useState(false);

  /* ── 초기화 ── */
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
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
    () => (ledger && profile ? analyze(ledger, profile.track) : null),
    [ledger, profile],
  );

  const contrasts = useMemo(
    () =>
      profile && insight && ledger
        ? buildContrasts(profile, insight, ledger, state)
        : [],
    [profile, insight, ledger, state],
  );

  /* ── 판정층 ── */
  useEffect(() => {
    if (!insight || !profile) return;
    let alive = true;
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
    const seed = `${profile.track}-${profile.subject}-${profile.capacity}`;
    const preset =
      profile.track === "estate"
        ? "holder"
        : profile.track === "daily"
          ? "spender"
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
        <p className="muted">이력을 준비하는 중입니다…</p>
      </div>
    );
  }

  const meta = TRACK_META[profile.track];
  const willExtract = tracksInvestment(profile.track)
    ? ["소비 패턴", "고정비 구조", "이상거래 베이스라인", "투자 대응 성향"]
    : ["소비 패턴", "고정비 구조", "이상거래 베이스라인"];

  return (
    <div className="shell-wide lg">
      <div className="plan-head">
        <div className="eyebrow">Phase 1 · Baseline</div>
        <h1>가장 건강할 때의 나를 기록해 둡니다</h1>
        <p className="section-lede">
          지금부터 답하실 내용은 <b>앞으로 하고 싶은 것</b>입니다. 여기서 불러오는 것은{" "}
          <b>지금까지 실제로 해오신 것</b>입니다. 둘을 나란히 두면, 미래의 원칙이 실제 습관과
          어긋나는 지점을 미리 찾을 수 있습니다.
        </p>
      </div>

      {/* ── ① 연동 ── */}
      {blocked ? (
        <div className="gate-warn" role="alert">
          <h4>이 트랙에서는 이력을 불러올 수 없습니다</h4>
          <p>
            {meta.name} 경로에서는 준비하시는 분이 <b>대상자 본인이 아닙니다.</b> 마이데이터와
            오픈뱅킹은 본인 인증을 전제로 하므로, 대리인이 부모님의 거래 이력을 열 수 있는
            법적 경로가 없습니다.
            <br />
            <br />
            이것이 <b>미리 준비해야 하는 이유</b>이기도 합니다. 본인이 판단할 수 있을 때
            연동해 두었다면 지금 10년치 기준선이 남아 있었을 것입니다. 지금은 인터뷰 답변만으로
            설계서를 만들고, 부족한 부분은 통장 사본·거래내역 등 서류로 대신합니다.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/interview" className="btn">
              인터뷰로 이동
            </Link>
          </div>
        </div>
      ) : !ledger ? (
        <div className="lg-import">
          <div className="lg-import-body">
            <h2>금융 이력 연동</h2>
            <p className="muted">
              {meta.name} 트랙에서는 다음을 읽습니다. 여기서 읽은 것은 설계서를 만드는 근거가
              아니라, 답변을 검증하는 대조군으로만 쓰입니다.
            </p>
            <ul className="lg-extract">
              {willExtract.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="lg-note mono">
              프로토타입 · 실제 금융기관에 접속하지 않습니다. 시드 고정 합성 이력을 생성합니다.
            </p>
          </div>
          <div className="lg-import-actions">
            <button className="btn" onClick={connect} disabled={loading}>
              {loading ? "불러오는 중…" : "10년 이력 불러오기"}
            </button>
            <Link href="/interview" className="btn ghost">
              건너뛰고 인터뷰 시작
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── ② 적재 ── */}
          <section className="section">
            <div className="section-title">
              <h2>적재됨</h2>
              <Badge tone="ok">
                {ledger.years}년 · {ledger.months.length}개월
              </Badge>
            </div>

            <div className="lg-stats">
              <div className="kv-row">
                <span>거래 집계</span>
                <span className="mono">
                  {ledger.months.reduce((a, m) => a + m.txnCount, 0).toLocaleString("ko-KR")}건
                </span>
              </div>
              <div className="kv-row">
                <span>매매 이벤트</span>
                <span className="mono">{ledger.trades.length}건</span>
              </div>
              <div className="kv-row">
                <span>이상징후</span>
                <span className="mono">{ledger.incidents.length}건</span>
              </div>
              <div className="kv-row">
                <span>누적 생활비</span>
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
                <h2>복제된 금융 자아</h2>
              </div>
              <PersonaCard insight={insight} persona={persona} pending={narrating} />
            </section>
          )}

          <section className="cta-band">
            <div>
              <h2>이제 미래의 원칙을 정할 차례입니다</h2>
              <p>
                인터뷰 중에 관련 문항이 나오면, 이 이력이 옆에 함께 표시됩니다.
                {contrasts.length > 0 &&
                  ` 지금 답변 기준으로 대조할 항목이 ${contrasts.length}개 있습니다.`}
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
              <Link href="/interview" className="btn">
                인터뷰 시작
              </Link>
            </div>
          </section>
        </>
      )}

      <p className="disclaimer">
        본 화면의 이력은 데모용으로 생성된 합성 데이터이며 실제 금융거래가 아닙니다. 성향
        지표는 관측된 행동의 요약일 뿐 투자 자문이 아니며, 어떤 판단도 진단을 대신하지
        않습니다.
      </p>
    </div>
  );
}
