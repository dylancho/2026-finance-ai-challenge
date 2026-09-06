"use client";

import { FlagCard } from "./ClauseCard";
import Disclaimer from "../common/Disclaimer";
import { DocBody, DocCard, DocRail, Todo, TodoRows, useActiveCard } from "./DocKit";
import type { CardTone, RailItem, TodoItem } from "./DocKit";
import type { Clause, TrustDesign } from "../../lib/types";

/*
 * 신탁설계서 — 지출설계서와 같은 카드 언어 (2026-09-07).
 *
 * 조항 열두 개를 한 장의 표로 눌러 담으면 무엇이 중요한지 사라진다. 지출설계서처럼
 * 카드 한 장에 조항 하나를 담고, 작은 라벨(제N조) → 쉬운 말 한 문장 → 조항 본문 순서로 읽힌다.
 * 조항 본문은 계약서에 그대로 실릴 문장이라 합니다체를 유지하고, 그 위의 안내 문장만 해요체다.
 * 조항 번호·제목은 의뢰서와 시뮬레이션이 인용하므로 손대지 않는다.
 * 카드마다 id="trust-N" 앵커를 달아 목차와 "아직 못 정한 곳" 에서 바로 내려갈 수 있게 한다.
 */

/** 조항이 무엇을 정하는지 한 문장(해요체)과, 비었을 때 무엇이 없는 셈인지. */
const GUIDE: Record<
  string,
  { lede: string; missing?: string; partial?: string }
> = {
  서문: {
    lede: "관리자와 가족이 판단이 어려울 때 돌아와 읽을 문장이에요.",
  },
  제1조: {
    lede: "이 신탁으로 무엇을 지킬지 정해요. 목적에 맞지 않는 지급은 여기서 막혀요.",
    missing: "목적이 비어 있으면 관리자가 지급을 거절할 근거가 없어요.",
  },
  제2조: {
    lede: "어떤 재산을 얼마나 맡길지예요. 나머지 조항은 모두 이 재산을 다뤄요.",
    missing: "맡길 재산이 없으면 아래 조항이 다룰 대상도 없어요.",
    partial: "맡길 재산은 골랐지만 금액이 비어 있어요. 금액이 있어야 얼마나 버티는지 계산할 수 있어요.",
  },
  제3조: {
    lede: "누가 맡기고, 누가 관리하고, 누가 받는지예요.",
    missing: "관리할 사람이 없으면 정작 그때 지급을 요청할 사람이 없어요.",
    partial: "관리자는 정했지만 예비 관리자나 혼자 요청할 수 있는 한도가 비어 있어요.",
  },
  제4조: {
    lede: "언제부터 이 설계서대로 돈이 나가기 시작하는지예요.",
    missing: "시작 조건이 없으면 판단이 어려워져도 아무 일도 일어나지 않아요.",
    partial: "시작 조건은 정했지만 그 일이 생겼는지 확인할 사람이 비어 있어요.",
  },
  제5조: {
    lede: "매달 얼마가 어떤 주기로 나갈지예요.",
    missing: "금액이 없으면 생활비가 얼마나 나갈지 정해지지 않아요.",
    partial: "매달 금액은 정했지만 요양시설에 들어갔을 때 얼마나 올릴지 비어 있어요.",
  },
  제6조: {
    lede: "치료비와 요양비가 갑자기 필요할 때의 기준이에요.",
    missing: "기준이 없으면 큰 병원비가 생겼을 때 지급할지 정할 근거가 없어요.",
  },
  제7조: {
    lede: "맡긴 재산을 어떻게 굴릴지예요.",
    missing: "방침이 없으면 시장이 흔들릴 때 판단이 사람마다 달라져요.",
  },
  제8조: {
    lede: "관리자도 할 수 없는 일을 미리 못 박아요.",
    missing: "금지행위가 없으면 부동산 처분이나 대출도 막을 근거가 없어요.",
  },
  제9조: {
    lede: "관리자를 지켜보고 이의를 제기할 사람이에요.",
    missing: "감독인이 없으면 관리자의 판단을 확인할 절차가 없어요.",
    partial: "감독인을 두지 않기로 했어요. 관리자의 판단을 확인할 절차가 없는 셈이에요.",
  },
  제10조: {
    lede: "이 계약을 언제 바꾸고 언제 끝낼지예요.",
    missing: "요건이 없으면 상황이 달라져도 계약을 손대기 어려워요.",
    partial: "종료와 변경 중 한쪽만 정했어요.",
  },
  제11조: {
    lede: "신탁이 끝날 때 남은 재산이 누구에게 가는지예요.",
    missing: "정하지 않으면 남은 재산은 법이 정한 몫대로 나뉘어요.",
  },
};

