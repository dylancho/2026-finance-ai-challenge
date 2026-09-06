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
import { josa, personLabel, won } from "../format";
import { hasChapter, isUnified } from "../questions";

/*
 * 문체 (2026-09-07 문체 가이드)
 *   조항 본문(body)  담백한 합니다체. 법조문 투("~하여서는 아니 된다")와 한자어 겹침을 걷어냈다.
 *   판정·근거·경고   화면 안내문이라 해요체.
 * 조항 번호·상태·source 는 그대로다. 의뢰서(§확정된 지시사항)가 이 body 를 그대로 인용한다.
 */

const NOT_SET = "아직 정하지 않았습니다.";

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

  if (estateMode(p)) {
    if (continuous === "yes") {
      code = "successive";
      name = "수익자연속신탁";
      rationale.push(
        "배우자가 먼저 받고 그다음 자녀에게 넘어가는 구조를 골랐어요.",
      );
      rationale.push(
        "유언만으로는 재산을 받은 사람이 다시 누구에게 넘길지까지 정하기 어려워요.",
      );
      alternatives.push({
        name: "유언대용신탁",
        why: "배우자 다음 순서까지 정할 필요가 없다면 더 단순한 구조로도 같은 목적을 이룰 수 있어요.",
      });
    } else {
      code = "will_substitute";
      name = "유언대용신탁";
      rationale.push("세상을 떠난 뒤 재산을 넘기는 것이 주된 목적이에요.");
      alternatives.push({
        name: "수익자연속신탁",
        why: "배우자가 먼저 받고 그다음 자녀로 이어지길 원한다면 이 구조가 맞아요.",
      });
    }
    alternatives.push({
      name: "공정증서 유언",
      why: "재산 구성이 단순하고 다툼 가능성이 낮다면 더 적은 비용으로 할 수 있어요.",
    });
  } else {
    rationale.push(
      purpose === "medical"
        ? "치료비·요양비를 확보하는 것이 주된 목적이라고 답했어요."
        : purpose === "fraud"
          ? "사기 피해와 잘못된 판단에서 재산을 지키는 것을 주된 목적으로 꼽았어요."
          : purpose === "conflict"
            ? "가족 사이 재산 다툼을 막는 것을 주된 목적으로 꼽았어요."
            : "판단이 어려워진 뒤에도 생활비가 계속 나오게 하는 것을 주된 목적으로 꼽았어요.",
    );
    rationale.push("혜택을 받는 사람이 본인이라 자익신탁 구조예요.");
    alternatives.push({
      name: "임의후견계약만",
      why: "묶어 둘 자산이 크지 않다면 신탁 없이 후견계약만으로도 관리 권한을 정할 수 있어요.",
    });
    alternatives.push({
      name: "대리인 지정 + 계좌 안심차단",
      why: "가장 간단한 방법이에요. 다만 관리자의 권한 범위를 문서로 남기기는 어려워요.",
    });
  }

  if (realEstateHeavy) {
    rationale.push(
      "부동산이 전체 자산의 절반을 넘어요. 부동산관리신탁을 함께 살펴봐야 해요.",
    );
  }

  return { code, name, rationale, alternatives };
}

/* ── 조항 생성 ───────────────────────────────────── */

const TRIGGER_TEXT: Record<string, string> = {
  doctor1: "정신건강의학과 또는 신경과 전문의 1인이 발급한 진단서가 수탁자에게 제출된 때",
  doctor2:
    "서로 다른 의료기관의 전문의 2인의 소견이 일치하고, 그 소견서가 수탁자에게 제출된 때",
  court: "가정법원의 후견개시 심판이 확정되고 그 심판서가 수탁자에게 제출된 때",
  designee:
    "제4조 제2항의 확인자가 서면으로 판단을 알리고, 수탁자가 이를 확인한 때",
  self: "위탁자 본인이 서면으로 지급 시작을 요청한 때",
};

