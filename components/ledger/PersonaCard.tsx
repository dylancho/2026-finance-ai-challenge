"use client";

import Badge from "../common/Badge";
import type { LedgerInsight, Persona } from "../../lib/types";
import { won } from "../../lib/format";

/**
 * 성향 복제 결과.
 *
 * 왼쪽은 측정층(결정론적 지표), 오른쪽은 판정층(LLM 또는 룰 폴백) 문장이다.
 * 둘을 나란히 두는 것이 핵심이다 — 판정을 사용자가 근거로 반박할 수 있어야 한다.
 */

interface Props {
  insight: LedgerInsight;
  persona: Persona | null;
  pending: boolean;
}

function Metric({
  label,
  value,
  hint,
  bar,
}: {
  label: string;
  value: string;
  hint?: string;
  bar?: number;
}) {
  return (
    <div className="lg-metric">
      <div className="lg-metric-top">
        <span className="l">{label}</span>
        <span className="v mono">{value}</span>
      </div>
      {bar !== undefined && (
        <div className="lg-metric-bar">
          <i style={{ width: `${Math.round(bar * 100)}%` }} />
        </div>
      )}
      {hint && <div className="lg-metric-hint">{hint}</div>}
    </div>
  );
}

export default function PersonaCard({ insight, persona, pending }: Props) {
  const { behavior: b, decision: d } = insight;

  return (
    <div className="lg-persona">
      <div className="lg-persona-metrics">
        <div className="lg-block-title">
          숫자로 본 것
          <span className="mono">규칙으로 계산</span>
        </div>

        <Metric
          label="한 달 생활비 (보통 달)"
          value={won(b.livingMedian)}
          hint={`많이 쓴 달은 ${won(b.livingP90)}`}
        />
        <Metric
          label="매달 나가는 고정비"
          value={`${b.fixed.length}가지 · 매달 ${won(b.fixed.reduce((a, f) => a + f.amount, 0))}`}
          hint={b.fixed.map((f) => `${f.label} ${f.day}일`).join(" · ")}
        />
        {b.seasonalPeak && (
          <Metric
            label="지출이 뛰는 때"
            value={won(b.seasonalPeak.amount)}
            hint={`${b.seasonalPeak.ym} · ${b.seasonalPeak.note}`}
          />
        )}
        {b.unusedSubscriptions.length > 0 && (
          <Metric
            label="안 쓰는 구독"
            value={`${b.unusedSubscriptions.length}건 · 매달 ${won(
              b.unusedSubscriptions.reduce((a, s) => a + s.amount, 0),
            )}`}
            hint={b.unusedSubscriptions
              .map((s) => `${s.label} ${s.months}개월째 안 씀`)
              .join(" · ")}
          />
        )}

        {d && (
          <>
            <div className="lg-block-title" style={{ marginTop: 22 }}>
              주가가 떨어졌을 때
              <span className="mono">하락 {d.reactions.length}번 기준</span>
            </div>
            <Metric
              label="손실을 피하려는 정도"
              value={d.riskAversion.toFixed(2)}
              bar={d.riskAversion}
              hint="얕은 하락에서 많이 팔수록 높아져요"
            />
            <Metric
              label="실제로 판 하락폭"
              value={`${(d.realizedStopLoss * 100).toFixed(1)}%`}
              hint="판 시점의 하락폭 가운데값이에요"
            />
            <Metric
              label="팔지 않고 버틴 비율"
              value={`${Math.round(d.holdRate * 100)}%`}
              bar={d.holdRate}
              hint={`하락 ${d.reactions.length}번 중 ${d.reactions.filter((r) => !r.sold).length}번은 팔지 않았어요`}
            />
            <Metric
              label="팔기까지 걸린 시간"
              value={d.reactionDays ? `${d.reactionDays}일` : "—"}
              hint="하락이 시작되고 팔 때까지 평균이에요"
            />
            <Metric
              label="자산 비중"
              value={`${d.allocation.equity} : ${d.allocation.bond} : ${d.allocation.cash}`}
              hint="주식 : 채권 : 현금"
            />
          </>
        )}
      </div>

      <div className="lg-persona-read">
        <div className="lg-block-title">
          AI 해설
          {persona && (
            <Badge tone={persona.source === "llm" ? "info" : "neutral"}>
              {persona.source === "llm" ? "AI가 쓴 글" : "규칙으로 만든 문장"}
            </Badge>
          )}
        </div>

        {persona ? (
          <>
            <p className="lg-read-text">{persona.text}</p>
            {/* 룰 문장이 이미 서 있으므로 화면을 비우지 않는다.
                판정층이 오면 이 자리 문장이 갈아끼워진다. */}
            {pending && persona.source === "rule" && (
              <p className="muted lg-read-pending">AI가 이력을 다시 읽고 있어요…</p>
            )}
          </>
        ) : (
          <p className="muted">이력을 읽고 있어요…</p>
        )}

        {d && (
          <div className="lg-reactions">
            <div className="lg-block-title" style={{ marginTop: 4 }}>
              근거: 주가가 떨어질 때마다 한 일
            </div>
            {d.reactions.map((r) => (
              <div className={`lg-reaction${r.sold ? " sold" : ""}`} key={r.date + r.label}>
                <div className="d mono">{r.date.slice(0, 7)}</div>
                <div className="b">
                  <div className="t">
                    {r.label}{" "}
                    <span className="mono dd">{(r.drawdown * 100).toFixed(0)}%</span>
                  </div>
                  <div className="s">
                    {r.sold
                      ? `갖고 있던 것의 ${Math.round(r.portionSold * 100)}%를 팔았어요 · 하락 시작 ${r.reactionDays}일 뒤`
                      : "팔지 않았어요"}
                  </div>
                  {r.coincidingOutflow && (
                    <div className="ctx">
                      같은 때 {r.coincidingOutflow.label} {won(r.coincidingOutflow.amount)}이 나갔어요.
                      {" 판단이 아니라 현금이 필요했을 수 있어요."}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="lg-footnote">
          숫자는 규칙으로 계산했고, 해설은 AI가 썼어요.
        </p>
      </div>
    </div>
  );
}