/** "제4조" → "trust-4", "서문" → "trust-preamble" */
function anchorOf(no: string): string {
  const n = /제(\d+)조/.exec(no)?.[1];
  return n ? `trust-${n}` : "trust-preamble";
}

function toneOf(c: Clause): CardTone | undefined {
  return c.status === "missing" ? "missing" : c.status === "partial" ? "partial" : undefined;
}

/* ── 비어 있는 조항만 렌더 ─────────────────────────── */

function ClauseSection({ clause }: { clause: Clause }) {
  const guide = GUIDE[clause.no] ?? { lede: "" };
  const tone = toneOf(clause);
  const todo = tone === "missing" ? guide.missing : tone === "partial" ? guide.partial : undefined;

  // 비어 있는 조항의 본문은 "아직 정하지 않았습니다." 한 줄뿐이라, 그 자리를 안내 블록이 대신한다.
  const body = tone === "missing" ? [] : clause.body;

  return (
    <DocCard
      id={anchorOf(clause.no)}
      label={clause.no}
      title={clause.title}
      lede={guide.lede || undefined}
      tone={tone}
    >
      {body.length > 0 && <DocBody lines={body} />}
      {clause.note && <p className="xd-note">{clause.note}</p>}
      {todo && <Todo what={todo} qid={clause.sources[0]} />}
    </DocCard>
  );
}

/* ── 본문 ──────────────────────────────────────────── */

