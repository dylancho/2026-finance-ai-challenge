import type { Instrument } from "../types";

/*
 * 서류의 쉬운 이름과 "체결 전" 결과 (2026-09-07 미리보기의 story.ts 에서 옮김).
 *
 * 미리보기(/simulation)가 메뉴에서 빠지면서 "실제로 체결한 서류" 카드가 의뢰서로 갔다.
 * 문장은 화면이 아니라 서류에 붙는 것이라 lib 에 둔다 — 두 화면이 같은 말을 쓴다.
 */
export function instrumentPlain(inst: Instrument): { name: string; consequence: string } {
  switch (inst.kind) {
    case "trust":
      return {
        name: `신탁계약 체결 (${inst.name})`,
        consequence: "체결 전에는 생활비 지급·증액·의료비처럼 신탁에서 나가는 돈이 움직이지 않습니다.",
      };
    case "voluntary_guardianship":
      return {
        name: "임의후견계약 공증",
        consequence: "공증하고 법원이 감독인을 정하기 전에는 요양시설 계약처럼 대신 결정하는 일이 안 됩니다.",
      };
    case "legal_guardianship":
      return {
        name: "법정후견 심판",
        consequence: "법원 심판이 확정되기 전에는 대신 결정하는 일이 안 됩니다.",
      };
    default:
      return {
        name: "자동이체·대리인 등록",
        consequence: "은행에 등록하기 전에는 공과금 자동이체를 대신 처리하지 못합니다.",
      };
  }
}