const PURPOSE_TEXT: Record<string, string> = {
  living:
    "위탁자가 스스로 금융 결정을 하기 어려워진 뒤에도 생활이 끊기지 않고 이어지게 하는 것",
  medical:
    "위탁자의 치료비와 요양비가 제때 지급되게 하는 것",
  conflict:
    "위탁자의 재산 관리와 배분 기준을 미리 정해 가족 사이 다툼을 막는 것",
  fraud:
    "사기, 부당한 권유, 판단력 저하로 인한 처분에서 위탁자의 재산을 지키는 것",
  spouse:
    "위탁자가 세상을 떠난 뒤에도 배우자의 생활이 안정되게 이어지게 하는 것",
};

const INVEST_TEXT: Record<string, string> = {
  preserve:
    "신탁재산에 넣은 투자자산은 원칙적으로 팔지 않고 그대로 보유합니다.",
  phased:
    "정기지급에 필요한 범위에서만 단계적으로 현금화하며, 한 번에 파는 규모는 연간 지급 예정액을 넘지 않습니다.",
  partial:
    "수시지급 사유가 생겨 현금이 부족할 때에만 필요한 범위에서 일부를 팔 수 있습니다.",
  delegate:
    "수탁자 또는 수탁자가 정한 운용 전문가의 판단에 따라 운용하되, 운용 결과를 반기마다 감독인에게 보고합니다.",
};

const FORBID_TEXT: Record<string, string> = {
  sell_estate: "신탁재산인 부동산의 매매·교환·담보 제공",
  loan: "신탁재산을 담보로 한 대출과 다른 사람을 위한 보증",
  gift: "제11조에서 정한 귀속권리자 외의 사람에게 하는 증여",
  business: "사업체에 대한 새 투자와 출자",
  break_deposit: "만기 전 정기예금·적금 중도해지",
  cancel_insurance: "보장성 보험계약 해지와 실효 방치",
  home: "위탁자가 사는 주택의 처분",
  land: "선산과 토지의 처분",
  memento: "위탁자가 특별한 의미를 둔 자산의 처분",
};

const SUPERVISOR_TEXT: Record<string, string> = {
  family: "위탁자의 다른 가족 1인을 신탁감독인으로 지정합니다.",
  expert: "변호사 또는 법무사 등 전문가를 신탁감독인으로 선임합니다.",
  institution: "수탁 금융기관이 정기적으로 운용·지급 내역을 보고하게 합니다.",
  none: "",
};

const TERM_TEXT: Record<string, string> = {
  auto: "제4조의 지급개시 사유가 사라진 것이 확인되면 이 신탁은 자동으로 종료합니다.",
  request: "위탁자가 서면으로 종료를 요청하면 이 신탁은 종료합니다.",
  supervisor:
    "신탁감독인이 위탁자가 다시 스스로 결정할 수 있게 되었음을 확인하고 서면으로 동의하면 이 신탁은 종료합니다.",
  court: "법원이 종료를 결정하면 이 신탁은 종료합니다.",
};

const CHANGE_TEXT: Record<string, string> = {
  self_only: "위탁자는 스스로 결정할 수 있는 동안 혼자서 이 계약을 변경할 수 있습니다.",
  self_supervisor:
    "이 계약의 변경은 위탁자와 신탁감독인이 서면으로 동의해야 효력이 생깁니다.",
  all: "이 계약의 변경은 위탁자·관리자·감독인 모두의 서면 동의가 필요합니다.",
  court: "이 계약의 변경은 법원의 허가가 필요합니다.",
};

const MEDICAL_TEXT: Record<string, string> = {
  unlimited:
    "치료비와 요양비는 금액 제한 없이 실비로 지급합니다. 다만 지급 후 30일 안에 증빙을 감독인에게 제출합니다.",
  total_cap:
    "치료비와 요양비는 누적 총액 한도 안에서 실비로 지급합니다. 한도를 넘는 금액은 감독인의 동의를 받아 지급합니다.",
  yearly_cap:
    "치료비와 요양비는 연간 한도 안에서 실비로 지급하며, 쓰지 않은 금액은 다음 해로 넘기지 않습니다.",
  family:
    "치료비와 요양비는 지급할 때마다 관리자와 감독인이 협의해 지급합니다.",
};

const ASSET_LABEL: Record<string, string> = {
  deposit: "예금·적금",
  invest: "주식·펀드·채권",
  realestate: "부동산",
  pension: "연금",
  insurance: "보험",
  business: "사업체·지분",
};

