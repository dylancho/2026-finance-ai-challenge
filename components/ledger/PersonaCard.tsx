"use client";

import Badge from "../common/Badge";
import type { LedgerInsight, Persona } from "../../lib/types";
import { won } from "../../lib/format";

/**
 * 지출 요약 카드.
 *
 * 2026-09-07: 지출설계서와 같은 언어로 바꿨다. 왼쪽에 숫자, 오른쪽에 해설을 나란히 두던
 * 두 칸 판을 없애고, 카드 한 장에 메시지 하나로 세운다. 큰 숫자 하나(보통 달 생활비,
 * 팔지 않고 버틴 횟수)와 그 숫자를 설명하는 한 문단이 먼저 오고, 세부는 목록 행으로 본다.
 *
 * 숫자는 규칙으로 계산한 것이고 문단은 AI가 쓴 것이다. 어느 쪽인지 라벨로 남겨 두어
 * 사용자가 해설을 숫자로 되짚어 볼 수 있게 한다.
 */

interface Props {
  insight: LedgerInsight;
  persona: Persona | null;
  pending: boolean;
}

/** 목록 행 하나. 왼쪽 라벨(+회색 둘째 줄), 오른쪽 값. 0~1 값이면 아래 막대를 눕힌다. */
function Row({
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
    <li className="lg-row">
      <div className="lg-row-main">
        <div className="l">{label}</div>
        {hint && <div className="s">{hint}</div>}
        {bar !== undefined && (
          <div className="lg-meter" aria-hidden>
            <i style={{ width: `${Math.round(bar * 100)}%` }} />
          </div>
        )}
      </div>
      <span className="lg-val">{value}</span>
    </li>
  );
}

