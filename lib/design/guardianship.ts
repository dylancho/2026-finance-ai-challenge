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
import { josa, personLabel } from "../format";
import { hasChapter, isUnified } from "../questions";

/*
 * 문체 (2026-09-07 문체 가이드)
 *   판정·근거·표 메모·절차·경고  화면 안내문이라 해요체.
 *   효력 요건(effect)            문서 본문이라 담백한 합니다체.
 * 절차 제목(title)은 의뢰서 §절차 에 그대로 실리는 명사구라 문장으로 바꾸지 않았다.
 * 코드·판정 로직·완성도 계산은 그대로다.
 */

/** 본인이 미리 정해두는 모드 (옛 트랙 B, 또는 의료·요양 영역 답변). */
function futureMode(p: Profile): boolean {
  return p.track === "future" || (isUnified(p) && hasChapter(p, "medical"));
}

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

/** 사용자가 고른 사무 + 금지행위를 반영해 맡김/동의 필요/제외를 결정 */
function buildPropertyScope(p: Profile): ScopeItem[] {
  const chosen = new Set(multiOf(p, "C13"));
  const forbidden = new Set(multiOf(p, "B15"));

  return PROPERTY_ITEMS.map(({ key, label }) => {
    // 신탁 금지행위로 지정된 항목은 후견에서도 동의 필요로 올린다.
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
        note: "본인이 금지행위로 정함. 감독인 동의가 있어야 가능",
      };
    }
    if (chosen.size && chosen.has(key)) {
      return { key, label, grant: "delegate" as const };
    }
    if (chosen.size) {
      return { key, label, grant: "exclude" as const, note: "고르지 않음" };
    }
    // C13 미응답 시의 일반 기본값. 화면에는 "기본값" 대신 왜 그렇게 나뉘는지를 적는다 (2026-09-07).
    const defaultDelegate = ["deposit_use", "tax", "insurance", "estate_rent"];
    return defaultDelegate.includes(key)
      ? { key, label, grant: "delegate" as const, note: "일상적인 관리라 후견인이 처리" }
      : { key, label, grant: "consent" as const, note: "중요한 재산 행위라 감독인 동의 필요" };
  });
}