/** 상속 의사를 답했는가 — 유언대용·수익자연속 구조로 판정하는 모드. */
function estateMode(p: Profile): boolean {
  return p.track === "estate" || (isUnified(p) && hasChapter(p, "estate"));
}

/** 본인이 미래를 대비해 미리 정하는 모드 (옛 트랙 B, 또는 의료·요양 영역 답변). */
function futureMode(p: Profile): boolean {
  return p.track === "future" || (isUnified(p) && hasChapter(p, "medical"));
}

export function buildTrustDesign(p: Profile): TrustDesign | null {
  // 신탁 초안은 상속 또는 의료·요양 영역을 답했을 때만 만든다.
  // 기본 질문만 답한 경우 신탁 용어를 한 번도 보여주지 않는다.
  if (isUnified(p) && !hasChapter(p, "estate") && !hasChapter(p, "medical")) return null;
  if (p.track === "caregiver") {
    // 대리 트랙은 대상자가 스스로 결정할 수 있는지에 따라 신탁 신규 설정 가능 여부가 갈린다.
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
      note: "법적 구속력은 없지만, 관리자가 판단할 때 해석 기준이 됩니다.",
    });
  }

  /* 제1조 목적 */
  const purpose = choiceOf(p, "B04");
  clauses.push({
    no: "제1조",
    title: "신탁의 목적",
    body: purpose
      ? [
          `이 신탁의 목적은 ${PURPOSE_TEXT[purpose]}입니다.`,
          "수탁자는 이 목적에 맞지 않는 지급 요청을 거절할 수 있습니다.",
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
              `${i + 1}. ${ASSET_LABEL[it.k] ?? it.k}: 약 ${it.v ? won(it.v) : "금액 없음"}`,
          ),
          `합계 약 ${won(total)}입니다.`,
          "실제로 신탁에 넣을 범위와 평가액은 수탁 금융기관이 확인한 뒤 확정합니다.",
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
    "수탁자: 신탁업 인가를 받은 금융기관 (나중에 정함)",
    `수익자(1차): ${estateMode(p) ? "위탁자 본인 (살아 있는 동안)" : "위탁자 본인"}`,
  ];
  if (estateMode(p)) {
    const cont = choiceOf(p, "D04");
    partyBody.push(
      cont === "yes"
        ? "수익자(2차): 배우자 (위탁자가 사망하면 승계)"
        : cont === "direct"
          ? "수익자(2차): 자녀 (위탁자가 사망하면 바로 승계)"
          : "수익자(2차): 아직 정하지 않음",
    );
  }
  partyBody.push(`관리자(1차): ${personLabel(primary)}`);
  partyBody.push(`관리자(예비): ${personLabel(backup)}`);
  if (soloLimit !== undefined) {
    partyBody.push(
      `관리자는 1회 ${won(soloLimit)}까지는 혼자 지급을 요청할 수 있습니다. 그보다 크면 감독인의 동의가 필요합니다.`,
    );
  }

  clauses.push({
    no: "제3조",
    title: "위탁자·수탁자·수익자·관리자",
    body: partyBody,
    status: primary ? (backup && soloLimit !== undefined ? "set" : "partial") : "missing",
    sources: ["B12", "B13", "B14", "D11", "D04"],
  });

  if (primary && !backup && futureMode(p)) {
    flags.push({
      level: "warn",
      title: "예비 관리자가 없어요",
      body: `${personLabel(primary)}께서 먼저 돌아가시거나 관리를 못 하게 되면, 그때 다시 법원 절차를 밟아야 해요.`,
      qid: "B13",
    });
  }

  /* 제4조 지급개시 사유 */
  const trig = choiceOf(p, "B05");
  const confirmer = personOf(p, "B06");
  clauses.push({
    no: "제4조",
    // 문서 본문이라 "지급개시 사유" 는 그대로 두고, 괄호의 내부 용어(트리거)만 뺐다.
    title: "지급개시 사유",
    body: trig
      ? [
          `① 이 신탁의 지급은 ${TRIGGER_TEXT[trig]}에 시작합니다.`,
          `② 위 사유가 생겼는지는 ${josa(personLabel(confirmer), "이가")} 확인합니다.`,
          "③ 지급이 시작된 뒤 사유가 사라지면 제10조에 따릅니다.",
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
      `① 수탁자는 수익자에게 매월 ${josa(won(monthly), "을를")} ${
        cycle === "weekly"
          ? "주 단위로 나누어"
          : cycle === "biweekly"
            ? "2주 단위로 나누어"
            : "한 번에"
      } 지급합니다.`,
    );
    if (bump !== undefined && bump > 0) {
      payBody.push(
        `② 수익자가 요양시설에 들어간 사실이 확인되면, 들어간 달부터 월 지급액을 ${won(
          monthly + bump,
        )}으로 올립니다. (기본 ${won(monthly)} + 추가 ${won(bump)})`,
      );
    } else {
      payBody.push(
        "② 요양시설 입소 같은 상황 변화에 따른 증액 조건은 아직 정하지 않았습니다.",
      );
    }
    payBody.push(
      "③ 물가가 달라져 조정이 필요하면 감독인의 동의를 얻어 조정할 수 있습니다.",
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
    title: "수시지급 (치료비와 요양비)",
    body: med
      ? [
          `① ${MEDICAL_TEXT[med]}`,
          "② 지급은 의료기관·요양기관에 직접 이체하는 것을 원칙으로 합니다.",
        ]
      : [
          NOT_SET,
          "이 조항이 비어 있으면 큰 의료비가 생겼을 때 지급할지 정할 기준이 없습니다.",
        ],
    status: med ? "set" : "missing",
    sources: ["B09"],
  });

  /* 제7조 운용 방침 */
  const inv = choiceOf(p, "B11");
  const bizNote =
    choiceOf(p, "D08") === "yes_succeed"
      ? ["② 사업체 지분은 나누지 않고 지정한 승계인에게 한 번에 넘깁니다."]
      : [];
  clauses.push({
    no: "제7조",
    title: "신탁재산 운용 방침",
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
          "수탁자와 관리자는 다음 행위를 할 수 없습니다.",
          ...forbid.map((f, i) => `${i + 1}. ${FORBID_TEXT[f] ?? f}`),
          "위 항목에 해당하는 요청은 감독인이 미리 서면으로 동의한 경우에만 예외적으로 검토합니다.",
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
          `① ${sup && sup !== "none" ? SUPERVISOR_TEXT[sup] : `${josa(personLabel(supPerson), "을를")} 신탁감독인으로 지정합니다.`}`,
          "② 감독인은 반기마다 지급 내역과 남은 신탁재산을 확인합니다.",
          "③ 감독인은 관리자의 지급 요청에 이의를 제기할 수 있습니다.",
        ]
      : [
          "감독인을 두지 않기로 했습니다.",
          "이 경우 관리자의 판단을 확인할 절차가 없습니다.",
        ],
    status: supSet ? "set" : sup === "none" ? "partial" : "missing",
    sources: ["B16", "D12"],
  });

  if (sup === "none") {
    flags.push({
      level: "critical",
      title: "감독하는 사람이 없어요",
      body: "관리자가 신탁재산을 목적과 다르게 써도 확인하고 제동을 걸 사람이 없어요. 실제 분쟁의 상당수가 여기서 시작돼요.",
      qid: "B16",
    });
  }

  /* 제10조 변경·종료 */
  const term = choiceOf(p, "B19");
  const change = choiceOf(p, "B20");
  clauses.push({
    no: "제10조",
    title: "변경과 종료",
    body:
      term || change
        ? [
            term ? `① ${TERM_TEXT[term]}` : "① 종료 요건은 아직 정하지 않았습니다.",
            change
              ? `② ${CHANGE_TEXT[change]}`
              : "② 변경 요건은 아직 정하지 않았습니다.",
          ]
        : [NOT_SET],
    status: term && change ? "set" : term || change ? "partial" : "missing",
    sources: ["B19", "B20"],
  });

  /* 제11조 남은 재산의 귀속 */
  const alloc = [...allocationOf(p, "B21"), ...allocationOf(p, "D03")];
  clauses.push({
    no: "제11조",
    title: "남은 재산의 귀속",
    body: alloc.length
      ? [
          "신탁이 끝날 때 남은 신탁재산은 다음과 같이 돌아갑니다.",
          ...alloc.map((r, i) => `${i + 1}. ${r.asset} → ${r.to}`),
          "귀속권리자가 먼저 사망하면 그 직계비속이 대신 받습니다.",
        ]
      : [
          NOT_SET,
          "정하지 않으면 신탁이 끝날 때 남은 재산은 법정상속분에 따라 나뉩니다.",
        ],
    status: alloc.length ? "set" : "missing",
    sources: ["B21", "D03"],
  });

  /* ── 플래그 ── */
  const heirs = amountsOf(p, "D01");
  const heirCount = (heirs.child ?? 0) + (heirs.spouse ?? 0);
  const lawKnown = choiceOf(p, "D06");
  if (estateMode(p) && alloc.length && heirCount > 1) {
    const skew = alloc.length < heirCount;
    if (skew || lawKnown === "know_ignore" || lawKnown === "unknown") {
      flags.push({
        level: "warn",
        title: "유류분 문제가 생길 수 있어요",
        body: `상속인이 ${heirCount}명인데 배분이 일부에 몰려 있어요. 배분에서 빠진 상속인은 유류분 반환을 청구할 수 있고, 신탁재산도 그 대상이 될 수 있어요. 세무·법률 전문가의 확인이 필요해요.`,
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
          title: "지급액에 비해 신탁재산이 부족할 수 있어요",
          body: `지금 설정대로면 신탁재산이 약 ${years.toFixed(1)}년 뒤에 바닥날 것으로 단순 추정돼요. 월 지급액이나 신탁재산 범위를 다시 살펴봐 주세요.`,
          qid: "B07",
        });
      }
    }
  }

  if (p.capacity === "declining") {
    flags.push({
      level: "warn",
      title: "시간이 많지 않을 수 있어요",
      body: "판단에 어려움이 보이기 시작한 시기에는 계약을 맺을 때의 판단 능력을 두고 나중에 다툼이 생길 수 있어요. 계약할 때 전문의 소견서를 함께 받아 두는 것이 보통이에요.",
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
          "상품에 따라 차이가 큽니다. KB 간편형 유언대용신탁 1,000만원(2025.7 출시), 하나 Living Trust 5억원 이상",
      },
      { label: "가입 연령", value: "상품마다 다릅니다 (만 19세 이상 또는 만 40세 이상)" },
      { label: "부동산 편입 시", value: "취득세·등록면허세를 따로 확인해야 합니다" },
    ],
    completeness,
    missing: filled.filter((c) => c.status === "missing").length,
  };
}

