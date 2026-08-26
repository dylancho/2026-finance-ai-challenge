import type {
  Flag,
  GuardianshipCode,
  GuardianshipDesign,
  Profile,
  RoadmapStep,
  ScopeItem,
  TreeNode,
} from "../types";
import { choiceOf, firstPerson, multiOf, personOf } from "../profile";
import { personLabel } from "../format";

/* ── 사무범위 기본 정의 ──────────────────────────── */

const PROPERTY_ITEMS: { key: string; label: string }[] = [
  { key: "deposit_use", label: "예금 입출금" },
  { key: "deposit_break", label: "정기예금·적금 해지" },
  { key: "estate_sell", label: "부동산 처분" },
  { key: "estate_rent", label: "부동산 임대 관리" },
  { key: "loan", label: "대출·보증" },
  { key: "securities", label: "증권 거래" },
  { key: "insurance", label: "보험 계약·청구·해지" },
  { key: "tax", label: "세금·공과금 납부" },
  { key: "litigation", label: "소송 행위" },
];

const PERSONAL_ITEMS: { key: string; label: string }[] = [
  { key: "residence", label: "거주지 결정" },
  { key: "medical", label: "의료행위 동의" },
  { key: "facility", label: "요양시설 입퇴소 계약" },
  { key: "visit", label: "면접교섭 결정" },
  { key: "mail", label: "우편·통신물 관리" },
  { key: "eol", label: "연명의료 의사 확인" },
];

/** 사용자가 고른 사무 + 금지행위를 반영해 위임/동의유보/제외를 결정 */
function buildPropertyScope(p: Profile): ScopeItem[] {
  const chosen = new Set(multiOf(p, "C13"));
  const forbidden = new Set(multiOf(p, "B15"));

  return PROPERTY_ITEMS.map(({ key, label }) => {
    // 신탁 금지행위로 지정된 항목은 후견에서도 동의유보로 올린다.
    const forbidMap: Record<string, string> = {
      estate_sell: "sell_estate",
      loan: "loan",
      deposit_break: "break_deposit",
      insurance: "cancel_insurance",
    };
    const f = forbidMap[key];
    if (f && forbidden.has(f)) {
      return {
        key,
        label,
        grant: "consent" as const,
        note: "본인이 금지행위로 지정 — 감독인 동의 없이는 불가",
      };
    }
    if (chosen.size && chosen.has(key)) {
      return { key, label, grant: "delegate" as const };
    }
    if (chosen.size) {
      return { key, label, grant: "exclude" as const, note: "선택하지 않음" };
    }
    // C13 미응답 시의 일반 기본값
    const defaultDelegate = ["deposit_use", "tax", "insurance", "estate_rent"];
    return defaultDelegate.includes(key)
      ? { key, label, grant: "delegate" as const, note: "기본값" }
      : { key, label, grant: "consent" as const, note: "기본값 — 별도 동의 필요" };
  });
}

function buildPersonalScope(p: Profile): ScopeItem[] {
  const chosen = new Set([...multiOf(p, "B18"), ...multiOf(p, "C13")]);
  const pref = choiceOf(p, "B17");

  return PERSONAL_ITEMS.map(({ key, label }) => {
    if (chosen.has(key)) {
      let note: string | undefined;
      if (key === "residence" && pref === "home")
        note = "본인 선호: 가능한 한 자택 거주";
      if (key === "residence" && pref === "facility")
        note = "본인 선호: 전문 요양시설";
      if (key === "facility" && pref === "home")
        note = "자택 거주 우선을 고려하여 판단";
      return { key, label, grant: "delegate" as const, note };
    }
    if (key === "eol") {
      return {
        key,
        label,
        grant: "exclude" as const,
        note: "미지정 — 그 시점에 대신 결정할 사람이 없습니다",
      };
    }
    return { key, label, grant: "exclude" as const, note: "선택하지 않음" };
  });
}

/* ── 제도 판정 ───────────────────────────────────── */