function buildPersonalScope(p: Profile): ScopeItem[] {
  const chosen = new Set([...multiOf(p, "B18"), ...multiOf(p, "C13")]);
  const pref = choiceOf(p, "B17");

  return PERSONAL_ITEMS.map(({ key, label }) => {
    if (chosen.has(key)) {
      let note: string | undefined;
      if (key === "residence" && pref === "home")
        note = "본인 바람: 되도록 집에서 지내기";
      if (key === "residence" && pref === "facility")
        note = "본인 바람: 전문 요양시설";
      if (key === "facility" && pref === "home")
        note = "집에서 지내는 것을 우선해서 판단";
      return { key, label, grant: "delegate" as const, note };
    }
    if (key === "eol") {
      return {
        key,
        label,
        grant: "exclude" as const,
        note: "정하지 않음. 그때 대신 결정할 사람이 없어요",
      };
    }
    return { key, label, grant: "exclude" as const, note: "고르지 않음" };
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
      question: "스스로 결정할 수 있나요?",
      answer: "예. 계약 내용을 이해하고 서명할 수 있어요",
      taken: true,
    });

    const wantsPrearrange =
      futureMode(p) ||
      p.track === "estate" ||
      choiceOf(p, "C12") === "yes_agree";

    if (wantsPrearrange) {
      tree.push({
        question: "미리 정해 두기를 원하나요?",
        answer: "예. 지금 스스로 후견인과 맡길 일을 정하려고 해요",
        taken: true,
      });
      return {
        code: "voluntary",
        name: "임의후견 (후견계약)",
        rationale: [
          `${josa(who, "이가")} 지금은 스스로 판단하고 계약할 수 있는 상태예요.`,
          "본인이 후견인과 맡길 일의 범위를 직접 정할 수 있는 시기예요.",
          "임의후견은 공정증서로 계약하고 등기해 두었다가, 실제로 판단이 어려워졌을 때 가정법원이 임의후견감독인을 정하면 효력이 생겨요.",
        ],
        ruledOut: [
          {
            name: "성년후견·한정후견",
            why: "법정후견은 이미 스스로 일을 처리하기 어려워진 뒤에 법원이 시작하는 제도예요. 지금 상태에는 맞지 않아요.",
          },
          {
            name: "특정후견",
            why: "한때, 특정한 일만 필요할 때의 제도예요. 계속되는 재산관리를 원한다면 맞지 않아요.",
          },
        ],
        tree,
      };
    }

    tree.push({
      question: "미리 정해 두기를 원하나요?",
      answer: "아직 아니요. 지금은 신탁과 대리인 지정으로 충분해요",
      taken: true,
    });
    return {
      code: "none",
      name: "지금은 후견 절차가 필요하지 않아요",
      rationale: [
        `${josa(who, "이가")} 스스로 금융 결정을 할 수 있는 상태예요.`,
        "후견 제도는 판단이 어려워진 뒤를 위한 거예요. 지금은 계좌 한도·이상거래 차단과 대리인 지정만으로도 충분할 수 있어요.",
      ],
      ruledOut: [
        {
          name: "임의후견",
          why: "미리 정해 두고 싶어지면 그때 살펴보면 돼요. 다만 스스로 결정할 수 있을 때만 가능해요.",
        },
      ],
      tree,
    };
  }

  /* 스스로 결정하기 어려운 경로 */
  tree.push({
    question: "스스로 결정할 수 있나요?",
    answer: "아니요. 계약 내용을 이해하고 서명하기 어려워요",
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
      question: "어느 정도 어려운가요?",
      answer: "특정한 일 하나만 처리하면 돼요",
      taken: true,
    });
    return {
      code: "specific",
      name: "특정후견",
      rationale: [
        "지금 필요한 것이 특정한 일 한 가지로 보여요.",
        "특정후견은 그 일에 한해 법원이 도울 조치를 정하는 제도예요. 본인의 행위능력은 제한되지 않아요.",
      ],
      ruledOut: [
        {
          name: "성년후견",
          why: "행위능력을 폭넓게 제한하는 제도예요. 특정한 일만 필요할 때는 지나쳐요.",
        },
      ],
      tree,
    };
  }

  if (partial) {
    tree.push({
      question: "어느 정도 어려운가요?",
      answer: "부족하지만 아주 없지는 않아요. 쉬운 일은 스스로 할 수 있어요",
      taken: true,
    });
    return {
      code: "limited",
      name: "한정후견",
      rationale: [
        "쉬운 내용은 이해하지만 복잡한 재산 행위는 어렵다고 답했어요.",
        "한정후견은 본인의 행위능력을 원칙적으로 유지하되, 법원이 정한 특정 행위에만 후견인의 동의를 받게 하는 제도예요.",
        "동의를 받아야 할 행위의 범위(동의유보)는 청구할 때 함께 정해요.",
      ],
      ruledOut: [
        {
          name: "임의후견",
          why: "지금 새로 후견계약을 맺기에는 판단 능력을 두고 다툼이 생길 수 있어요.",
        },
        {
          name: "성년후견",
          why: "스스로 일을 처리할 능력이 계속 없는 경우의 제도예요. 지금 상태보다 지나칠 수 있어요.",
        },
      ],
      tree,
    };
  }

  tree.push({
    question: "어느 정도 어려운가요?",
    answer: "계속 어려운 상태예요. 진단을 받았거나 일 처리가 어려워요",
    taken: true,
  });
  return {
    code: "adult",
    name: "성년후견",
    rationale: [
      `${josa(who, "이가")} 질병·장애·노령 등으로 일을 처리할 능력이 계속 부족한 상태로 보여요.`,
      "성년후견이 시작되면 후견인이 법정대리인으로서 재산관리와 신상보호를 대신해요.",
      "가정법원은 필요한 범위에서 후견인의 권한과 본인에게 남는 행위능력을 함께 정해요.",
    ],
    ruledOut: [
      {
        name: "임의후견",
        why: "본인의 유효한 의사표시가 있어야 하는 제도라 지금 상태에서는 새로 맺기 어려워요.",
      },
      {
        name: "한정후견",
        why: "부족하지만 아주 없지는 않은 경우의 제도예요. 진단 내용에 따라 한정후견으로 청구하기도 하니 전문가 확인이 필요해요.",
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
      detail: "맡길 일의 범위, 후견인, 보수, 감독 방식을 문서로 정리해요.",
      period: "즉시",
      docs: ["이 후견설계서"],
      cost: "비용 없음",
    },
    {
      n: 2,
      title: "공증사무소에서 공정증서 작성",
      detail:
        "후견계약은 반드시 공정증서로 맺어야 효력이 인정돼요. 본인과 후견인이 함께 가요.",
      period: "1~2주",
      docs: [
        "신분증",
        hasDocs.has("family") ? "가족관계증명서 (보유)" : "가족관계증명서",
        hasDocs.has("diagnosis") ? "의사 소견서 (보유)" : "의사 소견서 (권장)",
      ],
      cost: "공증수수료 (계약 내용·재산 규모에 따라 다름)",
    },
    {
      n: 3,
      title: "후견등기 신청",
      detail: "공정증서를 근거로 후견등기부에 등기해요.",
      period: "2~4주",
      docs: ["공정증서 정본"],
      cost: "등기 수수료",
    },
    {
      n: 4,
      title: "가정법원에 임의후견감독인 선임 청구 (이때 효력 발생)",
      detail:
        "실제로 판단이 어려워진 때에 청구해요. 감독인이 정해져야 후견계약의 효력이 생긴다는 점이 임의후견의 가장 중요한 특징이에요.",
      period: "2~6개월",
      docs: ["심판청구서", "진단서", "후견등기사항증명서"],
      cost: "인지·송달료, 필요하면 감정료",
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
      title: "청구할 수 있는 사람과 맡길 일 정리",
      detail: `본인·배우자·4촌 이내 친족 등이 ${label} 개시를 청구할 수 있어요. 필요한 일의 범위를 먼저 정해요.`,
      period: "즉시",
      docs: ["이 후견설계서"],
      cost: "비용 없음",
    },
    {
      n: 2,
      title: "서류 준비",
      detail: "진단서는 법원이 정한 양식에 맞춰야 하는 경우가 많아요.",
      period: "2~4주",
      docs: [
        hasDocs.has("diagnosis") ? "진단서 (보유)" : "진단서 (법원 양식 확인)",
        hasDocs.has("family") ? "가족관계증명서 (보유)" : "가족관계증명서",
        hasDocs.has("resident") ? "주민등록등본 (보유)" : "주민등록등본",
        hasDocs.has("bankbook") ? "재산 자료 (보유)" : "재산 목록과 거래 내역",
        "후견등기사항 부존재증명서",
      ],
      cost: "발급 수수료",
    },
    {
      n: 3,
      title: "가정법원에 심판 청구",
      detail: "본인 주소지 관할 가정법원에 청구서를 내요.",
      period: "접수 당일",
      docs: ["심판청구서", "청구인 신분증"],
      cost: "인지대·송달료",
    },
    {
      n: 4,
      title: "본인 심문과 정신감정",
      detail: conflict
        ? "가족 사이 이견이 있는 사건에서는 감정과 심문이 길어지고, 법원이 가족 대신 전문가 후견인을 정하기도 해요."
        : "법원이 본인의 뜻을 직접 확인하고, 필요하면 정신감정을 해요.",
      period: conflict ? "4~8개월" : "2~5개월",
      docs: ["법원 안내에 따름"],
      cost: "감정료 (수십만원~백만원대)",
    },
    {
      n: 5,
      title: "심판 확정과 후견등기",
      detail: `${label} 개시 심판이 확정되면 법원이 직권으로 후견등기를 하고, 후견인은 재산 목록을 법원에 보고해요.`,
      period: "1~2개월",
      docs: ["심판문", "재산목록 보고서"],
      cost: "비용 없음",
    },
  ];
}

