"use client";

import type { Ledger } from "../../lib/types";
import { won } from "../../lib/format";

/**
 * 달마다 쓴 돈 카드.
 *
 * 2026-09-07: 지출설계서와 같은 언어로 바꿨다. 작은 라벨 → 한 문장 제목(보통 달 생활비)
 * → 한 문장 설명이 먼저 오고, 그다음에 막대가 온다. 막대 아래 표식은 그대로다 —
 * 색만으로 구분하지 않는다 (PRD §13).
 */

interface Props {
  ledger: Ledger;
}

export default function LedgerChart({ ledger }: Props) {
  // 보통 달의 생활비는 지출 요약 카드가 말한다. 이 카드는 폭(가장 적은 달, 가장 많은 달)만 적어
  // 같은 "보통" 숫자를 두 번 다르게 말하지 않는다.
  const max = Math.max(...ledger.months.map((m) => m.living));
  const min = Math.min(...ledger.months.map((m) => m.living));
  const compareYears = ledger.years - ledger.baselineYears;
  const sells = new Set(
    ledger.trades.filter((t) => t.kind === "sell").map((t) => t.date.slice(0, 7)),
  );
  const buys = new Set(
    ledger.trades.filter((t) => t.kind === "buy").map((t) => t.date.slice(0, 7)),
  );
  const lates = new Set(
    ledger.months.filter((m) => m.latePayments > 0).map((m) => m.ym),
  );
  const incidents = new Set(
    ledger.incidents
      .filter((i) => i.type === "balance_error" || i.type === "duplicate_transfer")
      .map((i) => i.date.slice(0, 7)),
  );

  const baselineEnd = ledger.baselineYears * 12;

  return (
    <section className="lg-card" aria-labelledby="lg-chart-t">
      <header className="lg-head">
        <div className="lg-no">달마다 쓴 돈</div>
        <h3 id="lg-chart-t">
          앞 <em>{ledger.baselineYears}년</em>을 평소 기준으로 삼아요
        </h3>
        <p className="lg-lede">
          {ledger.startYear}년부터 {ledger.years}년치예요. 나머지 {compareYears}년이 그 기준과
          얼마나 다른지 봐요. 가장 적게 쓴 달은 <b>{won(min)}</b>, 가장 많이 쓴 달은{" "}
          <b>{won(max)}</b>이에요.
        </p>
      </header>

      <div className="lg-chart">
        <div className="lg-bars" role="img" aria-label={`${ledger.years}년치 월별 생활비 추이`}>
          {ledger.months.map((m, i) => (
            <div
              className={`lg-bar${i < baselineEnd ? " base" : ""}`}
              key={m.ym}
              title={`${m.ym} · 생활비 ${won(m.living)} · 거래 ${m.txnCount}건${
                m.latePayments ? ` · 연체 ${m.latePayments}건` : ""
              }`}
            >
              <i style={{ height: `${Math.max(3, (m.living / max) * 100)}%` }} />
            </div>
          ))}
        </div>

        <div className="lg-marks">
          {ledger.months.map((m) => {
            const mark = lates.has(m.ym)
              ? { cls: "late", ch: "!", label: "공과금 밀림" }
              : incidents.has(m.ym)
                ? { cls: "err", ch: "?", label: "잔액 착오" }
                : sells.has(m.ym)
                  ? { cls: "sell", ch: "▼", label: "판 달" }
                  : buys.has(m.ym)
                    ? { cls: "buy", ch: "▲", label: "산 달" }
                    : null;
            return (
              <div className="lg-mark" key={m.ym}>
                {mark && (
                  <span className={mark.cls} title={`${m.ym} ${mark.label}`}>
                    {mark.ch}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg-axis">
          <span className="lg-span base" style={{ flex: ledger.baselineYears }}>
            평소 기준으로 삼은 {ledger.baselineYears}년
          </span>
          <span className="lg-span" style={{ flex: compareYears }}>
            평소와 비교한 {compareYears}년
          </span>
        </div>

        <ul className="lg-legend">
          <li>
            <span className="buy">▲</span> 산 달
          </li>
          <li>
            <span className="sell">▼</span> 판 달
          </li>
          <li>
            <span className="err">?</span> 잔액 착오 · 같은 곳에 두 번 이체
          </li>
          <li>
            <span className="late">!</span> 공과금 밀림
          </li>
        </ul>
      </div>
    </section>
  );
}
