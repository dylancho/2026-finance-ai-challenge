"use client";

import type { Story, StoryId } from "./story";

/*
 * 앞으로 30년을 한 줄로 그린 축 + "지금 어느 시기인가요?" 선택.
 *
 * 촘촘한 차트나 권한 줄은 두지 않는다. 점 몇 개와 세 구간이면 충분하다.
 * 연차는 지출설계서 제6조와 같은 기준(지금 → 30년 뒤)이다.
 */

export interface StripMarks {
  /** 신호 구간이 시작되는 연차 (지금 = 0) */
  signalAt: number;
  /** 진단서 시점 연차 */
  diagAt: number;
  /** 요양 시작 연차. 없으면 표시하지 않는다 */
  careAt?: number;
  /** 자산 소진 연차. null 이면 30년 뒤에도 남는다 */
  runoutAt: number | null;
}

const AXIS_YEARS = 30;

export default function StoryStrip({
  stories,
  active,
  marks,
  onPick,
}: {
  stories: Story[];
  active: StoryId;
  marks: StripMarks;
  onPick: (id: StoryId) => void;
}) {
  const pct = (y: number) => `${Math.max(0, Math.min(100, (y / AXIS_YEARS) * 100))}%`;
  const current = stories.find((s) => s.id === active)!;

  const segments: { id: StoryId; from: number; to: number }[] = [
    { id: "now", from: 0, to: marks.signalAt },
    { id: "signal", from: marks.signalAt, to: marks.diagAt },
    { id: "after", from: marks.diagAt, to: AXIS_YEARS },
  ];

  const points: { at: number; label: string; sub?: string; key: string }[] = [
    { key: "now", at: 0, label: "지금" },
  ];
  // 요양 시작이 진단서 시점과 붙어 있으면 한 점으로 합친다. 두 글자가 겹치는 것보다 낫다.
  const hasCare = marks.careAt !== undefined && marks.careAt > 0 && marks.careAt < AXIS_YEARS;
  if (hasCare && Math.abs((marks.careAt as number) - marks.diagAt) <= 2) {
    points.push({ key: "diag", at: marks.diagAt, label: "진단서 · 요양 시작", sub: `약 ${marks.diagAt}년 뒤 (예시)` });
  } else {
    points.push({ key: "diag", at: marks.diagAt, label: "진단서", sub: `약 ${marks.diagAt}년 뒤 (예시)` });
    if (hasCare) points.push({ key: "care", at: marks.careAt as number, label: "요양 시작", sub: `${marks.careAt}년 뒤` });
  }
  points.push(
    marks.runoutAt !== null && marks.runoutAt <= AXIS_YEARS
      ? { key: "runout", at: marks.runoutAt, label: "자산 소진", sub: `약 ${marks.runoutAt}년 뒤` }
      : { key: "runout", at: AXIS_YEARS, label: "30년 뒤", sub: "자산이 남음" },
  );
  points.sort((a, b) => a.at - b.at);

  return (
    <section className="xd-card sv-strip" id="sv-strip" aria-label="앞으로 30년">
      <div className="xd-no">앞으로 30년</div>

      <div className="sv-seg-q">지금 어느 시기인가요?</div>
      <div className="sv-seg" role="tablist" aria-label="시기 선택">
        {stories.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={active === s.id}
            className={active === s.id ? "is-on" : undefined}
            onClick={() => onPick(s.id)}
          >
            <span className="n">{s.n}</span>
            {s.short}
          </button>
        ))}
      </div>

      {/* 가로 축: 넓은 화면 */}
      <div className="sv-axis" role="img" aria-label={points.map((p) => `${p.label}${p.sub ? ` ${p.sub}` : ""}`).join(", ")}>
        <div className="sv-axis-track">
          {segments.map((g) => (
            <i
              key={g.id}
              className={`seg${g.id === active ? " is-on" : ""}`}
              style={{ left: pct(g.from), width: `calc(${pct(g.to)} - ${pct(g.from)})` }}
            />
          ))}
          {points.map((p) => (
            <span className={`pt${p.at === 0 ? " first" : ""}${p.at >= AXIS_YEARS ? " last" : ""}`} key={p.key} style={{ left: pct(p.at) }}>
              <i />
              <b>{p.label}</b>
              {p.sub && <em>{p.sub}</em>}
            </span>
          ))}
        </div>
      </div>

      {/* 좁은 화면: 같은 정보를 목록으로 */}
      <ol className="sv-axis-list" aria-hidden>
        {points.map((p) => (
          <li key={p.key}>
            <b>{p.label}</b>
            {p.sub && <em>{p.sub}</em>}
          </li>
        ))}
      </ol>

      <div className="sv-brief">
        <div className="sv-brief-t">이 시기에 일어나는 일</div>
        <ul>
          {current.rows.slice(0, 3).map((r) => (
            <li key={r.label}>{r.label}</li>
          ))}
          {current.rows.length === 0 && current.missing && <li>{current.headline}</li>}
        </ul>
        <a href={`#sv-${current.id}`} className="sv-brief-more">
          자세히 보기 ↓
        </a>
      </div>
    </section>
  );
}
