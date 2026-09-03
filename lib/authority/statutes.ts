import type { DesignSet, InstrumentKind, Statute } from "../types";

/**
 * 참조 법령.
 *
 * 이 서비스가 이미 화면에서 단정하고 있는 사실 — "후견계약은 공정증서로 체결해야 한다",
 * "감독인이 선임되어야 효력이 발생한다" — 의 근거를 명시한다.
 *
 * 원칙 세 가지.
 *
 * 1. **조문 전문을 그대로 싣는다.** 요약하면 그 요약이 우리 주장이 되고, 인용이 아니게 된다.
 * 2. **구조적이고 오래 안 바뀐 조문만 넣는다.** 유류분(민법 §1112 이하)은 넣지 않는다 —
 *    2024년 헌법재판소 결정으로 내용이 달라진 부분이 있어, 조문만 인용하면 현행과 어긋날
 *    위험이 크다. 지금처럼 "전문가 확인이 필요합니다" 로 둔다.
 * 3. **명문 조항이 없는 것에는 조문을 붙이지 않는다.** "의사능력 없는 자의 법률행위는 무효"
 *    는 판례 법리이고 민법에 그 문언이 없다. 번호를 붙이는 순간 그것이 틀린 인용이 된다.
 *    금융기관 대리인 지정도 약관·내규의 영역이라 근거 조문을 달지 않는다.
 *
 * 확인일 2026-09-03 · 출처 국가법령정보센터 수록 조문
 */

const C = (article: string, title: string, text: string, path: string): Statute => ({
  law: "민법",
  article,
  title,
  text,
  url: `https://casenote.kr/법령/민법/${path}`,
});

const T = (article: string, title: string, text: string, path: string): Statute => ({
  law: "신탁법",
  article,
  title,
  text,
  url: `https://casenote.kr/법령/신탁법/${path}`,
});

export const STATUTES = {
  voluntaryForm: C(
    "제959조의14 제2항",
    "후견계약의 의의와 체결방법 등",
    "후견계약은 공정증서로 체결하여야 한다.",
    "제959조의14",
  ),
  voluntaryEffect: C(
    "제959조의14 제3항",
    "후견계약의 의의와 체결방법 등",
    "후견계약은 가정법원이 임의후견감독인을 선임한 때부터 효력이 발생한다.",
    "제959조의14",
  ),
  voluntarySupervisor: C(
    "제959조의15 제1항",
    "임의후견감독인의 선임",
    "가정법원은 후견계약이 등기되어 있고, 본인이 사무를 처리할 능력이 부족한 상황에 있다고 인정할 때에는 본인, 배우자, 4촌 이내의 친족, 임의후견인, 검사 또는 지방자치단체의 장의 청구에 의하여 임의후견감독인을 선임한다.",
    "제959조의15",
  ),
  adult: C(
    "제9조 제1항",
    "성년후견개시의 심판",
    "가정법원은 질병, 장애, 노령, 그 밖의 사유로 인한 정신적 제약으로 사무를 처리할 능력이 지속적으로 결여된 사람에 대하여 본인, 배우자, 4촌 이내의 친족, 미성년후견인, 미성년후견감독인, 한정후견인, 한정후견감독인, 특정후견인, 특정후견감독인, 검사 또는 지방자치단체의 장의 청구에 의하여 성년후견개시의 심판을 한다.",
    "제9조",
  ),
  limited: C(
    "제12조 제1항",
    "한정후견개시의 심판",
    "가정법원은 질병, 장애, 노령, 그 밖의 사유로 인한 정신적 제약으로 사무를 처리할 능력이 부족한 사람에 대하여 본인, 배우자, 4촌 이내의 친족, 미성년후견인, 미성년후견감독인, 성년후견인, 성년후견감독인, 특정후견인, 특정후견감독인, 검사 또는 지방자치단체의 장의 청구에 의하여 한정후견개시의 심판을 한다.",
    "제12조",
  ),
  specific: C(
    "제14조의2 제1항",
    "특정후견의 심판",
    "가정법원은 질병, 장애, 노령, 그 밖의 사유로 인한 정신적 제약으로 일시적 후원 또는 특정한 사무에 관한 후원이 필요한 사람에 대하여 본인, 배우자, 4촌 이내의 친족, 미성년후견인, 미성년후견감독인, 검사 또는 지방자치단체의 장의 청구에 의하여 특정후견의 심판을 한다.",
    "제14조의2",
  ),
  specificAgainstWill: C(
    "제14조의2 제2항",
    "특정후견의 심판",
    "특정후견은 본인의 의사에 반하여 할 수 없다.",
    "제14조의2",
  ),
  trustCreate: T(
    "제3조 제1항",
    "신탁의 설정",
    "신탁은 다음 각 호의 어느 하나에 해당하는 방법으로 설정할 수 있다. 1. 위탁자와 수탁자 간의 계약 2. 위탁자의 유언 3. 신탁의 목적, 신탁재산, 수익자 등을 특정하고 자신을 수탁자로 정한 위탁자의 선언",
    "제3조",
  ),
  willSubstitute: T(
    "제59조 제2항",
    "유언대용신탁",
    "제1항제2호의 수익자는 위탁자가 사망할 때까지 수익자로서의 권리를 행사하지 못한다. 다만, 신탁행위로 달리 정한 경우에는 그에 따른다.",
    "제59조",
  ),
  successive: T(
    "제60조",
    "수익자연속신탁",
    "신탁행위로 수익자가 사망한 경우 그 수익자가 갖는 수익권이 소멸하고 타인이 새로 수익권을 취득하도록 하는 뜻을 정할 수 있다. 이 경우 수익자의 사망에 의하여 차례로 타인이 수익권을 취득하는 경우를 포함한다.",
    "제60조",
  ),
} as const;

/** 법정후견 심판 청구권자 — 진단 이후 절차를 누가 밟을 수 있는지의 근거 */
export const PETITIONERS =
  "본인, 배우자, 4촌 이내의 친족, 검사 또는 지방자치단체의 장";

/** 문서별 근거 조문. 근거가 없는 문서에는 아무것도 달지 않는다. */
export function statutesFor(
  kind: InstrumentKind,
  design: DesignSet,
): Statute[] {
  switch (kind) {
    case "voluntary_guardianship":
      return [
        STATUTES.voluntaryForm,
        STATUTES.voluntaryEffect,
        STATUTES.voluntarySupervisor,
      ];
    case "legal_guardianship": {
      const code = design.guardianship?.verdict.code;
      if (code === "limited") return [STATUTES.limited];
      if (code === "specific")
        return [STATUTES.specific, STATUTES.specificAgainstWill];
      return [STATUTES.adult];
    }
    case "trust": {
      const out: Statute[] = [STATUTES.trustCreate];
      const code = design.trust?.type.code;
      if (code === "will_substitute") out.push(STATUTES.willSubstitute);
      if (code === "successive") out.push(STATUTES.successive);
      return out;
    }
    // 금융기관 대리인 지정은 약관·내규의 영역이다. 근거 조문을 지어내지 않는다.
    case "bank_mandate":
      return [];
  }
}

/** 의뢰서 §참조 법령 — 발급되는 문서들의 근거를 중복 없이 모은다. */
export function statutesForReferral(
  design: DesignSet,
  kinds: InstrumentKind[],
): Statute[] {
  const seen = new Set<string>();
  const out: Statute[] = [];
  for (const k of kinds) {
    for (const s of statutesFor(k, design)) {
      const key = `${s.law} ${s.article}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}
