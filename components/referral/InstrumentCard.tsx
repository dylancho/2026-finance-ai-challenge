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
  unavailable: { tone: "danger", label: "설정 곤란" },
};

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
              <b>대신 가능한 경로</b>
              <ul>
                {inst.fallback.map((f) => (
                  <li key={f.name}>
                    {f.name} — <em>{f.why}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="rf-effect">
            효력 발생 <b>{inst.effectRule}</b>
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
                <option value="sent">전문가에게 전달됨</option>
                <option value="executing">체결 절차 진행 중</option>
                <option value="effective">효력 발생</option>
              </select>
              <em>앱 바깥에서 벌어진 일을 알려주는 입력입니다. 앱이 정하지 않습니다.</em>
            </label>
          ) : null}
        </>
      )}

      <p className="rf-covers">
        covers <b>{inst.covers.join(" · ")}</b>
      </p>
    </article>
  );
}
