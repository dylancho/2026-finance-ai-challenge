import { describe, it, expect } from "vitest";
import { landingStats } from "../stats";

describe("landingStats", () => {
  it("데모 B 로 조항·공백·년수를 낸다", () => {
    const s = landingStats("B");
    expect(s.clauses).toBeGreaterThan(0);
    expect(s.gaps).toBeGreaterThanOrEqual(0);
    expect(s.years === null || s.years > 0).toBe(true);
  });
  it("없는 키는 0 으로 떨어진다", () => {
    expect(landingStats("Z")).toEqual({ clauses: 0, gaps: 0, years: null });
  });
});
