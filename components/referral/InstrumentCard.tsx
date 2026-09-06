"use client";

import Badge from "../common/Badge";
import type { AuthorityStage, Instrument } from "../../lib/types";

const STAGE: Record<
  AuthorityStage,
  { tone: "neutral" | "info" | "warn" | "ok" | "danger"; label: string }
> = {
  draft: { tone: "neutral", label: "초안" },
  sent: { tone: "info", label: "전달됨" },
  executing: { tone: "warn", label: "체결 절차 중" },
  effective: { tone: "ok", label: "효력 발생" },
  unavailable: { tone: "danger", label: "새로 만들기 어려움" },
};

/**
 * covers 는 "trust:*" · "expense:제2조" 같은 내부 키다. 화면에는 문서 이름과 조항으로 푼다.
 * 키 형식은 lib/authority/gate.ts 가 정하므로 여기서는 표시만 바꾼다 (2026-09-07).
 */
const DOC_NAME: Record<string, string> = {
  trust: "신탁설계서",
  guardianship: "후견설계서",
  expense: "지출설계서",
};

function coversLabel(covers: string[]): string {
  const byDoc = new Map<string, string[]>();
  for (const c of covers) {
    const [doc, ref] = c.split(":");
    const list = byDoc.get(doc) ?? [];
    list.push(ref);
    byDoc.set(doc, list);
  }
  return Array.from(byDoc.entries())
    .map(([doc, refs]) => {
      const name = DOC_NAME[doc] ?? doc;
      return refs.includes("*") ? `${name} 전체` : `${name} ${refs.join(" · ")}`;
    })
    .join(" · ");
}

export default function InstrumentCard({
  inst,
  onStage,
}: {
  inst: Instrument;
  onStage?: (stage: AuthorityStage) => void;
}) {
  const s = STAGE[inst.stage];
  const blocked = inst.stage === "unavailable";

  return (
    <article className={`rf-inst${blocked ? " blocked" : ""}`}>
      <div className="rf-inst-top">
        <h4>{inst.name}</h4>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>

      {blocked ? (
        <>
          <p className="rf-blocked">{inst.unavailableReason}</p>
          {inst.fallback?.length ? (
            <div className="rf-fallback">
              <b>대신 할 수 있는 방법</b>
              <ul>
                {inst.fallback.map((f) => (
                  <li key={f.name}>
                    {f.name} <em>{f.why}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="rf-effect">
            효력이 생기는 때 <b>{inst.effectRule}</b>
          </p>

          <ol className="rf-steps">
            {inst.steps.map((st) => (
              <li key={st.n}>
                <span className="i">{st.n}</span>
                <span className={`rf-actor a-${st.by}`}>{st.by}</span>
                <span className="l">
                  {st.label}
                  {st.detail ? <em>{st.detail}</em> : null}
                  {st.caution ? <em className="caution">{st.caution}</em> : null}
                  {st.period ? <em className="period">{st.period}</em> : null}
                </span>
              </li>
            ))}
          </ol>

          {onStage ? (
            <label className="rf-stage-set">
              <span>체결 상태</span>
              <select
                value={inst.stage}
                onChange={(e) => onStage(e.target.value as AuthorityStage)}
              >
                <option value="draft">초안</option>
                <option value="sent">전문가에게 전달함</option>
                <option value="executing">체결 절차 진행 중</option>
                <option value="effective">효력 발생</option>
              </select>
              <em>앱 바깥에서 끝난 일을 알려 주는 칸이에요. 앱이 정하는 게 아니에요.</em>
            </label>
          ) : null}
        </>
      )}

      {inst.basis.length ? (
        <details className="rf-basis">
          <summary>
            근거 조문 {inst.basis.map((b) => `${b.law} ${b.article}`).join(" · ")}
          </summary>
          <ul>
            {inst.basis.map((b) => (
              <li key={`${b.law}${b.article}`}>
                <a href={b.url} target="_blank" rel="noreferrer">
                  {b.law} {b.article}
                </a>{" "}
                <span className="ti">{b.title}</span>
                <p>{b.text}</p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="rf-covers">
        이 서류가 있어야 움직이는 조항 <b>{coversLabel(inst.covers)}</b>
      </p>
    </article>
  );
}