export default function TrustDoc({ design }: { design: TrustDesign }) {
  const activeId = useActiveCard("trust-", design);

  if (!design.available) {
    return (
      <div className="xd-solo">
        <div className="xd-col">
          <DocCard
            id="trust-blocked"
            label="신탁설계서"
            title="지금은 새 신탁을 만들기 어려워요"
            lede={design.blockedReason}
            hero
          />

          <DocCard
            id="trust-alts"
            label="다른 길"
            title="대신 살펴볼 수 있는 방법이 있어요"
            lede="신탁이 아니어도 재산을 지키는 절차는 남아 있어요."
          >
            <ul className="xd-list">
              {design.type.alternatives.map((a) => (
                <li className="xd-row" key={a.name}>
                  <div className="xd-row-main">
                    <div className="l">{a.name}</div>
                    <div className="s">{a.why}</div>
                  </div>
                </li>
              ))}
            </ul>
          </DocCard>

          <DocCard id="trust-why" label="판단 근거" title="이렇게 본 이유예요">
            <ul className="xd-why">
              {design.type.rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </DocCard>

          {design.flags.length > 0 && (
            <section className="xd-card" aria-label="다시 살펴볼 곳">
              <div className="xd-no">다시 살펴볼 곳</div>
              <div className="xd-flags">
                {design.flags.map((f, i) => (
                  <FlagCard key={i} flag={f} />
                ))}
              </div>
            </section>
          )}

          <Disclaimer />
        </div>
      </div>
    );
  }

  const counted = design.clauses.filter((c) => c.no !== "서문");
  const setCount = counted.filter((c) => c.status === "set").length;
  const partialCount = counted.filter((c) => c.status === "partial").length;
  const missingCount = counted.filter((c) => c.status === "missing").length;
  const openCount = partialCount + missingCount;
  const pct = (n: number) => `${(n / Math.max(counted.length, 1)) * 100}%`;

  const todos: TodoItem[] = counted
    .filter((c) => c.status !== "set")
    .map((c) => ({
      href: `#${anchorOf(c.no)}`,
      label: `${c.no} ${c.title}`,
      what:
        (c.status === "missing" ? GUIDE[c.no]?.missing : GUIDE[c.no]?.partial) ??
        "아직 정하지 않았어요.",
      cta: c.status === "missing" ? "채우러 가기 →" : "마저 채우기 →",
    }));

  const rail: RailItem[] = [
    { id: "trust-type", label: "검토할 구조" },
    ...(openCount > 0 ? [{ id: "trust-todo", label: "아직 못 정한 곳" }] : []),
    ...design.clauses.map((c) => ({
      id: anchorOf(c.no),
      no: c.no === "서문" ? undefined : c.no,
      label: c.no === "서문" ? "위탁자의 뜻" : c.title,
      tone: toneOf(c),
    })),
    { id: "trust-cost", label: "비용 안내" },
  ];

  return (
    <div className="xd">
      <DocRail items={rail} activeId={activeId} editHref="/interview" />

      <div className="xd-col">
        <DocCard
          id="trust-type"
          label="신탁설계서"
          title={design.type.name}
          lede="답을 보고 먼저 검토한 구조예요. 실제로 맺을 상품과 기관은 상담에서 정해요."
          hero
        >
          <ul className="xd-facts" aria-label="조항 상태 요약">
            <li>
              조항 <b>{counted.length}개</b>
            </li>
            <li>
              정한 조항 <b>{setCount}개</b>
            </li>
            <li>
              {openCount > 0 ? (
                <>
                  아직 못 정한 조항 <b>{openCount}개</b>
                </>
              ) : (
                <>빈 조항이 없어요</>
              )}
            </li>
          </ul>

          <div
            className="xd-meter"
            role="img"
            aria-label={`조항 ${counted.length}개 중 ${setCount}개를 정했어요`}
          >
            {setCount > 0 && <i className="set" style={{ width: pct(setCount) }} />}
            {partialCount > 0 && <i className="partial" style={{ width: pct(partialCount) }} />}
            {missingCount > 0 && <i className="missing" style={{ width: pct(missingCount) }} />}
          </div>
          <div className="xd-legend plain">
            <span>
              <i className="set" /> 정했어요 {setCount}
            </span>
            {partialCount > 0 && (
              <span>
                <i className="partial" /> 더 채울 곳 {partialCount}
              </span>
            )}
            {missingCount > 0 && (
              <span>
                <i className="missing" /> 아직 안 정했어요 {missingCount}
              </span>
            )}
          </div>

          <ul className="xd-why">
            {design.type.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {design.type.alternatives.length > 0 && (
            <details className="xd-more">
              <summary>함께 살펴볼 다른 방법 {design.type.alternatives.length}가지</summary>
              <ul className="xd-list">
                {design.type.alternatives.map((a) => (
                  <li className="xd-row" key={a.name}>
                    <div className="xd-row-main">
                      <div className="l">{a.name}</div>
                      <div className="s">{a.why}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </DocCard>

        {openCount > 0 && (
          <DocCard
            id="trust-todo"
            label="아직 못 정한 곳"
            title={`${openCount}개 조항이 비어 있어요`}
            lede="비어 있는 조항은 그 순간이 왔을 때 아무것도 정해 주지 않아요. 눌러서 그 자리로 가요."
            tone={missingCount > 0 ? "missing" : "partial"}
          >
            <TodoRows items={todos} />
          </DocCard>
        )}

        {design.flags.length > 0 && (
          <section className="xd-card" aria-label="다시 살펴볼 곳">
            <div className="xd-no">다시 살펴볼 곳</div>
            <div className="xd-flags">
              {design.flags.map((f, i) => (
                <FlagCard key={i} flag={f} />
              ))}
            </div>
          </section>
        )}

        {design.clauses.map((c) => (
          <ClauseSection key={c.no} clause={c} />
        ))}

        <DocCard
          id="trust-cost"
          label="비용 안내"
          title="드는 돈은 기관과 재산 구성에 따라 달라져요"
          lede="아래는 공시로 확인되는 일반 정보예요. 실제 견적은 상담에서 받아야 해요."
        >
          <ul className="xd-list">
            {design.cost.map((c) => (
              <li className="xd-row" key={c.label}>
                <div className="xd-row-main">
                  <div className="l">{c.label}</div>
                  <div className="s">{c.value}</div>
                </div>
              </li>
            ))}
          </ul>
        </DocCard>

        <Disclaimer />
      </div>
    </div>
  );
}
