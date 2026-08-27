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
          측정 지표
          <span className="mono">결정론적 산출</span>
        </div>

        <Metric
          label="월 생활비 중앙값"
          value={won(b.livingMedian)}
          hint={`상위 10% 달 ${won(b.livingP90)}`}
        />
        <Metric
          label="고정비"
          value={`${b.fixed.length}종 · 월 ${won(b.fixed.reduce((a, f) => a + f.amount, 0))}`}
          hint={b.fixed.map((f) => `${f.label} ${f.day}일`).join(" · ")}
        />
        {b.seasonalPeak && (
          <Metric
            label="계절 피크"
            value={won(b.seasonalPeak.amount)}
            hint={`${b.seasonalPeak.ym} · ${b.seasonalPeak.note}`}
          />
        )}
        {b.unusedSubscriptions.length > 0 && (
          <Metric
            label="미사용 구독"
            value={`${b.unusedSubscriptions.length}건 · 월 ${won(
              b.unusedSubscriptions.reduce((a, s) => a + s.amount, 0),
            )}`}
            hint={b.unusedSubscriptions
              .map((s) => `${s.label} ${s.months}개월 미이용`)
              .join(" · ")}
          />
        )}

        {d && (
          <>
            <div className="lg-block-title" style={{ marginTop: 22 }}>
              투자 대응
              <span className="mono">낙폭 {d.reactions.length}회 기준</span>
            </div>
            <Metric
              label="위험 회피도"
              value={d.riskAversion.toFixed(2)}
              bar={d.riskAversion}
              hint="낙폭 대비 매도비중 회귀 기울기. 얕은 하락에 많이 팔수록 높다"
            />
            <Metric
              label="실효 손절선"
              value={`${(d.realizedStopLoss * 100).toFixed(1)}%`}
              hint="실제로 매도가 일어난 낙폭의 중앙값"
            />
            <Metric
              label="보유 유지 비율"
              value={`${Math.round(d.holdRate * 100)}%`}
              bar={d.holdRate}
              hint={`하락 ${d.reactions.length}회 중 ${d.reactions.filter((r) => !r.sold).length}회 보유`}
            />
            <Metric
              label="반응 속도"
              value={d.reactionDays ? `${d.reactionDays}일` : "—"}
              hint="하락 시작부터 매도까지 평균"
            />
            <Metric
              label="자산 배분"
              value={`${d.allocation.equity} : ${d.allocation.bond} : ${d.allocation.cash}`}
              hint="주식 : 채권 : 현금"
            />
          </>
        )}
      </div>

      <div className="lg-persona-read">
        <div className="lg-block-title">
          판정
          {persona && (
            <Badge tone={persona.source === "llm" ? "info" : "neutral"}>
              {persona.source === "llm" ? "AI 판정" : "규칙 기반"}
            </Badge>
          )}
        </div>

        {pending ? (
          <p className="muted">이력을 읽는 중입니다…</p>
        ) : (
          <p className="lg-read-text">{persona?.text}</p>
        )}

        {d && (
          <div className="lg-reactions">
            <div className="lg-block-title" style={{ marginTop: 4 }}>
              근거 — 하락 구간별 대응
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
                      ? `보유분 ${Math.round(r.portionSold * 100)}% 매도 · 하락 시작 +${r.reactionDays}일`
                      : "매도 없음"}
                  </div>
                  {r.coincidingOutflow && (
                    <div className="ctx">
                      같은 시점 {r.coincidingOutflow.label} {won(r.coincidingOutflow.amount)}
                      {" — 판단이 아니라 현금 필요였을 수 있습니다"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="lg-footnote">
          본 구현은 규칙 기반 측정 + 파운데이션 모델 판정입니다. 피처별 전용 모델
          (역강화학습 · 시계열 트랜스포머 등) 적용은 후속 과제입니다.
        </p>
      </div>
    </div>
  );
}
