import type { DesignSet, Gap, Profile } from "../types";
import { activeQuestions, isAnswered } from "../questions";

/**
 * 미응답 질문을 "미래에 무슨 일이 생기는가"로 번역한다.
 * 이 문장이 대시보드의 실질적 CTA다.
 */
const CONSEQUENCE: Record<string, { what: string; consequence: string; severity: Gap["severity"] }> = {
  /* Track A */
  A01: {
    what: "고정지출 목록이 비어 있습니다",
    consequence: "자동이체 매트릭스에 행이 없습니다. 어떤 돈이 매달 나가야 하는지 아무도 모릅니다.",
    severity: "high",
  },
  A02: {
    what: "월 생활비가 정해지지 않았습니다",
    consequence: "생활계좌에 얼마를 넣어야 할지 계산할 수 없습니다.",
    severity: "high",
  },
  A05: {
    what: "1회 이체 한도가 없습니다",
    consequence: "보이스피싱 한 번에 계좌 잔액 전액이 빠져나갈 수 있습니다. 피해 규모의 상한선이 없습니다.",
    severity: "high",
  },
  A06: {
    what: "차단할 이상거래를 고르지 않았습니다",
    consequence: "심야 고액 이체, 신규 계좌 송금, 대출 실행이 모두 그대로 통과합니다.",
    severity: "high",
  },
  A07: {
    what: "알림 받을 사람이 없습니다",
    consequence: "이상 거래가 감지되어도 알릴 곳이 본인뿐입니다. 판단이 어려운 순간에는 그것으로 부족합니다.",
    severity: "medium",
  },
  A08: {
    what: "갑작스러운 큰 지출의 처리 방식이 없습니다",
    consequence: "병원비가 발생했을 때 한도에 막혀 결제가 안 되거나, 반대로 아무 제한 없이 나갑니다.",
    severity: "medium",
  },

  /* Track B */
  B03: {
    what: "신탁재산이 지정되지 않았습니다",
    consequence: "무엇을 보호할지 정해지지 않아 신탁 제2조를 작성할 수 없습니다.",
    severity: "high",
  },
  B04: {
    what: "신탁의 목적이 없습니다",
    consequence: "수탁자가 어떤 지급을 승인하고 어떤 요청을 거절할지 판단할 기준이 없습니다.",
    severity: "high",
  },
  B05: {
    what: "지급개시 트리거가 없습니다",
    consequence:
      "판단이 어려워졌을 때 이 계획이 언제 작동을 시작할지 아무도 모릅니다. 가족이 그 시점을 두고 다투게 됩니다.",
    severity: "high",
  },
  B06: {
    what: "발동을 확인할 사람이 없습니다",
    consequence: "트리거 조건이 충족되었는지 누가 판정할지 정해지지 않았습니다.",
    severity: "medium",
  },
  B07: {
    what: "월 지급액이 없습니다",
    consequence: "생활비를 얼마씩 지급할지 정해지지 않아 정기지급 조항이 비어 있습니다.",
    severity: "high",
  },
  B08: {
    what: "요양시설 입소 시 증액 조건이 없습니다",
    consequence:
      "요양원 본인부담이 시작되면 기존 지급액으로 부족해집니다. 그 시점에 가족이 증액 여부를 두고 협의해야 합니다.",
    severity: "medium",
  },
  B09: {
    what: "의료비 지급 한도가 없습니다",
    consequence:
      "큰 치료비가 발생했을 때 지급할지 말지 정할 기준이 없습니다. 수탁자는 판단을 보류하고, 결정은 멈춥니다.",
    severity: "high",
  },
  B11: {
    what: "투자자산 운용지침이 없습니다",
    consequence: "판단이 어려워진 시점에 관리자가 급하게 처분해도 이를 제한할 근거가 없습니다.",
    severity: "medium",
  },
  B12: {
    what: "1차 관리자가 없습니다",
    consequence: "신탁의 지급을 요청하고 후견을 맡을 사람이 지정되지 않았습니다.",
    severity: "high",
  },
  B13: {
    what: "예비 관리자가 없습니다",
    consequence: "1차 관리자가 먼저 사망하거나 관리를 못 하게 되면 그 시점에 다시 법원 절차를 밟아야 합니다.",
    severity: "medium",
  },
  B14: {
    what: "단독 결정 상한이 없습니다",
    consequence: "관리자가 얼마까지 혼자 결정할 수 있는지 불분명해 견제가 작동하지 않습니다.",
    severity: "medium",
  },
  B15: {
    what: "금지행위가 지정되지 않았습니다",
    consequence: "부동산 처분이나 대출 실행을 막을 조항이 없습니다. 시뮬레이터에서 이 거래는 그대로 통과합니다.",
    severity: "high",
  },
  B16: {
    what: "감독하는 사람이 없습니다",
    consequence: "관리자가 목적과 다르게 자산을 써도 확인하고 제동을 걸 주체가 없습니다.",
    severity: "high",
  },
  B18: {
    what: "신상 사무의 범위가 없습니다",
    consequence: "요양시설 계약이나 의료행위 동의를 누가 할 수 있는지 정해지지 않았습니다.",
    severity: "medium",
  },
  B19: {
    what: "종료 요건이 없습니다",
    consequence: "회복하더라도 관리자의 권한이 자동으로 사라지지 않습니다.",
    severity: "low",
  },
  B21: {
    what: "잔여재산 귀속이 없습니다",
    consequence: "신탁 종료 시 남은 재산은 법정상속분에 따라 나뉩니다. 본인의 뜻이 반영되지 않습니다.",
    severity: "medium",
  },

  /* Track C */
  C03: {
    what: "대상자의 의사능력 상태가 확인되지 않았습니다",
    consequence: "어떤 후견 제도가 가능한지 판단할 수 없습니다. 이 답이 모든 경로를 결정합니다.",
    severity: "high",
  },
  C07: {
    what: "후견인 후보가 없습니다",
    consequence: "심판을 청구하려면 누가 후견인이 될지 특정해야 합니다.",
    severity: "high",
  },
  C11: {
    what: "서류가 준비되지 않았습니다",
    consequence: "진단서와 가족관계증명서가 없으면 심판청구 자체를 접수할 수 없습니다.",
    severity: "medium",
  },
  C13: {
    what: "필요한 사무 범위가 없습니다",
    consequence: "법원에 무엇을 대신하게 해달라고 청구할지 정해지지 않았습니다.",
    severity: "high",
  },

  /* Track D */
  D03: {
    what: "재산 배분이 정해지지 않았습니다",
    consequence: "누구에게 무엇을 남길지 정하지 않으면 법정상속분에 따라 나뉩니다.",
    severity: "high",
  },
  D04: {
    what: "수익자 연속 구조가 정해지지 않았습니다",
    consequence: "배우자 사후의 재산 흐름이 설계되지 않아 신탁 유형 판정이 확정되지 않습니다.",
    severity: "medium",
  },
  D12: {
    what: "집행을 확인할 사람이 없습니다",
    consequence: "내 뜻대로 집행되는지 검증할 주체가 없습니다.",
    severity: "medium",
  },
};

export function findGaps(p: Profile, _design: DesignSet): Gap[] {
  const qs = activeQuestions(p);
  const gaps: Gap[] = [];

  for (const q of qs) {
    if (q.optional) continue;
    if (isAnswered(p, q.id)) continue;
    const meta = CONSEQUENCE[q.id];
    const ref = q.mapsTo[0];
    gaps.push({
      qid: q.id,
      doc: ref?.doc ?? "expense",
      clause: ref ? `${ref.clause} ${ref.label}` : "—",
      what: meta?.what ?? `${q.prompt} — 아직 답하지 않았습니다`,
      consequence:
        meta?.consequence ??
        "이 항목이 비어 있으면 해당 조항을 작성할 수 없습니다.",
      severity: meta?.severity ?? "medium",
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
