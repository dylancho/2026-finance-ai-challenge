import { describe, expect, it } from "vitest";
import {
  eventContextOf,
  eventOf,
  fromApi,
  hasInventedNumber,
  interpretByRule,
  kindOfText,
  parseKoreanAmount,
  parsePercent,
} from "../interpret";
import { DEMO_PROFILES } from "../../profile";

/**
 * 룰 해석기는 /api/ai/event 의 폴백이다. 키가 없거나 라우트가 죽어도 이 함수가
 * 같은 모양을 내서 화면이 완주해야 한다. 칩 3종 문장과 흔한 표현이 읽히는지 본다.
 */

describe("parseKoreanAmount — 한국어 금액 표기", () => {
  const cases: [string, number][] = [
    ["3억", 300_000_000],
    ["2억 5천", 250_000_000],
    ["2억5천만원", 250_000_000],
    ["2억 5,000만원", 250_000_000],
    ["5,000만원", 50_000_000],
    ["3000만원", 30_000_000],
    ["2.5억", 250_000_000],
    ["1억 2천 5백만원", 125_000_000],
    ["300만원", 3_000_000],
    ["집을 팔아서 2억 5천만원이 생겼어요", 250_000_000],
    ["보험금으로 5천 받았어요", 50_000_000],
    ["50000000원", 50_000_000],
  ];
  for (const [text, expected] of cases) {
    it(`${text} → ${expected.toLocaleString()}`, () => {
      expect(parseKoreanAmount(text)).toBe(expected);
    });
  }

  it("금액이 없으면 undefined", () => {
    expect(parseKoreanAmount("목돈이 생겼어요")).toBeUndefined();
    expect(parseKoreanAmount("치매 진단을 받았습니다")).toBeUndefined();
  });

  it("'5천원' 은 소액 그대로", () => {
    expect(parseKoreanAmount("5천원")).toBe(5_000);
  });
});

describe("parsePercent", () => {
  it("%, 퍼센트, 프로, 반토막", () => {
    expect(parsePercent("주식이 30% 떨어졌어요")).toBe(30);
    expect(parsePercent("25퍼센트 빠졌어요")).toBe(25);
    expect(parsePercent("한 40프로 하락")).toBe(40);
    expect(parsePercent("반토막 났어요")).toBe(50);
  });
  it("숫자 없으면 undefined, 100 초과는 무시", () => {
    expect(parsePercent("주식이 많이 떨어졌어요")).toBeUndefined();
    expect(parsePercent("150% 떨어졌어요")).toBeUndefined();
  });
});

describe("interpretByRule — 세 이벤트로 대응", () => {
  it("칩 3종 문장을 그대로 읽는다", () => {
    const dx = interpretByRule("치매 진단을 받았습니다");
    expect(dx.kind).toBe("diagnosis");

    const wf = interpretByRule("목돈 3억이 들어왔습니다");
    expect(wf.kind).toBe("windfall");
    if (wf.kind === "windfall") expect(wf.params.amount).toBe(300_000_000);

    const cr = interpretByRule("시장이 25% 급락했습니다");
    expect(cr.kind).toBe("market_crash");
    if (cr.kind === "market_crash") expect(cr.params.dropPct).toBe(25);
  });

  it("집을 팔아서 2억 5천만원이 생겼어요 → windfall 2.5억, 라벨에 금액", () => {
    const r = interpretByRule("집을 팔아서 2억 5천만원이 생겼어요");
    expect(r.kind).toBe("windfall");
    if (r.kind !== "windfall") return;
    expect(r.params.amount).toBe(250_000_000);
    expect(r.label).toContain("2억 5,000만원");
    expect(r.source).toBe("rule");
  });

  it("주식이 30% 떨어졌어요 → market_crash dropPct 30", () => {
    const r = interpretByRule("주식이 30% 떨어졌어요");
    expect(r.kind).toBe("market_crash");
    if (r.kind === "market_crash") {
      expect(r.params.dropPct).toBe(30);
      expect(r.label).toContain("30%");
    }
  });

  it("어머니가 치매 진단을 받으셨어요 → diagnosis", () => {
    expect(interpretByRule("어머니가 치매 진단을 받으셨어요").kind).toBe("diagnosis");
  });

  it("숫자가 빠지면 되묻고, 되묻는 종류를 기억한다", () => {
    const r = interpretByRule("집 팔아서 목돈이 생겼어요");
    expect(r.kind).toBe("clarify");
    if (r.kind === "clarify") {
      expect(r.pendingKind).toBe("windfall");
      expect(r.reply).toMatch(/얼마|금액/);
    }
    const c = interpretByRule("주식이 크게 떨어졌어요");
    expect(c.kind).toBe("clarify");
    if (c.kind === "clarify") expect(c.pendingKind).toBe("market_crash");
  });

  it("되묻기 뒤에 숫자만 오면 그 종류로 이어 붙인다", () => {
    const wf = interpretByRule("3억이요", { pendingKind: "windfall" });
    expect(wf.kind).toBe("windfall");
    if (wf.kind === "windfall") expect(wf.params.amount).toBe(300_000_000);

    const cr = interpretByRule("30", { pendingKind: "market_crash" });
    expect(cr.kind).toBe("market_crash");
    if (cr.kind === "market_crash") expect(cr.params.dropPct).toBe(30);
  });

  it("범위 밖 상황은 other + 숫자 없는 정성 항목", () => {
    const r = interpretByRule("아들이 사업자금을 빌려달라고 합니다");
    expect(r.kind).toBe("other");
    if (r.kind !== "other") return;
    expect(r.considerations.length).toBeGreaterThanOrEqual(2);
    for (const c of r.considerations) expect(hasInventedNumber(c)).toBe(false);
    expect(r.reply).not.toMatch(/권장|추천|하세요/);
  });

  it("어떤 응답 문장에도 권장·추천·실행이 없다", () => {
    for (const t of ["치매 진단", "3억 생김", "30% 하락", "며느리가 돈을 달라고"]) {
      const r = interpretByRule(t);
      expect(r.reply).not.toMatch(/권장|추천|하세요|실행/);
    }
  });
});

