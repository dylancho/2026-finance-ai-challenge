import type { Ledger, LedgerInsight, Profile } from "./types";
import { analyze, analyzeBehavior, analyzeDecision, computeBaseline } from "./ledger";
import { isUnified } from "./questions";

/**
 * 프로필에 맞는 이력 분석.
 *
 * 통합 플로우는 투자 성향(낙폭 반응)을 항상 뽑는다 — 투자 챕터를 나중에 답하거나
 * 시장 급락 이벤트를 돌릴 때 대조할 이력이 있어야 하기 때문이다. 측정층(analyze)의
 * 트랙 게이트는 보류 트랙 데모와 테스트가 기대하는 동작이라 손대지 않고, 여기서
 * 측정 함수를 직접 조립한다.
 */
export function insightFor(ledger: Ledger, p: Profile): LedgerInsight {
  if (!isUnified(p)) return analyze(ledger, p.track);
  return {
    behavior: analyzeBehavior(ledger),
    decision: analyzeDecision(ledger),
    baseline: computeBaseline(ledger),
    persona: null,
  };
}