function decideVerdict(p: Profile): {
  code: GuardianshipCode;
  name: string;
  rationale: string[];
  ruledOut: { name: string; why: string }[];
  tree: TreeNode[];
} {
  const who = p.subject === "family" ? (p.subjectRelation ?? "그분") : "본인";
  const signable = choiceOf(p, "C03");
  const changes = multiOf(p, "C02");
  const urgent = multiOf(p, "C04").filter((v) => v !== "none");

  const hasCapacity =
    p.capacity === "full" ||
    (p.capacity === "declining" && signable !== "no") ||
    signable === "yes";

  const tree: TreeNode[] = [];

  if (hasCapacity) {
    tree.push({
      question: "의사능력이 남아 있는가?",
      answer: "예 — 계약 내용을 이해하고 서명할 수 있는 상태",
      taken: true,
    });

    const wantsPrearrange =
      p.track === "future" ||
      p.track === "estate" ||
      choiceOf(p, "C12") === "yes_agree";

    if (wantsPrearrange) {
      tree.push({
        question: "본인이 미리 정해두기를 원하는가?",
        answer: "예 — 지금 스스로 후견인과 사무 범위를 정하려 함",
        taken: true,
      });
      return {
        code: "voluntary",
        name: "임의후견 (후견계약)",
        rationale: [
          `${who}이(가) 현재 스스로 판단하고 계약할 수 있는 상태입니다.`,
          "본인이 후견인과 위임할 사무의 범위를 직접 정할 수 있는 시기입니다.",
          "임의후견은 공정증서로 계약하고 등기한 뒤, 실제로 판단이 어려워졌을 때 가정법원이 임의후견감독인을 선임함으로써 효력이 발생합니다.",
        ],
        ruledOut: [
          {
            name: "성년후견·한정후견",
            why: "법정후견은 이미 사무처리 능력이 부족해진 뒤에 법원이 개시하는 제도입니다. 지금 상태에는 해당하지 않습니다.",
          },
          {
            name: "특정후견",
            why: "일시적·특정한 사무만 필요한 경우의 제도입니다. 지속적인 재산관리 설계를 원하신다면 맞지 않습니다.",
          },
        ],
        tree,
      };
    }

    tree.push({
      question: "본인이 미리 정해두기를 원하는가?",
      answer: "아직 아님 — 지금은 신탁·대리인 지정으로 충분",
      taken: true,
    });
    return {
      code: "none",
      name: "지금은 후견 절차가 필요하지 않습니다",
      rationale: [
        `${who}이(가) 스스로 금융 결정을 하실 수 있는 상태입니다.`,
        "후견 제도는 판단이 어려워진 이후를 위한 것입니다. 지금은 계좌 한도·이상거래 차단과 대리인 지정만으로도 충분할 수 있습니다.",
      ],
      ruledOut: [
        {
          name: "임의후견",
          why: "미리 정해두고 싶어지시면 그때 검토하시면 됩니다. 다만 의사능력이 있을 때만 가능합니다.",
        },
      ],
      tree,
    };
  }

  /* 의사능력 흠결 경로 */
  tree.push({
    question: "의사능력이 남아 있는가?",
    answer: "아니오 — 계약 내용을 이해하고 서명하기 어려운 상태",
    taken: true,
  });

  const severe =
    changes.includes("diagnosed") ||
    p.capacity === "diagnosed" ||
    p.capacity === "incident" ||
    signable === "no";
  const partial = signable === "partial";
  const onlySpecific = urgent.length === 1 && !severe;

  if (onlySpecific) {
    tree.push({
      question: "부족의 정도는?",
      answer: "특정 사무만 처리하면 되는 상황",
      taken: true,
    });
    return {
      code: "specific",
      name: "특정후견",
      rationale: [
        "지금 필요한 것이 특정한 사무 한 가지로 파악됩니다.",
        "특정후견은 그 사무에 한정해 법원이 후원 조치를 정하는 제도로, 본인의 행위능력은 제한되지 않습니다.",
      ],
      ruledOut: [
        {
          name: "성년후견",
          why: "행위능력을 폭넓게 제한하는 제도입니다. 특정 사무만 필요한 경우에는 과도합니다.",
        },
      ],
      tree,
    };
  }

  if (partial) {
    tree.push({
      question: "부족의 정도는?",
      answer: "부족하지만 결여되지는 않음 — 쉬운 일은 스스로 가능",
      taken: true,
    });
    return {
      code: "limited",
      name: "한정후견",
      rationale: [
        "쉬운 내용은 이해하시지만 복잡한 재산 행위는 어렵다고 답하셨습니다.",
        "한정후견은 본인의 행위능력을 원칙적으로 유지하되, 법원이 정한 특정 행위에만 후견인의 동의를 받도록 하는 제도입니다.",
        "동의를 받아야 할 행위의 범위(동의유보)를 청구 시 함께 정합니다.",
      ],
      ruledOut: [
        {
          name: "임의후견",
          why: "지금 새로 후견계약을 체결하기에는 의사능력에 다툼의 여지가 있습니다.",
        },
        {
          name: "성년후견",
          why: "사무처리 능력이 지속적으로 결여된 경우의 제도입니다. 현재 상태보다 과도할 수 있습니다.",
        },
      ],
      tree,
    };
  }

  tree.push({
    question: "부족의 정도는?",
    answer: "지속적으로 결여 — 진단을 받았거나 사무처리가 어려운 상태",
    taken: true,
  });
  return {
    code: "adult",
    name: "성년후견",
    rationale: [
      `${who}이(가) 질병·장애·노령 등으로 사무를 처리할 능력이 지속적으로 결여된 상태로 파악됩니다.`,
      "성년후견이 개시되면 후견인이 법정대리인으로서 재산관리와 신상보호를 대행합니다.",
      "가정법원은 필요한 범위에서 후견인의 권한과 본인의 잔존 행위능력을 함께 정합니다.",
    ],
    ruledOut: [
      {
        name: "임의후견",
        why: "본인의 유효한 의사표시를 전제로 하는 제도이므로 현재 상태에서는 새로 체결하기 어렵습니다.",
      },
      {
        name: "한정후견",
        why: "부족하지만 결여되지는 않은 경우의 제도입니다. 진단 내용에 따라 한정후견으로 청구하는 경우도 있으므로 전문가 확인이 필요합니다.",
      },
    ],
    tree,
  };
}

