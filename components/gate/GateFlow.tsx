"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { emptyProfile, readProfile, saveProfile } from "../../lib/profile";
import { CHAPTER_META, isUnified } from "../../lib/questions";
import type { Capacity, Chapter, Profile } from "../../lib/types";

/**
 * 게이트 = 상황 입력.
 *
 * 2026-09-03 구조 전환: 카테고리(트랙) 선택 STEP 을 없앴다. 어느 경로로 들어와도
 * 같은 게이트 → 이력 → 코어 인터뷰로 진입하고, 홈 버튼이 넘긴 ?focus= 는 코어를
 * 마친 뒤 챕터 제안 화면에서 그 챕터를 맨 위에 올리는 데만 쓴다.
 *
 * 남은 것은 옛 STEP 2 — 의사능력 3택 + 사고 발생 여부. 이것이 게이트의 전부다.
 */

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

const FOCUSABLE: Chapter[] = ["invest", "estate", "medical"];

export default function GateFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");
  const focus = FOCUSABLE.find((c) => c === focusParam) ?? null;

  const [capacityLevel, setCapacityLevel] = useState<Capacity | null>(null);
  const [hasIncident, setHasIncident] = useState<boolean | null>(null);

  function finish() {
    if (!capacityLevel || hasIncident === null) return;
    // 사고 발생 여부가 의사능력 축보다 더 즉각적인 개입이 필요한 신호라
    // 우선한다 — 둘 다 blocking 취급은 동일해서 어느 쪽이 저장돼도 하위
    // 설계서 로직(diagnosed/incident를 항상 같이 검사)에는 차이가 없다.
    const cap: Capacity = hasIncident ? "incident" : capacityLevel;
    const base: Profile = { ...emptyProfile(), ...readProfileSafely() };
    // 통합 플로우끼리는 답변을 이어 쓴다. 보류 트랙 데모(B/C/D)에서 넘어온
    // 프로필은 질문 체계가 달라 답변을 물려받지 않는다.
    const keep = isUnified(base);
    const next: Profile = {
      ...base,
      track: "daily",
      // 서비스 대상을 고령층 당사자 본인으로 한정하기로 하면서 대상(본인/가족)
      // 선택 STEP을 게이트에서 제거했다 (2026-08-31). subject는 항상 본인이다.
      subject: "self",
      subjectRelation: undefined,
      capacity: cap,
      answers: keep ? base.answers : {},
      transcript: keep ? base.transcript : [],
      chaptersCompleted: keep ? (base.chaptersCompleted ?? []) : [],
    };
    saveProfile(next);
    // 이력 연동은 게이트 뒤에 온다. 관심 챕터는 인터뷰까지 URL 로 넘긴다.
    router.push(focus ? `/ledger?focus=${focus}` : "/ledger");
  }

  const blocking = capacityLevel === "diagnosed" || hasIncident === true;
  const canFinish = !!capacityLevel && hasIncident !== null;

  return (
    <div className="gate shell-wide">
      <div className="fade-in gate-center">
        <div className="gate-step">
          약 {CHAPTER_META.core.count}문항 · {CHAPTER_META.core.minutes}, 필요한 부분만 더
        </div>
        <h1>지금 상태를 알려주세요</h1>
        <p className="gate-lede">
          이 답변에 따라 어떤 제도가 가능한지가 달라집니다.
          <br />
          신탁계약과 임의후견계약은 본인의 의사능력을 전제로 하기 때문에,
          <br />
          시점을 놓치면 선택지가 법정후견으로 좁아집니다.
        </p>
        {focus && (
          <p className="gate-focus mono">
            {CHAPTER_META[focus].label}을(를) 고르셨네요. 기본 질문이 끝나면 이 영역부터
            이어서 여쭤봅니다.
          </p>
        )}

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
          <Link href="/" className="btn ghost">
            ← 홈으로
          </Link>
          <button className="btn" disabled={!canFinish} onClick={finish}>
            {blocking ? "가능한 경로로 설계 시작" : "설계 시작"}
          </button>
        </div>
      </div>
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
