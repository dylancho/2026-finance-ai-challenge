import { describe, expect, it } from "vitest";
import { DEMO_PROFILES, emptyProfile } from "../profile";
import {
  activeQuestions,
  CHAPTER_BANK,
  CHAPTER_META,
  findQuestion,
  hasChapter,
  questionsFor,
  QUESTION_BANK,
} from "../questions";
import { buildDesign, findGaps, scenariosFor } from "../design";
import type { Profile } from "../types";

/** 코어 답 위에 다른 챕터 답을 얹은 통합 플로우 프로필 */
function unified(extra: Partial<Profile> = {}): Profile {
  return {
    ...emptyProfile(),
    ...DEMO_PROFILES.A,
    ...extra,
    answers: { ...DEMO_PROFILES.A.answers, ...(extra.answers ?? {}) },
  };
}

describe("질문 체계 — ID 불변", () => {
  it("코어는 옛 트랙 A 의 11문항 ID 를 그대로 가진다", () => {
    const ids = CHAPTER_BANK.core.map((q) => q.id).sort();
    expect(ids).toEqual(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11"]);
    expect(CHAPTER_BANK.core[0].id).toBe("A09");
    expect(CHAPTER_BANK.core.every((q) => q.chapter === "core")).toBe(true);
  });

  it("코어에는 신탁·후견 용어가 없다", () => {
    for (const q of CHAPTER_BANK.core) {
      const text = [q.prompt, q.helper ?? "", ...(q.options ?? []).map((o) => o.label)].join(" ");
      expect(text).not.toMatch(/신탁|후견/);
    }
  });

  it("상속 챕터는 D* 전부, 의료 챕터는 5문항 이내, 투자는 I01 부터", () => {
    expect(CHAPTER_BANK.estate.map((q) => q.id)).toEqual(QUESTION_BANK.estate.map((q) => q.id));
    expect(CHAPTER_BANK.medical.length).toBeLessThanOrEqual(5);
    expect(CHAPTER_BANK.medical.every((q) => /^[BC]\d\d$/.test(q.id))).toBe(true);
    expect(CHAPTER_BANK.invest[0].id).toBe("I01");
  });

  it("B11 은 invest 챕터로 이관됐지만 보류 트랙 B 배열 원래 자리에도 남아 있다", () => {
    expect(findQuestion("B11")?.chapter).toBe("invest");
    expect(QUESTION_BANK.future).toHaveLength(22);
    expect(QUESTION_BANK.future[10].id).toBe("B11");
    expect(QUESTION_BANK.future.find((q) => q.id === "B09")).toBe(findQuestion("B09"));
  });

  it("questionsFor 는 챕터 순서(core → invest → estate → medical → safe)를 지킨다", () => {
    const qs = questionsFor(["estate", "core"]);
    expect(qs[0].id).toBe("A09");
    expect(qs[qs.length - 1].id).toBe("D16");
  });

  it("CHAPTER_META 문항 수가 실제 배열과 맞는다", () => {
    expect(CHAPTER_META.core.count).toBe(11);
    expect(CHAPTER_META.estate.count).toBe(16);
    expect(CHAPTER_META.core.required).toBe(true);
  });
});

describe("설계 엔진 — 있는 답으로만 만든다", () => {
  it("코어만 답하면 지출설계서만 나오고 죽지 않는다", () => {
    const p = unified();
    const d = buildDesign(p);
    expect(d.trust).toBeNull();
    expect(d.guardianship).toBeNull();
    expect(d.expense.transfers.length).toBeGreaterThan(0);
    expect(d.expense.sustainability.years).not.toBeNull();
    expect(d.expense.invest).toBeNull();
  });

  it("코어 + 상속이면 신탁 초안이 유언대용/수익자연속으로 선다", () => {
    const p = unified({
      chaptersCompleted: ["core", "estate"],
      answers: DEMO_PROFILES.D.answers,
    });
    const d = buildDesign(p);
    expect(d.trust).not.toBeNull();
    expect(["will_substitute", "successive"]).toContain(d.trust!.type.code);
    expect(d.guardianship).toBeNull();
    expect(d.expense.transfers.length).toBeGreaterThan(0);
  });

  it("코어 + 의료·요양이면 신탁·후견 초안이 모두 서고 후견은 임의후견으로 판정한다", () => {
    const p = unified({
      chaptersCompleted: ["core", "medical"],
      answers: {
        B17: { kind: "choice", value: "home" },
        B08: { kind: "amount", value: 1_500_000 },
        B09: { kind: "choice", value: "yearly_cap" },
        B18: { kind: "multi", values: ["medical", "facility"] },
      },
    });
    const d = buildDesign(p);
    expect(d.trust?.available).toBe(true);
    expect(d.trust?.clauses.find((c) => c.no === "제6조")?.status).toBe("set");
    expect(d.guardianship?.verdict.code).toBe("voluntary");
    expect(d.expense.sustainability.careStartYear).toBe(5);
  });

  it("투자 챕터를 시작만 해도 제7조 이 있는 답으로 선다", () => {
    const p = unified({
      answers: { I01: { kind: "multi", values: ["derivative", "crypto"] } },
    });
    const d = buildDesign(p);
    expect(d.expense.invest?.forbidden).toEqual(["derivative", "crypto"]);
    expect(d.expense.invest?.status).toBe("partial");
    expect(hasChapter(p, "invest")).toBe(true);
  });

  it("보류 트랙 데모(B/C/D)는 예전 그대로 설계된다", () => {
    expect(buildDesign(DEMO_PROFILES.B).trust?.type.code).toBe("self_benefit");
    expect(buildDesign(DEMO_PROFILES.B).guardianship?.verdict.code).toBe("voluntary");
    expect(buildDesign(DEMO_PROFILES.C).guardianship).not.toBeNull();
    expect(buildDesign(DEMO_PROFILES.D).trust?.type.code).toBe("successive");
  });
});

describe("공백·시나리오", () => {
  it("gaps 는 여전히 A0* 참조로 동작한다", () => {
    const p = unified();
    delete p.answers.A05;
    const gaps = findGaps(p, buildDesign(p));
    expect(gaps.find((g) => g.qid === "A05")?.severity).toBe("high");
  });

  it("건너뛴 챕터의 질문은 질문 단위 공백에 들어가지 않는다", () => {
    const p = unified();
    const gaps = findGaps(p, buildDesign(p));
    expect(gaps.some((g) => g.qid.startsWith("D"))).toBe(false);
    expect(activeQuestions(p).every((q) => q.chapter === "core")).toBe(true);
  });

  it("건너뛴 챕터마다 '선언되지 않은 영역' 공백이 하나씩 선다", () => {
    const p = unified();
    const gaps = findGaps(p, buildDesign(p));
    const chapterGaps = gaps.filter((g) => g.chapter);
    expect(chapterGaps.map((g) => g.chapter).sort()).toEqual(["estate", "invest", "medical", "safe"]);
    expect(chapterGaps.find((g) => g.chapter === "invest")?.what).toContain("투자 원칙이 선언되지 않았습니다");
    expect(chapterGaps.find((g) => g.chapter === "estate")?.consequence).toContain("법정상속");
  });

  it("챕터를 완료로 기록하면 그 챕터의 공백 카드가 사라지고 조항이 선다", () => {
    const p = unified({
      chaptersCompleted: ["core", "invest"],
      answers: {
        I01: { kind: "multi", values: ["derivative"] },
        I02: { kind: "choice", value: "low" },
        I03: { kind: "choice", value: "do_nothing" },
        I04: { kind: "choice", value: "freeze" },
      },
    });
    const design = buildDesign(p);
    const gaps = findGaps(p, design);
    expect(gaps.some((g) => g.chapter === "invest")).toBe(false);
    expect(gaps.some((g) => g.chapter === "estate")).toBe(true);
    expect(design.expense.invest?.status).toBe("set");
    expect(design.expense.invest?.riskCapPct).toBe(20);
  });

  it("보류 트랙 데모에는 챕터 공백이 없다", () => {
    const gaps = findGaps(DEMO_PROFILES.B, buildDesign(DEMO_PROFILES.B));
    expect(gaps.some((g) => g.chapter)).toBe(false);
  });

  it("게이트의 incident 는 이상거래 룰 전체 활성화 + 긴급조치 플래그로 이어진다", () => {
    const p = unified({ capacity: "incident" });
    const d = buildDesign(p);
    expect(d.expense.fraudRules.every((r) => r.active)).toBe(true);
    const flag = d.expense.flags.find((f) => f.level === "critical");
    expect(flag?.title).toContain("이미 피해");
    expect(flag?.qid).toBeUndefined();
  });

  it("시나리오는 코어 것만, 상속을 선언하면 배우자 사망이 추가된다", () => {
    expect(scenariosFor(unified()).map((s) => s.id)).toEqual(["phishing", "hospital", "shortfall"]);
    const withEstate = unified({ chaptersCompleted: ["core", "estate"] });
    expect(scenariosFor(withEstate).map((s) => s.id)).toContain("spouse_death");
  });
});
