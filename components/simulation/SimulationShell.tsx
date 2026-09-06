"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Disclaimer from "../common/Disclaimer";
import StoryStrip, { type StripMarks } from "./StoryStrip";
import StoryCard from "./StoryCard";
import DocsCard from "./DocsCard";
import { buildStory, countBlocked, type StoryId } from "./story";
import { buildDesign, runScenario, scenariosFor } from "../../lib/design";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import {
  applyDemoLedger,
  emptyLedgerState,
  evaluateTrigger,
  PHASE_YEARS,
  readBiomarker,
  readLedgerState,
  saveLedgerState,
  setProof,
} from "../../lib/ledger";
import { insightFor } from "../../lib/insight";
import {
  applyAuthority,
  buildInstruments,
  emptyAuthorityState,
  applyDemoAuthority,
  readAuthorityState,
  saveAuthorityState,
  setStage,
} from "../../lib/authority";
import type {
  AuthorityState,
  InstrumentKind,
  LedgerState,
  Profile,
  ScenarioResult,
} from "../../lib/types";

/*
 * 미리보기 (2026-09-07, 토스 스타일로 다시 씀).
 *
 * 한 가지 질문에만 답한다 — "설계서대로 하면, 앞으로 내 돈은 실제로 어떻게 움직이나?"
 * 시간 순서대로 세 장(지금 · 신호가 보일 때 · 진단서가 나온 뒤)을 쌓고, 마지막에
 * "실제로 체결한 서류" 를 둔다. 엔진은 그대로다: 시나리오(runScenario) · 집행 근거
 * (applyAuthority/canExecute) · 트리거(evaluateTrigger) · 바이오마커(readBiomarker).
 * 이 파일은 상태를 들고 카드에 나눠 줄 뿐이다.
 */

/**
 * 시나리오를 어느 장의 "예" 로 보여줄지.
 *
 * lib/ledger/timeline.ts 의 SCENARIO_PHASE 는 엔진 축(적재·감지·대행)의 배치라 치매 진단이
 * 2구간에 들어간다. 이 화면의 3장은 "진단서가 나온 뒤" 이므로 이야기 순서에 맞게 다시 놓는다.
 * 새 시나리오를 만들지는 않는다 — scenariosFor() 가 준 것만 배치한다.
 */
const EXAMPLE_PLACEMENT: Record<string, StoryId> = {
  shortfall: "now",
  phishing: "now",
  hospital: "now",
  accident: "signal",
  dementia: "after",
  care: "after",
  spouse_death: "after",
};