function blockedDesign(p: Profile): TrustDesign {
  const who = p.subject === "family" ? (p.subjectRelation ?? "그분") : "본인";
  return {
    available: false,
    blockedReason: `${josa(who, "이가")} 스스로 결정하기 어려운 상태라고 답했어요. 신탁계약은 위탁자 본인의 유효한 의사표시가 있어야 해서, 이 상태에서 새로 신탁을 만들기는 어려워요. 이미 맺은 신탁이 있다면 그 계약의 효력은 따로 살펴봐요.`,
    type: {
      code: "blocked",
      name: "새 신탁을 만들기 어려움",
      rationale: [
        "신탁계약은 위탁자가 스스로 결정할 수 있어야 맺을 수 있어요.",
        "결정이 어려운 상태에서 맺은 계약은 나중에 무효라고 다툼이 생길 수 있어요.",
      ],
      alternatives: [
        {
          name: "법정후견 + 후견지원신탁",
          why: "가정법원의 후견개시 심판을 받은 뒤, 법원의 감독 아래 후견지원신탁을 이용하는 길이 있어요.",
        },
        {
          name: "지금 바로 할 수 있는 계좌 보호",
          why: "후견 절차와 별개로, 금융기관의 이상거래 차단·한도 축소·안심차단 서비스는 지금 신청할 수 있어요.",
        },
      ],
    },
    clauses: [],
    flags: [
      {
        level: "critical",
        title: "새 신탁을 만들기 어려운 상태예요",
        body: "후견설계서의 법정후견 경로와 지출설계서의 즉시 조치를 먼저 확인해 주세요.",
      },
    ],
    cost: [],
    completeness: 0,
    missing: 0,
  };
}
