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
 * 같은 게이트 → 코어 인터뷰로 진입하고, 홈 버튼이 넘긴 ?focus= 는 코어를
 * 마친 뒤 챕터 제안 화면에서 그 챕터를 맨 위에 올리는 데만 쓴다.
 *
 * 2026-09-06: 게이트와 인터뷰 사이에 있던 이력 연동(/ledger)을 뺐다. 이력은
 * 선택 사항인데 필수 단계처럼 보여 인터뷰 진입이 늦어졌다. 헤더 메뉴에서
 * 언제든 들어갈 수 있고, 인터뷰 안에서도 한 줄 안내로 권한다.
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
    title: "네, 스스로 판단하고 결정할 수 있어요",
    desc: "금융 업무와 계약 내용을 이해하고, 내 뜻대로 직접 결정할 수 있어요.",
  },
  {
    value: "declining",
    title: "최근 기억이나 판단이 예전 같지 않다고 느껴요",
    desc: "아직 직접 결정할 수 있지만, 기억력이나 판단력이 달라진 것 같아 미리 준비하고 싶어요.",
  },
  {
    value: "diagnosed",
    title: "인지장애나 치매 진단을 받았어요",
    desc: "진단을 받은 상태예요. 지금 가능한 범위 안에서 준비할 방법을 알고 싶어요.",
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
    title: "이미 금융 문제나 피해가 생겼어요",
    desc: "사기 피해, 설명하기 어려운 이체, 계좌에 접근하지 못하는 문제 같은 일이 실제로 있었어요.",
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
    // 2026-09-06: 게이트에서 인터뷰로 바로 간다 (이력 연동은 헤더 메뉴로 이동).
    // 관심 챕터는 인터뷰까지 URL 로 넘긴다.
    router.push(focus ? `/interview?focus=${focus}` : "/interview");
  }

  const blocking = capacityLevel === "diagnosed" || hasIncident === true;
  const canFinish = !!capacityLevel && hasIncident !== null;

  return (
    <div className="gate shell-wide">
      <div className="fade-in gate-center">
        <div className="gate-step">
          기본 질문 {CHAPTER_META.core.count}개 · 약 {CHAPTER_META.core.minutes}. 필요한 부분만 더 답해요
        </div>
        <h1>지금 상태를 알려 주세요</h1>
        <p className="gate-lede">
          이 답에 따라 쓸 수 있는 제도가 달라져요.
          <br />
          신탁계약과 임의후견계약은 본인이 스스로 결정할 수 있을 때만 맺을 수 있어요.
          <br />
          시점을 놓치면 선택지가 법정후견으로 좁아져요.
        </p>
        {focus && (
          <p className="gate-focus mono">
            {CHAPTER_META[focus].label} 영역을 고르셨네요. 기본 질문이 끝나면 이 영역부터
            이어서 여쭤볼게요.
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
          <h2 className="gate-subq-title">2. 이미 금융 문제가 생긴 적이 있나요?</h2>
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
            <h4>먼저 알려 드릴 것이 있어요</h4>
            <p>
              스스로 결정하기 어려운 상태에서는 새로 신탁계약이나 임의후견계약을 맺기 어려워요.
              나중에 그 계약이 유효한지 다툼이 생길 수 있어서예요.
              <br />
              이 경우 NEXT는 <b>법정후견(한정후견·성년후견) 준비</b>와{" "}
              <b>지금 바로 할 수 있는 계좌 보호 조치</b>를 중심으로 설계서를 만들어요.
              신탁설계서는 만들지 않고, 대신 그 이유와 다른 길을 보여 드려요.
            </p>
          </div>
        )}

        {capacityLevel === "declining" && !blocking && (
          <div className="gate-warn fade-in">
            <h4>시간이 많지 않을 수 있어요</h4>
            <p>
              아직 가능한 때예요. 다만 이 시기에 맺은 계약은 나중에 판단 능력을 두고 다툼이
              생길 수 있어요. 그래서 계약할 때 전문의 소견서를 함께 받아 두는 것이 보통이에요.
            </p>
          </div>
        )}

        <div className="gate-nav">
          <Link href="/" className="btn ghost">
            ← 홈으로
          </Link>
          <button className="btn" disabled={!canFinish} onClick={finish}>
            {blocking ? "가능한 길로 시작하기" : "인터뷰 시작하기"}
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
