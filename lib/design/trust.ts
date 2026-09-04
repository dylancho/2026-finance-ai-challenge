import type { Clause, Flag, Profile, TrustDesign } from "../types";
import {
  allocationOf,
  amountOf,
  amountsOf,
  choiceOf,
  firstAmount,
  firstPerson,
  multiOf,
  personOf,
  textOf,
} from "../profile";
import { personLabel, won } from "../format";

const NOT_SET = "— 아직 정해지지 않았습니다.";

/* ── 유형 판정 ───────────────────────────────────── */

function decideType(p: Profile) {
  const purpose = choiceOf(p, "B04");
  const continuous = choiceOf(p, "D04");
  const assets = { ...amountsOf(p, "B01"), ...amountsOf(p, "D02") };
  const realEstateHeavy =
    (assets.realestate ?? 0) > 0 &&
    (assets.realestate ?? 0) >=
      Object.values(assets).reduce((a, b) => a + b, 0) * 0.5;

  const rationale: string[] = [];
  const alternatives: { name: string; why: string }[] = [];

  let code = "self_benefit";
  let name = "치매대비 자익신탁 (특정금전신탁 기반)";

  if (p.track === "estate") {
    if (continuous === "yes") {
      code = "successive";
      name = "수익자연속신탁";
      rationale.push(
        "배우자를 1차 수익자로, 자녀를 2차 수익자로 지정하는 구조를 선택하셨습니다.",
      );
      rationale.push(
        "유언만으로는 재산을 받은 사람이 다시 누구에게 넘길지까지 정하기 어렵습니다.",
      );
      alternatives.push({
        name: "유언대용신탁",
        why: "연속 지정이 필요 없다면 더 단순한 구조로도 사후 이전 목적을 달성할 수 있습니다.",
      });
    } else {
      code = "will_substitute";
      name = "유언대용신탁";
      rationale.push("사후 재산 이전이 주된 목적으로 파악됩니다.");
      alternatives.push({
        name: "수익자연속신탁",
        why: "배우자가 먼저 받고 그다음 자녀로 이어지길 원하신다면 이 구조가 맞습니다.",
      });
    }
    alternatives.push({
      name: "공정증서 유언",
      why: "재산 구성이 단순하고 분쟁 가능성이 낮다면 더 낮은 비용으로 가능합니다.",
    });
  } else {
    rationale.push(
      purpose === "medical"
        ? "치료비·요양비 확보가 주된 목적이라고 답하셨습니다."
        : purpose === "fraud"
          ? "사기 피해와 잘못된 판단으로부터의 보호를 주된 목적으로 꼽으셨습니다."
          : purpose === "conflict"
            ? "가족 간 재산 분쟁 방지를 주된 목적으로 꼽으셨습니다."
            : "판단이 어려워진 뒤에도 생활비가 계속 지급되는 것을 주된 목적으로 꼽으셨습니다.",
    );
    rationale.push("수익자가 위탁자 본인이므로 자익신탁 구조에 해당합니다.");
    alternatives.push({
      name: "임의후견계약 단독",
      why: "묶어둘 자산 규모가 크지 않다면 신탁 없이 후견계약만으로도 관리 권한을 정할 수 있습니다.",
    });
    alternatives.push({
      name: "대리인 지정 + 계좌 안심차단",
      why: "가장 간단한 방법입니다. 다만 관리자의 권한 범위를 문서로 남기기는 어렵습니다.",
    });
  }

  if (realEstateHeavy) {
    rationale.push(
      "보유 자산에서 부동산 비중이 절반을 넘어, 부동산관리신탁 병행 검토가 필요합니다.",
    );
  }

  return { code, name, rationale, alternatives };
}

/* ── 조항 생성 ───────────────────────────────────── */

const TRIGGER_TEXT: Record<string, string> = {
  doctor1: "정신건강의학과 또는 신경과 전문의 1인이 발급한 진단서가 수탁자에게 제출된 때",
  doctor2:
    "서로 다른 의료기관 소속 전문의 2인의 소견이 일치하고, 그 소견서가 수탁자에게 제출된 때",
  court: "가정법원의 후견개시 심판이 확정되고 그 심판서가 수탁자에게 제출된 때",
  designee:
    "제4조 제2항의 확인자가 서면으로 판단을 통지하고, 수탁자가 이를 확인한 때",
  self: "위탁자 본인이 서면으로 지급개시를 요청한 때",
};

