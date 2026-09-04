import type { Chapter, Profile } from "./types";
import {
  chapterCompleted,
  chapterStarted,
  hasChapter,
  isUnified,
  OPTIONAL_CHAPTERS,
} from "./questions";

/**
 * 챕터 상태의 프로필 쪽 헬퍼.
 *
 * 통합 플로우(2026-09-03)에서 Profile.track 은 항상 "daily" 다. "이 영역을
 * 선언했는가" 는 lib/questions 의 hasChapter 가 판단하고, 여기서는 그 판정을
 * 프로필 변경·공백 계산에 쓰는 얇은 함수만 둔다.
 */

export { chapterCompleted, chapterStarted, hasChapter, isUnified };

/** 아직 완료 기록이 없는 선택 챕터. 설계서의 "선언되지 않은 영역" 카드가 된다. */
export function missingChapters(p: Profile): Chapter[] {
  if (!isUnified(p)) return [];
  return OPTIONAL_CHAPTERS.filter((ch) => !chapterCompleted(p, ch));
}

export function markChapterCompleted(p: Profile, ch: Chapter): Profile {
  const done = p.chaptersCompleted ?? [];
  if (done.includes(ch)) return p;
  return { ...p, chaptersCompleted: [...done, ch] };
}
