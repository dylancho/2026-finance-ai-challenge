"use client";

import Link from "next/link";
import Badge from "../common/Badge";
import type { Contrast, Resolution } from "../../lib/types";
import { docName } from "../../lib/ai/rules";

/**
 * 내가 정한 것(인터뷰) 과 실제로 해 온 것(이력) 의 비교.
 *
 * gaps 가 "안 채운 칸" 이라면 여기는 "채웠는데 사실과 어긋나는 칸" 이다.
 */

const TONE: Record<Contrast["agreement"], { tone: "ok" | "warn" | "danger"; label: string }> = {
  aligned: { tone: "ok", label: "일치" },
  tension: { tone: "warn", label: "어긋남" },
  contradiction: { tone: "danger", label: "모순" },
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
      <div className="clause set">
        <header className="clause-head">
          <span className="ti">비교할 이력이 없어요</span>
          <Badge tone="neutral">불러오기 전</Badge>
        </header>
        <ul className="clause-body">
          <li>
            금융 이력을 불러오면 답과 실제 행동이 어긋나는 곳을 여기서 짚어 드려요.
          </li>
          <li>
            <Link href="/ledger">금융 이력 불러오기 →</Link>
          </li>
        </ul>
      </div>
    );
  }

  const open = contrasts.filter((c) => c.agreement !== "aligned" && !c.resolution);

  return (
    <div>
      <p className="section-lede" style={{ marginBottom: 18 }}>
        인터뷰에서 <b>정한 것</b>과 이력에서 <b>실제로 해 온 것</b>을 문항별로 나란히
        놓았어요. 어긋난다고 답이 틀린 건 아니에요. 다만 실제 상황에서 어느 쪽으로
        움직일지는 지금 정해 두어야 해요.
        {open.length > 0 && (
          <>
            {" "}
            아직 정하지 않은 항목이 <b>{open.length}개</b> 있어요.
          </>
        )}
      </p>

      {contrasts.map((c) => {
        const t = TONE[c.agreement];
        const interp = interpretations[c.qid];
        return (
          <div className={`ct-item ${c.agreement}`} key={c.qid}>
            <header className="ct-head">
              <div>
                <span className="mono r">
                  {c.qid} · {docName(c.clause.doc)} {c.clause.clause}
                </span>
                <span className="ti">{c.title}</span>
              </div>
              <div className="ct-badges">
                {c.resolution && <Badge tone="ok">{RESOLUTION_LABEL[c.resolution]}</Badge>}
                <Badge tone={t.tone}>{t.label}</Badge>
              </div>
            </header>

            <div className="ct-cols">
              <div className="ct-col declared">
                <div className="k">내가 정한 것</div>
                <div className="v">{c.declared}</div>
              </div>
              <div className="ct-col observed">
                <div className="k">실제로 해 온 것 (10년 이력)</div>
                <div className="v">{c.observed}</div>
              </div>
            </div>

            <p className="ct-reason">
              {interp?.text ?? c.reason}
              {interp?.source === "llm" && <span className="mono src">AI 해설</span>}
            </p>

            {c.evidence.length > 0 && (
              <details className="ct-evidence">
                <summary>근거 {c.evidence.length}건</summary>
                <ul>
                  {c.evidence.map((e, i) => (
                    <li key={i}>
                      <span className="mono">{e.label}</span>
                      <span>{e.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {c.agreement !== "aligned" && (
              <div className="ct-actions">
                {c.resolution ? (
                  <>
                    <span className="muted">
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
                      <button className="btn outline sm" onClick={() => onResolve(c, "observed")}>
                        {RESOLUTION_LABEL.observed}
                      </button>
                    )}
                    <button className="btn sm" onClick={() => onResolve(c, "adjusted")}>
                      {RESOLUTION_LABEL.adjusted}
                    </button>
                    <Link href={`/interview?q=${c.qid}`} className="btn ghost sm">
                      문항 다시 보기
                    </Link>
                  </>
                )}
              </div>
            )}

            {!c.observedValue && c.agreement !== "aligned" && !c.resolution && (
              <p className="ct-hint">
                실제 해 온 행동에 맞는 선택지가 이 문항에는 없어요. 그래서 &lsquo;실제 해 온
                대로&rsquo;는 고를 수 없어요. 절충을 고르면 실제 수치를 조항에 단서로 남겨요.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