const PURPOSE_TEXT: Record<string, string> = {
  living:
    "위탁자가 스스로 금융 의사결정을 하기 어려운 상태가 된 이후에도 위탁자의 생활이 중단 없이 유지되도록 하는 것",
  medical:
    "위탁자의 치료 및 요양에 필요한 비용이 적시에 지급되도록 하는 것",
  conflict:
    "위탁자의 재산 관리와 배분 기준을 미리 확정하여 가족 간 분쟁을 예방하는 것",
  fraud:
    "위탁자의 재산이 사기·부당한 권유·판단능력 저하로 인한 처분으로부터 보호되도록 하는 것",
  spouse:
    "위탁자 사망 이후에도 배우자의 생활이 안정적으로 유지되도록 하는 것",
};

const INVEST_TEXT: Record<string, string> = {
  preserve:
    "신탁재산에 편입된 투자자산은 원칙적으로 처분하지 아니하고 현상 그대로 보유한다.",
  phased:
    "정기지급에 필요한 범위에서만 단계적으로 현금화하며, 1회 처분 규모는 연간 지급 예정액을 초과하지 아니한다.",
  partial:
    "수시지급 사유가 발생하여 현금이 부족한 경우에 한하여 필요한 범위에서 일부를 처분할 수 있다.",
  delegate:
    "수탁자 또는 수탁자가 선임한 운용 전문가의 판단에 따라 운용하되, 운용 결과를 반기마다 감독인에게 보고한다.",
};

const FORBID_TEXT: Record<string, string> = {
  sell_estate: "신탁재산에 속한 부동산의 매매·교환·담보 제공",
  loan: "신탁재산을 담보로 하는 차입 및 제3자를 위한 보증",
  gift: "제11조에 정한 귀속권리자 외의 제3자에 대한 증여",
  business: "사업체에 대한 신규 투자 및 출자",
  break_deposit: "만기 전 정기예금·적금의 중도해지",
  cancel_insurance: "보장성 보험계약의 해지 및 실효 방치",
  home: "위탁자가 거주하는 주택의 처분",
  land: "선산 및 토지의 처분",
  memento: "위탁자가 특별한 의미를 부여한 자산의 처분",
};

const SUPERVISOR_TEXT: Record<string, string> = {
  family: "위탁자의 다른 가족 1인을 신탁감독인으로 지정한다.",
  expert: "변호사 또는 법무사 등 전문가를 신탁감독인으로 선임한다.",
  institution: "수탁 금융기관이 정기적으로 운용·지급 내역을 보고하도록 한다.",
  none: "",
};

const TERM_TEXT: Record<string, string> = {
  auto: "제4조의 지급개시 사유가 소멸한 사실이 확인되면 본 신탁은 자동으로 종료한다.",
  request: "위탁자가 서면으로 종료를 요청하는 때에 본 신탁은 종료한다.",
  supervisor:
    "신탁감독인이 위탁자의 의사능력 회복을 확인한 뒤 서면으로 동의하는 때에 본 신탁은 종료한다.",
  court: "법원의 종료 결정이 있는 때에 본 신탁은 종료한다.",
};

const CHANGE_TEXT: Record<string, string> = {
  self_only: "위탁자는 의사능력이 있는 동안 단독으로 본 계약을 변경할 수 있다.",
  self_supervisor:
    "본 계약의 변경은 위탁자와 신탁감독인의 서면 동의로써 효력이 발생한다.",
  all: "본 계약의 변경은 위탁자·관리자·감독인 전원의 서면 동의를 요한다.",
  court: "본 계약의 변경은 법원의 허가를 요한다.",
};

const MEDICAL_TEXT: Record<string, string> = {
  unlimited:
    "치료 및 요양에 필요한 비용은 금액의 제한 없이 실비로 지급한다. 다만 지급 후 30일 이내에 증빙을 감독인에게 제출한다.",
  total_cap:
    "치료 및 요양비는 누적 총액 한도 내에서 실비로 지급한다. 한도 초과분은 감독인의 동의를 받아 지급한다.",
  yearly_cap:
    "치료 및 요양비는 연간 한도 내에서 실비로 지급하며, 미사용액은 다음 연도로 이월하지 아니한다.",
  family:
    "치료 및 요양비는 지급 시마다 관리자와 감독인의 협의를 거쳐 지급한다.",
};

