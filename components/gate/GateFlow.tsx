"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Badge from "../common/Badge";
import { TRACK_META } from "../../lib/questions";
import { emptyProfile, readProfile, saveProfile } from "../../lib/profile";
import type { Capacity, Profile, Subject, Track } from "../../lib/types";

const PURPOSES: {
  track: Track;
  title: string;
  desc: string;
}[] = [
  {
    track: "daily",
    title: "일상 지출과 공과금이 문제없이 나가게 하고 싶어요",
    desc: "자동이체가 밀리지 않고, 큰돈이 한 번에 빠져나가지 않도록. 8문항이면 끝납니다.",
  },
  {
    track: "future",
    title: "나중에 판단이 어려워질 때를 대비하고 싶어요",
    desc: "치매·사고에 대비해 누가 무엇을 어디까지 결정할지 지금 정해둡니다. 22문항.",
  },
  {
    track: "caregiver",
    title: "부모님이나 가족을 대신해 알아보고 있어요",
    desc: "지금 그분의 상태에서 무엇이 가능하고 무엇이 어려운지부터 확인합니다. 14문항.",
  },
  {
    track: "estate",
    title: "남길 재산을 어떻게 물려줄지 정하고 싶어요",
    desc: "누구에게 무엇을, 어떤 순서로. 유류분까지 함께 검토합니다. 16문항.",
  },
];

const RELATIONS = ["부모님", "배우자", "조부모", "형제자매", "그 외 친족"];

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
  const [subject, setSubject] = useState<Subject | null>(null);
  const [relation, setRelation] = useState<string>("");
  const [capacity, setCapacity] = useState<Capacity | null>(null);

  function pickTrack(t: Track) {
    setTrack(t);
    if (t === "caregiver") {
      setSubject("family");
    } else if (t === "daily" || t === "estate") {
      setSubject("self");
    } else {
      setSubject(null);
    }
    setStep(1);
  }

  function finish(cap: Capacity) {
    if (!track) return;
    const base: Profile = { ...emptyProfile(), ...readProfileSafely() };
    const next: Profile = {
      ...base,
      track,
      subject: subject ?? "self",
      subjectRelation: subject === "family" ? relation || "가족" : undefined,
      capacity: cap,
      // 트랙이 바뀌면 이전 트랙의 답변은 의미가 없다.
      answers: base.track === track ? base.answers : {},
      transcript: base.track === track ? base.transcript : [],
    };
    saveProfile(next);
    router.push("/interview");
  }

  const who = subject === "family" ? relation || "그분" : "본인";
  const blocking = capacity === "diagnosed" || capacity === "incident";

  return (
    <div className="gate shell-wide">
      {step === 0 && (
        <div className="fade-in">
          <div className="gate-step">STEP 1 / 3 · 목적</div>
          <h1>오늘은 무엇을 준비하러 오셨나요?</h1>
          <p className="gate-lede">
            목적에 따라 질문과 산출물이 완전히 달라집니다. 공과금 관리만 필요하시다면 신탁이나
            후견 이야기는 꺼내지 않습니다.
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
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <div className="gate-step">STEP 2 / 3 · 대상</div>
          <h1>이 설계는 누구를 위한 것인가요?</h1>
          <p className="gate-lede">
            {track === "caregiver"
              ? "가족을 대신해 알아보시는 경우입니다. 대상자와의 관계를 알려주세요."
              : "본인을 위한 것인지, 가족을 대신한 것인지에 따라 가능한 제도가 달라집니다."}
          </p>

          {track !== "caregiver" && (
            <div className="gate-cards tight">
              <button
                className="gate-card"
                aria-pressed={subject === "self"}
                onClick={() => {
                  setSubject("self");
                  setRelation("");
                }}
              >
                <span className="t">본인을 위한 설계입니다</span>
                <span className="d">
                  내가 결정할 수 없게 될 때를 대비해 지금의 내가 정해둡니다.
                </span>
              </button>
              <button
                className="gate-card"
                aria-pressed={subject === "family"}
                onClick={() => setSubject("family")}
              >
                <span className="t">가족을 위한 설계입니다</span>
                <span className="d">
                  부모님이나 배우자를 대신해 준비합니다. 대상자의 동의가 필요할 수 있습니다.
                </span>
              </button>
            </div>
          )}

          {(subject === "family" || track === "caregiver") && (
            <>
              <p className="gate-lede" style={{ marginTop: 26, marginBottom: 10 }}>
                대상자와의 관계
              </p>
              <div className="relation-row">
                {RELATIONS.map((r) => (
                  <button
                    key={r}
                    className="chip-btn"
                    aria-pressed={relation === r}
                    onClick={() => setRelation(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="gate-nav">
            <button className="btn ghost" onClick={() => setStep(0)}>
              ← 목적 다시 고르기
            </button>
            <button
              className="btn"
              disabled={!subject || (subject === "family" && !relation)}
              onClick={() => setStep(2)}
            >
              다음
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <div className="gate-step">STEP 3 / 3 · 의사능력</div>
          <h1>
            지금 {who}은(는) 금융 결정을 스스로 하실 수 있나요?
          </h1>
          <p className="gate-lede">
            이 질문이 어떤 제도가 가능한지를 결정합니다. 신탁계약과 임의후견계약은 본인의
            의사능력을 전제로 하기 때문에, 시점을 놓치면 선택지가 법정후견으로 좁아집니다.
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
            <button className="btn ghost" onClick={() => setStep(1)}>
              ← 이전
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