export default function PersonaCard({ insight, persona, pending }: Props) {
  const { behavior: b, decision: d } = insight;
  const fixedTotal = b.fixed.reduce((a, f) => a + f.amount, 0);
  const unusedTotal = b.unusedSubscriptions.reduce((a, s) => a + s.amount, 0);

  const held = d ? d.reactions.filter((r) => !r.sold).length : 0;
  const sold = d ? d.reactions.length - held : 0;

  return (
    <>
      <section className="lg-card" aria-labelledby="lg-spend-t">
        <header className="lg-head">
          <div className="lg-no">
            지출 요약
            {persona && (
              <Badge tone={persona.source === "llm" ? "info" : "neutral"}>
                {persona.source === "llm" ? "AI가 쓴 글" : "규칙으로 만든 문장"}
              </Badge>
            )}
          </div>
          <h3 id="lg-spend-t">
            한 달에 보통 <em>{won(b.livingMedian)}</em>을 써요
          </h3>
          {persona ? (
            <p className="lg-read-text">{persona.text}</p>
          ) : (
            <p className="lg-lede">이력을 읽고 있어요…</p>
          )}
          {/* 규칙으로 만든 문장이 이미 서 있으므로 화면을 비우지 않는다. AI 글이 오면 갈아끼워진다. */}
          {pending && persona?.source === "rule" && (
            <p className="muted lg-read-pending">AI가 이력을 다시 읽고 있어요…</p>
          )}
        </header>

        <ul className="lg-list">
          <Row
            label="많이 쓴 달"
            value={won(b.livingP90)}
            hint="지출이 큰 쪽 열 달 중 한 달이 이만큼이에요"
          />
          <Row
            label="매달 나가는 고정비"
            value={won(fixedTotal)}
            hint={
              b.fixed.length
                ? `${b.fixed.length}가지 · ${b.fixed.map((f) => `${f.label} ${f.day}일`).join(" · ")}`
                : "매달 같은 날 나가는 항목이 없어요"
            }
          />
          {b.seasonalPeak && (
            <Row
              label="지출이 뛰는 때"
              value={won(b.seasonalPeak.amount)}
              hint={`${b.seasonalPeak.ym} · ${b.seasonalPeak.note}`}
            />
          )}
          {b.unusedSubscriptions.length > 0 && (
            <Row
              label="안 쓰는 구독"
              value={`매달 ${won(unusedTotal)}`}
              hint={b.unusedSubscriptions
                .map((s) => `${s.label} ${s.months}개월째 안 씀`)
                .join(" · ")}
            />
          )}
        </ul>

        <p className="lg-footnote">숫자는 규칙으로 계산했고, 해설은 AI가 썼어요.</p>
      </section>

      {d && (
        <section className="lg-card" aria-labelledby="lg-drop-t">
          <header className="lg-head">
            <div className="lg-no">주가가 떨어졌을 때</div>
            <h3 id="lg-drop-t">
              {sold === 0 ? (
                <>
                  크게 떨어진 <em>{d.reactions.length}번</em> 모두 팔지 않았어요
                </>
              ) : held > 0 ? (
                <>
                  크게 떨어진 {d.reactions.length}번 가운데 <em>{held}번</em>은 팔지 않았어요
                </>
              ) : (
                <>
                  크게 떨어질 때마다 <em>{d.reactions.length}번</em> 모두 팔았어요
                </>
              )}
            </h3>
            <p className="lg-lede">
              {sold > 0 ? (
                <>
                  팔 때는 보통 <b>{Math.abs(d.realizedStopLoss * 100).toFixed(1)}%</b> 떨어진
                  뒤였어요.
                  {d.reactionDays > 0 && <> 하락이 시작되고 {d.reactionDays}일쯤 지나서였어요.</>}
                </>
              ) : (
                <>한 번도 팔지 않고 그대로 두었어요.</>
              )}
            </p>
          </header>

          <ul className="lg-list">
            <Row
              label="팔지 않고 버틴 비율"
              value={`${Math.round(d.holdRate * 100)}%`}
              hint={`하락 ${d.reactions.length}번 중 ${held}번은 팔지 않았어요`}
              bar={d.holdRate}
            />
            {/* 한 번도 팔지 않았으면 "판 적 없음" 행이 두 줄 남는다. 빈 값 대신 행을 뺀다. */}
            {sold > 0 && (
              <Row
                label="실제로 판 하락폭"
                value={`${Math.abs(d.realizedStopLoss * 100).toFixed(1)}%`}
                hint="판 시점의 하락폭 가운데값이에요"
              />
            )}
            {sold > 0 && (
              <Row
                label="팔기까지 걸린 시간"
                value={d.reactionDays ? `${d.reactionDays}일` : "하루 안에"}
                hint="하락이 시작되고 팔 때까지 평균이에요"
              />
            )}
            <Row
              label="손실을 피하려는 정도"
              value={d.riskAversion.toFixed(2)}
              hint="얕은 하락에서 많이 팔수록 높아져요"
              bar={d.riskAversion}
            />
            <Row
              label="자산 비중"
              value={`${d.allocation.equity} : ${d.allocation.bond} : ${d.allocation.cash}`}
              hint="주식 : 채권 : 현금"
            />
          </ul>

          <details className="lg-more">
            <summary>떨어질 때마다 무엇을 했는지 {d.reactions.length}번 모두 보기</summary>
            <div className="lg-reactions">
              {d.reactions.map((r) => (
                <div className={`lg-reaction${r.sold ? " sold" : ""}`} key={r.date + r.label}>
                  <div className="d">{r.date.slice(0, 7)}</div>
                  <div className="b">
                    <div className="t">
                      {r.label} <span className="dd">{(r.drawdown * 100).toFixed(0)}%</span>
                    </div>
                    <div className="s">
                      {r.sold
                        ? `갖고 있던 것의 ${Math.round(r.portionSold * 100)}%를 팔았어요 · 하락 시작 ${r.reactionDays}일 뒤`
                        : "팔지 않았어요"}
                    </div>
                    {r.coincidingOutflow && (
                      <div className="ctx">
                        같은 때 {r.coincidingOutflow.label} {won(r.coincidingOutflow.amount)}이
                        나갔어요. 판단이 아니라 현금이 필요했을 수 있어요.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}
    </>
  );
}