export default function SimulationShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());
  const [auth, setAuth] = useState<AuthorityState>(emptyAuthorityState());
  const [active, setActive] = useState<StoryId>("now");
  const [seenId, setSeenId] = useState<string>("sv-strip");

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setProfile(d);
        setLedgerState(applyDemoLedger(demo));
        setAuth(applyDemoAuthority());
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
    setAuth(readAuthorityState());
  }, [router]);

  const design = useMemo(() => (profile ? buildDesign(profile) : null), [profile]);

  const insight = useMemo(
    () => (profile && ledgerState.ledger ? insightFor(ledgerState.ledger, profile) : null),
    [profile, ledgerState.ledger],
  );

  const reading = useMemo(
    () => (ledgerState.ledger ? readBiomarker(ledgerState.ledger) : null),
    [ledgerState.ledger],
  );

  const gate = useMemo(
    () => (reading ? evaluateTrigger(reading, ledgerState.proof) : null),
    [reading, ledgerState.proof],
  );

  const instruments = useMemo(
    () => (profile && design ? buildInstruments(profile, design, auth) : []),
    [profile, design, auth],
  );

  const stories = useMemo(
    () =>
      profile && design
        ? buildStory({
            profile,
            design,
            instruments,
            gate,
            reading,
            insight,
            hasLedger: !!ledgerState.ledger,
          })
        : [],
    [profile, design, instruments, gate, reading, insight, ledgerState.ledger],
  );

  /* 예시 시나리오: 엔진 결과에 집행 근거만 덧씌워 장별로 나눈다 */
  const examples = useMemo(() => {
    const out: Record<StoryId, ScenarioResult[]> = { now: [], signal: [], after: [] };
    if (!profile || !design) return out;
    for (const s of scenariosFor(profile)) {
      const base = runScenario(profile, design, s.id);
      if (!base) continue;
      out[EXAMPLE_PLACEMENT[s.id] ?? "now"].push(applyAuthority(base, instruments));
    }
    return out;
  }, [profile, design, instruments]);

  /* 축 표시. 연차는 지금 = 0. 엔진의 구간 연차에서 이력 길이를 빼 "지금" 기준으로 옮기고,
     구간이 0 폭이 되지 않게 최소 폭만 준다 (표시용 — 판정에는 쓰지 않는다). */
  const marks = useMemo<StripMarks | null>(() => {
    if (!design) return null;
    const years = ledgerState.ledger?.years ?? PHASE_YEARS[2][0];
    const relSignal = PHASE_YEARS[2][0] - years;
    const relDiag = PHASE_YEARS[3][0] - years;
    const s = design.expense.sustainability;
    // 요양 시작 연차가 있으면 진단서 시점을 그쪽에 맞춘다 (요양이 진단보다 먼저 올 수는 없다).
    const care = s.careStartYear;
    const diagBase = care !== undefined && care > 0 ? Math.min(relDiag, care) : relDiag;
    const diagAt = Math.min(20, Math.max(4, diagBase));
    const signalAt = Math.min(diagAt - 2, Math.max(2, relSignal));
    return {
      signalAt,
      diagAt,
      careAt: s.careStartYear,
      runoutAt: s.series.length > 0 && s.assets > 0 ? s.years : null,
    };
  }, [design, ledgerState.ledger]);

  const blockedCount = useMemo(() => countBlocked(stories), [stories]);
  const fired = gate?.fired ?? false;

  const attachProof = (attach: boolean) => {
    const today = new Date().toISOString().slice(0, 10);
    setLedgerState((s) =>
      saveLedgerState(setProof(s, attach ? { kind: "diagnosis", issuedAt: today } : null)),
    );
  };
  const toggleStage = (kind: InstrumentKind, effective: boolean) =>
    setAuth((s) => saveAuthorityState(setStage(s, kind, effective ? "effective" : "draft")));

  const pick = (id: StoryId) => {
    setActive(id);
    document.getElementById(`sv-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  // 지출설계서와 같은 스크롤 추적: 헤더 아래 기준선을 지난 카드 중 가장 아래 것이 "지금 보는 카드".
  useEffect(() => {
    if (!stories.length) return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".sv-col section[id^='sv-']"));
    if (!cards.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = 96 + 24;
      let current = cards[0].id;
      for (const c of cards) if (c.getBoundingClientRect().top <= line) current = c.id;
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) current = cards[cards.length - 1].id;
      setSeenId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [stories.length]);

  if (!profile || !profile.track || !design || !marks) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">미리보기를 준비하는 중입니다…</p>
      </div>
    );
  }

  const rail = (id: string, no: string | null, label: string) => (
    <a
      key={id}
      href={`#${id}`}
      className={seenId === id ? "is-active" : undefined}
      aria-current={seenId === id ? "true" : undefined}
    >
      {no && <span className="no">{no}</span>}
      {label}
    </a>
  );

  return (
    <div className="shell-wide sv-page">
      <div className="plan-head sv-head">
        <h1>설계서대로라면, 앞으로 이렇게 움직입니다</h1>
        <p className="section-lede">
          지금 작성된 설계서의 조항을 그대로 따라가며, 건강할 때부터 진단서가 나온 뒤까지 돈이 어떻게
          움직이는지 보여드립니다. 서류를 실제로 체결하기 전에는 어떤 항목도 저절로 실행되지 않습니다.
        </p>
      </div>

      <div className="xd sv">
        <nav className="xd-rail" aria-label="시기 이동">
          {rail("sv-strip", null, "앞으로 30년")}
          {stories.map((s) => rail(`sv-${s.id}`, String(s.n), s.short))}
          {rail("sv-docs", null, "체결한 서류")}
          <Link className="xd-rail-edit" href="/plan">
            내 설계서 보기 →
          </Link>
        </nav>

        <div className="xd-col sv-col">
          <StoryStrip stories={stories} active={active} marks={marks} onPick={pick} />

          {stories.map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              current={active === s.id}
              fired={fired}
              gate={gate}
              examples={examples[s.id]}
              onProof={attachProof}
            />
          ))}

          {instruments.length > 0 && (
            <DocsCard instruments={instruments} blockedCount={blockedCount} onToggle={toggleStage} />
          )}

          <Disclaimer>
            이 미리보기는 입력하신 답변만으로 구성한 예시이며, 실제 제도의 적용 여부와 순서는
            금융기관·전문가의 확인이 필요합니다. 어느 시기에 있는지, 진단서가 있는지, 서류를
            체결했는지는 앱이 판정하지 않고 사용자가 알려주는 것입니다.
          </Disclaimer>
        </div>
      </div>
    </div>
  );
}
