"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wallet, TrendingUp, ScrollText } from "lucide-react";
import Badge from "../common/Badge";
import { emptyProfile, readProfile, saveProfile } from "../../lib/profile";
import type { Capacity, Profile, Subject, Track } from "../../lib/types";

// 2026-08-30 회의 결정: 설문 카테고리를 일상대리 / 투자 / 상속 3개로 확정.
// "future"(미래 판단력 저하 대비)와 "caregiver"(가족 대신 준비)는 메인 시나리오에서
// 제외하고 추후 검토로 보류 — 코드는 남기고 게이트 선택지에서만 뺀다.
// 홈 화면 카테고리 버튼(일상 관리/자산·투자 관리/상속 준비)과 같은 아이콘·순서를 쓴다.
const CATEGORIES: {
  track: Track | "investment";
  icon: typeof Wallet;
  title: string;
  desc: string;
  meta: string;
  enabled: boolean;
}[] = [
  {
    track: "daily",
    icon: Wallet,
    title: "일상에 필요한 돈 관리를 미리 정해두고 싶어요",
    desc: "생활비, 공과금, 정기결제처럼 일상에 필요한 돈을 어떻게 관리할지 미리 정해둘 수 있어요.",
    meta: "약 8문항 · 2~3분",
    enabled: true,
  },
  {
    // 투자 트랙: 질문·선택지 설계가 아직 진행 중 (담당 이지수). 선택은 열어두되
    // 인터뷰로 보내지 않고 준비 중 안내만 보여준다.
    track: "investment",
    icon: TrendingUp,
    title: "내 자산을 어떻게 관리할지 미리 정해두고 싶어요",
    desc: "예금이나 주식 등 보유한 자산을 언제 유지하고 처분할지, 나만의 관리 원칙을 미리 정해둘 수 있어요.",
    meta: "질문 설계 중",
    enabled: false,
  },
  {
    track: "estate",
    icon: ScrollText,
    title: "내 재산을 어떻게 남길지 미리 정해두고 싶어요",
    desc: "누구에게 무엇을 남길지부터 나누는 방법과 순서까지, 내 뜻을 하나씩 정리해둘 수 있어요.",
    meta: "약 16문항 · 5~10분",
    enabled: true,
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
    if (t === "daily" || t === "estate") {
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
    // 이력 연동은 게이트 뒤에 온다. 트랙을 알아야 무엇을 뽑을지 정할 수 있다.
    router.push("/ledger");
  }

  const who = subject === "family" ? relation || "그분" : "본인";
  const blocking = capacity === "diagnosed" || capacity === "incident";

  return (
    <div className="gate shell-wide">
      {step === 0 && (
        <div className="fade-in">
          <div className="gate-step">STEP 1 / 3 · 준비할 내용 선택</div>
          <h1>무엇을 미리 준비해둘까요?</h1>
          <p className="gate-lede">
            앞으로 판단이나 결정이 어려워질 때를 대비해,
            <br />
            지금 정해두고 싶은 내용을 선택해주세요.
            <br />
            선택한 내용에 필요한 질문만 차례로 안내해드릴게요.
          </p>
          <div className="gate-cards triple">
            {CATEGORIES.map((c) => (
              <button
                key={c.track}
                className="gate-card"
                disabled={!c.enabled}
                aria-disabled={!c.enabled}
                onClick={() => c.enabled && pickTrack(c.track as Track)}
                aria-pressed={track === c.track}
              >
                <c.icon className="gate-card-icon" strokeWidth={1.5} aria-hidden="true" />
                <span className="t">{c.title}</span>
                <span className="d">{c.desc}</span>
                <span className="meta">
                  {c.enabled ? c.meta : <Badge tone="warn">{c.meta}</Badge>}
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
            본인을 위한 것인지, 가족을 대신한 것인지에 따라 가능한 제도가 달라집니다.
          </p>

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

          {subject === "family" && (
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