/* ── 로드맵 ──────────────────────────────────────── */

function voluntaryRoadmap(hasDocs: Set<string>): RoadmapStep[] {
  return [
    {
      n: 1,
      title: "후견계약 내용 확정",
      detail: "위임할 사무의 범위, 후견인, 보수, 감독 방식을 문서로 정리합니다.",
      period: "—",
      docs: ["본 후견설계서"],
      cost: "—",
    },
    {
      n: 2,
      title: "공증사무소에서 공정증서 작성",
      detail:
        "후견계약은 반드시 공정증서로 체결해야 효력이 인정됩니다. 본인과 후견인이 함께 출석합니다.",
      period: "1~2주",
      docs: [
        "신분증",
        hasDocs.has("family") ? "가족관계증명서 (보유)" : "가족관계증명서",
        hasDocs.has("diagnosis") ? "의사 소견서 (보유)" : "의사 소견서 (권장)",
      ],
      cost: "공증수수료 (계약 내용·재산 규모에 따라 상이)",
    },
    {
      n: 3,
      title: "후견등기 신청",
      detail: "공정증서를 근거로 후견등기부에 등기합니다.",
      period: "2~4주",
      docs: ["공정증서 정본"],
      cost: "등기 수수료",
    },
    {
      n: 4,
      title: "가정법원에 임의후견감독인 선임 청구 — 이때 효력 발생",
      detail:
        "실제로 판단이 어려워진 시점에 청구합니다. 감독인이 선임되어야 비로소 후견계약의 효력이 발생한다는 점이 임의후견의 가장 중요한 특징입니다.",
      period: "2~6개월",
      docs: ["심판청구서", "진단서", "후견등기사항증명서"],
      cost: "인지·송달료 + 필요 시 감정료",
    },
  ];
}

