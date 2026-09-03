import type { DocKey, ExecutionCheck, Instrument } from "../types";

/**
 * 집행 근거 게이트.
 *
 * 규칙은 셋뿐이다.
 *   1. covers 에 걸린 문서가 없으면 통과. 집행 근거가 필요 없는 조항이다.
 *   2. 걸렸고 그 문서가 effective 면 통과.
 *   3. 그 외 전부 차단.
 *
 * 축 전체가 이 함수 하나로 수렴한다.
 */

/**
 * 시나리오가 내는 ref 는 `"제5조 ②"` 처럼 항 번호가 붙는다.
 * covers 는 조(條) 단위로 적으므로 머리만 떼어 비교한다.
 */
export function normalizeRef(doc: DocKey, ref: string): string {
  const head = ref.trim().split(/\s+/)[0];
  return `${doc}:${head}`;
}

function coveredBy(key: string, inst: Instrument): boolean {
  const doc = key.split(":")[0];
  return inst.covers.some((c) => c === key || c === `${doc}:*`);
}

const STAGE_REASON: Record<string, string> = {
  draft: "아직 AI 초안 상태입니다. 전문가에게 전달되지 않았습니다.",
  sent: "전문가에게 전달되었으나 아직 체결되지 않았습니다.",
  executing: "체결 절차가 진행 중입니다. 아직 효력이 발생하지 않았습니다.",
  unavailable: "이 제도를 새로 설정하기 어려운 상태입니다.",
};

export function canExecute(
  doc: DocKey,
  ref: string,
  instruments: Instrument[],
): ExecutionCheck {
  const key = normalizeRef(doc, ref);
  const holders = instruments.filter((i) => coveredBy(key, i));

  if (!holders.length) return { ok: true };

  const effective = holders.find((i) => i.stage === "effective");
  if (effective) return { ok: true, instrument: effective };

  // 여러 문서가 같은 조항을 덮으면 가장 앞선 것을 대표로 보여준다.
  const order: Record<string, number> = {
    executing: 0,
    sent: 1,
    draft: 2,
    unavailable: 3,
  };
  const lead = [...holders].sort(
    (a, b) => (order[a.stage] ?? 9) - (order[b.stage] ?? 9),
  )[0];

  return {
    ok: false,
    instrument: lead,
    reason: `「${lead.name}」이 ${STAGE_REASON[lead.stage] ?? "집행 가능한 상태가 아닙니다."}`,
  };
}
