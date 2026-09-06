import { demoProfile } from "../profile";
import { buildDesign, findGaps } from "../design";

/**
 * 랜딩 S7 "내 설계서에는 지금 빈칸이 몇 개일까요" 의 숫자.
 *
 * 조항 = 신탁 조항(set·partial) + 지출설계서의 한도·자동이체·활성 보호 규칙 항목 수.
 * 빈칸(gaps) = findGaps. 년수 = 지출설계서 지속가능성 추정. 랜딩이 앱과 다른 숫자를 말하지 않도록
 * 실제 설계서 빌더를 그대로 돌린다.
 */
export interface LandingStats {
  clauses: number;
  gaps: number;
  years: number | null;
}

export function landingStats(key = "B"): LandingStats {
  const p = demoProfile(key);
  if (!p) return { clauses: 0, gaps: 0, years: null };
  const d = buildDesign(p);
  const trust = d.trust?.clauses.filter((c) => c.status !== "missing").length ?? 0;
  const expense =
    d.expense.limits.length +
    d.expense.transfers.length +
    d.expense.fraudRules.filter((r) => r.active).length;
  return {
    clauses: trust + expense,
    gaps: findGaps(p, d).length,
    years: d.expense.sustainability.years,
  };
}
