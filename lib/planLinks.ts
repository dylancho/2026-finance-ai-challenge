/**
 * 설계서 조항으로 가는 링크.
 *
 * 지출설계서는 카드마다 id="exp-N" 앵커가 있어 "제6조 보기" 가 그 카드로 바로 간다.
 * 신탁·후견은 아직 앵커가 없어 탭까지만 보낸다.
 * components/events/AdviceBlock.tsx 의 clauseHref 와 같은 규칙이다 — 시뮬레이션에서도 쓰게
 * 되어 lib 로 옮겼다. AdviceBlock 쪽은 다른 작업자가 손대고 있어 그대로 둔다.
 */
export function clauseHref(clause: { doc: string; ref: string }): string {
  const n = /제(\d+)조/.exec(clause.ref)?.[1];
  const hash = clause.doc === "expense" && n ? `#exp-${n}` : "";
  return `/plan?tab=${clause.doc}${hash}`;
}

/** "지출설계서 제2조" 처럼 링크에 쓸 짧은 이름 */
export function clauseLabel(clause: { doc: string; ref: string }): string {
  const doc =
    clause.doc === "trust" ? "신탁설계서" : clause.doc === "guardianship" ? "후견설계서" : "지출설계서";
  // "제5조 ②" 는 조 단위 머리만 남긴다. 링크가 가리키는 것도 조(카드) 단위다.
  const head = clause.ref.trim().split(/\s+/)[0];
  return `${doc} ${head}`;
}