const ASSET_LABEL: Record<string, string> = {
  deposit: "예금·적금",
  invest: "주식·펀드·채권",
  realestate: "부동산",
  pension: "연금",
  insurance: "보험",
  business: "사업체·지분",
};

export function buildTrustDesign(p: Profile): TrustDesign | null {
  if (p.track === "daily") return null;
  if (p.track === "caregiver") {
    // 대리 트랙은 대상자의 의사능력에 따라 신탁 신규 설정 가능 여부가 갈린다.
    const signable = choiceOf(p, "C03");
    if (signable === "no" || p.capacity === "diagnosed" || p.capacity === "incident") {
      return blockedDesign(p);
    }
  }
  if (p.capacity === "diagnosed" || p.capacity === "incident") {
    return blockedDesign(p);
  }

  const type = decideType(p);
  const clauses: Clause[] = [];
  const flags: Flag[] = [];

  /* 서문 */
  const message = textOf(p, "B22") || textOf(p, "D16");
  if (message) {
    clauses.push({
      no: "서문",
      title: "위탁자의 뜻",
      body: [`"${message}"`],
      status: "set",
      sources: ["B22", "D16"],
      note: "법적 구속력은 없으나 관리자가 판단할 때의 해석 기준이 됩니다.",
    });
  }

  /* 제1조 목적 */
  const purpose = choiceOf(p, "B04");
  clauses.push({
    no: "제1조",
    title: "신탁의 목적",
    body: purpose
      ? [
          `본 신탁의 목적은 ${PURPOSE_TEXT[purpose]}에 있다.`,
          "수탁자는 본조의 목적에 부합하지 아니하는 지급 요청을 거절할 수 있다.",
        ]
      : [NOT_SET],
    status: purpose ? "set" : "missing",
    sources: ["B04"],
  });

  /* 제2조 신탁재산 */
  const trustAssets = multiOf(p, "B03").filter((v) => v !== "none");
  const trustAmounts = amountsOf(p, "B03");
  const estateAssets = multiOf(p, "D02");
  const estateAmounts = amountsOf(p, "D02");
  const items = trustAssets.length
    ? trustAssets.map((k) => ({ k, v: trustAmounts[k] ?? 0 }))
    : estateAssets.map((k) => ({ k, v: estateAmounts[k] ?? 0 }));
  const total = items.reduce((a, b) => a + b.v, 0);

  clauses.push({
    no: "제2조",
    title: "신탁재산",
    body: items.length
      ? [
          ...items.map(
            (it, i) =>
              `${i + 1}. ${ASSET_LABEL[it.k] ?? it.k} — 추정 ${it.v ? won(it.v) : "금액 미기재"}`,
          ),
          `합계 추정액 ${won(total)}.`,
          "실제 편입 범위와 평가액은 수탁 금융기관의 확인을 거쳐 확정한다.",
        ]
      : [NOT_SET],
    status: items.length ? (total > 0 ? "set" : "partial") : "missing",
    sources: ["B03", "D02"],
  });

  /* 제3조 당사자 */
  const primary = firstPerson(p, "B12", "D11");
  const backup = personOf(p, "B13");
  const soloLimit = amountOf(p, "B14");
  const partyBody: string[] = [
    `위탁자: ${p.subject === "family" ? `${p.subjectRelation ?? "가족"} (본인 아님)` : "본인"}`,
    "수탁자: 신탁업 인가를 받은 금융기관 (추후 선정)",
    `수익자(1차): ${p.track === "estate" ? "위탁자 본인 (생존 중)" : "위탁자 본인"}`,
  ];
  if (p.track === "estate") {
    const cont = choiceOf(p, "D04");
    partyBody.push(
      cont === "yes"
        ? "수익자(2차): 배우자 — 위탁자 사망 시 승계"
        : cont === "direct"
          ? "수익자(2차): 자녀 — 위탁자 사망 시 직접 승계"
          : "수익자(2차): 미지정",
    );
  }
  partyBody.push(`관리자(1차): ${personLabel(primary)}`);
  partyBody.push(`관리자(예비): ${personLabel(backup)}`);
  if (soloLimit !== undefined) {
    partyBody.push(
      `관리자는 1회 ${won(soloLimit)} 이하의 지급에 한하여 단독으로 요청할 수 있고, 이를 초과하는 경우 감독인의 동의를 요한다.`,
    );
  }

  clauses.push({
    no: "제3조",
    title: "위탁자·수탁자·수익자·관리자",
    body: partyBody,
    status: primary ? (backup && soloLimit !== undefined ? "set" : "partial") : "missing",
    sources: ["B12", "B13", "B14", "D11", "D04"],
  });

  if (primary && !backup && p.track === "future") {
    flags.push({
      level: "warn",
      title: "예비 관리자가 지정되지 않았습니다",
      body: `${personLabel(primary)}께서 먼저 사망하거나 관리를 할 수 없게 되면, 그 시점에 다시 법원 절차를 밟아야 합니다.`,
      qid: "B13",
    });
  }

  /* 제4조 지급개시 트리거 */
  const trig = choiceOf(p, "B05");
  const confirmer = personOf(p, "B06");
  clauses.push({
    no: "제4조",
    title: "지급개시 사유 (트리거)",
    body: trig
      ? [
          `① 본 신탁의 지급은 ${TRIGGER_TEXT[trig]}에 개시한다.`,
          `② 위 사유의 발생 여부는 ${personLabel(confirmer)}이(가) 확인한다.`,
          "③ 지급개시 이후 사유가 소멸한 경우 제10조에 따른다.",
        ]
      : [NOT_SET],
    status: trig ? (confirmer ? "set" : "partial") : "missing",
    sources: ["B05", "B06"],
  });

  /* 제5조 정기지급 */
  const monthly = firstAmount(p, "B07", "D09", "A02");
  const bump = amountOf(p, "B08");
  const cycle = choiceOf(p, "A03");
  const payBody: string[] = [];
  if (monthly !== undefined) {
    payBody.push(
      `① 수탁자는 수익자에게 매월 ${won(monthly)}을(를) ${
        cycle === "weekly"
          ? "주 단위로 분할하여"
          : cycle === "biweekly"
            ? "2주 단위로 분할하여"
            : "매월 1회"
      } 지급한다.`,
    );
    if (bump !== undefined && bump > 0) {
      payBody.push(
        `② 수익자가 요양시설에 입소한 사실이 확인되는 경우, 입소한 달부터 월 지급액을 ${won(
          monthly + bump,
        )}으로 증액한다. (기본 ${won(monthly)} + 증액 ${won(bump)})`,
      );
    } else {
      payBody.push(
        "② 요양시설 입소 등 상황 변화에 따른 증액 조건이 정해지지 않았습니다.",
      );
    }
    payBody.push(
      "③ 물가 변동에 따른 조정이 필요한 경우 감독인의 동의를 얻어 조정할 수 있다.",
    );
  } else {
    payBody.push(NOT_SET);
  }
  clauses.push({
    no: "제5조",
    title: "정기지급",
    body: payBody,
    status: monthly === undefined ? "missing" : bump === undefined ? "partial" : "set",
    sources: ["B07", "B08", "A02", "A03", "D09"],
  });

  /* 제6조 수시지급 (의료) */
  const med = choiceOf(p, "B09");
  clauses.push({
    no: "제6조",
    title: "수시지급 — 치료 및 요양비",
    body: med
      ? [
          `① ${MEDICAL_TEXT[med]}`,
          "② 지급은 의료기관·요양기관에 직접 이체하는 방식을 원칙으로 한다.",
        ]
      : [
          NOT_SET,
          "이 조항이 비어 있으면, 큰 의료비가 발생했을 때 지급 여부를 정할 기준이 없습니다.",
        ],
    status: med ? "set" : "missing",
    sources: ["B09"],
  });

  /* 제7조 운용지침 */
  const inv = choiceOf(p, "B11");
  const bizNote =
    choiceOf(p, "D08") === "yes_succeed"
      ? ["② 사업체 지분은 분할하지 아니하고 지정된 승계인에게 일괄 이전한다."]
      : [];
  clauses.push({
    no: "제7조",
    title: "신탁재산의 운용지침",
    body: inv ? [`① ${INVEST_TEXT[inv]}`, ...bizNote] : [NOT_SET],
    status: inv ? "set" : "missing",
    sources: ["B11", "D08"],
  });

  /* 제8조 금지행위 */
  const forbid = [...multiOf(p, "B15"), ...multiOf(p, "D13")].filter(
    (v) => v !== "none",
  );
  clauses.push({
    no: "제8조",
    title: "금지행위",
    body: forbid.length
      ? [
          "수탁자와 관리자는 다음 각 호의 행위를 하여서는 아니 된다.",
          ...forbid.map((f, i) => `${i + 1}. ${FORBID_TEXT[f] ?? f}`),
          "위 각 호에 해당하는 요청은 감독인의 사전 서면 동의가 있는 경우에만 예외적으로 검토한다.",
        ]
      : [NOT_SET],
    status: forbid.length ? "set" : "missing",
    sources: ["B15", "D13"],
  });

  /* 제9조 신탁감독인 */
  const sup = choiceOf(p, "B16");
  const supPerson = personOf(p, "D12") ?? personOf(p, "B06");
  const supSet = (sup && sup !== "none") || !!personOf(p, "D12");
  clauses.push({
    no: "제9조",
    title: "신탁감독인",
    body: supSet
      ? [
          `① ${sup && sup !== "none" ? SUPERVISOR_TEXT[sup] : `${personLabel(supPerson)}을(를) 신탁감독인으로 지정한다.`}`,
          "② 감독인은 반기마다 지급 내역과 잔여 신탁재산을 확인한다.",
          "③ 감독인은 관리자의 지급 요청에 대해 이의를 제기할 수 있다.",
        ]
      : [
          "감독인을 두지 않는 것으로 선택하셨습니다.",
          "이 경우 관리자의 판단을 검증할 절차가 존재하지 않습니다.",
        ],
    status: supSet ? "set" : sup === "none" ? "partial" : "missing",
    sources: ["B16", "D12"],
  });

  if (sup === "none") {
    flags.push({
      level: "critical",
      title: "감독하는 사람이 없습니다",
      body: "관리자가 신탁재산을 목적과 다르게 사용해도 이를 확인하고 제동을 걸 주체가 없습니다. 실제 분쟁의 상당수가 여기서 시작됩니다.",
      qid: "B16",
    });
  }

  /* 제10조 변경·해지 */
  const term = choiceOf(p, "B19");
  const change = choiceOf(p, "B20");
  clauses.push({
    no: "제10조",
    title: "변경 및 종료",
    body:
      term || change
        ? [
            term ? `① ${TERM_TEXT[term]}` : "① 종료 요건이 정해지지 않았습니다.",
            change
              ? `② ${CHANGE_TEXT[change]}`
              : "② 변경 요건이 정해지지 않았습니다.",
          ]
        : [NOT_SET],
    status: term && change ? "set" : term || change ? "partial" : "missing",
    sources: ["B19", "B20"],
  });

  /* 제11조 잔여재산 귀속 */
  const alloc = [...allocationOf(p, "B21"), ...allocationOf(p, "D03")];
  clauses.push({
    no: "제11조",
    title: "잔여재산의 귀속",
    body: alloc.length
      ? [
          "신탁 종료 시 잔여 신탁재산은 다음과 같이 귀속한다.",
          ...alloc.map((r, i) => `${i + 1}. ${r.asset} → ${r.to}`),
          "귀속권리자가 먼저 사망한 경우 그 직계비속이 대습한다.",
        ]
      : [
          NOT_SET,
          "정하지 않으면 신탁 종료 시 잔여재산은 법정상속분에 따라 배분됩니다.",
        ],
    status: alloc.length ? "set" : "missing",
    sources: ["B21", "D03"],
  });

  /* ── 플래그 ── */
  const heirs = amountsOf(p, "D01");
  const heirCount = (heirs.child ?? 0) + (heirs.spouse ?? 0);
  const lawKnown = choiceOf(p, "D06");
  if (p.track === "estate" && alloc.length && heirCount > 1) {
    const skew = alloc.length < heirCount;
    if (skew || lawKnown === "know_ignore" || lawKnown === "unknown") {
      flags.push({
        level: "warn",
        title: "유류분 저촉 가능성이 있습니다",
        body: `상속인이 ${heirCount}명인데 배분이 일부에 집중되어 있습니다. 배분에서 빠진 상속인은 유류분 반환을 청구할 수 있고, 신탁재산도 그 판단 대상이 될 수 있습니다. 세무·법률 전문가 확인이 필요합니다.`,
        qid: "D03",
      });
    }
  }

  if (monthly !== undefined && total > 0) {
    const income = amountOf(p, "B02") ?? 0;
    const net = Math.max(0, monthly - income);
    if (net > 0) {
      const years = total / (net * 12);
      if (years < 10) {
        flags.push({
          level: "warn",
          title: "지급액 대비 신탁재산이 부족할 수 있습니다",
          body: `현재 설정으로는 신탁재산이 약 ${years.toFixed(1)}년 뒤 소진될 것으로 단순 추정됩니다. 월 지급액이나 신탁재산 범위를 다시 살펴보실 필요가 있습니다.`,
          qid: "B07",
        });
      }
    }
  }

  if (p.capacity === "declining") {
    flags.push({
      level: "warn",
      title: "시간이 많지 않을 수 있습니다",
      body: "판단에 어려움이 보이기 시작한 단계에서는 계약 체결 시점의 의사능력이 나중에 다투어질 수 있습니다. 계약 시 전문의 소견서를 함께 받아두는 것이 일반적입니다.",
    });
  }

  const filled = clauses.filter((c) => c.no !== "서문");
  const setCount = filled.filter((c) => c.status === "set").length;
  const partialCount = filled.filter((c) => c.status === "partial").length;
  const completeness = Math.round(
    ((setCount + partialCount * 0.5) / filled.length) * 100,
  );

  return {
    available: true,
    type,
    clauses,
    flags,
    // 요율을 숫자로 적지 않는다. 이 표는 은행 WM 에게 제출되는 문서에 그대로 실리고,
    // 그 숫자를 가장 잘 아는 사람들이 읽는다. 공시로 확인되는 것만 남긴다.
    cost: [
      {
        label: "신탁보수",
        value: "기관·상품별로 신탁계약에서 정합니다 (계약·집행·관리 보수로 나뉘는 것이 일반적)",
      },
      {
        label: "최저 수탁금액",
        value:
          "상품에 따라 편차가 큽니다 — KB 간편형 유언대용신탁 1,000만원(2025.7 출시) / 하나 Living Trust 5억원 이상",
      },
      { label: "가입 연령", value: "상품별 상이 (만 19세 이상 또는 만 40세 이상)" },
      { label: "부동산 편입 시", value: "취득세·등록면허세 별도 검토 필요" },
    ],
    completeness,
    missing: filled.filter((c) => c.status === "missing").length,
  };
}

