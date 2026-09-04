import type { Chapter, DocKey, Profile, Question, Track } from "../types";
import { coreQuestions } from "./core";
import { investQuestions } from "./invest";
import { estateQuestions } from "./estate";
import { medicalQuestions } from "./medical";
import { futureQuestions } from "./future";
import { caregiverQuestions } from "./caregiver";

/* ── 챕터 (통합 플로우) ─────────────────────────────── */

export const CHAPTER_BANK: Record<Chapter, Question[]> = {
  core: coreQuestions,
  invest: investQuestions,
  estate: estateQuestions,
  medical: medicalQuestions,
};

export const CHAPTER_ORDER: Chapter[] = ["core", "invest", "estate", "medical"];
export const OPTIONAL_CHAPTERS: Chapter[] = ["invest", "estate", "medical"];

export interface ChapterMeta {
  label: string;
  short: string;
  /** 한 줄 설명 */
  caption: string;
  /** 이 챕터를 건너뛰면 어떤 판단을 할 수 없는가 */
  withoutIt: string;
  count: number;
  minutes: string;
  required: boolean;
  /** 이 챕터가 채우는 문서 */
  docs: string[];
}

export const CHAPTER_META: Record<Chapter, ChapterMeta> = {
  core: {
    label: "일상 자금 관리",
    short: "코어",
    caption: "들어오는 돈, 나가는 돈, 한도와 차단, 알릴 사람을 정합니다.",
    withoutIt: "생활비와 공과금이 어떻게 나가야 하는지 아무도 모릅니다.",
    count: coreQuestions.length,
    minutes: "3분",
    required: true,
    docs: ["지출설계서"],
  },
  invest: {
    label: "투자 원칙",
    short: "투자",
    caption: "손대지 않을 자산, 위험자산 한도, 급락했을 때 어떻게 할지를 미리 정합니다.",
    withoutIt: "목돈이 생기거나 시장이 급락했을 때 판단 근거가 없습니다.",
    count: investQuestions.filter((q) => !q.showIf).length,
    minutes: "2분",
    required: false,
    docs: ["지출설계서 제7조"],
  },
  estate: {
    label: "상속 의사",
    short: "상속",
    caption: "누구에게 무엇을 남길지, 나누는 방법과 순서를 정합니다.",
    withoutIt: "유고 시 법정상속 순위로만 처리됩니다.",
    count: estateQuestions.length,
    minutes: "5~10분",
    required: false,
    docs: ["신탁설계서"],
  },
  medical: {
    label: "의료·요양 기준",
    short: "의료·요양",
    caption: "어디서 요양할지, 요양이 시작되면 지급액을 얼마나 올릴지, 의료비는 어디까지 쓸지를 정합니다.",
    withoutIt: "요양시설 입소 시 비용 상한과 재원 순서를 정할 수 없습니다.",
    count: medicalQuestions.length,
    minutes: "2분",
    required: false,
    docs: ["신탁설계서", "후견설계서"],
  },
};

/** 챕터 목록에 속한 질문. 순서는 CHAPTER_ORDER 를 따르고 챕터 안 순서는 파일 순서다. */
export function questionsFor(chapters: Chapter[]): Question[] {
  return CHAPTER_ORDER.filter((ch) => chapters.includes(ch)).flatMap(
    (ch) => CHAPTER_BANK[ch],
  );
}

/* ── 보류 트랙 (호환) ──────────────────────────────── */

/**
 * @deprecated 트랙 분리는 폐지됐다. ?demo=B/C/D 와 findQuestion 의 역인덱스를 위해
 * 남긴다. 통합 플로우는 CHAPTER_BANK 를 본다.
 */
export const QUESTION_BANK: Record<Track, Question[]> = {
  daily: coreQuestions,
  future: futureQuestions,
  caregiver: caregiverQuestions,
  estate: estateQuestions,
};

/** 통합 플로우인가. 보류 트랙 데모(B/C/D)만 false 다. */
export function isUnified(p: Profile): boolean {
  return p.track === null || p.track === "daily";
}

/** 챕터의 질문 중 하나라도 답이 있는가 (완료 표시와 무관). */
export function chapterStarted(p: Profile, ch: Chapter): boolean {
  return CHAPTER_BANK[ch].some((q) => !!p.answers[q.id]);
}

/** 챕터를 끝까지 답했다고 기록했는가. */
export function chapterCompleted(p: Profile, ch: Chapter): boolean {
  return (p.chaptersCompleted ?? []).includes(ch);
}

/**
 * 이 영역이 "선언된" 것으로 볼 수 있는가.
 * 완료했거나 시작이라도 했으면 엔진은 있는 답으로 조항을 만든다.
 * 보류 트랙 데모는 트랙 자체가 해당 영역을 뜻한다.
 */
export function hasChapter(p: Profile, ch: Chapter): boolean {
  if (!isUnified(p)) {
    switch (ch) {
      case "core":
        return false;
      case "estate":
        return p.track === "estate";
      case "medical":
        return p.track === "future" || p.track === "caregiver";
      case "invest":
        return p.track === "future";
    }
  }
  return chapterCompleted(p, ch) || chapterStarted(p, ch);
}

/**
 * 이 프로필의 질문 전체 (showIf 통과).
 * 통합 플로우: 코어 + 완료했거나 시작한 챕터. 건너뛴 챕터의 질문은 여기 없다 —
 * 그 챕터는 통째로 "선언되지 않은 영역" 이라 질문 단위 공백으로 쪼개지 않는다.
 */
