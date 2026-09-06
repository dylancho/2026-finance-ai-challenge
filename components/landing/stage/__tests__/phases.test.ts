import { describe, it, expect } from "vitest";
import { T, TOTAL, DARK, isDark } from "../phases";

describe("phases", () => {
  it("라벨은 시간순이고 TOTAL 안에 있다", () => {
    const times = Object.values(T);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    expect(Math.max(...times)).toBeLessThan(TOTAL);
  });
  it("다크 구간은 0~1 안의 오름차순 쌍", () => {
    for (const [a, b] of DARK) {
      expect(a).toBeLessThan(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });
  it("S0 오프닝과 CH2 이후는 다크, CH1 은 밝음", () => {
    expect(isDark(0.02)).toBe(true);
    expect(isDark(T.ch1Beat2 / TOTAL)).toBe(false);
    expect(isDark(T.tr / TOTAL)).toBe(true);
  });
});
