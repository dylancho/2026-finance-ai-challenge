"use client";

import type { BiomarkerReading } from "../../lib/types";
import { bandLabel, biomarkerMeaning } from "../../lib/ledger";

/*
 * 평소 패턴과 비교한 점수 (2026-09-07).
 *
 * 미리보기(/simulation)가 메뉴에서 빠지면서 2장의 신호 블록을 여기로 옮겼다. 점수·구간
 * 칩·한 문장 뜻풀이·상위 신호 세 개까지는 그 블록 그대로(SignalBlock)이고, 이 화면에서는
 * "이 점수가 보호자 알림 경로를 여는 신호" 라는 한 줄을 덧붙인다. 판정은 전부
 * lib/ledger/biomarker.ts 가 끝냈고 여기서는 읽어서 보여 주기만 한다.
 */

export interface SignalView {
  score: number;
  band: BiomarkerReading["band"];
  bandLabel: string;
  meaning: string;
  signals: { label: string; baseline: string; observed: string }[];
}

/** 판독 결과를 화면용 요약으로 줄인다. 신호는 이탈이 있는 것만, 이탈 큰 순으로 최대 max 개. */
export function signalView(reading: BiomarkerReading, max = 3): SignalView {
  return {
    score: reading.score,
    band: reading.band,
    bandLabel: bandLabel(reading.band),
    meaning: biomarkerMeaning(reading.band),
    signals: reading.signals
      .filter((s) => s.deviation > 0)
      .slice(0, max)
      .map((s) => ({ label: s.label, baseline: s.baseline, observed: s.observed })),
  };
}

/**
 * 점수 블록. 미리보기 2장과 이력 화면이 같은 것을 쓴다.
 * 정상 구간이면 신호 목록 대신 "아직 다른 신호가 없다" 한 줄만 둔다 — 조용한 화면이 맞다.
 */
export function SignalBlock({ s, heading = "지금 내 이력에서는" }: { s: SignalView; heading?: string }) {
  const calm = s.band === "normal";
  return (
    <div className={`sv-signal ${s.band}`}>
      <div className="sv-signal-head">
        <div>
          <div className="k">{heading}</div>
          <div className="v">
            평소 패턴과 비교한 점수 <b>{s.score}점</b>
            <span className={`sv-tag ${calm ? "ok" : "warn"}`}>{s.bandLabel}</span>
          </div>
        </div>
      </div>
      <p className="sv-signal-p">
        {calm
          ? `아직 평소와 다른 신호가 없어요 · ${s.score}점 · ${s.bandLabel}`
          : s.meaning}
      </p>
      {!calm && s.signals.length > 0 && (
        <ul className="sv-signal-list">
          {s.signals.map((x) => (
            <li key={x.label}>
              <span className="l">{x.label}</span>
              <span className="v">
                평소 {x.baseline}, 최근 {x.observed}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="sv-signal-note">
        진단이 아니에요. 평소와 달라진 지점을 표시할 뿐이에요. 판단은 의료기관의 몫이에요.
      </p>
    </div>
  );
}

/**
 * 이력 화면의 점수 카드. 2026-09-07 부터 지출설계서와 같은 언어로 선다 —
 * 작은 라벨 → 점수 한 문장 → 뜻풀이 한 문장 → 벌어진 항목 목록.
 * 미리보기 2장은 위의 SignalBlock 을 그대로 쓰므로 그쪽은 건드리지 않는다.
 */
export default function BiomarkerCard({ reading }: { reading: BiomarkerReading | null }) {
  // 이력이 없으면 점수도 없다 — 카드를 그리지 않는다.
  if (!reading) return null;
  const s = signalView(reading);
  const calm = s.band === "normal";
  const alert = s.band === "alert";
  return (
    <section className={`lg-card lg-score ${s.band}`} aria-labelledby="lg-bio-t">
      <header className="lg-head">
        <div className="lg-no">
          이력에서 읽은 신호
          <span className={`lg-band ${s.band}`}>{s.bandLabel}</span>
        </div>
        <h3 id="lg-bio-t">
          평소와 비교하면 <em>{s.score}점</em>이에요
        </h3>
        <p className="lg-lede">
          {calm ? "아직 평소와 다른 신호가 없어요." : s.meaning}
        </p>
      </header>

      {!calm && s.signals.length > 0 && (
        <ul className="lg-list">
          {s.signals.map((x) => (
            <li className="lg-row" key={x.label}>
              <div className="lg-row-main">
                <div className="l">{x.label}</div>
                <div className="s">평소 {x.baseline}</div>
              </div>
              <span className="lg-val">최근 {x.observed}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="lg-note-box">
        <b>
          {alert
            ? "지금 이 점수 때문에 보호자에게 알림이 가요."
            : "이 점수가 경보 구간에 들면 보호자에게 알림이 가요."}
        </b>{" "}
        지출설계서 제5조에 정해 둔 사람에게 먼저 알리고, 승인 단계를 늘려요. 신탁 지급처럼
        되돌리기 어려운 일은 점수만으로는 열리지 않아요. 의사 진단서가 확인돼야 넘어가요.
      </p>
      <p className="lg-footnote">
        진단이 아니에요. 평소와 달라진 지점을 표시할 뿐이에요. 판단은 의료기관의 몫이에요.
      </p>
    </section>
  );
}
