"use client";

import Link from "next/link";
import { DocCard, Todo } from "./DocKit";
import type { Contrast, Resolution } from "../../lib/types";
import { docName } from "../../lib/ai/rules";

/**
 * 내가 정한 것(인터뷰) 과 실제로 해 온 것(이력) 의 비교.
 *
 * gaps 가 "안 채운 칸" 이라면 여기는 "채웠는데 사실과 어긋나는 칸" 이다.
 *
 * 2026-09-07: 지출설계서와 같은 카드 언어로 다시 짰다. 카드 한 장에 문항 하나,
 * 두 값을 옅은 타일 두 개로 나란히 놓고, 무엇을 고를지 정하지 않은 카드는
 * 비어 있는 항목과 같은 표시(꼬리표·테두리·안내 블록)를 쓴다.
 */

const AGREEMENT: Record<Contrast["agreement"], { cls: string; label: string }> = {
  aligned: { cls: "ok", label: "같아요" },
  tension: { cls: "warn", label: "어긋나요" },
  contradiction: { cls: "danger", label: "많이 달라요" },
};

// 2026-09-07 문체 가이드: "선언/관측/명문화" 는 내부 용어라 버튼에도 사람 말을 쓴다.
const RESOLUTION_LABEL: Record<Resolution, string> = {
  declared: "내가 정한 대로",
  observed: "실제 해 온 대로",
  adjusted: "절충해서 조항에 적기",
};

interface Props {
  contrasts: Contrast[];
  interpretations: Record<string, { text: string; source: "rule" | "llm" }>;
  onResolve: (c: Contrast, r: Resolution) => void;
  onUndo: (c: Contrast) => void;
}

export default function ContrastPanel({
  contrasts,
  interpretations,
  onResolve,
  onUndo,
}: Props) {
  if (!contrasts.length) {
    return (
      <div className="xd-solo">
        <div className="xd-col">
          <DocCard
            id="ct-empty"
            label="정한 것과 실제 비교"
            title="아직 비교할 이력이 없어요"
            lede="금융 이력을 불러오면 답과 실제 행동이 어긋나는 곳을 여기서 짚어 드려요."
            hero
            tone="missing"
          >
            <div className="xd-todo">
              <p className="w">
                10년치 거래를 읽어 문항별로 나란히 놓아요. 이력은 이 기기에만 저장돼요.
              </p>
              <Link className="go" href="/ledger">
                <span className="q">금융 이력 불러오기</span>
                <span className="c">불러오러 가기 →</span>
              </Link>
            </div>
          </DocCard>
        </div>
      </div>
    );
  }

  const gaps = contrasts.filter((c) => c.agreement !== "aligned");
  const open = gaps.filter((c) => !c.resolution);
  const contradictions = gaps.filter((c) => c.agreement === "contradiction").length;

  return (
    <div className="xd-solo">
      <div className="xd-col">
        <DocCard
          id="ct-summary"
          label="정한 것과 실제 비교"
          title={
            open.length > 0
              ? `아직 정하지 않은 곳이 ${open.length}군데 있어요`
              : gaps.length > 0
                ? "어긋나는 곳을 모두 정했어요"
                : "정한 것과 실제가 모두 같아요"
          }
          lede="어긋난다고 답이 틀린 건 아니에요. 다만 실제 상황에서 어느 쪽으로 움직일지는 지금 정해 두어야 해요."
          hero
          tone={open.length > 0 ? "missing" : undefined}
        >
          <ul className="xd-facts" aria-label="비교 요약">
            <li>
              비교한 문항 <b>{contrasts.length}개</b>
            </li>
            <li>
              어긋나는 곳 <b>{gaps.length}개</b>
            </li>
            {contradictions > 0 && (
              <li>
                많이 다른 곳 <b>{contradictions}개</b>
              </li>
            )}
          </ul>
        </DocCard>

        {contrasts.map((c) => {
          const a = AGREEMENT[c.agreement];
          const interp = interpretations[c.qid];
          const openHere = c.agreement !== "aligned" && !c.resolution;
          return (
            <DocCard
              key={c.qid}
              id={`ct-${c.qid}`}
              label={`${c.qid} · ${docName(c.clause.doc)} ${c.clause.clause}`}
              title={c.title}
              tone={openHere ? "missing" : undefined}
              tag={
                c.resolution
                  ? { cls: "ok", label: RESOLUTION_LABEL[c.resolution] }
                  : { cls: a.cls, label: a.label }
              }
              lede={
                <>
                  {interp?.text ?? c.reason}
                  {interp?.source === "llm" && <span className="xd-src">AI 해설</span>}
                </>
              }
            >
              <div className="xd-vs">
                <div className="said">
                  <div className="k">내가 정한 것</div>
                  <div className="v">{c.declared}</div>
                </div>
                <div className="did">
                  <div className="k">실제로 해 온 것 (10년 이력)</div>
                  <div className="v">{c.observed}</div>
                </div>
              </div>

              {c.evidence.length > 0 && (
                <details className="xd-more">
                  <summary>이력에서 찾은 근거 {c.evidence.length}건</summary>
                  <ul className="xd-list">
                    {c.evidence.map((e, i) => (
                      <li className="xd-row" key={i}>
                        <div className="xd-row-main">
                          <div className="l">{e.label}</div>
                          <div className="s">{e.detail}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {openHere && (
                <Todo
                  what={
                    c.observedValue
                      ? "어느 쪽으로 갈지 아직 정하지 않았어요. 아래에서 하나를 고르면 조항에 반영해요."
                      : "실제 해 온 행동에 맞는 선택지가 이 문항에는 없어요. 절충을 고르면 실제 수치를 조항에 단서로 남겨요."
                  }
                  qid={c.qid}
                  cta="문항 다시 보기 →"
                />
              )}

              {c.agreement !== "aligned" && (
                <div className="xd-actions">
                  {c.resolution ? (
                    <>
                      <span className="m">
                        &lsquo;{RESOLUTION_LABEL[c.resolution]}&rsquo;로 정했어요.
                      </span>
                      <button className="btn ghost sm" onClick={() => onUndo(c)}>
                        다시 정하기
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn outline sm" onClick={() => onResolve(c, "declared")}>
                        {RESOLUTION_LABEL.declared}
                      </button>
                      {c.observedValue && (
                        <button
                          className="btn outline sm"
                          onClick={() => onResolve(c, "observed")}
                        >
                          {RESOLUTION_LABEL.observed}
                        </button>
                      )}
                      <button className="btn sm" onClick={() => onResolve(c, "adjusted")}>
                        {RESOLUTION_LABEL.adjusted}
                      </button>
                    </>
                  )}
                </div>
              )}
            </DocCard>
          );
        })}
      </div>
    </div>
  );
}