export function activeQuestions(p: Profile): Question[] {
  const base = isUnified(p)
    ? questionsFor(["core", ...OPTIONAL_CHAPTERS.filter((ch) => hasChapter(p, ch))])
    : p.track
      ? QUESTION_BANK[p.track]
      : [];
  return base.filter((q) => !q.showIf || q.showIf(p));
}

/** 한 챕터의 질문 (showIf 통과). 인터뷰가 챕터 단위로 진행할 때 쓴다. */
export function chapterQuestions(p: Profile, ch: Chapter): Question[] {
  return CHAPTER_BANK[ch].filter((q) => !q.showIf || q.showIf(p));
}

/** 아직 답하지 않은 첫 질문 (optional 은 건너뛰지 않는다) */
export function nextQuestion(p: Profile): Question | null {
  const qs = activeQuestions(p);
  return qs.find((q) => !isAnswered(p, q.id)) ?? null;
}

export function isAnswered(p: Profile, qid: string): boolean {
  const a = p.answers[qid];
  if (!a) return false;
  switch (a.kind) {
    case "choice":
      return !!a.value;
    case "multi":
      return a.values.length > 0;
    case "amount":
      return Number.isFinite(a.value);
    case "person":
      return a.people.length > 0 && !!a.people[0].relation;
    case "allocation":
      return a.rows.length > 0;
    case "open":
      return a.text.trim().length > 0;
  }
}

/**
 * 어떤 문서의 어떤 조항을 채우는 질문들.
 *
 * 설계서에서 "이 조항 수정하기" 링크를 만들 때 쓴다. mapsTo 를 역으로 훑으므로
 * 조항과 질문의 대응은 질문 은행 한 곳에서만 관리하면 된다.
 */
export function questionsForClause(
  p: Profile,
  doc: DocKey,
  clause: string,
  /** 한 조항이 여러 표로 나뉘어 그려질 때, 그 표에 해당하는 항목만 고르는 필터 */
  match?: (label: string) => boolean,
): Question[] {
  return activeQuestions(p).filter((q) =>
    q.mapsTo.some(
      (r) => r.doc === doc && r.clause === clause && (!match || match(r.label)),
    ),
  );
}

/** 그 조항으로 진입할 때 먼저 물어야 할 질문. 비어 있는 것을 우선한다. */
export function entryQuestionForClause(
  p: Profile,
  doc: DocKey,
  clause: string,
  match?: (label: string) => boolean,
): Question | null {
  const qs = questionsForClause(p, doc, clause, match);
  if (!qs.length) return null;
  return qs.find((q) => !isAnswered(p, q.id)) ?? qs[0];
}

export function findQuestion(qid: string): Question | undefined {
  for (const list of [...Object.values(CHAPTER_BANK), ...Object.values(QUESTION_BANK)]) {
    const hit = list.find((q) => q.id === qid);
    if (hit) return hit;
  }
  return undefined;
}

/** 섹션 단위 진행 상황. qs 를 주면 그 목록(예: 현재 챕터) 기준으로 센다. */
export function sectionProgress(p: Profile, qs: Question[] = activeQuestions(p)) {
  const order: string[] = [];
  for (const q of qs) if (!order.includes(q.section)) order.push(q.section);

  return order.map((section) => {
    const inSection = qs.filter((q) => q.section === section);
    const done = inSection.filter((q) => isAnswered(p, q.id)).length;
    return {
      section,
      total: inSection.length,
      done,
      complete: done === inSection.length,
      active: done > 0 && done < inSection.length,
    };
  });
}

export function overallProgress(p: Profile, qs: Question[] = activeQuestions(p)) {
  const done = qs.filter((q) => isAnswered(p, q.id)).length;
  return {
    done,
    total: qs.length,
    ratio: qs.length ? done / qs.length : 0,
  };
}

/* ── 화면용 메타 ───────────────────────────────────── */

/**
 * 헤더·리드 문장에 쓰는 플로우 이름. 통합 플로우는 선언한 챕터를 나열하고,
 * 보류 트랙 데모는 옛 트랙 이름을 그대로 쓴다.
 */
export function flowMeta(p: Profile): { name: string; short: string; docs: string[] } {
  if (!isUnified(p) && p.track) {
    const legacy: Record<Exclude<Track, "daily">, { name: string; short: string; docs: string[] }> = {
      future: {
        name: "미래 판단력 저하 대비 (보류 트랙)",
        short: "미래 대비",
        docs: ["신탁설계서", "후견설계서", "지출설계서"],
      },
      caregiver: {
        name: "가족을 대신한 준비 (보류 트랙)",
        short: "가족 대리",
        docs: ["후견설계서", "지출설계서"],
      },
      estate: {
        name: "상속·증여 연계 (보류 트랙)",
        short: "상속 설계",
        docs: ["신탁설계서", "지출설계서"],
      },
    };
    return legacy[p.track as Exclude<Track, "daily">];
  }
  const declared = OPTIONAL_CHAPTERS.filter((ch) => hasChapter(p, ch));
  const docs = new Set<string>(CHAPTER_META.core.docs);
  for (const ch of declared) for (const d of CHAPTER_META[ch].docs) docs.add(d.replace(/ 제\d+조$/, ""));
  return {
    name: declared.length
      ? `코어 + ${declared.map((ch) => CHAPTER_META[ch].short).join("·")}`
      : "코어 (일상 자금 관리)",
    short: "통합 설계",
    docs: [...docs],
  };
}
