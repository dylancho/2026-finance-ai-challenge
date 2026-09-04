import type { DesignSet, Profile } from "../types";
import { buildTrustDesign } from "./trust";
import { buildGuardianshipDesign } from "./guardianship";
import { buildExpenseDesign } from "./expense";

export { findGaps, chapterGaps, chapterGapId } from "./gaps";
export { runScenario, scenariosFor, SCENARIOS } from "./scenario";

export function buildDesign(p: Profile): DesignSet {
  return {
    trust: buildTrustDesign(p),
    guardianship: buildGuardianshipDesign(p),
    expense: buildExpenseDesign(p),
  };
}

/** 축별 완성도 (전체 단일 점수를 쓰지 않는다) */
export function readinessAxes(design: DesignSet) {
  const axes: {
    key: "trust" | "guardianship" | "expense";
    label: string;
    pct: number;
    missing: number;
    available: boolean;
    note?: string;
  }[] = [];

  if (design.trust) {
    axes.push({
      key: "trust",
      label: "신탁 설계",
      pct: design.trust.completeness,
      missing: design.trust.missing,
      available: design.trust.available,
      note: design.trust.available ? undefined : "신규 설정 곤란",
    });
  }
  if (design.guardianship) {
    axes.push({
      key: "guardianship",
      label: "후견 설계",
      pct: design.guardianship.completeness,
      missing: design.guardianship.missing,
      available: true,
    });
  }
  axes.push({
    key: "expense",
    label: "지출 설계",
    pct: design.expense.completeness,
    missing: design.expense.missing,
    available: true,
  });

  return axes;
}

export function allFlags(design: DesignSet) {
  return [
    ...(design.trust?.flags ?? []),
    ...(design.guardianship?.flags ?? []),
    ...design.expense.flags,
  ].sort((a, b) => {
    const rank = { critical: 0, warn: 1, info: 2 };
    return rank[a.level] - rank[b.level];
  });
}
