import type {
  DesignSet,
  Profile,
  Scenario,
  ScenarioNode,
  ScenarioResult,
} from "../types";
import {
  amountOf,
  choiceOf,
  firstAmount,
  firstPerson,
  multiOf,
  personOf,
} from "../profile";
import { personLabel, won } from "../format";
import { hasChapter, isAnswered, isUnified } from "../questions";

export const SCENARIOS: Scenario[] = [
  {
    id: "dementia",
    name: "치매 진단",
    caption: "전문의 진단을 받고 금융 결정이 어려워지는 경우",
    tracks: ["future", "caregiver", "estate"],
    chapters: ["medical", "estate"],
  },
  {
    id: "accident",
    name: "갑작스러운 사고",
    caption: "예고 없이, 준비할 시간 없이 찾아오는 경우",
    tracks: ["future", "caregiver", "estate"],
    chapters: ["medical", "estate"],
  },
  {
    id: "care",
    name: "장기 요양시설 입소",
    caption: "매달 나가는 돈의 규모가 바뀌는 경우",
    tracks: ["future", "caregiver"],
    chapters: ["medical"],
  },
  {
    id: "phishing",
    name: "보이스피싱 시도",
    caption: "누군가 계좌에 손을 대려 하는 경우",
    tracks: ["daily", "future", "caregiver", "estate"],
    chapters: ["core"],
  },
  {
    id: "hospital",
    name: "장기 입원",
    caption: "본인이 직접 은행에 갈 수 없는 경우",
    tracks: ["daily", "future", "caregiver"],
    chapters: ["core"],
  },
  {
    id: "shortfall",
    name: "자동이체 잔액 부족",
    caption: "가장 흔하게 벌어지는 일",
    tracks: ["daily"],
    chapters: ["core"],
  },
  {
    id: "spouse_death",
    name: "배우자 사망",
    caption: "재산이 다음 사람에게 넘어가는 경우",
    tracks: ["estate"],
    chapters: ["estate"],
  },
];

/**
 * 이 프로필에서 돌려볼 수 있는 시나리오.
 * 통합 플로우: 코어 시나리오는 항상, 나머지는 해당 챕터를 선언했을 때만.
 */
export function scenariosFor(p: Profile): Scenario[] {
  if (isUnified(p)) {
    return SCENARIOS.filter((s) =>
      s.chapters.some((ch) => ch === "core" || hasChapter(p, ch)),
    );
  }
  return SCENARIOS.filter((s) => s.tracks.includes(p.track!));
}

/* ── 노드 빌더 헬퍼 ──────────────────────────────── */

interface Ctx {
  p: Profile;
  design: DesignSet;
  n: number;
}

function ok(
  ctx: Ctx,
  title: string,
  detail: string,
  clauses: ScenarioNode["clauses"],
): ScenarioNode {
  return { n: ++ctx.n, title, detail, clauses, status: "ok" };
}

function gap(
  ctx: Ctx,
  title: string,
  detail: string,
  qid: string,
  message: string,
): ScenarioNode {
  return {
    n: ++ctx.n,
    title,
    detail,
    clauses: [],
    status: "gap",
    gapQid: qid,
    gapMessage: message,
  };
}

/* ── 시나리오별 노드 ─────────────────────────────── */

