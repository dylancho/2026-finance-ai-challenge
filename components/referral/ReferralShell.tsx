"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InstrumentCard from "./InstrumentCard";
import ReferralDoc from "./ReferralDoc";
import { buildDesign } from "../../lib/design";
import {
  applyDemoLedger,
  emptyLedgerState,
  evaluateTrigger,
  readBiomarker,
  readLedgerState,
} from "../../lib/ledger";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import {
  buildInstruments,
  markSent,
  applyDemoAuthority,
  readAuthorityState,
  saveAuthorityState,
  setStage,
} from "../../lib/authority";
import { buildReferral } from "../../lib/authority/referral";
import type {
  AuthorityStage,
  AuthorityState,
  InstrumentKind,
  LedgerState,
  Profile,
} from "../../lib/types";
import { emptyAuthorityState } from "../../lib/authority";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "체결 대상 문서" },
  { n: 2, label: "의뢰서" },
  { n: 3, label: "전달" },
];

export default function ReferralShell() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<AuthorityState>(emptyAuthorityState());
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [to, setTo] = useState("은행 WM·신탁부서");
  const [time, setTime] = useState("평일 오전");
  const [sent, setSent] = useState(false);
  const [ledgerState, setLedgerState] = useState<LedgerState>(emptyLedgerState());

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // ?step=2 로 의뢰서 본문에 바로 진입한다. 시연·공유용.
    const st = Number(q.get("step"));
    if (st === 1 || st === 2 || st === 3) setStep(st as Step);
    const demo = q.get("demo");
    const d = demo ? demoProfile(demo) : null;
    if (d) {
      saveProfile(d);
      setProfile(d);
      setLedgerState(applyDemoLedger(demo!));
      setAuth(applyDemoAuthority());
      return;
    }
    setProfile(readProfile());
    setLedgerState(readLedgerState());
    setAuth(readAuthorityState());
  }, []);

  const design = useMemo(() => (profile ? buildDesign(profile) : null), [profile]);

  const instruments = useMemo(
    () => (profile && design ? buildInstruments(profile, design, auth) : []),
    [profile, design, auth],
  );

  const reading = useMemo(
    () => (ledgerState.ledger ? readBiomarker(ledgerState.ledger) : null),
    [ledgerState.ledger],
  );

  const gate = useMemo(
    () => (reading ? evaluateTrigger(reading, ledgerState.proof) : null),
    [reading, ledgerState.proof],
  );

  const referral = useMemo(
    () =>
      profile && design
        ? buildReferral(profile, design, {
            instruments,
            ledger: ledgerState.ledger,
            reading,
            gate,
          })
        : null,
    [profile, design, instruments, ledgerState.ledger, reading, gate],
  );

  if (!profile || !design || !referral) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">의뢰서를 불러오는 중입니다…</p>
      </div>
    );
  }

  if (!profile.track) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">아직 설계를 시작하지 않으셨습니다.</p>
        <Link href="/start" className="btn" style={{ marginTop: 16 }}>
          설계 시작하기
        </Link>
      </div>
    );
  }

  const changeStage = (kind: InstrumentKind, stage: AuthorityStage) =>
    setAuth(saveAuthorityState(setStage(auth, kind, stage)));

  const guardian = referral.guardian;

  const send = () => {
    const kinds = instruments
      .filter((i) => i.stage !== "unavailable")
      .map((i) => i.kind);
    const to = name.trim() || guardian?.label || referral.recipients[0];
    setAuth(saveAuthorityState(markSent(auth, kinds, Date.now(), to)));
    setSent(true);
  };

  return (
    <div className="shell-wide rf">
      <div className="plan-head">
        <span className="eyebrow">전문가 연계</span>
        <h1>{referral.title}</h1>
        <p className="section-lede">
          NEXT는 권한을 만들지 않습니다. 아래 문서가 정식으로 체결될 때 비로소 금융기관이 집행할 수
          있는 근거가 생깁니다.
        </p>
      </div>

      <div className="tabs" role="tablist">
        {STEPS.map((s) => (
          <button
            key={s.n}
            role="tab"
            aria-selected={step === s.n}
            className="tab"
            onClick={() => setStep(s.n)}
          >
            <span className="rf-stepno">{s.n}</span>
            {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <section>
          <h2 className="rf-h2">설계서가 작동하려면 이 문서들이 체결되어야 합니다</h2>
          <p className="section-lede">
            {referral.executorNote ??
              "각 문서마다 효력이 발생하는 시점이 다릅니다. 아래 단계를 모두 마쳐야 집행 근거가 생깁니다."}
          </p>
          <div className="rf-inst-list">
            {instruments.map((i) => (
              <InstrumentCard
                key={i.kind}
                inst={i}
                onStage={(s) => changeStage(i.kind, s)}
              />
            ))}
          </div>
          <div className="rf-nav">
            <button className="btn" onClick={() => setStep(2)}>
              의뢰서 보기
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <div className="rf-doc-actions">
            <button className="btn ghost" onClick={() => window.print()}>
              의뢰서 인쇄
            </button>
          </div>
          <ReferralDoc r={referral} />
          <div className="rf-nav">
            <button className="btn outline" onClick={() => setStep(1)}>
              이전
            </button>
            <button className="btn" onClick={() => setStep(3)}>
              전달하기
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          {sent ? (
            <div className="rf-sent">
              <h2 className="rf-h2">
                {auth.sentTo ? `${auth.sentTo}께 전달되었습니다` : "의뢰서가 정리되었습니다"}
              </h2>
              <p className="section-lede">
                문서 상태가 <b>전달됨</b>으로 바뀌었습니다. 전달했다고 해서 계약이 되는 것은
                아닙니다. 전문가가 검토한 뒤 정식 절차를 밟아야 효력이 생깁니다.
              </p>

              {guardian ? (
                <div className="rf-esc">
                  <div className="row on">
                    <span className="i">1</span>
                    <span className="t">
                      <b>보호자 {guardian.label}</b>
                      <em>{guardian.channel}로 통보 · 방금 전달됨</em>
                    </span>
                  </div>
                  <div className="row">
                    <span className="i">2</span>
                    <span className="t">
                      <b>{guardian.escalateTo}</b>
                      <em>{guardian.escalateHours}시간 안에 응답이 없으면 이쪽으로 넘어갑니다</em>
                    </span>
                  </div>
                  <p className="note">
                    지출설계서에 정해 둔 승인·에스컬레이션 체계를 그대로 따릅니다.
                    이 화면은 데모이므로 실제 발송은 하지 않습니다.
                  </p>
                </div>
              ) : null}
              <p className="attach" style={{ marginTop: 20 }}>
                <b>데모 안내</b>
                입력하신 내용은 어디로도 전송되지 않았습니다. 체결 상태는 이 브라우저에만
                저장됩니다.
              </p>
              <div className="rf-nav">
                <button className="btn outline" onClick={() => setStep(1)}>
                  체결 상태 확인
                </button>
                <Link href="/simulation" className="btn">
                  시뮬레이션에서 확인하기
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="rf-h2">의뢰서를 전달할 곳</h2>
              <p className="section-lede">
                전달했다고 해서 계약이 되는 것은 아닙니다. 전문가가 검토한 뒤 정식 절차를 밟아야
                효력이 생깁니다.
              </p>

              <div className="rf-form">
                <div className="field">
                  <label htmlFor="rf-name">
                    {guardian ? "전달받을 보호자" : "이름"}
                  </label>
                  <input
                    id="rf-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={guardian ? guardian.label : "예: 김민수"}
                  />
                  {guardian ? (
                    <span className="rf-hint">
                      설문에서 1차 관리자로 지정하신 분입니다. 비워두면 그대로 사용합니다.
                    </span>
                  ) : null}
                </div>
                <div className="field">
                  <label htmlFor="rf-to">전달 대상</label>
                  <select id="rf-to" value={to} onChange={(e) => setTo(e.target.value)}>
                    {referral.recipients.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rf-time">연락 가능한 시간</label>
                  <select
                    id="rf-time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  >
                    <option>평일 오전</option>
                    <option>평일 오후</option>
                    <option>평일 저녁</option>
                    <option>주말</option>
                  </select>
                </div>
              </div>

              <p className="attach">
                <b>전달하면 이렇게 됩니다</b>
                문서 상태가 <b>초안 → 전달됨</b>으로 바뀝니다. 체결 여부는 앱이 아니라 전문가와의
                절차에서 정해지므로, <b>효력 발생</b>으로의 전환은 바깥에서 벌어진 일을 앱에
                알려주는 입력입니다.
              </p>

              <div className="rf-nav">
                <button className="btn outline" onClick={() => setStep(2)}>
                  이전
                </button>
                <button
                  className="btn"
                  disabled={!name.trim() && !guardian}
                  onClick={send}
                >
                  전문가에게 전달
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
