"use client";

import type { Ledger } from "../../lib/types";
import { won } from "../../lib/format";

/**
 * 10년 적재 뷰. 월별 생활비를 막대로, 매도·연체를 그 아래 표식으로 찍는다.
 * 색만으로 구분하지 않는다 (PRD §13).
 */

interface Props {
  ledger: Ledger;
}

export default function LedgerChart({ ledger }: Props) {
  const max = Math.max(...ledger.months.map((m) => m.living));
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
    <div className="lg-chart">
      <div className="lg-chart-head">
        <span className="mono">
          {ledger.startYear} — {ledger.startYear + ledger.years - 1}
        </span>
        <span className="muted">월 생활비 · 최대 {won(max)}</span>
      </div>

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
            ? { cls: "late", ch: "!", label: "연체" }
            : incidents.has(m.ym)
              ? { cls: "err", ch: "?", label: "입력 오류" }
              : sells.has(m.ym)
                ? { cls: "sell", ch: "▼", label: "매도" }
                : buys.has(m.ym)
                  ? { cls: "buy", ch: "▲", label: "매수" }
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
        <span
          className="lg-span base"
          style={{ flex: ledger.baselineYears }}
        >
          베이스라인 구간 {ledger.baselineYears}년
        </span>
        <span className="lg-span" style={{ flex: ledger.years - ledger.baselineYears }}>
          관측 구간 {ledger.years - ledger.baselineYears}년
        </span>
      </div>

      <ul className="lg-legend">
        <li>
          <span className="buy">▲</span> 매수
        </li>
        <li>
          <span className="sell">▼</span> 매도
        </li>
        <li>
          <span className="err">?</span> 잔액 오류 · 중복 이체
        </li>
        <li>
          <span className="late">!</span> 고정비 연체
        </li>
      </ul>
    </div>
  );
}
