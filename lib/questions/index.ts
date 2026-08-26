import type { Profile, Question, Track } from "../types";
import { dailyQuestions } from "./daily";
import { futureQuestions } from "./future";
import { caregiverQuestions } from "./caregiver";
import { estateQuestions } from "./estate";

export const QUESTION_BANK: Record<Track, Question[]> = {
  daily: dailyQuestions,
  future: futureQuestions,
  caregiver: caregiverQuestions,
  estate: estateQuestions,
};

export const TRACK_META: Record<
  Track,
  { name: string; short: string; caption: string; docs: string[] }
> = {
  daily: {
    name: "일상 지출·공과금 관리",
    short: "지출 관리",
    caption: "자동이체와 한도, 이상거래 차단을 설계합니다.",
    docs: ["지출설계서"],
  },
  future: {
    name: "미래 판단력 저하 대비",
    short: "미래 대비",
    caption: "신탁·후견·지출을 함께 설계합니다.",
    docs: ["신탁설계서", "후견설계서", "지출설계서"],
  },
  caregiver: {
    name: "가족을 대신한 준비",
    short: "가족 대리",
    caption: "지금 가능한 제도부터 확인하고 절차를 설계합니다.",
    docs: ["후견설계서", "지출설계서"],
  },
  estate: {
    name: "상속·증여 연계",
    short: "상속 설계",
    caption: "유언대용·수익자연속 구조와 유류분을 검토합니다.",
    docs: ["신탁설계서", "지출설계서"],
  },
};

/** 프로필의 트랙에 해당하는, showIf 를 통과한 질문 목록 */
export function activeQuestions(p: Profile): Question[] {
  if (!p.track) return [];
  return QUESTION_BANK[p.track].filter((q) => !q.showIf || q.showIf(p));
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

export function findQuestion(qid: string): Question | undefined {
  for (const list of Object.values(QUESTION_BANK)) {
    const hit = list.find((q) => q.id === qid);
    if (hit) return hit;
  }
  return undefined;
}

/** 섹션 단위 진행 상황 */
export function sectionProgress(p: Profile) {
  const qs = activeQuestions(p);
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

export function overallProgress(p: Profile) {
  const qs = activeQuestions(p);
  const done = qs.filter((q) => isAnswered(p, q.id)).length;
  return {
    done,
    total: qs.length,
    ratio: qs.length ? done / qs.length : 0,
  };
}
