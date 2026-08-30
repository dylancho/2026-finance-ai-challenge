"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wallet, TrendingUp, ScrollText } from "lucide-react";
import Badge from "../common/Badge";
import { emptyProfile, readProfile, saveProfile } from "../../lib/profile";
import type { Capacity, Profile, Track } from "../../lib/types";

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

// 2026-08-31 피드백: 의사능력(의학적 상태)과 금융 사고 발생 여부(사건)는
// 서로 다른 축이라 겹칠 수 있다 — 배타적인 카드 4개 대신 두 질문으로 나눈다.
// 저장되는 Capacity 값 자체(full/declining/diagnosed/incident)는 그대로 두고,
// UI에서만 두 질문으로 나눠 받은 뒤 finish()에서 하나로 합친다.
const CAPACITY_LEVELS: {
  value: Capacity;
  title: string;
  desc: string;
}[] = [
  {
    value: "full",
    title: "네, 스스로 판단하고 결정할 수 있습니다",
    desc: "금융 업무와 계약 내용을 이해하고, 본인의 뜻에 따라 직접 결정할 수 있습니다.",
  },
  {
    value: "declining",
    title: "최근 기억이나 판단이 예전과 다르게 느껴집니다",
    desc: "아직 직접 결정할 수 있지만, 기억력이나 판단력의 변화를 느끼고 있어 미리 준비하고 싶습니다.",
  },
  {
    value: "diagnosed",
    title: "인지장애·치매 등을 진단받았습니다",
    desc: "진단을 받은 상태이며, 현재 가능한 범위 안에서 미리 준비할 방법을 확인하고 싶습니다.",
  },
];

const INCIDENT_OPTIONS: {
  value: boolean;
  title: string;
  desc?: string;
}[] = [
  {
    value: false,
    title: "아니요",
  },
  {
    value: true,
    title: "이미 금융 문제나 피해가 발생했습니다",
    desc: "사기 피해, 설명하기 어려운 이체, 계좌 접근 문제 등 실제 금융 문제가 발생했습니다.",
  },
];

export default function GateFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState<Track | null>(null);
  const [capacityLevel, setCapacityLevel] = useState<Capacity | null>(null);
  const [hasIncident, setHasIncident] = useState<boolean | null>(null);

  function pickTrack(t: Track) {
    setTrack(t);
    setStep(1);
  }

  function finish() {
    if (!track || !capacityLevel || hasIncident === null) return;
    // 사고 발생 여부가 의사능력 축보다 더 즉각적인 개입이 필요한 신호라
    // 우선한다 — 둘 다 blocking 취급은 동일해서 어느 쪽이 저장돼도 하위
    // 설계서 로직(diagnosed/incident를 항상 같이 검사)에는 차이가 없다.
    const cap: Capacity = hasIncident ? "incident" : capacityLevel;
    const base: Profile = { ...emptyProfile(), ...readProfileSafely() };
    const next: Profile = {
      ...base,
      track,
      // 서비스 대상을 고령층 당사자 본인으로 한정하기로 하면서 대상(본인/가족)
      // 선택 STEP을 게이트에서 제거했다 (2026-08-31). subject는 항상 본인이다.
      subject: "self",
      subjectRelation: undefined,
      capacity: cap,
      // 트랙이 바뀌면 이전 트랙의 답변은 의미가 없다.
      answers: base.track === track ? base.answers : {},
      transcript: base.track === track ? base.transcript : [],
    };
    saveProfile(next);
    // 이력 연동은 게이트 뒤에 온다. 트랙을 알아야 무엇을 뽑을지 정할 수 있다.
    router.push("/ledger");
  }

  const blocking = capacityLevel === "diagnosed" || hasIncident === true;
  const canFinish = !!capacityLevel && hasIncident !== null;

  return (
    <div className="gate shell-wide">
      {step === 0 && (
        <div className="fade-in gate-center">
          <div className="gate-step">STEP 1 / 2</div>
          <h1>무엇을 미리 준비해둘까요?</h1>
          <p className="gate-lede">
            앞으로 판단이나 결정이 어려워질 때를 대비해, 지금 정해두고 싶은 내용을 선택해주세요.
            <br />
            선택한 내용에 필요한 질문만 차례로 안내해드릴게요.
          </p>
          <div className="gate-cards stacked">
            {CATEGORIES.map((c) => (
              <button
                key={c.track}
                className="gate-card gate-card-side"
                disabled={!c.enabled}
                aria-disabled={!c.enabled}
                onClick={() => c.enabled && pickTrack(c.track as Track)}
                aria-pressed={track === c.track}
              >
                <c.icon className="gate-card-icon" strokeWidth={1.5} aria-hidden="true" />
                <span className="gate-card-text">
                  <span className="t">{c.title}</span>
                  <span className="d">{c.desc}</span>
                  <span className="meta">
                    {c.enabled ? c.meta : <Badge tone="warn">{c.meta}</Badge>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in gate-center">
          <div className="gate-step">STEP 2 / 2</div>
          <h1>지금 상태를 알려주세요</h1>
          <p className="gate-lede">
            이 답변에 따라 어떤 제도가 가능한지가 달라집니다.
            <br />
            신탁계약과 임의후견계약은 본인의 의사능력을 전제로 하기 때문에,
            <br />
            시점을 놓치면 선택지가 법정후견으로 좁아집니다.
          </p>

          <div className="gate-subq">
            <h2 className="gate-subq-title">1. 지금 스스로 금융 결정을 할 수 있나요?</h2>
            <div className="gate-cards stacked">
              {CAPACITY_LEVELS.map((c) => (
                <button
                  key={c.value}
                  className="gate-card"
                  aria-pressed={capacityLevel === c.value}
                  onClick={() => setCapacityLevel(c.value)}
                >
                  <span className="t">{c.title}</span>
                  <span className="d">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="gate-subq">
            <h2 className="gate-subq-title">2. 이미 금융 문제가 발생했나요?</h2>
            <div className="gate-cards stacked">
              {INCIDENT_OPTIONS.map((o) => (
                <button
                  key={String(o.value)}
                  className="gate-card"
                  aria-pressed={hasIncident === o.value}
                  onClick={() => setHasIncident(o.value)}
                >
                  <span className="t">{o.title}</span>
                  {o.desc && <span className="d">{o.desc}</span>}
                </button>
              ))}
            </div>
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

          {capacityLevel === "declining" && !blocking && (
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
              ← 이전
            </button>
            <button className="btn" disabled={!canFinish} onClick={finish}>
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
