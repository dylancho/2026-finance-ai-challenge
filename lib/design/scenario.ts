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
import { josa, personLabel, won } from "../format";
import { hasChapter, isAnswered, isUnified } from "../questions";

/*
 * 문체 (2026-09-07 문체 가이드): 상황 흐름의 단계 제목·설명·멈춘 이유는 화면 안내문이라 해요체다.
 * 조항 참조(doc·ref·label)와 판정 로직은 그대로다.
 */

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
 * 이 프로필에서 돌려볼 수 있는 상황.
 * 통합 인터뷰: 기본 질문의 상황은 항상, 나머지는 해당 영역을 답했을 때만.
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

/* ── 상황별 노드 ─────────────────────────────── */

/**
 * B05 지급개시 사유의 표시 라벨. 미리보기(/simulation)도 같은 문장을 쓰므로 밖으로 뺐다.
 * 값·판정 로직은 그대로다.
 */
export const TRIGGER_LABEL: Record<string, string> = {
  doctor1: "전문의 진단서 1장 제출",
  doctor2: "전문의 2인 소견 일치 확인",
  court: "가정법원 후견개시 심판 확정",
  designee: "지정 확인자의 서면 판단",
  self: "본인의 사전 요청",
};

function dementiaNodes(ctx: Ctx): ScenarioNode[] {
  const { p } = ctx;
  const nodes: ScenarioNode[] = [];

  const trig = choiceOf(p, "B05");
  const TRIG_LABEL = TRIGGER_LABEL;

  if (!isAnswered(p, "B05") && p.track === "future") {
    nodes.push(
      gap(
        ctx,
        "치매 진단을 받았어요",
        "이제 이 계획이 움직여야 할 때예요.",
        "B05",
        "그런데 언제부터 움직이는지가 정해져 있지 않아요. 진단서 한 장이면 되는지, 법원 심판이 필요한지 아무도 몰라요. 가족들은 여기서 다투기 시작해요.",
      ),
    );
    return nodes;
  }

  nodes.push(
    ok(
      ctx,
      "치매 진단",
      trig
        ? `${TRIG_LABEL[trig]}. 지급 시작 조건이 채워졌어요.`
        : "진단을 받았어요.",
      trig
        ? [
            {
              doc: "trust",
              ref: "제4조",
              label: "지급 시작 조건",
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
        "조건 확인",
        `${josa(personLabel(confirmer), "이가")} 조건이 채워진 것을 확인하고 수탁자에게 알려요.`,
        [
          {
            doc: "trust",
            ref: "제4조 ②",
            label: "확인하는 사람",
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
        "생활비 자동 지급 시작",
        `매달 ${josa(won(monthly), "이가")} 생활계좌로 들어오고, 등록된 자동이체가 그대로 나가요. 누구도 새로 결정할 필요가 없어요.`,
        [
          { doc: "trust", ref: "제5조", label: "정기지급", detail: `월 ${won(monthly)}` },
          {
            doc: "expense",
            ref: "제2조",
            label: "자동이체 목록",
            detail: `${ctx.design.expense.transfers.length}개 항목 · 월 ${won(ctx.design.expense.transferTotal)}`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "생활비를 지급해야 해요",
        "이제 매달 돈이 나가야 해요.",
        "B07",
        "얼마를 지급할지 정해져 있지 않아요. 수탁자는 금액을 스스로 정할 수 없고, 가족이 매달 협의해야 해요.",
      ),
    );
    return nodes;
  }

  const inv = choiceOf(p, "B11");
  if (inv) {
    const INV: Record<string, string> = {
      preserve: "투자자산은 팔지 않고 그대로 둬요.",
      phased: "생활비에 필요한 만큼만 단계적으로 현금화해요.",
      partial: "큰돈이 필요할 때만 일부를 팔아요.",
      delegate: "정해 둔 전문가가 운용을 이어받아요.",
    };
    nodes.push(
      ok(ctx, "투자자산 처리", INV[inv], [
        { doc: "trust", ref: "제7조", label: "운용 방침", detail: INV[inv] },
      ]),
    );
  }

  const forbid = multiOf(p, "B15");
  if (forbid.includes("sell_estate")) {
    nodes.push(
      ok(
        ctx,
        "가족 중 한 명이 부동산을 팔려고 해요",
        "수탁자가 금지행위 조항을 확인하고 요청을 거절해요. 감독인에게도 알려요.",
        [
          {
            doc: "trust",
            ref: "제8조",
            label: "금지행위라 차단",
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
        "가족 중 한 명이 부동산을 팔려고 해요",
        "본인의 뜻과 다른 처분이 시작돼요.",
        "B15",
        "금지행위를 정해 두지 않아 수탁자에게는 막을 근거가 없어요. 거래는 그대로 진행돼요.",
      ),
    );
  }

  const med = choiceOf(p, "B09");
  if (med) {
    const MED: Record<string, string> = {
      unlimited: "제한 없이 실비로 지급되고, 30일 안에 증빙이 감독인에게 가요.",
      total_cap: "누적 한도 안에서 지급되고, 넘는 금액은 감독인 동의를 거쳐요.",
      yearly_cap: "연간 한도 안에서 지급돼요.",
      family: "관리자와 감독인이 협의해 지급 여부를 정해요.",
    };
    nodes.push(
      ok(
        ctx,
        "큰 의료비가 생겨요",
        MED[med] + " 의료기관에 직접 이체돼요.",
        [{ doc: "trust", ref: "제6조", label: "수시지급", detail: MED[med] }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "큰 의료비가 생겨요",
        "수술이나 긴 치료가 필요해졌어요.",
        "B09",
        "의료비를 어디까지 쓸지 정해져 있지 않아요. 수탁자는 지급을 미루고, 가족은 서로 미뤄요. 여기서 결정을 내릴 사람이 없어요.",
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
        "감독인이 반기마다 지급 내역과 남은 재산을 확인해요. 이상이 있으면 이의를 제기해요.",
        [{ doc: "trust", ref: "제9조", label: "신탁감독인", detail: "반기 확인" }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "몇 년이 지났어요",
        "그동안 재산이 어떻게 관리됐는지 확인할 때예요.",
        "B16",
        "감독하는 사람이 없어 아무도 확인하지 않았어요. 문제가 있었다면 지금 알게 돼요.",
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
      "사고가 났고, 의식이 돌아올지 알 수 없어요",
      "준비할 시간이 없었어요. 지금 있는 설정만으로 버텨야 해요.",
      [],
    ),
  );

  const transfers = ctx.design.expense.transfers;
  if (transfers.length) {
    nodes.push(
      ok(
        ctx,
        "그래도 공과금은 나가요",
        `등록된 ${transfers.length}개 항목이 자동이체로 계속 처리돼요. 연체가 생기지 않아요.`,
        [
          {
            doc: "expense",
            ref: "제2조",
            label: "자동이체 목록",
            detail: `월 ${won(ctx.design.expense.transferTotal)}`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "이번 달 공과금 납부일이에요",
        "누군가 대신 내야 해요.",
        p.track === "daily" ? "A01" : "B10",
        "자동이체가 등록되어 있지 않아요. 연체가 쌓이고, 가족이 하나하나 손으로 처리해야 해요.",
      ),
    );
  }

  const trig = choiceOf(p, "B05");
  if (trig === "court") {
    nodes.push(
      gap(
        ctx,
        "지급 시작 조건 확인",
        "계획이 움직이려면 조건이 채워져야 해요.",
        "B05",
        "법원 심판 확정을 시작 조건으로 정했어요. 사고 상황에서는 심판까지 몇 달이 걸리고, 그동안 이 계획은 움직이지 않아요. 진단서 기준 조건을 함께 두는 것을 살펴봐 주세요.",
      ),
    );
    return nodes;
  }
  if (trig) {
    nodes.push(
      ok(
        ctx,
        "지급 시작 조건 충족",
        "의료기관의 소견으로 조건이 확인되어 지급이 시작돼요.",
        [{ doc: "trust", ref: "제4조", label: "지급 시작 조건", detail: "충족" }],
      ),
    );
  }

  const primary = firstPerson(p, "B12", "C07", "A07");
  if (primary) {
    nodes.push(
      ok(
        ctx,
        "관리자가 역할을 시작해요",
        `${josa(personLabel(primary), "이가")} 정해진 범위 안에서 금융 일을 처리해요.`,
        [
          { doc: "trust", ref: "제3조", label: "1차 관리자", detail: personLabel(primary) },
          { doc: "guardianship", ref: "제2조", label: "후견인 후보", detail: personLabel(primary) },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "누군가 결정을 해야 해요",
        "은행은 본인 확인 없이는 어떤 처리도 하지 않아요.",
        p.track === "daily" ? "A07" : "B12",
        "관리할 사람을 정해 두지 않았어요. 가족이 법원에 후견 심판을 청구해야 하고, 그동안 계좌는 사실상 잠겨요.",
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
        `${josa(personLabel(backup), "이가")} 자동으로 이어받아요. 다시 법원에 갈 필요가 없어요.`,
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
      "요양시설에 들어가기로 해요",
      "집에서 지내기 어려워졌어요.",
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
        "후견인이 요양시설 입퇴소 계약을 대신 맺을 수 있어요.",
        [
          {
            doc: "guardianship",
            ref: "제3조",
            label: "신상보호 · 요양시설 계약",
            detail: "맡김",
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "입소 계약서에 서명해야 해요",
        "시설은 본인이나 법적 권한이 있는 사람의 서명을 요구해요.",
        p.track === "caregiver" ? "C13" : "B18",
        "요양시설 계약 권한이 맡길 일에 들어 있지 않아요. 가족이 서명해도 시설이 거절할 수 있어요.",
      ),
    );
    return nodes;
  }

  if (bump !== undefined && bump > 0) {
    nodes.push(
      ok(
        ctx,
        "월 지급액이 자동으로 올라가요",
        `들어간 달부터 ${won(monthly)}에서 ${won(monthly + bump)}으로 올라가요. 가족이 협의할 일이 없어요.`,
        [
          {
            doc: "trust",
            ref: "제5조 ②",
            label: "증액 조건",
            detail: `+${won(bump)}`,
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "요양비가 지금 지급액을 넘어서요",
        "월 본인 부담이 갑자기 늘어요.",
        "B08",
        "증액 조건이 없어요. 지급액은 그대로이고, 모자라는 돈을 누가 낼지 가족이 매달 협의해야 해요.",
      ),
    );
    return nodes;
  }

  const s = ctx.design.expense.sustainability;
  if (s.years !== null && s.years > 0) {
    nodes.push(
      ok(
        ctx,
        "자산이 얼마나 버티나",
        `증액 이후 기준으로 약 ${s.years}년 유지되는 것으로 단순 추정돼요. 수익률과 물가는 넣지 않았어요.`,
        [
          {
            doc: "expense",
            ref: "제6조",
            label: "자산이 버티는 기간",
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
      "낯선 번호로 전화가 와요",
      "검찰이라고 해요. 계좌가 범죄에 연루됐으니 안전한 계좌로 옮기라고 해요.",
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
        "이체를 시도해요",
        `1회 한도 ${won(perTx)}에서 막혀요. 잔액 전부가 한 번에 빠져나가지 않아요.`,
        [{ doc: "expense", ref: "제3조", label: "1회 이체 한도", detail: won(perTx) }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "이체를 시도해요",
        "시키는 대로 계좌번호를 입력해요.",
        p.track === "daily" ? "A05" : "B14",
        "1회 이체 한도가 없어요. 잔액 전부가 한 번에 빠져나갈 수 있어요.",
      ),
    );
    return nodes;
  }

  if (hasNewPayee) {
    nodes.push(
      ok(
        ctx,
        "처음 보는 계좌예요",
        "처음 보내는 계좌 규칙에 걸려 24시간 멈춰요. 그 사이에 확인할 시간이 생겨요.",
        [
          {
            doc: "expense",
            ref: "제4조",
            label: "보호 규칙 · 처음 보내는 계좌",
            detail: "24시간 보류",
          },
        ],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "처음 보는 계좌예요",
        "한도 안의 금액으로 나눠 여러 번 보내요.",
        "A06",
        "처음 보내는 계좌 규칙이 꺼져 있어요. 한도 안이라면 몇 번이든 통과해요.",
      ),
    );
    return nodes;
  }

  const notify = firstPerson(p, "A07", "B12", "C07");
  if (notify) {
    nodes.push(
      ok(
        ctx,
        "알림이 가요",
        `${personLabel(notify)}에게 바로 알리고, ${design.expense.approval.escalateHours}시간 안에 응답이 없으면 ${design.expense.approval.second}에게 넘어가요.`,
        [
          {
            doc: "expense",
            ref: "제5조",
            label: "알림·승인 순서",
            detail: personLabel(notify),
          },
        ],
      ),
    );
    nodes.push(
      ok(
        ctx,
        "피해가 생기지 않았어요",
        "한도가 규모를 제한했고, 보류가 시간을 벌었고, 알림이 사람을 불렀어요. 세 가지가 함께 움직였어요.",
        [],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "멈춘 거래를 누군가 확인해야 해요",
        "24시간이 지나가요.",
        p.track === "daily" ? "A07" : "B12",
        "알릴 사람을 정해 두지 않았어요. 거래는 멈췄지만 아무도 확인하지 않았고, 본인이 직접 승인해 버려요.",
      ),
    );
  }

  return nodes;
}

function hospitalNodes(ctx: Ctx): ScenarioNode[] {
  const { p, design } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(
    ok(ctx, "장기 입원", "몇 달 동안 은행에 갈 수 없는 상태가 돼요.", []),
  );

  if (design.expense.transfers.length) {
    nodes.push(
      ok(
        ctx,
        "고정지출은 그대로 처리돼요",
        `${design.expense.transfers.map((t) => t.item).join(" · ")}, 월 ${won(design.expense.transferTotal)}이 자동으로 나가요.`,
        [{ doc: "expense", ref: "제2조", label: "자동이체", detail: "정상 작동" }],
      ),
    );
  } else {
    nodes.push(
      gap(
        ctx,
        "공과금 납부일이 돌아와요",
        "누군가 대신 내야 해요.",
        p.track === "daily" ? "A01" : "B10",
        "자동이체가 등록되어 있지 않아 연체가 시작돼요.",
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
          ? `의료예비계좌(목표 ${won(design.expense.cashflow.medicalReserve)})에서 나가요.`
          : bigSpend === "approve"
            ? "지정한 사람이 승인하면 나가요."
            : "정해진 절차에 따라 나가요.",
        [
          { doc: "expense", ref: "제1조", label: "의료예비계좌", detail: "지급" },
          ...(med
            ? [
                {
                  doc: "trust" as const,
                  ref: "제6조",
                  label: "수시지급",
                  detail: "한도 안에서 실비",
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
        "병원비를 결제해야 해요",
        "한도를 넘는 금액이에요.",
        p.track === "daily" ? "A08" : "B09",
        "큰 지출을 어떻게 처리할지 정해져 있지 않아요. 한도에 막혀 결제가 안 되거나, 가족이 대신 부담하게 돼요.",
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
      "생활계좌 잔액이 모자라요",
      "이번 달 지출이 예상보다 많았어요. 자동이체 출금일이 내일이에요.",
      [],
    ),
  );

  const onFail = choiceOf(p, "A04");
  if (!onFail) {
    nodes.push(
      gap(
        ctx,
        "자동이체가 실패해요",
        "출금이 되지 않았어요.",
        "A04",
        "실패했을 때 무엇을 할지 정해져 있지 않아요. 연체료가 붙고, 통신비 연체는 신용에 영향을 줘요.",
      ),
    );
    return nodes;
  }

  const FAIL: Record<string, string> = {
    auto_cover: "의료예비계좌에서 모자라는 돈이 자동으로 채워지고 결제가 정상 처리돼요.",
    notify_only: "본인에게 알림이 가요. 직접 입금해야 해요.",
    notify_guardian: "지정한 사람에게도 함께 알려 대신 처리할 수 있어요.",
    hold: "결제가 멈추고 승인 요청이 가요.",
  };
  nodes.push(
    ok(ctx, "정해 둔 조치가 움직여요", FAIL[onFail], [
      {
        doc: "expense",
        ref: "제2조",
        label: "이체 실패 시 조치",
        detail: FAIL[onFail],
      },
    ]),
  );

  if (onFail === "auto_cover") {
    nodes.push(
      ok(
        ctx,
        "예비계좌 잔액이 줄어요",
        `목표 잔액 ${won(design.expense.cashflow.medicalReserve)}에 못 미치면 보전계좌에서 채우도록 되어 있어요.`,
        [{ doc: "expense", ref: "제1조", label: "3층 계좌 구조", detail: "채우는 흐름" }],
      ),
    );
  }

  const notify = personOf(p, "A07");
  if (notify) {
    nodes.push(
      ok(
        ctx,
        "기록이 남아요",
        `${personLabel(notify)}에게 월간 요약이 가서 반복되는 패턴을 일찍 알아챌 수 있어요.`,
        [{ doc: "expense", ref: "제5조", label: "알림 순서", detail: "월간 요약" }],
      ),
    );
  }

  return nodes;
}

function spouseDeathNodes(ctx: Ctx): ScenarioNode[] {
  const { p } = ctx;
  const nodes: ScenarioNode[] = [];

  nodes.push(ok(ctx, "위탁자 사망", "재산이 다음 사람에게 넘어갈 때예요.", []));

  const cont = choiceOf(p, "D04");
  if (cont === "yes") {
    nodes.push(
      ok(
        ctx,
        "배우자가 1차 수익자가 돼요",
        "상속 절차와 별개로 신탁계약에 따라 배우자에게 수익권이 넘어가요. 상속인 모두의 동의를 기다릴 필요가 없어요.",
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
        "배우자가 세상을 떠난 뒤 자녀에게 승계",
        "유언만으로는 정하기 어려운 다음 승계가 계약으로 정해져 있어요.",
        [{ doc: "trust", ref: "제3조", label: "2차 수익자", detail: "자녀" }],
      ),
    );
  } else if (!isAnswered(p, "D04")) {
    nodes.push(
      gap(
        ctx,
        "재산이 누구에게 가야 하나요",
        "배우자인지, 자녀인지, 어떤 순서인지 정할 때예요.",
        "D04",
        "승계 구조가 정해져 있지 않아요. 법정상속분대로 나뉘고, 배우자가 세상을 떠난 뒤의 흐름은 정할 수 없어요.",
      ),
    );
    return nodes;
  }

  const alloc = p.answers["D03"];
  if (alloc?.kind === "allocation" && alloc.rows.length) {
    nodes.push(
      ok(
        ctx,
        "재산이 정한 대로 나뉘어요",
        alloc.rows.map((r) => `${r.asset} → ${r.to}`).join(" · "),
        [
          {
            doc: "trust",
            ref: "제11조",
            label: "남은 재산의 귀속",
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
        "구체적인 배분이 필요할 때예요.",
        "D03",
        "배분을 정해 두지 않아 법정상속분대로 똑같이 나뉘어요. 사업체 지분도 흩어져요.",
      ),
    );
    return nodes;
  }

  const known = choiceOf(p, "D06");
  if (known === "know_ignore" || known === "unknown") {
    nodes.push(
      gap(
        ctx,
        "배분에서 빠진 상속인이 이의를 제기해요",
        "유류분 반환 청구가 들어와요.",
        "D06",
        "유류분은 신탁재산도 대상이 될 수 있어요. 설계는 유지되더라도 일부를 돌려줘야 할 수 있어 세무·법률 전문가 확인이 필요해요.",
      ),
    );
  } else {
    nodes.push(
      ok(
        ctx,
        "유류분을 감안한 배분이었어요",
        "다른 상속인의 최소 몫을 고려한 설계라 다툼 가능성이 낮아져요.",
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
      "지금 정해 둔 내용만으로 이 상황이 끝까지 진행돼요. 중간에 새로 결정해야 할 지점이 없어요.",
    );
  } else {
    const stopped = nodes.find((n) => n.status === "gap");
    out.push(
      `${stopped?.n}번 단계에서 흐름이 멈춰요. 그때 판단할 근거가 설계서에 없기 때문이에요.`,
    );
  }

  if (primary && monthly) {
    out.push(
      `지금 설정은 ${josa(personLabel(primary), "을를")} 1차 관리자로 두고 월 ${won(monthly)}을 먼저 지급하는 구조예요.`,
    );
  } else if (primary) {
    out.push(`관리하는 사람은 ${josa(personLabel(primary), "으로")} 정해져 있어요.`);
  }

  const active = design.expense.fraudRules.filter((r) => r.active).length;
  out.push(
    `보호 규칙 ${active}개가 켜져 있고, 자동이체 ${design.expense.transfers.length}개 항목이 등록되어 있어요.`,
  );

  out.push(
    "이 흐름은 답한 내용만으로 만든 예시예요. 실제 제도가 적용되는지와 순서는 금융기관·전문가의 확인이 필요해요.",
  );

  return out;
}
