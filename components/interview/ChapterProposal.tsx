"use client";

import Link from "next/link";
import { useState } from "react";
import Badge from "../common/Badge";
import { CHAPTER_META, chapterCompleted, OPTIONAL_CHAPTERS } from "../../lib/questions";
import type { Chapter, Profile } from "../../lib/types";

/**
 * 코어를 마친 직후의 챕터 제안 화면.
 *
 * 챕터는 전부 선택이다. 건너뛰면 그 영역은 설계서에 "아직 선언하지 않은 것" 으로
 * 남고, 거기서 다시 들어올 수 있다. 여기서 강요하지 않는다 — 다만 건너뛰면 어떤
 * 판단을 할 수 없는지는 한 줄로 분명히 적는다.
 */

interface Props {
  profile: Profile;
  /** 홈 카테고리 버튼에서 넘어온 관심 챕터. 맨 위에, 선택된 상태로 보인다. */
  focus: Chapter | null;
  onPick: (ch: Chapter) => void;
}

export default function ChapterProposal({ profile, focus, onPick }: Props) {
  const remaining = OPTIONAL_CHAPTERS.filter((ch) => !chapterCompleted(profile, ch));
  const ordered = focus && remaining.includes(focus)
    ? [focus, ...remaining.filter((ch) => ch !== focus)]
    : remaining;
  const done = OPTIONAL_CHAPTERS.filter((ch) => chapterCompleted(profile, ch));

  const [picked, setPicked] = useState<Chapter | null>(
    focus && remaining.includes(focus) ? focus : null,
  );

  return (
    <div className="chapter-propose fade-in">
      <div className="eyebrow">기본 설계 완료</div>
      <h2>더 정해 두고 싶은 영역이 있나요?</h2>
      <p className="section-lede">
        지금까지의 답으로 지출설계서가 이미 만들어졌습니다. 아래 영역은 선택입니다.
        건너뛰어도 되지만, 건너뛴 영역은 설계서에 <b>아직 선언하지 않은 것</b>으로 남습니다.
      </p>

      {done.length > 0 && (
        <p className="chapter-done mono">
          선언 완료:{" "}
          {done.map((ch) => (
            <Badge tone="ok" key={ch}>
              {CHAPTER_META[ch].label}
            </Badge>
          ))}
        </p>
      )}

      <div className="gate-cards stacked">
        {ordered.map((ch) => {
          const m = CHAPTER_META[ch];
          return (
            <button
              key={ch}
              type="button"
              className="gate-card gate-card-side"
              aria-pressed={picked === ch}
              onClick={() => setPicked(ch)}
            >
              <span className="gate-card-text">
                <span className="t">
                  {m.label}
                  {focus === ch && (
                    <span className="chapter-focus-tag">처음 고르신 영역</span>
                  )}
                </span>
                <span className="d">{m.caption}</span>
                <span className="d chapter-without">건너뛰면 — {m.withoutIt}</span>
                <span className="meta">
                  약 {m.count}문항 · {m.minutes} · {m.docs.join(" · ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="gate-nav">
        <Link href="/plan" className="btn ghost">
          지금은 설계서 보기
        </Link>
        <button
          type="button"
          className="btn"
          disabled={!picked}
          onClick={() => picked && onPick(picked)}
        >
          {picked ? `${CHAPTER_META[picked].label} 이어서 답하기` : "영역을 골라 주세요"}
        </button>
      </div>
    </div>
  );
}