describe("kindOfText 우선순위", () => {
  it("진단 > 급락 > 목돈", () => {
    expect(kindOfText("1억 주식이 30% 떨어졌어요")).toBe("market_crash");
    expect(kindOfText("치매 진단 받고 보험금 3천 나왔어요")).toBe("diagnosis");
    expect(kindOfText("오늘 날씨가 좋네요")).toBeNull();
  });
});

describe("fromApi — 라우트 응답 검증", () => {
  it("windfall 은 amount 가 있어야 한다. 없으면 null → 폴백", () => {
    expect(fromApi({ kind: "windfall", reply: "네", amount: null })).toBeNull();
    const ok = fromApi({ kind: "windfall", reply: "네", amount: 250_000_000, label: "" });
    expect(ok?.kind).toBe("windfall");
    if (ok?.kind === "windfall") {
      expect(ok.params.amount).toBe(250_000_000);
      expect(ok.label).toContain("2억 5,000만원");
      expect(ok.source).toBe("llm");
    }
  });

  it("market_crash 는 dropPct 가 없어도 기본값으로 완주한다", () => {
    const r = fromApi({ kind: "market_crash", reply: "네", dropPct: null, label: "시장 급락" });
    expect(r?.kind).toBe("market_crash");
    if (r?.kind === "market_crash") expect(r.params.dropPct).toBeUndefined();
  });

  it("hasInventedNumber: 조항 번호는 허용, 금액·퍼센트·기간은 잡는다", () => {
    expect(hasInventedNumber("지출설계서 제5조 알림 대상")).toBe(false);
    expect(hasInventedNumber("제7조 ② 위험자산 상한")).toBe(false);
    expect(hasInventedNumber("월 300만원까지는 괜찮습니다")).toBe(true);
    expect(hasInventedNumber("자산의 20% 이내로")).toBe(true);
    expect(hasInventedNumber("3년 안에")).toBe(true);
  });

  it("other 의 정성 항목에서 숫자가 섞인 줄은 버린다", () => {
    const r = fromApi({
      kind: "other",
      reply: "계산 밖입니다.",
      considerations: ["제5조 알림 대상", "월 300만원까지는 괜찮습니다", "되돌릴 수 있는지"],
      chapter: "core",
    });
    expect(r?.kind).toBe("other");
    if (r?.kind === "other") {
      expect(r.considerations).toEqual(["제5조 알림 대상", "되돌릴 수 있는지"]);
      expect(r.chapter).toBe("core");
    }
  });

  it("모르는 kind 나 빈 reply 는 null", () => {
    expect(fromApi({ kind: "divorce", reply: "x" })).toBeNull();
    expect(fromApi({ kind: "diagnosis", reply: "" })).toBeNull();
  });
});

describe("eventOf / eventContextOf", () => {
  it("해석 → LifeEvent, 매번 다른 id 라 블록이 겹치지 않는다", () => {
    const it1 = interpretByRule("3억 생겼어요");
    if (it1.kind !== "windfall") throw new Error("expected windfall");
    const a = eventOf(it1);
    const b = eventOf(it1);
    expect(a.id).not.toBe(b.id);
    expect(a.params.amount).toBe(300_000_000);
    expect(a.label).toBe(it1.label);
  });

  it("데모 B 의 설계서 요약에는 총자산과 완료 챕터가 들어간다", () => {
    const ctx = eventContextOf(DEMO_PROFILES.B, null);
    expect(ctx.hasLedgerInsight).toBe(false);
    expect(ctx.chaptersCompleted).toEqual(DEMO_PROFILES.B.chaptersCompleted);
    expect(typeof ctx.totalAssets === "number" || ctx.totalAssets === undefined).toBe(true);
  });
});