function statutoryRoadmap(
  code: GuardianshipCode,
  hasDocs: Set<string>,
  conflict: boolean,
): RoadmapStep[] {
  const label =
    code === "limited" ? "한정후견" : code === "specific" ? "특정후견" : "성년후견";
  return [
    {
      n: 1,
      title: "청구 자격과 사무 범위 정리",
      detail: `본인·배우자·4촌 이내 친족 등이 ${label} 개시를 청구할 수 있습니다. 필요한 사무 범위를 먼저 확정합니다.`,
      period: "—",
      docs: ["본 후견설계서"],
      cost: "—",
    },
    {
      n: 2,
      title: "서류 준비",
      detail: "진단서는 법원이 정한 양식에 맞춰야 하는 경우가 많습니다.",
      period: "2~4주",
      docs: [
        hasDocs.has("diagnosis") ? "진단서 (보유)" : "진단서 — 법원 양식 확인 필요",
        hasDocs.has("family") ? "가족관계증명서 (보유)" : "가족관계증명서",
        hasDocs.has("resident") ? "주민등록등본 (보유)" : "주민등록등본",
        hasDocs.has("bankbook") ? "재산 자료 (보유)" : "재산목록 및 거래내역",
        "후견등기사항 부존재증명서",
      ],
      cost: "발급 수수료",
    },
    {
      n: 3,
      title: "가정법원에 심판청구",
      detail: "본인 주소지 관할 가정법원에 청구서를 제출합니다.",
      period: "—",
      docs: ["심판청구서", "청구인 신분증"],
      cost: "인지대·송달료",
    },
    {
      n: 4,
      title: "본인 심문 및 정신감정",
      detail: conflict
        ? "가족 간 이견이 있는 사건에서는 감정과 심문이 길어지고, 법원이 가족 대신 전문가 후견인을 선임하는 경우가 있습니다."
        : "법원이 본인의 의사를 직접 확인하고, 필요한 경우 정신감정을 실시합니다.",
      period: conflict ? "4~8개월" : "2~5개월",
      docs: ["법원 안내에 따름"],
      cost: "감정료 (수십만원~백만원대)",
    },
    {
      n: 5,
      title: "심판 확정 및 후견등기",
      detail: `${label} 개시 심판이 확정되면 직권으로 후견등기가 이루어지고, 후견인은 재산목록을 법원에 보고합니다.`,
      period: "1~2개월",
      docs: ["심판문", "재산목록 보고서"],
      cost: "—",
    },
  ];
}

/* ── 본체 ────────────────────────────────────────── */

