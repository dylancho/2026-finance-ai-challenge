"use client";

import Link from "next/link";
import Badge from "../common/Badge";
import type { Contrast, Resolution } from "../../lib/types";
import { docName } from "../../lib/ai/rules";

/**
 * 선언(인터뷰) vs 관찰(이력) 대조.
 *
 * gaps 가 "안 채운 칸" 이라면 여기는 "채웠는데 사실과 어긋나는 칸" 이다.
 */

const TONE: Record<Contrast["agreement"], { tone: "ok" | "warn" | "danger"; label: string }> = {
  aligned: { tone: "ok", label: "일치" },
  tension: { tone: "warn", label: "어긋남" },
  contradiction: { tone: "danger", label: "모순" },
};

const RESOLUTION_LABEL: Record<Resolution, string> = {
  declared: "선언 유지",
  observed: "이력대로 수정",
  adjusted: "절충 — 조항에 명문화",
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
          <span className="ti">대조할 이력이 없습니다</span>
          <Badge tone="neutral">미연동</Badge>
        </header>
        <ul className="clause-body">
          <li>
            과거 금융 이력을 불러오면, 여기서 답변과 실제 행동이 어긋나는 지점을 짚어
            드립니다.
          </li>
          <li>
            <Link href="/ledger">이력 연동하러 가기 →</Link>
          </li>
        </ul>
      </div>
    );
  }

  const open = contrasts.filter((c) => c.agreement !== "aligned" && !c.resolution);

  return (
    <div>
      <p className="section-lede" style={{ marginBottom: 18 }}>
        인터뷰에서 <b>말씀하신 것</b>과 이력에서 <b>관측된 것</b>을 문항 단위로 맞대어
        봤습니다. 어긋난다고 답이 틀린 것은 아닙니다 — 다만 그 조항이 실제 상황에서
        어느 쪽으로 작동할지 지금 정해두셔야 합니다.
        {open.length > 0 && (
          <>
            {" "}
            아직 정하지 않은 항목이 <b>{open.length}개</b> 있습니다.
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
                <div className="k">말한 것 · 인터뷰</div>
                <div className="v">{c.declared}</div>
              </div>
              <div className="ct-col observed">
                <div className="k">한 것 · 10년 이력</div>
                <div className="v">{c.observed}</div>
              </div>
            </div>

            <p className="ct-reason">
              {interp?.text ?? c.reason}
              {interp?.source === "llm" && <span className="mono src">AI 판정</span>}
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
                      {RESOLUTION_LABEL[c.resolution]}(으)로 정하셨습니다.
                    </span>
                    <button className="btn ghost sm" onClick={() => onUndo(c)}>
                      다시 정하기
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn outline sm" onClick={() => onResolve(c, "declared")}>
                      선언 유지
                    </button>
                    {c.observedValue && (
                      <button className="btn outline sm" onClick={() => onResolve(c, "observed")}>
                        이력대로 수정
                      </button>
                    )}
                    <button className="btn sm" onClick={() => onResolve(c, "adjusted")}>
                      절충 — 조항에 명문화
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
                관측된 행동에 대응하는 선택지가 이 문항에 없습니다. 그래서 &lsquo;이력대로
                수정&rsquo;은 제공하지 않습니다. 절충을 고르시면 관측값을 조항 단서로
                남깁니다.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
