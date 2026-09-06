"use client";

import { FlagCard } from "./ClauseCard";
import Disclaimer from "../common/Disclaimer";
import { DocBody, DocCard, DocRail, Todo, TodoRows, useActiveCard } from "./DocKit";
import type { RailItem, TodoItem } from "./DocKit";
import { personLabel } from "../../lib/format";
import { entryQuestionForClause } from "../../lib/questions";
import type { GuardianshipDesign, Profile, ScopeGrant, ScopeItem } from "../../lib/types";

/*
 * 후견설계서 — 지출설계서와 같은 카드 언어 (2026-09-07).
 *
 * 표 두 개와 사이드바로 나뉘어 있던 화면을 카드 한 줄로 세웠다. 카드 한 장에 판단 하나,
 * 큰 제목 하나와 그것을 설명하는 한 문장이 먼저 오고 세부는 목록 행으로 내려간다.
 * 효력 요건은 문서 본문이라 합니다체를 유지하고, 그 밖의 안내 문장은 해요체다.
 * "동의유보" 는 한정후견의 법률 용어지만 꼬리표로는 낯설어 "동의 필요" 로 적는다.
 */

const GRANT: Record<ScopeGrant, { label: string; cls: string }> = {
  delegate: { label: "맡겨요", cls: "ok" },
  // "동의 필요" 는 비어 있는 항목이 아니라 정해 둔 규칙이라, "아직" 을 뜻하는 주황이 아닌 파랑을 쓴다.
  consent: { label: "동의 필요", cls: "info" },
  exclude: { label: "안 맡겨요", cls: "neutral" },
};

/** 설계 엔진이 붙인 짧은 메모를 화면 말투로 바꾼다. 데이터는 그대로 둔다. */
function noteText(it: ScopeItem): string | undefined {
  if (it.note === "고르지 않음") return "이 일은 고르지 않았어요.";
  return it.note;
}

function ScopeCard({
  id,
  label,
  items,
  kind,
  qid,
}: {
  id: string;
  label: string;
  items: ScopeItem[];
  kind: "재산" | "신상보호";
  qid?: string;
}) {
  const delegated = items.filter((i) => i.grant === "delegate").length;
  const consent = items.filter((i) => i.grant === "consent").length;
  const excluded = items.length - delegated - consent;

  return (
    <DocCard
      id={id}
      label={label}
      title={
        delegated > 0
          ? `${items.length}가지 중 ${delegated}가지를 후견인에게 맡겨요`
          : `${items.length}가지 중 맡기는 일이 아직 없어요`
      }
      lede={
        delegated > 0 ? (
          <>
            맡긴 일은 후견인이 혼자 처리해요. <b>동의 필요</b>로 둔 {consent}가지는 감독인의 동의가
            있어야 하고, 나머지 {excluded}가지는 후견인이 손대지 못해요.
          </>
        ) : (
          "무엇을 맡길지 고르지 않으면 법원이 범위를 정할 때 참고할 근거가 없어요."
        )
      }
      tone={delegated > 0 ? undefined : "missing"}
    >
      <ul className="xd-list">
        {items.map((it) => (
          <li className={`xd-row ${it.grant === "exclude" ? "off" : ""}`} key={it.key}>
            <div className="xd-row-main">
              <div className="l">{it.label}</div>
              {noteText(it) && <div className="s">{noteText(it)}</div>}
            </div>
            <span className={`xd-tag ${GRANT[it.grant].cls}`}>{GRANT[it.grant].label}</span>
          </li>
        ))}
      </ul>
      {delegated === 0 && (
        <Todo what={`${kind}에서 맡길 일을 아직 고르지 않았어요.`} qid={qid} />
      )}
    </DocCard>
  );
}