export function buildGuardianshipDesign(p: Profile): GuardianshipDesign | null {
  if (p.track === "daily") return null;
  if (p.track === "estate") return null;

  const verdict = decideVerdict(p);
  const scopeProperty = buildPropertyScope(p);
  const scopePersonal = buildPersonalScope(p);

  const primary = firstPerson(p, "B12", "C07");
  const backup = personOf(p, "B13");

  const supChoice = choiceOf(p, "B16");
  const supervisorAssigned = verdict.code === "voluntary" ? true : supChoice !== "none";
  const supervisorLabel =
    verdict.code === "voluntary"
      ? "가정법원이 선임하는 임의후견감독인 (필수)"
      : supChoice === "expert"
        ? "변호사·법무사 등 전문가"
        : supChoice === "family"
          ? "다른 가족 1인"
          : supChoice === "institution"
            ? "금융기관 정기 보고"
            : "미지정";

  const hasDocs = new Set(multiOf(p, "C11"));
  const conflict = choiceOf(p, "C06") === "conflict";

  const roadmap =
    verdict.code === "voluntary"
      ? voluntaryRoadmap(hasDocs)
      : verdict.code === "none"
        ? []
        : statutoryRoadmap(verdict.code, hasDocs, conflict);

  const effect =
    verdict.code === "voluntary"
      ? [
          "① 후견계약은 공정증서로 체결하여야 한다.",
          "② 계약 체결 후 후견등기를 마쳐야 한다.",
          "③ 본인의 사무처리 능력이 부족해진 때에 가정법원이 임의후견감독인을 선임함으로써 효력이 발생한다.",
          "④ 감독인이 선임되기 전까지는 후견인에게 대리권이 없다.",
        ]
      : verdict.code === "none"
        ? ["현재 단계에서는 후견 절차가 개시되지 않습니다."]
        : [
            "① 가정법원의 심판이 확정된 때부터 효력이 발생한다.",
            "② 후견인은 취임 후 정해진 기간 내에 재산목록을 작성하여 법원에 보고한다.",
            "③ 후견인은 법원이 정한 주기로 사무 보고를 한다.",
            "④ 법원은 필요하다고 인정하면 후견감독인을 선임할 수 있다.",
          ];

  /* ── 플래그 ── */
  const flags: Flag[] = [];

  if (
    (p.capacity === "diagnosed" || p.capacity === "incident") &&
    p.track === "future"
  ) {
    flags.push({
      level: "critical",
      title: "임의후견은 어려울 수 있습니다",
      body: "미리 정해두는 임의후견계약은 본인의 의사능력을 전제로 합니다. 이미 진단을 받으셨거나 금융 사고가 발생한 상태라면 법정후견 절차를 먼저 확인하셔야 합니다.",
    });
  }

  if (conflict) {
    flags.push({
      level: "warn",
      title: "가족 간 이견이 절차를 늦춥니다",
      body: "다른 가족이 반대하면 법원은 본인의 의사와 이해관계를 더 신중히 확인합니다. 감정 절차가 추가되어 심판까지 반년 이상 걸리는 경우가 있고, 가족 대신 전문가 후견인이 선임되기도 합니다.",
      qid: "C06",
    });
  }

  if (!supervisorAssigned) {
    flags.push({
      level: "warn",
      title: "후견감독인을 두지 않기로 하셨습니다",
      body: "법정후견에서 감독인 선임은 필수가 아닙니다. 다만 후견인의 재산 관리를 확인할 절차가 없으면 나중에 다른 가족이 문제를 제기할 여지가 커집니다.",
      qid: "B16",
    });
  }

  const heirCount = (p.answers["C05"]?.kind === "amount" && p.answers["C05"].value) || 0;
  if (primary && heirCount > 1) {
    flags.push({
      level: "info",
      title: "후견인과 상속인이 같은 사람입니다",
      body: `${personLabel(primary)}이(가) 후견인이면서 동시에 상속인인 구조입니다. 법에서 금지하지는 않지만, 재산 처분에서 이해가 충돌할 수 있어 법원이 감독인 선임을 권하는 경우가 있습니다.`,
    });
  }

  const eol = scopePersonal.find((s) => s.key === "eol");
  if (eol?.grant === "exclude" && p.track === "future") {
    flags.push({
      level: "info",
      title: "연명의료에 관한 뜻이 비어 있습니다",
      body: "이 항목은 후견인이 대신 결정하기 특히 어려운 영역입니다. 사전연명의료의향서를 별도로 작성해 두는 방법이 있습니다.",
      qid: "B18",
    });
  }

  if (multiOf(p, "C04").includes("hospital_bill")) {
    flags.push({
      level: "warn",
      title: "지금 당장 병원비 결제가 막혀 있습니다",
      body: "후견 심판은 수개월이 걸립니다. 그 전에 의료기관의 분할납부 협의, 긴급복지지원 제도, 금융기관의 예외 인출 절차를 먼저 확인해 보세요. 지출설계서의 즉시 조치 항목을 함께 보시기 바랍니다.",
      qid: "C04",
    });
  }

  /* ── 완성도 ── */
  const checks = [
    verdict.code !== "none",
    !!primary,
    !!backup || p.track === "caregiver",
    scopeProperty.some((s) => s.grant === "delegate"),
    scopePersonal.some((s) => s.grant === "delegate"),
    supervisorAssigned,
    hasDocs.size > 0 || p.track === "future",
  ];
  const done = checks.filter(Boolean).length;

  return {
    verdict: {
      code: verdict.code,
      name: verdict.name,
      rationale: verdict.rationale,
      ruledOut: verdict.ruledOut,
    },
    tree: verdict.tree,
    scopeProperty,
    scopePersonal,
    guardians: { primary, backup },
    supervisor: {
      assigned: supervisorAssigned,
      label: supervisorLabel,
      note:
        verdict.code === "voluntary"
          ? "임의후견에서는 감독인 선임이 효력 발생 요건입니다. 선택 사항이 아닙니다."
          : "법정후견에서 감독인 선임은 법원의 재량입니다.",
    },
    effect,
    roadmap,
    flags,
    completeness: Math.round((done / checks.length) * 100),
    missing: checks.length - done,
  };
}