/* ── 본체 ────────────────────────────────────────── */

export function buildGuardianshipDesign(p: Profile): GuardianshipDesign | null {
  // 후견 초안은 의료·요양 영역(신상 사무·요양 방식)을 답했을 때만 만든다.
  if (isUnified(p) && !hasChapter(p, "medical")) return null;
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
      ? "가정법원이 정하는 임의후견감독인 (필수)"
      : supChoice === "expert"
        ? "변호사·법무사 등 전문가"
        : supChoice === "family"
          ? "다른 가족 1인"
          : supChoice === "institution"
            ? "금융기관 정기 보고"
            : "정하지 않음";

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
          "① 후견계약은 공정증서로 맺어야 합니다.",
          "② 계약을 맺은 뒤 후견등기를 마쳐야 합니다.",
          "③ 본인이 스스로 일을 처리하기 어려워진 때에 가정법원이 임의후견감독인을 정하면 효력이 생깁니다.",
          "④ 감독인이 정해지기 전까지 후견인에게는 대리권이 없습니다.",
        ]
      : verdict.code === "none"
        ? ["지금 단계에서는 후견 절차를 시작하지 않습니다."]
        : [
            "① 가정법원의 심판이 확정된 때부터 효력이 생깁니다.",
            "② 후견인은 취임 후 정해진 기간 안에 재산 목록을 만들어 법원에 보고합니다.",
            "③ 후견인은 법원이 정한 주기로 일 처리를 보고합니다.",
            "④ 법원은 필요하다고 보면 후견감독인을 정할 수 있습니다.",
          ];

  /* ── 플래그 ── */
  const flags: Flag[] = [];

  if (
    (p.capacity === "diagnosed" || p.capacity === "incident") &&
    futureMode(p)
  ) {
    flags.push({
      level: "critical",
      title: "임의후견은 어려울 수 있어요",
      body: "미리 정해 두는 임의후견계약은 본인이 스스로 결정할 수 있어야 맺을 수 있어요. 이미 진단을 받았거나 금융 사고가 있었다면 법정후견 절차를 먼저 확인해야 해요.",
    });
  }

  if (conflict) {
    flags.push({
      level: "warn",
      title: "가족 사이 이견이 절차를 늦춰요",
      body: "다른 가족이 반대하면 법원은 본인의 뜻과 이해관계를 더 신중히 확인해요. 감정 절차가 더해져 심판까지 반년 넘게 걸리기도 하고, 가족 대신 전문가 후견인이 정해지기도 해요.",
      qid: "C06",
    });
  }

  if (!supervisorAssigned) {
    flags.push({
      level: "warn",
      title: "후견감독인을 두지 않기로 했어요",
      body: "법정후견에서 감독인은 필수가 아니에요. 다만 후견인의 재산 관리를 확인할 절차가 없으면 나중에 다른 가족이 문제를 제기할 여지가 커져요.",
      qid: "B16",
    });
  }

  const heirCount = (p.answers["C05"]?.kind === "amount" && p.answers["C05"].value) || 0;
  if (primary && heirCount > 1) {
    flags.push({
      level: "info",
      title: "후견인과 상속인이 같은 사람이에요",
      body: `${josa(personLabel(primary), "이가")} 후견인이면서 상속인이에요. 법이 금지하지는 않지만, 재산 처분에서 이해가 부딪칠 수 있어 법원이 감독인을 두라고 권하기도 해요.`,
    });
  }

  const eol = scopePersonal.find((s) => s.key === "eol");
  if (eol?.grant === "exclude" && futureMode(p)) {
    flags.push({
      level: "info",
      title: "연명의료를 어떻게 할지 비어 있어요",
      body: "이 항목은 후견인이 대신 정하기 특히 어려운 영역이에요. 사전연명의료의향서를 따로 써 두는 방법이 있어요.",
      qid: "B18",
    });
  }

  if (multiOf(p, "C04").includes("hospital_bill")) {
    flags.push({
      level: "warn",
      title: "지금 당장 병원비 결제가 막혀 있어요",
      body: "후견 심판은 몇 달이 걸려요. 그 전에 병원의 분할 납부 협의, 긴급복지지원 제도, 금융기관의 예외 인출 절차를 먼저 확인해 주세요. 지출설계서의 즉시 조치 항목도 함께 봐 주세요.",
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
    hasDocs.size > 0 || futureMode(p),
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
          ? "임의후견에서는 감독인이 정해져야 효력이 생겨요. 선택이 아니에요."
          : "법정후견에서 감독인을 둘지는 법원이 정해요.",
    },
    effect,
    roadmap,
    flags,
    completeness: Math.round((done / checks.length) * 100),
    missing: checks.length - done,
  };
}