function blockedDesign(p: Profile): TrustDesign {
  const who = p.subject === "family" ? (p.subjectRelation ?? "그분") : "본인";
  return {
    available: false,
    blockedReason: `${who}의 의사능력이 이미 충분하지 않은 것으로 답하셨습니다. 신탁계약은 위탁자 본인의 유효한 의사표시를 전제로 하므로, 이 상태에서 새로 신탁을 설정하는 것은 어렵습니다. 이미 체결된 신탁이 있다면 그 계약의 효력은 별개로 검토됩니다.`,
    type: {
      code: "blocked",
      name: "신규 신탁 설정 곤란",
      rationale: [
        "신탁계약은 위탁자의 의사능력을 요구합니다.",
        "의사능력이 흠결된 상태에서 체결된 계약은 후에 무효로 다투어질 수 있습니다.",
      ],
      alternatives: [
        {
          name: "법정후견 + 후견지원신탁",
          why: "가정법원의 후견개시 심판을 받은 뒤, 법원의 감독 아래 후견지원신탁을 이용하는 경로가 있습니다.",
        },
        {
          name: "즉시 가능한 계좌 보호 조치",
          why: "후견 절차와 별개로, 금융기관의 이상거래 차단·한도 축소·안심차단 서비스는 지금 신청할 수 있습니다.",
        },
      ],
    },
    clauses: [],
    flags: [
      {
        level: "critical",
        title: "신규 신탁 설정이 어려운 상태입니다",
        body: "후견설계서의 법정후견 경로와 지출설계서의 즉시 조치를 먼저 확인해 주세요.",
      },
    ],
    cost: [],
    completeness: 0,
    missing: 0,
  };
}
