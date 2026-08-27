import { describe, expect, it } from "vitest";
import { demoLedger, generateLedger } from "../generate";
import {
  bandOf,
  evaluateTrigger,
  PROOF_FRESH_DAYS,
  readBiomarker,
} from "../biomarker";
import type { BiomarkerReading, MedicalProof } from "../../types";

const asOf = new Date("2026-08-27T00:00:00Z");
const daysAgo = (n: number) =>
  new Date(asOf.getTime() - n * 86_400_000).toISOString().slice(0, 10);

const reading = (score: number): BiomarkerReading => ({
  score,
  band: bandOf(score),
  series: [],
  signals: [],
});

describe("구간 경계", () => {
  it.each([
    [0, "normal"],
    [30, "normal"],
    [31, "watch"],
    [60, "watch"],
    [61, "alert"],
    [100, "alert"],
  ])("%i → %s", (score, band) => {
    expect(bandOf(score as number)).toBe(band);
  });
});

describe("스코어 산출", () => {
  it("건강한 이력은 경보에 닿지 않는다", () => {
    const r = readBiomarker(generateLedger("healthy", { preset: "holder", decline: false }));
    expect(r.band).not.toBe("alert");
  });

  it("저하 이력은 스코어가 올라간다", () => {
    const healthy = readBiomarker(generateLedger("x", { preset: "cautious", decline: false }));
    const declining = readBiomarker(
      generateLedger("x", { preset: "cautious", decline: true, declineFromYear: 8 }),
    );
    expect(declining.score).toBeGreaterThan(healthy.score);
  });

  it("시계열은 베이스라인 구간이 끝난 뒤부터 그린다", () => {
    const l = demoLedger("B")!;
    const r = readBiomarker(l);
    expect(r.series[0].ym).toBe("2021-01");
    expect(r.series).toHaveLength(l.months.length - l.baselineYears * 12);
  });

  it("신호는 기여도 순으로 정렬된다", () => {
    const r = readBiomarker(demoLedger("B")!);
    const w = r.signals.map((s) => s.deviation * s.weight);
    expect([...w].sort((a, b) => b - a)).toEqual(w);
  });
});

describe("트리거 게이트 — AI 경보 단독으로는 발동하지 않는다", () => {
  const fresh: MedicalProof = { kind: "diagnosis", issuedAt: daysAgo(5) };

  it("경보 + 최근 서류 = 발동", () => {
    expect(evaluateTrigger(reading(72), fresh, asOf).fired).toBe(true);
  });

  it("경보만 있고 서류가 없으면 발동하지 않는다", () => {
    const g = evaluateTrigger(reading(95), null, asOf);
    expect(g.fired).toBe(false);
    expect(g.aiAlert).toBe(true);
    expect(g.blockedBy.join()).toContain("첨부되지 않았");
  });

  it("서류만 있고 경보가 아니면 발동하지 않는다", () => {
    const g = evaluateTrigger(reading(30), fresh, asOf);
    expect(g.fired).toBe(false);
    expect(g.blockedBy.join()).toContain("경보 구간이 아닙니다");
  });

  it("스코어가 100이어도 서류 없이는 발동하지 않는다", () => {
    expect(evaluateTrigger(reading(100), null, asOf).fired).toBe(false);
  });

  it("서류가 30일을 넘기면 발동하지 않는다", () => {
    const stale: MedicalProof = { kind: "ltci", issuedAt: daysAgo(PROOF_FRESH_DAYS + 1) };
    const g = evaluateTrigger(reading(80), stale, asOf);
    expect(g.fired).toBe(false);
    expect(g.proofFresh).toBe(false);
    expect(g.blockedBy.join()).toContain("이내 발행분이 아닙니다");
  });

  it("정확히 30일 전 서류는 유효하다", () => {
    const edge: MedicalProof = { kind: "ltci", issuedAt: daysAgo(PROOF_FRESH_DAYS) };
    expect(evaluateTrigger(reading(80), edge, asOf).fired).toBe(true);
  });

  it("미래 날짜로 발행된 서류는 인정하지 않는다", () => {
    const future: MedicalProof = { kind: "diagnosis", issuedAt: daysAgo(-3) };
    expect(evaluateTrigger(reading(80), future, asOf).proofFresh).toBe(false);
  });

  it("두 조건 모두 없으면 사유가 둘 다 나온다", () => {
    expect(evaluateTrigger(reading(10), null, asOf).blockedBy).toHaveLength(2);
  });

  it("장기요양등급도 진단서와 동등하게 인정한다", () => {
    const ltci: MedicalProof = { kind: "ltci", issuedAt: daysAgo(2) };
    expect(evaluateTrigger(reading(70), ltci, asOf).fired).toBe(true);
  });
});
