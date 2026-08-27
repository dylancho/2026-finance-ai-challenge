import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "../../profile";
import { demoLedger } from "../generate";
import { analyze } from "../analyze";
import { buildContrasts, contrastFor, openContrasts } from "../contrast";
import { emptyLedgerState, setResolution } from "../store";
import type { Profile } from "../../types";

const build = (key: "A" | "B" | "D", track: Profile["track"]) => {
  const p = DEMO_PROFILES[key];
  const l = demoLedger(key)!;
  return buildContrasts(p, analyze(l, track), l);
};

describe("B 데모 — 핵심 장면", () => {
  const cs = build("B", "future");

  it("B11 운용지침이 모순으로 잡힌다", () => {
    // 선언 preserve(팔지 않기) vs 하락 5회 전부 매도
    const c = contrastFor(cs, "B11")!;
    expect(c.agreement).toBe("contradiction");
    expect(c.declared).toContain("팔지 않기");
  });

  it("B11 근거에 낙폭 구간이 모두 들어간다", () => {
    const c = contrastFor(cs, "B11")!;
    expect(c.evidence).toHaveLength(5);
    expect(c.evidence.every((e) => e.detail.length > 0)).toBe(true);
  });

  it("B11 은 관찰에 대응하는 선택지가 없으므로 observedValue 를 만들지 않는다", () => {
    // 억지 매핑 대신 화면에서 '절충' 만 제공한다.
    expect(contrastFor(cs, "B11")!.observedValue).toBeUndefined();
  });

  it("동시 지출이 겹친 매도는 해석에 반영된다", () => {
    expect(contrastFor(cs, "B11")!.reason).toContain("현금 필요");
  });

  it("B14 단독 결정 상한이 과거 최대 이체를 막는다", () => {
    const c = contrastFor(cs, "B14")!;
    expect(c.agreement).toBe("contradiction");
    expect(c.observedValue).toBeDefined();
  });

  it("B07 생활비는 실제보다 높게 잡혀 tension", () => {
    expect(contrastFor(cs, "B07")!.agreement).toBe("tension");
  });

  it("심각한 것부터 정렬된다", () => {
    const rank = { contradiction: 0, tension: 1, aligned: 2 };
    const seq = cs.map((c) => rank[c.agreement]);
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
  });
});

describe("A 데모 — 지출 트랙", () => {
  const cs = build("A", "daily");

  it("투자 성향이 없어도 대조가 나온다", () => {
    expect(cs.length).toBeGreaterThan(0);
  });

  it("운용지침 대조는 생기지 않는다", () => {
    expect(contrastFor(cs, "B11")).toBeUndefined();
  });

  it("생활비가 실제와 20% 이내면 aligned", () => {
    expect(contrastFor(cs, "A02")!.agreement).toBe("aligned");
  });

  it("이체 한도가 과거 최대보다 낮으면 모순", () => {
    const c = contrastFor(cs, "A05")!;
    expect(c.agreement).toBe("contradiction");
    expect(c.reason).toContain("정당한 큰 지출");
  });

  it("고정지출을 다 골랐으면 aligned", () => {
    expect(contrastFor(cs, "A01")!.agreement).toBe("aligned");
  });
});

describe("D 데모 — 상속 트랙", () => {
  const cs = build("D", "estate");

  it("D 는 B11 을 답하지 않으므로 운용지침 대조가 없다", () => {
    expect(contrastFor(cs, "B11")).toBeUndefined();
  });

  it("생활비 대조는 D09 로 잡힌다", () => {
    expect(contrastFor(cs, "D09")).toBeDefined();
  });
});

describe("관찰 불가 문항은 침묵한다", () => {
  it("이력에 근거가 없는 문항에는 대조를 만들지 않는다", () => {
    const cs = build("B", "future");
    // B15(금지행위)·B21(잔여재산)은 합성 이력에 대응 사건이 없다.
    expect(contrastFor(cs, "B15")).toBeUndefined();
    expect(contrastFor(cs, "B21")).toBeUndefined();
  });

  it("답하지 않은 문항에는 대조를 만들지 않는다", () => {
    const bare: Profile = { ...DEMO_PROFILES.B, answers: {} };
    const l = demoLedger("B")!;
    expect(buildContrasts(bare, analyze(l, "future"), l)).toHaveLength(0);
  });
});

describe("해소", () => {
  const p = DEMO_PROFILES.B;
  const l = demoLedger("B")!;
  const insight = analyze(l, "future");

  it("미해소 불일치만 openContrasts 로 나온다", () => {
    const cs = buildContrasts(p, insight, l);
    const open = openContrasts(cs);
    expect(open.every((c) => c.agreement !== "aligned")).toBe(true);
    expect(open.length).toBeGreaterThan(0);
  });

  it("해소한 항목은 open 에서 빠진다", () => {
    const state = setResolution(emptyLedgerState(), "B11", "declared");
    const cs = buildContrasts(p, insight, l, state);
    expect(contrastFor(cs, "B11")!.resolution).toBe("declared");
    expect(openContrasts(cs).some((c) => c.qid === "B11")).toBe(false);
  });

  it("aligned 항목은 애초에 open 이 아니다", () => {
    const cs = buildContrasts(DEMO_PROFILES.A, analyze(demoLedger("A")!, "daily"), demoLedger("A")!);
    const aligned = cs.filter((c) => c.agreement === "aligned");
    expect(aligned.length).toBeGreaterThan(0);
    expect(openContrasts(cs).some((c) => aligned.includes(c))).toBe(false);
  });
});
