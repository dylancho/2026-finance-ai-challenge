import type { Instrument, ScenarioNode, ScenarioResult } from "../types";
import { canExecute } from "./gate";

/**
 * 시나리오 결과에 집행 근거를 씌운다.
 *
 * lib/design/scenario.ts (938줄) 는 수정하지 않는다. 조항이 무엇을 하는지는 그쪽이 이미
 * 계산했고, 여기서는 "그것을 집행할 근거가 있는가" 만 덧씌운다. 두 판단을 한 파일에 섞으면
 * 시나리오를 고칠 때마다 게이트가 함께 흔들린다.
 */
export function applyAuthority(
  result: ScenarioResult,
  instruments: Instrument[],
): ScenarioResult {
  let blockedCount = 0;

  const nodes: ScenarioNode[] = result.nodes.map((n) => {
    // 안 채운 칸은 그대로 둔다. 공백과 집행 근거 없음은 해결 방법이 다르다 —
    // 하나는 질문에 답하는 것이고 하나는 계약을 체결하는 것이다.
    if (n.status !== "ok") return n;

    const checks = n.clauses.map((c) => ({
      clause: c,
      check: canExecute(c.doc, c.ref, instruments),
    }));
    const blocked = checks.filter((x) => !x.check.ok);
    if (!blocked.length) return n;

    blockedCount++;
    const lead = blocked[0].check;

    return {
      ...n,
      status: "noauthority",
      clauses: checks.map(({ clause, check }) =>
        check.ok ? clause : { ...clause, locked: true },
      ),
      authority: {
        reason: lead.reason ?? "집행 근거가 없습니다.",
        instrumentName: lead.instrument?.name ?? "관련 문서",
        effectRule: lead.instrument?.effectRule ?? "",
        refs: blocked.map((b) => `${b.clause.ref} ${b.clause.label}`),
      },
    };
  });

  const verdict = blockedCount
    ? [
        ...result.verdict,
        `이 흐름에서 ${blockedCount}개 단계가 집행되지 못했습니다. 조항은 정해져 있지만 그것을 집행할 계약이 아직 체결되지 않았기 때문입니다.`,
      ]
    : result.verdict;

  return { ...result, nodes, verdict, blockedCount };
}