function dementiaNodes(ctx: Ctx): ScenarioNode[] {
  const { p } = ctx;
  const nodes: ScenarioNode[] = [];

  const trig = choiceOf(p, "B05");
  const TRIG_LABEL: Record<string, string> = {
    doctor1: "전문의 진단서 1장 제출",
    doctor2: "전문의 2인 소견 일치 확인",
    court: "가정법원 후견개시 심판 확정",
    designee: "지정 확인자의 서면 판단",
    self: "본인의 사전 요청",
  };

  if (!isAnswered(p, "B05") && p.track === "future") {
    nodes.push(
      gap(
        ctx,
        "치매 진단을 받았습니다",
        "이제 이 계획이 작동해야 할 시점입니다.",
        "B05",
        "그런데 언제부터 작동하는지가 정해져 있지 않습니다. 진단서 한 장으로 충분한지, 법원 심판이 필요한지 아무도 모릅니다. 가족들은 여기서 다투기 시작합니다.",
      ),
    );
    return nodes;
  }

  nodes.push(
    ok(
      ctx,
      "치매 진단",
      trig
        ? `${TRIG_LABEL[trig]} — 지급개시 요건이 충족되었습니다.`
        : "진단을 받았습니다.",
      trig
        ? [
            {
              doc: "trust",
              ref: "제4조",
              label: "지급개시 트리거",
              detail: TRIG_LABEL[trig],
            },
          ]
        : [],
    ),
  );

  const confirmer = personOf(p, "B06");
  if (confirmer) {
    nodes.push(
      ok(
        ctx,
        "발동 확인",
        `${personLabel(confirmer)}이(가) 요건 충족을 확인하고 수탁자에게 통지합니다.`,
        [
          {
            doc: "trust",
            ref: "제4조 ②",
            label: "발동 확인자",
            detail: personLabel(confirmer),
          },
        ],
      ),
    );
  }

  const monthly = firstAmount(p, "B07", "A02");
  if (monthly) {
    nodes.push(
      ok(
        ctx,
        "생활비 자동 지급 개시",
        `매달 ${won(monthly)}이(가) 생활계좌로 들어오고, 등록된 자동이체가 그대로 나갑니다. 누구도 새로 결정할 필요가 없습니다.`,
        [
          { doc: "trust", ref: "제5조", label: "정기지급", detail: `월 ${won(monthly)}` },
          {
            doc: "expense",
            ref: "§2",
            label: "자동이체 매트릭스",
            detail: `${ctx.design.expense.transfers.length}개 항목 · 월 ${won(ctx.design.expense.transferTotal)}`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "생활비를 지급해야 합니다",
        "이제 매달 돈이 나가야 합니다.",
        "B07",
        "얼마를 지급할지 정해져 있지 않습니다. 수탁자는 금액을 스스로 정할 수 없고, 가족이 매달 협의해야 합니다.",
      ),
    );
    return nodes;
  }

  const inv = choiceOf(p, "B11");
  if (inv) {
    const INV: Record<string, string> = {
      preserve: "투자자산은 처분하지 않고 그대로 유지됩니다.",
      phased: "생활비에 필요한 만큼만 단계적으로 현금화됩니다.",
      partial: "큰돈이 필요할 때만 일부가 매도됩니다.",
      delegate: "선임된 전문가가 운용을 이어받습니다.",
    };
    nodes.push(
      ok(ctx, "투자자산 처리", INV[inv], [
        { doc: "trust", ref: "제7조", label: "운용지침", detail: INV[inv] },
      ]),
    );
  }

  const forbid = multiOf(p, "B15");
  if (forbid.includes("sell_estate")) {
    nodes.push(
      ok(
        ctx,
        "가족 중 한 명이 부동산 매각을 시도합니다",
        "수탁자가 금지행위 조항을 확인하고 요청을 거절합니다. 감독인에게 통지됩니다.",
        [
          {
            doc: "trust",
            ref: "제8조",
            label: "금지행위 → 차단",
            detail: "부동산의 매매·교환·담보 제공",
          },
        ],
      ),
    );
  } else if (isAnswered(p, "B15")) {
    // 다른 금지행위는 지정했지만 부동산은 안 한 경우
  } else {
    nodes.push(
      gap(
        ctx,
        "가족 중 한 명이 부동산 매각을 시도합니다",
        "본인의 뜻과 다른 처분이 시작됩니다.",
        "B15",
        "금지행위가 지정되어 있지 않아 수탁자에게는 이를 막을 근거가 없습니다. 거래는 그대로 진행됩니다.",
      ),
    );
  }

  const med = choiceOf(p, "B09");
  if (med) {
    const MED: Record<string, string> = {
      unlimited: "제한 없이 실비로 지급되고, 30일 내 증빙이 감독인에게 제출됩니다.",
      total_cap: "누적 한도 내에서 지급되고, 초과분은 감독인 동의를 거칩니다.",
      yearly_cap: "연간 한도 내에서 지급됩니다.",
      family: "관리자와 감독인이 협의해 지급 여부를 정합니다.",
    };
    nodes.push(
      ok(
        ctx,
        "큰 의료비가 발생합니다",
        MED[med] + " 의료기관에 직접 이체됩니다.",
        [{ doc: "trust", ref: "제6조", label: "수시지급", detail: MED[med] }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "큰 의료비가 발생합니다",
        "수술이나 장기 치료가 필요해졌습니다.",
        "B09",
        "의료비를 어디까지 쓸지 정해져 있지 않습니다. 수탁자는 지급을 보류하고, 가족은 서로 미룹니다. 여기서 결정을 내릴 사람이 없습니다.",
      ),
    );
    return nodes;
  }

  const sup = choiceOf(p, "B16");
  if (sup && sup !== "none") {
    nodes.push(
      ok(
        ctx,
        "정기 감독",
        "감독인이 반기마다 지급 내역과 잔여 재산을 확인합니다. 이상이 있으면 이의를 제기합니다.",
        [{ doc: "trust", ref: "제9조", label: "신탁감독인", detail: "반기 확인" }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "몇 년이 지났습니다",
        "그동안 재산이 어떻게 관리되었는지 확인할 시점입니다.",
        "B16",
        "감독하는 사람이 없어 아무도 확인하지 않았습니다. 문제가 있었다면 지금 알게 됩니다.",
      ),
    );
  }

  return nodes;
}

function accidentNodes(ctx: Ctx): ScenarioNode[] {
  const { p } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(
    ok(
      ctx,
      "사고 발생 · 의식 회복이 불투명합니다",
      "준비할 시간이 없었습니다. 지금 있는 설정만으로 버텨야 합니다.",
      [],
    ),
  );

  const transfers = ctx.design.expense.transfers;
  if (transfers.length) {
    nodes.push(
      ok(
        ctx,
        "그래도 공과금은 나갑니다",
        `등록된 ${transfers.length}개 항목이 자동이체로 계속 처리됩니다. 연체가 발생하지 않습니다.`,
        [
          {
            doc: "expense",
            ref: "§2",
            label: "자동이체 매트릭스",
            detail: `월 ${won(ctx.design.expense.transferTotal)}`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "이번 달 공과금 납부일입니다",
        "누군가 대신 내야 합니다.",
        p.track === "daily" ? "A01" : "B10",
        "자동이체가 등록되어 있지 않습니다. 연체가 쌓이고, 가족이 하나하나 손으로 처리해야 합니다.",
      ),
    );
  }

  const trig = choiceOf(p, "B05");
  if (trig === "court") {
    nodes.push(
      gap(
        ctx,
        "지급개시 요건 확인",
        "계획이 작동하려면 요건이 충족되어야 합니다.",
        "B05",
        "법원 심판 확정을 트리거로 정하셨습니다. 사고 상황에서는 심판까지 수개월이 걸리고, 그동안 이 계획은 작동하지 않습니다. 진단서 기반 트리거를 함께 두는 것을 검토해 보세요.",
      ),
    );
    return nodes;
  }
  if (trig) {
    nodes.push(
      ok(
        ctx,
        "지급개시 요건 충족",
        "의료기관의 소견으로 요건이 확인되어 지급이 시작됩니다.",
        [{ doc: "trust", ref: "제4조", label: "지급개시 트리거", detail: "충족" }],
      ),
    );
  }

  const primary = firstPerson(p, "B12", "C07", "A07");
  if (primary) {
    nodes.push(
      ok(
        ctx,
        "관리자가 역할을 시작합니다",
        `${personLabel(primary)}이(가) 정해진 범위 안에서 금융 사무를 처리합니다.`,
        [
          { doc: "trust", ref: "제3조", label: "1차 관리자", detail: personLabel(primary) },
          { doc: "guardianship", ref: "§2", label: "후견인 후보", detail: personLabel(primary) },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "누군가 결정을 해야 합니다",
        "은행은 본인 확인 없이는 어떤 처리도 하지 않습니다.",
        p.track === "daily" ? "A07" : "B12",
        "관리할 사람이 지정되어 있지 않습니다. 가족이 법원에 후견 심판을 청구해야 하고, 그동안 계좌는 사실상 잠깁니다.",
      ),
    );
    return nodes;
  }

  const backup = personOf(p, "B13");
  if (backup) {
    nodes.push(
      ok(
        ctx,
        "관리자에게도 문제가 생긴다면",
        `${personLabel(backup)}이(가) 자동으로 승계합니다. 다시 법원에 갈 필요가 없습니다.`,
        [{ doc: "trust", ref: "제3조", label: "예비 관리자", detail: personLabel(backup) }],
      ),
    );
  }

  return nodes;
}

function careNodes(ctx: Ctx): ScenarioNode[] {
  const { p } = ctx;
  const nodes: ScenarioNode[] = [];
  const monthly = firstAmount(p, "B07", "A02") ?? 0;
  const bump = amountOf(p, "B08");

  nodes.push(
    ok(
      ctx,
      "요양시설 입소를 결정합니다",
      "집에서 지내기 어려워졌습니다.",
      [],
    ),
  );

  const facility = multiOf(p, "B18").includes("facility") ||
    multiOf(p, "C13").includes("facility");
  if (facility) {
    nodes.push(
      ok(
        ctx,
        "입소 계약 체결",
        "후견인이 요양시설 입퇴소 계약을 대신 체결할 수 있습니다.",
        [
          {
            doc: "guardianship",
            ref: "§3",
            label: "신상보호 — 요양시설 계약",
            detail: "위임됨",
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "입소 계약서에 서명해야 합니다",
        "시설은 본인 또는 법적 권한이 있는 사람의 서명을 요구합니다.",
        p.track === "caregiver" ? "C13" : "B18",
        "요양시설 계약 권한이 사무 범위에 포함되어 있지 않습니다. 가족이 서명해도 시설이 거절할 수 있습니다.",
      ),
    );
    return nodes;
  }

  if (bump !== undefined && bump > 0) {
    nodes.push(
      ok(
        ctx,
        "월 지급액이 자동으로 올라갑니다",
        `입소한 달부터 ${won(monthly)} → ${won(monthly + bump)}으로 증액됩니다. 가족이 협의할 일이 없습니다.`,
        [
          {
            doc: "trust",
            ref: "제5조 ②",
            label: "증액 트리거",
            detail: `+${won(bump)}`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "요양비가 기존 지급액을 넘어섭니다",
        "월 본인부담이 갑자기 늘어납니다.",
        "B08",
        "증액 조건이 없습니다. 지급액은 그대로이고, 부족분을 누가 낼지 가족이 매달 협의해야 합니다.",
      ),
    );
    return nodes;
  }

  const s = ctx.design.expense.sustainability;
  if (s.years !== null && s.years > 0) {
    nodes.push(
      ok(
        ctx,
        "자금이 얼마나 버티는가",
        `증액 이후 기준으로 약 ${s.years}년간 유지되는 것으로 단순 추정됩니다. 수익률과 물가는 반영하지 않았습니다.`,
        [
          {
            doc: "expense",
            ref: "§6",
            label: "지속가능성 추정",
            detail: `약 ${s.years}년`,
          },
        ],
      ),
    );
  }

  return nodes;
}

function phishingNodes(ctx: Ctx): ScenarioNode[] {
  const { p, design } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(
    ok(
      ctx,
      "낯선 번호로 전화가 옵니다",
      "검찰이라고 합니다. 계좌가 범죄에 연루되었으니 안전한 계좌로 옮기라고 합니다.",
      [],
    ),
  );

  const hasNewPayee = design.expense.fraudRules.find(
    (r) => r.key === "new_payee",
  )?.active;
  const perTx = firstAmount(p, "A05", "B14");

  if (perTx !== undefined) {
    nodes.push(
      ok(
        ctx,
        "이체를 시도합니다",
        `1회 한도 ${won(perTx)}에서 막힙니다. 잔액 전액이 한 번에 빠져나가지 않습니다.`,
        [{ doc: "expense", ref: "§3", label: "1회 이체 한도", detail: won(perTx) }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "이체를 시도합니다",
        "지시대로 계좌번호를 입력합니다.",
        p.track === "daily" ? "A05" : "B14",
        "1회 이체 한도가 없습니다. 잔액 전액이 한 번에 빠져나갈 수 있습니다.",
      ),
    );
    return nodes;
  }

  if (hasNewPayee) {
    nodes.push(
      ok(
        ctx,
        "처음 보는 계좌입니다",
        "신규 수취인 규칙이 걸려 24시간 보류됩니다. 그 사이에 확인할 시간이 생깁니다.",
        [
          {
            doc: "expense",
            ref: "§4",
            label: "이상거래 — 신규 수취인",
            detail: "24시간 보류",
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "처음 보는 계좌입니다",
        "한도 이내 금액으로 나눠 여러 번 보냅니다.",
        "A06",
        "신규 수취인 규칙이 켜져 있지 않습니다. 한도 이내라면 몇 번이든 통과합니다.",
      ),
    );
    return nodes;
  }

  const notify = firstPerson(p, "A07", "B12", "C07");
  if (notify) {
    nodes.push(
      ok(
        ctx,
        "알림이 발송됩니다",
        `${personLabel(notify)}에게 즉시 통보되고, ${design.expense.approval.escalateHours}시간 내 응답이 없으면 ${design.expense.approval.second}에게 넘어갑니다.`,
        [
          {
            doc: "expense",
            ref: "§5",
            label: "알림·승인 체계",
            detail: personLabel(notify),
          },
        ],
      ),
    );
    nodes.push(
      ok(
        ctx,
        "피해가 발생하지 않았습니다",
        "한도가 규모를 제한했고, 보류가 시간을 벌었고, 알림이 사람을 불렀습니다. 세 가지가 함께 작동했습니다.",
        [],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "보류된 거래를 누군가 확인해야 합니다",
        "24시간이 지나갑니다.",
        p.track === "daily" ? "A07" : "B12",
        "알릴 사람이 지정되어 있지 않습니다. 보류는 걸렸지만 아무도 확인하지 않았고, 본인이 직접 승인해 버립니다.",
      ),
    );
  }

  return nodes;
}

function hospitalNodes(ctx: Ctx): ScenarioNode[] {
  const { p, design } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(
    ok(ctx, "장기 입원", "몇 달간 은행에 갈 수 없는 상태가 됩니다.", []),
  );

  if (design.expense.transfers.length) {
    nodes.push(
      ok(
        ctx,
        "고정지출은 그대로 처리됩니다",
        `${design.expense.transfers.map((t) => t.item).join(" · ")} — 월 ${won(design.expense.transferTotal)}이 자동으로 나갑니다.`,
        [{ doc: "expense", ref: "§2", label: "자동이체", detail: "정상 작동" }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "공과금 납부일이 돌아옵니다",
        "누군가 대신 내야 합니다.",
        p.track === "daily" ? "A01" : "B10",
        "자동이체가 등록되어 있지 않아 연체가 시작됩니다.",
      ),
    );
    return nodes;
  }

  const bigSpend = choiceOf(p, "A08");
  const med = choiceOf(p, "B09");
  if (bigSpend || med) {
    nodes.push(
      ok(
        ctx,
        "병원비 결제",
        bigSpend === "reserve" || p.track !== "daily"
          ? `의료예비계좌(목표 ${won(design.expense.cashflow.medicalReserve)})에서 집행됩니다.`
          : bigSpend === "approve"
            ? "지정인의 승인을 거쳐 집행됩니다."
            : "정해진 절차에 따라 집행됩니다.",
        [
          { doc: "expense", ref: "§1", label: "의료예비계좌", detail: "집행" },
          ...(med
            ? [
                {
                  doc: "trust" as const,
                  ref: "제6조",
                  label: "수시지급",
                  detail: "한도 내 실비",
                },
              ]
            : []),
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "병원비를 결제해야 합니다",
        "한도를 넘는 금액입니다.",
        p.track === "daily" ? "A08" : "B09",
        "큰 지출의 처리 방식이 정해져 있지 않습니다. 한도에 막혀 결제되지 않거나, 가족이 대신 부담하게 됩니다.",
      ),
    );
  }

  return nodes;
}

function shortfallNodes(ctx: Ctx): ScenarioNode[] {
  const { p, design } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(
    ok(
      ctx,
      "생활계좌 잔액이 부족합니다",
      "이번 달 지출이 예상보다 많았습니다. 자동이체 출금일이 내일입니다.",
      [],
    ),
  );

  const onFail = choiceOf(p, "A04");
  if (!onFail) {
    nodes.push(
      gap(
        ctx,
        "자동이체가 실패합니다",
        "출금이 되지 않았습니다.",
        "A04",
        "실패 시 조치가 정해져 있지 않습니다. 연체료가 붙고, 통신비 연체는 신용에 영향을 줍니다.",
      ),
    );
    return nodes;
  }

  const FAIL: Record<string, string> = {
    auto_cover: "의료예비계좌에서 부족분이 자동으로 채워지고 결제가 정상 처리됩니다.",
    notify_only: "본인에게 알림이 발송됩니다. 직접 입금해야 합니다.",
    notify_guardian: "지정인에게도 함께 통보되어 대신 처리할 수 있습니다.",
    hold: "결제가 보류되고 승인 요청이 발송됩니다.",
  };
  nodes.push(
    ok(ctx, "설정된 조치가 작동합니다", FAIL[onFail], [
      {
        doc: "expense",
        ref: "§2",
        label: "이체 실패 시 조치",
        detail: FAIL[onFail],
      },
    ]),
  );

  if (onFail === "auto_cover") {
    nodes.push(
      ok(
        ctx,
        "예비계좌 잔액이 줄어듭니다",
        `목표 잔액 ${won(design.expense.cashflow.medicalReserve)}에 미달하면 보전계좌에서 보충하도록 설계되어 있습니다.`,
        [{ doc: "expense", ref: "§1", label: "3층 계좌 구조", detail: "보충 흐름" }],
      ),
    );
  }

  const notify = personOf(p, "A07");
  if (notify) {
    nodes.push(
      ok(
        ctx,
        "기록이 남습니다",
        `${personLabel(notify)}에게 월간 요약이 전달되어 반복되는 패턴을 조기에 발견할 수 있습니다.`,
        [{ doc: "expense", ref: "§5", label: "알림 체계", detail: "월간 요약" }],
      ),
    );
  }

  return nodes;
}

function spouseDeathNodes(ctx: Ctx): ScenarioNode[] {
  const { p } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(ok(ctx, "위탁자 사망", "재산이 다음 사람에게 넘어갈 시점입니다.", []));

  const cont = choiceOf(p, "D04");
  if (cont === "yes") {
    nodes.push(
      ok(
        ctx,
        "배우자가 1차 수익자가 됩니다",
        "상속 절차와 별개로 신탁계약에 따라 배우자에게 수익권이 승계됩니다. 상속인 전원의 동의를 기다릴 필요가 없습니다.",
        [
          {
            doc: "trust",
            ref: "제3조",
            label: "수익자 연속",
            detail: "배우자 → 자녀",
          },
        ],
      ),
    );
    nodes.push(
      ok(
        ctx,
        "배우자 사망 후 자녀에게 승계",
        "유언만으로는 정하기 어려운 2차 승계가 계약으로 확정되어 있습니다.",
        [{ doc: "trust", ref: "제3조", label: "2차 수익자", detail: "자녀" }],
      ),
    );
  } else if (!isAnswered(p, "D04")) {
    nodes.push(
      gap(
        ctx,
        "재산이 누구에게 가야 합니까",
        "배우자인지, 자녀인지, 어떤 순서인지 결정할 시점입니다.",
        "D04",
        "승계 구조가 정해져 있지 않습니다. 법정상속분에 따라 나뉘고, 배우자 사후의 흐름은 통제할 수 없습니다.",
      ),
    );
    return nodes;
  }

  const alloc = p.answers["D03"];
  if (alloc?.kind === "allocation" && alloc.rows.length) {
    nodes.push(
      ok(
        ctx,
        "재산이 정해진 대로 배분됩니다",
        alloc.rows.map((r) => `${r.asset} → ${r.to}`).join(" · "),
        [
          {
            doc: "trust",
            ref: "제11조",
            label: "잔여재산 귀속",
            detail: `${alloc.rows.length}건`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "무엇을 누구에게 남길지",
        "구체적인 배분이 필요한 시점입니다.",
        "D03",
        "배분이 지정되어 있지 않아 법정상속분에 따라 균등하게 나뉩니다. 사업체 지분도 흩어집니다.",
      ),
    );
    return nodes;
  }

  const known = choiceOf(p, "D06");
  if (known === "know_ignore" || known === "unknown") {
    nodes.push(
      gap(
        ctx,
        "배분에서 빠진 상속인이 이의를 제기합니다",
        "유류분 반환 청구가 들어옵니다.",
        "D06",
        "유류분은 신탁재산도 판단 대상이 될 수 있습니다. 설계는 유지되더라도 일부 반환이 필요할 수 있어 세무·법률 전문가 확인이 필요합니다.",
      ),
    );
  } else {
    nodes.push(
      ok(
        ctx,
        "유류분을 감안한 배분이었습니다",
        "다른 상속인의 최소 몫을 고려한 설계여서 분쟁 가능성이 낮아집니다.",
        [{ doc: "trust", ref: "제11조", label: "유류분 검토", detail: "반영됨" }],
      ),
    );
  }

  return nodes;
}

/* ── 진입점 ──────────────────────────────────────── */

export function runScenario(
  p: Profile,
  design: DesignSet,
  scenarioId: string,
): ScenarioResult | null {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return null;

  const ctx: Ctx = { p, design, n: 0 };
  let nodes: ScenarioNode[] = [];

  switch (scenarioId) {
    case "dementia":
      nodes = dementiaNodes(ctx);
      break;
    case "accident":
      nodes = accidentNodes(ctx);
      break;
    case "care":
      nodes = careNodes(ctx);
      break;
    case "phishing":
      nodes = phishingNodes(ctx);
      break;
    case "hospital":
      nodes = hospitalNodes(ctx);
      break;
    case "shortfall":
      nodes = shortfallNodes(ctx);
      break;
    case "spouse_death":
      nodes = spouseDeathNodes(ctx);
      break;
  }

  const gapCount = nodes.filter((n) => n.status === "gap").length;
  const verdict = buildVerdict(p, design, nodes, gapCount);

  return { scenario, nodes, verdict, gapCount };
}

function buildVerdict(
  p: Profile,
  design: DesignSet,
  nodes: ScenarioNode[],
  gapCount: number,
): string[] {
  const out: string[] = [];
  const primary = firstPerson(p, "B12", "C07", "A07");
  const monthly = firstAmount(p, "B07", "A02");

  if (gapCount === 0) {
    out.push(
      "지금 설정된 내용만으로 이 상황이 끝까지 진행됩니다. 중간에 새로 결정해야 할 지점이 없습니다.",
    );
  } else {
    const stopped = nodes.find((n) => n.status === "gap");
    out.push(
      `${stopped?.n}번 단계에서 흐름이 멈춥니다. 그 시점에 판단할 근거가 설계서에 없기 때문입니다.`,
    );
  }

  if (primary && monthly) {
    out.push(
      `현재 설정은 ${personLabel(primary)}을(를) 1차 관리자로 두고 월 ${won(monthly)}을 우선 지급하는 구조로 정리되어 있습니다.`,
    );
  } else if (primary) {
    out.push(`관리 주체는 ${personLabel(primary)}으로 정리되어 있습니다.`);
  }

  const active = design.expense.fraudRules.filter((r) => r.active).length;
  out.push(
    `이상거래 룰 ${active}개가 활성 상태이고, 자동이체 ${design.expense.transfers.length}개 항목이 등록되어 있습니다.`,
  );

  out.push(
    "이 시뮬레이션은 입력하신 답변만으로 구성한 예시이며, 실제 제도의 적용 여부와 순서는 금융기관·전문가의 확인이 필요합니다.",
  );

  return out;
}