export default function GuardianshipDoc({
  design,
  profile,
}: {
  design: GuardianshipDesign;
  profile: Profile;
}) {
  const activeId = useActiveCard("gd-", design);

  const q = (clause: string, match?: (l: string) => boolean) =>
    entryQuestionForClause(profile, "guardianship", clause, match)?.id;

  const guardianQ = q("제2조");
  const supervisorQ = q("제4조");
  const propertyQ = q("제3조", (l) => !l.includes("신상보호"));
  const personalQ = q("제3조", (l) => l.includes("신상보호"));

  const delegatedProperty = design.scopeProperty.filter((i) => i.grant === "delegate").length;
  const delegatedPersonal = design.scopePersonal.filter((i) => i.grant === "delegate").length;

  /* 비어 있는 곳. 화면에 보이는 것만 모은다. */
  const todos: TodoItem[] = [];
  if (!design.guardians.primary)
    todos.push({
      href: "#gd-people",
      label: "후견인 후보",
      what: "맡길 사람이 없으면 법원이 후보 없이 정하게 돼요.",
      cta: "채우러 가기 →",
    });
  if (!design.guardians.backup)
    todos.push({
      href: "#gd-people",
      label: "예비 후견인",
      what: "후견인이 먼저 그만두면 그때 다시 법원 절차를 밟아야 해요.",
      cta: "채우러 가기 →",
    });
  if (!design.supervisor.assigned)
    todos.push({
      href: "#gd-people",
      label: "후견감독인",
      what: "후견인의 재산 관리를 확인할 사람이 없어요.",
      cta: "채우러 가기 →",
    });
  if (delegatedProperty === 0)
    todos.push({
      href: "#gd-property",
      label: "재산 관리로 맡길 일",
      what: "무엇을 맡길지 고르지 않았어요.",
      cta: "고르러 가기 →",
    });
  if (delegatedPersonal === 0)
    todos.push({
      href: "#gd-personal",
      label: "신상보호로 맡길 일",
      what: "거주지와 의료를 누가 정할지 비어 있어요.",
      cta: "고르러 가기 →",
    });

  const rail: RailItem[] = [
    { id: "gd-verdict", label: "맞는 제도" },
    ...(todos.length > 0
      ? [{ id: "gd-todo", label: "아직 못 정한 곳", tone: "missing" as const }]
      : []),
    { id: "gd-tree", label: "이렇게 판단했어요" },
    {
      id: "gd-property",
      label: "재산 관리",
      tone: delegatedProperty === 0 ? ("missing" as const) : undefined,
    },
    {
      id: "gd-personal",
      label: "신상보호",
      tone: delegatedPersonal === 0 ? ("missing" as const) : undefined,
    },
    {
      id: "gd-people",
      label: "관련된 사람",
      tone:
        design.guardians.primary && design.supervisor.assigned && design.guardians.backup
          ? undefined
          : ("missing" as const),
    },
    { id: "gd-effect", label: "효력이 생기려면" },
    ...(design.roadmap.length > 0 ? [{ id: "gd-roadmap", label: "절차 순서" }] : []),
  ];

  return (
    <div className="xd">
      <DocRail items={rail} activeId={activeId} editHref="/interview" />

      <div className="xd-col">
        <DocCard
          id="gd-verdict"
          label="후견설계서"
          title={design.verdict.name}
          lede="답을 보고 이 제도를 먼저 검토했어요. 실제 청구 전에는 전문가 확인이 필요해요."
          hero
        >
          <ul className="xd-facts" aria-label="후견 요약">
            <li>
              후견인 후보 <b>{personLabel(design.guardians.primary)}</b>
            </li>
            <li>
              맡기는 일 <b>{delegatedProperty + delegatedPersonal}가지</b>
            </li>
            <li>
              {todos.length > 0 ? (
                <>
                  아직 못 정한 곳 <b>{todos.length}군데</b>
                </>
              ) : (
                <>빈 곳이 없어요</>
              )}
            </li>
          </ul>

          <ul className="xd-why">
            {design.verdict.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {design.verdict.ruledOut.length > 0 && (
            <details className="xd-more">
              <summary>맞지 않는 제도 {design.verdict.ruledOut.length}가지와 그 이유</summary>
              <ul className="xd-list">
                {design.verdict.ruledOut.map((r) => (
                  <li className="xd-row" key={r.name}>
                    <div className="xd-row-main">
                      <div className="l">{r.name}</div>
                      <div className="s">{r.why}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </DocCard>

        {todos.length > 0 && (
          <DocCard
            id="gd-todo"
            label="아직 못 정한 곳"
            title={`${todos.length}군데가 비어 있어요`}
            lede="비어 있으면 법원이 정할 때 참고할 것이 없어요. 눌러서 그 자리로 가요."
            tone="missing"
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

        <DocCard
          id="gd-tree"
          label="판단 과정"
          title="이렇게 판단했어요"
          lede="두 가지만 물으면 어느 제도인지 갈려요. 답이 달라지면 제도도 달라져요."
        >
          <ol className="xd-steps rows">
            {design.tree.map((n, i) => (
              <li key={i}>
                <span className="dot">{i + 1}</span>
                <div>
                  <div className="s">{n.question}</div>
                  <div className="l">{n.answer}</div>
                </div>
              </li>
            ))}
          </ol>
        </DocCard>

        <ScopeCard
          id="gd-property"
          label="재산 관리"
          items={design.scopeProperty}
          kind="재산"
          qid={propertyQ}
        />
        <ScopeCard
          id="gd-personal"
          label="신상보호"
          items={design.scopePersonal}
          kind="신상보호"
          qid={personalQ}
        />

        <DocCard
          id="gd-people"
          label="관련된 사람"
          title={
            design.guardians.primary
              ? `${personLabel(design.guardians.primary)}께 맡기려고 해요`
              : "맡길 사람을 아직 정하지 않았어요"
          }
          lede={design.supervisor.note}
          tone={
            design.guardians.primary && design.guardians.backup && design.supervisor.assigned
              ? undefined
              : "missing"
          }
        >
          <ul className="xd-list">
            <li className="xd-row">
              <div className="xd-row-main">
                <div className="l">후견인 후보</div>
                <div className="s">실제로 일을 맡아 처리할 사람이에요.</div>
              </div>
              <span className={`xd-val ${design.guardians.primary ? "" : "muted"}`}>
                {design.guardians.primary
                  ? personLabel(design.guardians.primary)
                  : "아직 정하지 않았어요"}
              </span>
            </li>
            <li className="xd-row">
              <div className="xd-row-main">
                <div className="l">예비 후견인</div>
                <div className="s">후견인이 그만두게 되면 이어받을 사람이에요.</div>
              </div>
              <span className={`xd-val ${design.guardians.backup ? "" : "muted"}`}>
                {design.guardians.backup
                  ? personLabel(design.guardians.backup)
                  : "아직 정하지 않았어요"}
              </span>
            </li>
            <li className="xd-row">
              <div className="xd-row-main">
                <div className="l">후견감독인</div>
                <div className="s">후견인의 재산 관리를 확인하는 사람이에요.</div>
              </div>
              <span className={`xd-val ${design.supervisor.assigned ? "" : "muted"}`}>
                {design.supervisor.assigned ? design.supervisor.label : "아직 정하지 않았어요"}
              </span>
            </li>
          </ul>

          {!design.guardians.primary && (
            <Todo what="맡길 사람이 없으면 법원이 후보 없이 정하게 돼요." qid={guardianQ} />
          )}
          {design.guardians.primary && !design.guardians.backup && (
            <Todo
              what="예비 후견인이 비어 있어요. 후견인이 먼저 그만두면 그때 다시 법원 절차를 밟아야 해요."
              qid={guardianQ}
            />
          )}
          {!design.supervisor.assigned && (
            <Todo
              what="후견감독인이 비어 있어요. 후견인의 재산 관리를 확인할 절차가 없어요."
              qid={supervisorQ}
            />
          )}
        </DocCard>

        <DocCard
          id="gd-effect"
          label="효력"
          title="이 조건이 갖춰져야 효력이 생겨요"
          lede="서류를 만들어 두는 것만으로는 권한이 생기지 않아요."
        >
          <DocBody lines={design.effect} />
        </DocCard>

        {design.roadmap.length > 0 && (
          <DocCard
            id="gd-roadmap"
            label="절차 순서"
            title={`${design.roadmap.length}단계를 거쳐요`}
            lede="아래 순서대로 진행해요. 걸리는 시간과 준비할 서류를 단계마다 적어 두었어요."
          >
            <ol className="xd-steps rows">
              {design.roadmap.map((s) => (
                <li key={s.n}>
                  <span className="dot">{s.n}</span>
                  <div>
                    <div className="l">{s.title}</div>
                    <div className="s">{s.detail}</div>
                    <div className="xd-chips">
                      <span className="xd-chip plain">걸리는 시간 {s.period}</span>
                      <span className="xd-chip plain">{s.cost}</span>
                      {s.docs.map((d) => (
                        <span
                          className={`xd-chip ${d.includes("보유") ? "have" : "todo"}`}
                          key={d}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </DocCard>
        )}

        <Disclaimer>
          위 절차는 일반적인 흐름입니다. 요건·절차·기간은 사건과 법원에 따라 다르므로,
          청구 전에 변호사·법무사의 확인이 필요합니다.
        </Disclaimer>
      </div>
    </div>
  );
}
