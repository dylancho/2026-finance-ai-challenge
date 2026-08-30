"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Badge from "../common/Badge";
import { TRACK_META } from "../../lib/questions";
import { emptyProfile, readProfile, saveProfile } from "../../lib/profile";
import type { Capacity, Profile, Track } from "../../lib/types";

// 2026-08-30 회의 결정: 설문 카테고리를 일상대리 / 투자 / 상속 3개로 확정.
// "future"(미래 판단력 저하 대비)와 "caregiver"(가족 대신 준비)는 메인 시나리오에서
// 제외하고 추후 검토로 보류 — 코드는 남기고 게이트 선택지에서만 뺀다.
const PURPOSES: {
  track: Track;
  title: string;
  desc: string;
}[] = [
  {
    track: "daily",
    title: "일상 지출과 공과금이 문제없이 나가게 하고 싶어요",
    desc: "자동이체가 밀리지 않고, 큰돈이 한 번에 빠져나가지 않도록. 3문항이면 끝납니다.",
  },
  {
    track: "estate",
    title: "남길 재산을 어떻게 물려줄지 정하고 싶어요",
    desc: "누구에게 무엇을, 어떤 순서로. 유류분까지 함께 검토합니다. 3문항.",
  },
];

// 투자 트랙: 질문·선택지 설계가 아직 진행 중 (담당 이지수). 선택은 가능하게 열어두되
// 인터뷰로 보내지 않고 준비 중 안내만 보여준다.
const PURPOSE_SOON: {
  track: "investment";
  title: string;
  desc: string;
} = {
  track: "investment",
  title: "투자 자산을 대신 판단해주길 바라요",
  desc: "매매·리밸런싱 원칙을 미리 정해둡니다. 3문항 — 질문 설계 중입니다.",
};

const CAPACITIES: {
  value: Capacity;
  title: string;
  desc: string;
}[] = [
  {
    value: "full",
    title: "네, 스스로 판단하고 계약할 수 있습니다",
    desc: "은행 업무를 직접 보고, 계약서 내용을 이해하고 서명할 수 있는 상태입니다.",
  },
  {
    value: "declining",
    title: "최근 기억이나 판단에 어려움이 보입니다",
    desc: "아직 가능하지만 예전 같지는 않습니다. 준비할 수 있는 시간이 줄고 있는 단계입니다.",
  },
  {
    value: "diagnosed",
    title: "치매 등 진단을 받으셨습니다",
    desc: "의료기관에서 인지장애나 치매 진단을 받은 상태입니다.",
  },
  {
    value: "incident",
    title: "이미 금융 사고나 계좌 문제가 발생했습니다",
    desc: "사기 피해, 설명되지 않는 이체, 계좌 접근 불가 등이 실제로 벌어졌습니다.",
  },
];

export default function GateFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState<Track | null>(null);
  const [capacity, setCapacity] = useState<Capacity | null>(null);

  function pickTrack(t: Track) {
    setTrack(t);
    setStep(1);
  }

  function finish(cap: Capacity) {
    if (!track) return;
    const base: Profile = { ...emptyProfile(), ...readProfileSafely() };
    const next: Profile = {
      ...base,
      track,
      // 메인 시나리오는 본인이 직접 계약·판단하는 상황에 초점을 맞춘다 (2026-08-30 회의).
      subject: "self",
      subjectRelation: undefined,
      capacity: cap,
      // 트랙이 바뀌면 이전 트랙의 답변은 의미가 없다.
      answers: base.track === track ? base.answers : {},
      transcript: base.track === track ? base.transcript : [],
    };
    saveProfile(next);
    router.push("/ledger");
  }

  const blocking = capacity === "diagnosed" || capacity === "incident";

  return (
    <div className="gate shell-wide">
      {step === 0 && (
        <div className="fade-in">
          <div className="gate-step">STEP 1 / 2 · 목적</div>
          <h1>오늘은 무엇을 준비하러 오셨나요?</h1>
          <p className="gate-lede">
            목적에 따라 질문과 산출물이 완전히 달라집니다. 각 영역은 3문항으로 끝나고,
            본인이 직접 결정하는 상황을 기준으로 설계합니다.
          </p>
          <div className="gate-cards">
            {PURPOSES.map((p) => (
              <button
                key={p.track}
                className="gate-card"
                onClick={() => pickTrack(p.track)}
                aria-pressed={track === p.track}
              >
                <span className="t">{p.title}</span>
                <span className="d">{p.desc}</span>
                <span className="docs">
                  {TRACK_META[p.track].docs.map((d) => (
                    <Badge key={d} tone="info">
                      {d}
                    </Badge>
                  ))}
                </span>
              </button>
            ))}
            <button className="gate-card" disabled aria-disabled="true">
              <span className="t">{PURPOSE_SOON.title}</span>
              <span className="d">{PURPOSE_SOON.desc}</span>
              <span className="docs">
                <Badge tone="warn">준비 중</Badge>
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <div className="gate-step">STEP 2 / 2 · 사후관리 발동 시점</div>
          <h1>지금 금융 결정을 스스로 하실 수 있나요?</h1>
          <p className="gate-lede">
            NEXT는 진단을 내리지 않습니다. 지금 상태를 스스로 알려주시면, 그 시점부터 어떤
            대리 실행이 가능한지를 결정합니다.
          </p>

          <div className="gate-cards">
            {CAPACITIES.map((c) => (
              <button
                key={c.value}
                className="gate-card"
                aria-pressed={capacity === c.value}
                onClick={() => setCapacity(c.value)}
              >
                <span className="t">{c.title}</span>
                <span className="d">{c.desc}</span>
              </button>
            ))}
          </div>

          {blocking && (
            <div className="gate-warn fade-in" role="alert">
              <h4>먼저 알려드릴 것이 있습니다</h4>
              <p>
                의사능력이 이미 흠결된 상태에서는 새로운 신탁계약이나 임의후견계약을 체결하기
                어렵습니다. 나중에 그 계약의 효력이 다투어질 수 있기 때문입니다.
                <br />
                NEXT는 이 경우 <b>법정후견(한정후견·성년후견) 준비</b>와{" "}
                <b>지금 바로 가능한 계좌 보호 조치</b>를 중심으로 설계서를 만듭니다. 신탁설계서는
                생성되지 않고, 대신 그 이유와 대안을 보여드립니다.
              </p>
            </div>
          )}

          {capacity === "declining" && (
            <div className="gate-warn fade-in">
              <h4>시간이 많지 않을 수 있습니다</h4>
              <p>
                아직 가능한 단계입니다. 다만 이 시기에 체결한 계약은 나중에 의사능력을 두고
                다투어질 수 있으므로, 계약 시 전문의 소견서를 함께 받아두는 것이 일반적입니다.
              </p>
            </div>
          )}

          <div className="gate-nav">
            <button className="btn ghost" onClick={() => setStep(0)}>
              ← 목적 다시 고르기
            </button>
            <button
              className="btn"
              disabled={!capacity}
              onClick={() => capacity && finish(capacity)}
            >
              {blocking ? "가능한 경로로 설계 시작" : "설계 시작"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function readProfileSafely(): Partial<Profile> {
  try {
    return readProfile();
  } catch {
    return {};
  }
}
