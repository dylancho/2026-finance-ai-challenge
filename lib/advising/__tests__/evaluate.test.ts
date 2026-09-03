import { describe, expect, it } from "vitest";
import { DEMO_PROFILES, emptyProfile } from "../../profile";
import { demoLedger } from "../../ledger/generate";
import { insightFor } from "../../insight";
import { buildExpenseDesign } from "../../design/expense";
import { adviseEvent, EVENTS, evaluateEvent, ruleAdviceNarration } from "..";
import type { Profile } from "../../types";

const base = (extra: Partial<Profile> = {}): Profile => ({
  ...emptyProfile(),
  ...DEMO_PROFILES.A,
  ...extra,
  answers: { ...DEMO_PROFILES.A.answers, ...(extra.answers ?? {}) },
});

const ev = (kind: (typeof EVENTS)[number]["kind"]) => EVENTS.find((e) => e.kind === kind)!;
const ledger = demoLedger("A")!;

describe("후보 생성 — 세 이벤트 모두", () => {
  for (const e of EVENTS) {
    it(`${e.label}: 후보 4개, 아무것도 하지 않음 포함, 전부 impact 있음`, () => {
      const p = base({
        chaptersCompleted: ["core", "invest"],
        answers: {
          I01: { kind: "multi", values: ["none"] },
          I02: { kind: "choice", value: "low" },
          I03: { kind: "choice", value: "do_nothing" },
          I04: { kind: "choice", value: "freeze" },
        },
      });
      const cands = evaluateEvent(p, insightFor(ledger, p), e);
      expect(cands).toHaveLength(4);
      expect(cands.filter((c) => c.isDoNothing)).toHaveLength(1);
      for (const c of cands) {
        expect(c.impact.runwayYears !== undefined).toBe(true);
        expect(typeof c.impact.riskExposure).toBe("number");
        expect(c.basis.length).toBeGreaterThan(0);
        expect(c.title).not.toMatch(/실행/);
      }
    });
  }

  it("급락 이벤트는 '아무것도 하지 않음' 이 첫 번째 후보다", () => {
    const p = base();
    const cands = evaluateEvent(p, insightFor(ledger, p), ev("market_crash"));
    expect(cands[0].isDoNothing).toBe(true);
  });
});

describe("impact 는 설계서 제6조 과 같은 계산이다", () => {
  it("진단·급락의 현상 유지 소진 시점이 설계서 추정과 일치한다", () => {
    const p = base();
    const design = buildExpenseDesign(p);
    const adv = adviseEvent(p, null, ev("diagnosis"));
    expect(adv.baselineRunwayYears).toBe(design.sustainability.years);
    expect(adv.candidates.find((c) => c.isDoNothing)!.impact.runwayYears).toBe(
      design.sustainability.years,
    );
  });

  it("목돈 3억이 들어오면 현상 유지의 소진 시점이 늘어나고 노출액은 3억 전액이다", () => {
    const p = base();
    const design = buildExpenseDesign(p);
    const nothing = evaluateEvent(p, null, ev("windfall")).find((c) => c.isDoNothing)!;
    expect(nothing.impact.riskExposure).toBe(300_000_000);
    const before = design.sustainability.years ?? 31;
    const after = nothing.impact.runwayYears ?? 31;
    expect(after).toBeGreaterThan(before);
  });

  it("진단 이벤트에서 한도 하향 후보의 노출액은 새 한도의 2배다", () => {
    const p = base(); // A05 = 100만
    const c = evaluateEvent(p, null, ev("diagnosis")).find((x) => x.id === "dx-lower-limit")!;
    expect(c.impact.riskExposure).toBe(1_000_000);
    expect(c.reversible).toBe(true);
  });
});

describe("금지 자산군은 하드 제약이다", () => {
  it("예금·채권을 금지하면 안전자산 전환 후보가 생기지 않는다", () => {
    const p = base({
      answers: {
        I01: { kind: "multi", values: ["deposit", "bond"] },
        I02: { kind: "choice", value: "half" },
        I03: { kind: "choice", value: "reduce" },
      },
    });
    const crash = evaluateEvent(p, insightFor(ledger, p), ev("market_crash"));
    expect(crash.some((c) => c.id === "cr-all-safe")).toBe(false);
    expect(crash.some((c) => c.id === "cr-reduce")).toBe(false);
    expect(crash.some((c) => c.isDoNothing)).toBe(true);

    const windfall = evaluateEvent(p, null, ev("windfall"));
    expect(windfall.some((c) => c.id === "wf-allocate")).toBe(false);
    expect(windfall.some((c) => c.id === "wf-medical-reserve")).toBe(false);
  });

  it("펀드·주식만 금지하면 배분 후보는 남되 위험 몫이 0 이 된다", () => {
    const p = base({
      answers: {
        I01: { kind: "multi", values: ["fund", "equity"] },
        I02: { kind: "choice", value: "half" },
      },
    });
    const c = evaluateEvent(p, null, ev("windfall")).find((x) => x.id === "wf-allocate")!;
    expect(c).toBeDefined();
    expect(c.impact.riskExposure).toBe(0);
    expect(c.basis.join(" ")).toContain("금지 자산군 제외");
  });
});

describe("재진입과 대조", () => {
  it("의료·투자 미선언이면 해당 이벤트에 재진입 챕터가 붙는다", () => {
    const p = base();
    expect(adviseEvent(p, null, ev("diagnosis")).reentry).toEqual(["medical"]);
    expect(adviseEvent(p, null, ev("windfall")).reentry).toEqual(["invest"]);
    expect(adviseEvent(p, null, ev("market_crash")).reentry).toEqual(["invest"]);
  });

  it("급락 이벤트는 선언(I03)과 관측(낙폭 반응)을 나란히 둔다", () => {
    const p = base({ answers: { I03: { kind: "choice", value: "do_nothing" } } });
    const adv = adviseEvent(p, insightFor(ledger, p), ev("market_crash"));
    expect(adv.contrast?.declared).toContain("아무것도 하지 않는다");
    expect(adv.contrast?.observed).toMatch(/하락 \d회/);
    expect(adv.contrast?.evidence.length).toBeGreaterThan(0);
    expect(adv.reentry).toEqual([]);
  });

  it("보류 트랙 데모(B)에는 재진입 카드가 없고 후보는 만들어진다", () => {
    const adv = adviseEvent(DEMO_PROFILES.B, insightFor(demoLedger("B")!, DEMO_PROFILES.B), ev("diagnosis"));
    expect(adv.reentry).toEqual([]);
    expect(adv.candidates.some((c) => c.id === "dx-start-payout")).toBe(true);
  });
});

describe("룰 폴백 서술", () => {
  it("키 없는 환경에서도 요약·후보별 문장이 나온다", () => {
    const p = base();
    const adv = adviseEvent(p, null, ev("windfall"));
    const n = ruleAdviceNarration(adv);
    expect(n.summary.source).toBe("rule");
    expect(n.summary.text).not.toMatch(/권장|추천/);
    for (const c of adv.candidates) expect(n.tradeoffs[c.id]?.text.length).toBeGreaterThan(0);
  });
});
