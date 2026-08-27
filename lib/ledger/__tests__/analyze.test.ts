import { describe, expect, it } from "vitest";
import { generateLedger, demoLedger } from "../generate";
import {
  analyze,
  analyzeDecision,
  baselineMonths,
  computeBaseline,
  median,
  reactionsOf,
  riskAversionOf,
} from "../analyze";

describe("시드 결정성", () => {
  it("같은 시드는 항상 같은 이력을 만든다", () => {
    const a = generateLedger("seed-x", { preset: "panic_seller" });
    const b = generateLedger("seed-x", { preset: "panic_seller" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("다른 시드는 다른 이력을 만든다", () => {
    const a = generateLedger("seed-x", { preset: "panic_seller" });
    const b = generateLedger("seed-y", { preset: "panic_seller" });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("10년이면 월 집계가 120개다", () => {
    expect(generateLedger("s", { years: 10 }).months).toHaveLength(120);
  });
});

describe("median", () => {
  it("홀수 길이는 가운데 값", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it("짝수 길이는 두 값의 평균", () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2.5 → 반올림 3
  });
  it("빈 배열은 0", () => {
    expect(median([])).toBe(0);
  });
});

describe("베이스라인 구간 분리", () => {
  const ledger = generateLedger("baseline-test", {
    preset: "cautious",
    years: 10,
    baselineYears: 5,
    decline: true,
    declineFromYear: 8,
  });

  it("앞 baselineYears 구간만 쓴다", () => {
    const ms = baselineMonths(ledger);
    expect(ms).toHaveLength(60);
    expect(ms[0].ym).toBe("2016-01");
    expect(ms[ms.length - 1].ym).toBe("2020-12");
  });

  it("저하 구간이 베이스라인에 섞이지 않는다", () => {
    // 이게 깨지면 기준선이 오염되어 감지가 통째로 무뎌진다.
    const ms = baselineMonths(ledger);
    const declineYears = ["2023", "2024", "2025"];
    expect(ms.some((m) => declineYears.includes(m.ym.slice(0, 4)))).toBe(false);
  });

  it("베이스라인 연체율이 저하 구간 연체율보다 낮다", () => {
    const base = computeBaseline(ledger);
    const tail = ledger.months.slice(-24);
    const tailLatePerYear = tail.reduce((a, m) => a + m.latePayments, 0) / 2;
    expect(base.latePerYear).toBeLessThan(tailLatePerYear);
  });

  it("span 이 실제 사용 구간과 일치한다", () => {
    const base = computeBaseline(ledger);
    expect(base.span).toEqual({ from: "2016-01", to: "2020-12" });
  });
});

describe("riskAversion 회귀", () => {
  it("아무것도 안 팔면 0", () => {
    expect(
      riskAversionOf([
        { date: "", label: "", drawdown: -0.2, sold: false, portionSold: 0, reactionDays: 0 },
        { date: "", label: "", drawdown: -0.1, sold: false, portionSold: 0, reactionDays: 0 },
      ]),
    ).toBe(0);
  });

  it("얕은 낙폭에 전량 매도하면 높다", () => {
    const v = riskAversionOf([
      { date: "", label: "", drawdown: -0.1, sold: true, portionSold: 1, reactionDays: 3 },
    ]);
    expect(v).toBeGreaterThan(0.9);
  });

  it("깊은 낙폭에 소량 매도하면 낮다", () => {
    const v = riskAversionOf([
      { date: "", label: "", drawdown: -0.28, sold: true, portionSold: 0.2, reactionDays: 80 },
    ]);
    expect(v).toBeLessThan(0.2);
  });

  it("낙폭 이벤트가 없으면 0", () => {
    expect(riskAversionOf([])).toBe(0);
  });
});

describe("프리셋이 의도한 성향을 만든다", () => {
  it("panic_seller 는 대부분 팔고 holder 는 대부분 버틴다", () => {
    const panic = analyzeDecision(
      generateLedger("demo-B-panic", { preset: "panic_seller", decline: true, declineFromYear: 8 }),
    )!;
    const holder = analyzeDecision(generateLedger("demo-D-holder", { preset: "holder" }))!;

    expect(panic.holdRate).toBeLessThan(0.4);
    expect(holder.holdRate).toBeGreaterThan(0.6);
    expect(panic.riskAversion).toBeGreaterThan(holder.riskAversion);
    expect(panic.reactionDays).toBeLessThan(holder.reactionDays || 999);
  });

  it("B 데모는 B11 'preserve' 선언과 모순되는 이력을 만든다", () => {
    // 이 테스트가 깨지면 핵심 데모 장면이 성립하지 않는다.
    const d = analyzeDecision(demoLedger("B")!)!;
    expect(d.reactions.filter((r) => r.sold).length).toBeGreaterThanOrEqual(3);
  });

  it("판정층이 쓸 맥락(동시 지출)이 최소 한 건 붙는다", () => {
    const d = analyzeDecision(demoLedger("B")!)!;
    const withContext = d.reactions.filter((r) => r.coincidingOutflow);
    expect(withContext.length).toBeGreaterThanOrEqual(1);
  });
});

describe("트랙별 추출량 차등", () => {
  const ledger = demoLedger("B")!;

  it("future 는 투자 성향까지 뽑는다", () => {
    expect(analyze(ledger, "future").decision).not.toBeNull();
  });
  it("estate 도 투자 성향까지 뽑는다", () => {
    expect(analyze(ledger, "estate").decision).not.toBeNull();
  });
  it("daily 는 투자 성향을 뽑지 않는다", () => {
    expect(analyze(ledger, "daily").decision).toBeNull();
  });
  it("caregiver 는 투자 성향을 뽑지 않는다", () => {
    expect(analyze(ledger, "caregiver").decision).toBeNull();
  });
  it("트랙과 무관하게 소비·베이스라인은 항상 나온다", () => {
    for (const t of ["daily", "future", "caregiver", "estate"] as const) {
      const i = analyze(ledger, t);
      expect(i.behavior.livingMedian).toBeGreaterThan(0);
      expect(i.baseline.txnPerMonth).toBeGreaterThan(0);
    }
  });
});

describe("낙폭-매도 짝짓기", () => {
  it("모든 낙폭 구간이 하나씩 대응된다", () => {
    const l = demoLedger("B")!;
    expect(reactionsOf(l)).toHaveLength(l.drawdowns.length);
  });

  it("매도가 없는 구간은 sold=false, portionSold=0", () => {
    const l = generateLedger("no-sell", { preset: "holder" });
    for (const r of reactionsOf(l)) {
      if (!r.sold) expect(r.portionSold).toBe(0);
    }
  });
});
