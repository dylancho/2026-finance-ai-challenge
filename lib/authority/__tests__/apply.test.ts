import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "../../profile";
import { buildDesign, runScenario, scenariosFor } from "../../design";
import type { AuthorityState, Instrument } from "../../types";
import { buildInstruments } from "../instruments";
import { applyAuthority } from "../apply";

const run = (key: string, stages: AuthorityState["stages"] = {}) => {
  const p = DEMO_PROFILES[key];
  const design = buildDesign(p);
  const insts = buildInstruments(p, design, { version: 1, stages, sentAt: null, sentTo: null });
  const scen = scenariosFor(p)[0];
  const base = runScenario(p, design, scen.id)!;
  return { base, out: applyAuthority(base, insts), insts };
};

const ALL_EFFECTIVE: AuthorityState["stages"] = {
  trust: "effective",
  voluntary_guardianship: "effective",
  legal_guardianship: "effective",
  bank_mandate: "effective",
};

describe("applyAuthority — 잠금", () => {
  it("초안 상태에서는 조항이 걸린 단계가 잠긴다", () => {
    const { out } = run("B");
    expect(out.blockedCount).toBeGreaterThan(0);
    expect(out.nodes.some((n) => n.status === "noauthority")).toBe(true);
  });

  it("전부 체결되면 잠기지 않는다", () => {
    const { out } = run("B", ALL_EFFECTIVE);
    expect(out.blockedCount).toBe(0);
    expect(out.nodes.every((n) => n.status !== "noauthority")).toBe(true);
  });

  it("잠긴 단계는 이유와 효력 발생 요건을 함께 낸다", () => {
    const n = run("B").out.nodes.find((x) => x.status === "noauthority")!;
    expect(n.authority?.reason).toContain("초안");
    expect(n.authority?.effectRule).toBeTruthy();
    expect(n.authority?.refs.length).toBeGreaterThan(0);
  });
});

describe("applyAuthority — 공백은 건드리지 않는다", () => {
  it("gap 노드를 noauthority 로 덮어쓰지 않는다", () => {
    // 둘은 해결 방법이 다르다 — 답하기 / 체결하기
    const { base, out } = run("B");
    const gapNs = base.nodes.filter((n) => n.status === "gap").map((n) => n.n);
    for (const i of gapNs) {
      expect(out.nodes.find((n) => n.n === i)!.status).toBe("gap");
    }
  });

  it("gapCount 는 그대로 둔다", () => {
    const { base, out } = run("B");
    expect(out.gapCount).toBe(base.gapCount);
  });
});

describe("applyAuthority — 문서별로 범위가 다르다", () => {
  it("신탁만 체결하면 위임장이 필요한 조항은 여전히 잠긴다", () => {
    const { out } = run("B", { trust: "effective" });
    const mixed = out.nodes.find(
      (n) =>
        n.status === "noauthority" &&
        n.clauses.some((c) => c.doc === "expense" && c.locked) &&
        n.clauses.some((c) => c.doc === "trust" && !c.locked),
    );
    expect(mixed).toBeTruthy();
  });

  it("잠긴 조항만 locked 로 표시하고 나머지는 건드리지 않는다", () => {
    const { out } = run("B", { trust: "effective" });
    for (const n of out.nodes) {
      for (const c of n.clauses) {
        if (c.doc === "trust") expect(c.locked).toBeFalsy();
      }
    }
  });
});

describe("applyAuthority — 정리 문구", () => {
  it("잠긴 단계가 있으면 verdict 에 한 줄을 덧붙인다", () => {
    const { base, out } = run("B");
    expect(out.verdict.length).toBe(base.verdict.length + 1);
    expect(out.verdict.at(-1)).toContain("체결되지 않았기");
  });

  it("잠긴 단계가 없으면 verdict 를 건드리지 않는다", () => {
    const { base, out } = run("B", ALL_EFFECTIVE);
    expect(out.verdict).toEqual(base.verdict);
  });
});

describe("applyAuthority — 순수성", () => {
  it("원본 결과를 변형하지 않는다", () => {
    const { base } = run("B");
    const before = JSON.stringify(base);
    applyAuthority(base, [] as Instrument[]);
    expect(JSON.stringify(base)).toBe(before);
  });

  it("instruments 가 비면 전부 통과한다", () => {
    const { base, out: _ } = run("B");
    const out = applyAuthority(base, []);
    expect(out.blockedCount).toBe(0);
  });
});
