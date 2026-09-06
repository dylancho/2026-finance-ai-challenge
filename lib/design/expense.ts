import type {
  AccountLayer,
  ExpenseDesign,
  Flag,
  FraudRule,
  InvestPrinciples,
  LimitRow,
  Profile,
  TransferRow,
} from "../types";
import {
  amountOf,
  amountsOf,
  choiceOf,
  firstAmount,
  firstMulti,
  firstPerson,
  multiOf,
  personOf,
} from "../profile";
import { josa, personLabel, won } from "../format";
import { hasChapter, isUnified } from "../questions";
import { ASSET_CLASS_LABEL, RISK_CAP_PCT } from "../questions/invest";
import { policyFromProfile, TIMEOUT_LABEL } from "../fraud/policy";

/*
 * 문체 (2026-09-07 문체 가이드): 지출설계서는 카드 한 장에 한 문장이 곧 본문이라 해요체다.
 * 계좌 설명·한도 메모·규칙 조건·경고를 사람 말로 바꿨다. key·판정·완성도 계산은 그대로다.
 * "미지정" 은 ExpenseDoc 과 미리보기(story.ts)가 값으로 비교하므로 남겨 둔다.
 */

/**
 * 자산이 바닥나는 시점 추정. 수익률·물가를 반영하지 않은 단순 인출 계산이다.
 *
 * 설계서 제6조 과 어드바이징(lib/advising)이 같은 함수를 쓴다 — 상황 화면의
 * "바닥나는 시점 변화" 가 설계서의 추정과 어긋나면 안 되기 때문이다.
 *
 * @param assets     지금 인출 가능한 자산
 * @param monthlyNet 월 순인출액 (수입을 뺀 뒤). 0 이하면 바닥나지 않는다.
 * @param bump       careAt 년차부터 더해지는 월 증액 (요양비)
 * @param careAt     증액이 시작되는 년차. Infinity 면 없음.
 */
export function projectRunway(
  assets: number,
  monthlyNet: number,
  bump = 0,
  careAt = Infinity,
): { years: number | null; series: { year: number; balance: number }[]; careStartYear?: number } {
  const series: { year: number; balance: number }[] = [];
  let years: number | null = null;
  let careStartYear: number | undefined;
  if (!(assets > 0 && monthlyNet > 0)) return { years, series, careStartYear };

  let balance = assets;
  for (let y = 0; y <= 30; y++) {
    series.push({ year: y, balance: Math.max(0, Math.round(balance)) });
    if (balance <= 0) {
      if (years === null) years = y;
      break;
    }
    const monthly = y >= careAt ? monthlyNet + bump : monthlyNet;
    if (y >= careAt && careStartYear === undefined) careStartYear = y;
    balance -= monthly * 12;
  }
  if (years === null && series[series.length - 1].balance > 0) years = null;
  else if (years === null) years = series.length;
  return { years, series, careStartYear };
}

// lib/questions/invest.ts I03 의 라벨과 같은 문장을 쓴다. 설계서 제7조·의뢰서 부록에 그대로 실린다.
const CRASH_POLICY_LABEL: Record<string, string> = {
  do_nothing: "팔지 않고 그대로 보유한다",
  reduce: "위험자산 일부를 줄인다",
  all_safe: "전량 안전자산으로 바꾼다",
  consult: "지정한 사람과 상의한 뒤 정한다",
};

const HANDOVER_LABEL: Record<string, string> = {
  designee: "지정한 사람에게 맡긴다",
  institution: "금융기관 일임 운용으로 넘긴다",
  freeze: "새 매매를 멈추고 그대로 둔다",
  undecided: "아직 정하지 않았다",
};

const STANCE_LABEL: Record<string, string> = {
  preserve: "그대로 두고 팔지 않기",
  phased: "생활비가 필요한 만큼만 단계적으로 현금화",
  partial: "큰돈이 필요할 때만 일부 매도",
  delegate: "전문가에게 운용을 맡기기",
};

/**
 * 제7조 투자 원칙. invest 영역을 답하지 않았으면 null 을 돌려 조항 자체를 생략한다.
 * 있는 답만으로 만든다 — I01 만 답해도 금지 자산군 항은 선다.
 */
export function buildInvestPrinciples(p: Profile): InvestPrinciples | null {
  if (!(isUnified(p) ? hasChapter(p, "invest") : p.track === "future")) return null;

  const forbidden = multiOf(p, "I01").filter((v) => v !== "none");
  const cap = choiceOf(p, "I02");
  const crash = choiceOf(p, "I03");
  const handover = choiceOf(p, "I04");
  const handoverPerson = personOf(p, "I05");
  const stance = choiceOf(p, "B11");

  const answered = [
    !!p.answers["I01"],
    cap !== undefined,
    crash !== undefined,
    handover !== undefined,
  ].filter(Boolean).length;

  return {
    forbidden,
    forbiddenLabels: forbidden.map((k) => ASSET_CLASS_LABEL[k] ?? k),
    riskCapPct: cap !== undefined ? RISK_CAP_PCT[cap] : undefined,
    crashPolicyCode: crash,
    // "지정한 사람" 은 I05 의 그 사람이다. 이름이 있으면 문장에 넣어 누구와 상의하는지 보이게 한다.
    crashPolicy: crash
      ? crash === "consult" && handoverPerson
        ? `${personLabel(handoverPerson)}의 의견을 듣고 정한다`
        : CRASH_POLICY_LABEL[crash]
      : undefined,
    handover: handover
      ? handover === "designee" && handoverPerson
        ? `${personLabel(handoverPerson)}에게 맡긴다`
        : HANDOVER_LABEL[handover]
      : undefined,
    stance: stance ? STANCE_LABEL[stance] : undefined,
    status: answered === 4 ? "set" : answered > 0 || stance ? "partial" : "missing",
  };
}

const ITEM_LABEL: Record<string, string> = {
  utility: "전기·가스·수도",
  maintenance: "아파트 관리비",
  telecom: "통신비",
  insurance: "보험료",
  rent: "월세",
  loan: "대출 원리금·이자",
  tax: "세금·사회보험",
  subscription: "정기 구독",
  care: "요양·간병비",
  support: "가족 정기 지원",
  hospital: "병원 정기 치료비",
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: "매월 1회",
  biweekly: "2주 1회",
  weekly: "매주",
  ondemand: "청구 시",
};

// ExpenseDoc 제2조가 "잔액이 모자라면 {onFail}." 로 문장을 맺는다. 마침표 없는 해요체 절로 둔다.
const ONFAIL_LABEL: Record<string, string> = {
  auto_cover: "예비계좌에서 자동으로 채워요",
  notify_only: "알림을 보내고 기다려요",
  notify_guardian: "지정한 사람에게 알리고 기다려요",
  hold: "보류하고 승인을 요청해요",
};

const ALL_FRAUD_RULES: Omit<FraudRule, "active">[] = [
  {
    key: "new_payee",
    condition: "6개월 넘게 거래가 없던 계좌로 1회 한도를 넘는 이체",
    action: "24시간 보류하고 다시 확인",
    notify: "1차 관리자",
  },
  {
    key: "night",
    condition: "밤 11시~새벽 6시 사이 큰 금액 이체",
    action: "차단",
    notify: "1차 관리자와 감독인",
  },
  {
    key: "loan",
    condition: "대출 실행이나 카드 현금서비스",
    action: "차단",
    notify: "모두",
  },
  {
    key: "remote",
    condition: "원격제어 앱이 켜진 상태에서 하는 이체",
    action: "차단",
    notify: "모두",
  },
  {
    key: "overseas",
    condition: "해외 송금",
    action: "차단하고 창구에서 확인",
    notify: "1차 관리자",
  },
  {
    key: "deposit_break",
    condition: "정기예금·적금 중도해지",
    action: "차단 (신탁 금지행위와 같은 항목)",
    notify: "모두",
  },
  {
    key: "burst",
    condition: "월 생활비의 3배가 넘는 인출이나 이체",
    action: "보류하고 승인 요청",
    notify: "1차 관리자",
  },
];

export function buildExpenseDesign(p: Profile): ExpenseDesign {
  /* ── 입력 수집 (트랙별로 다른 질문에서 같은 값을 끌어온다) ── */
  const living = firstAmount(p, "A02", "B07", "D09") ?? 0;
  const bump = amountOf(p, "B08") ?? 0;
  const income = firstAmount(p, "B02", "C10", "A09") ?? 0;
  const perTxLimit = firstAmount(p, "A05", "B14");
  const soloLimit = amountOf(p, "B14");
  const cycle = choiceOf(p, "A03") ?? "monthly";
  const onFail = choiceOf(p, "A04") ?? "auto_cover";
  const bigSpend = choiceOf(p, "A08");
  const notifyPerson = firstPerson(p, "A07", "B12", "C07");
  const supervisor =
    personOf(p, "B06") ?? personOf(p, "D12") ?? personOf(p, "A11");

  const fixedKeys = firstMulti(p, "A01", "B10", "C09");
  const fixedAmounts =
    amountsOf(p, "A01").utility !== undefined || multiOf(p, "A01").length
      ? amountsOf(p, "A01")
      : multiOf(p, "B10").length
        ? amountsOf(p, "B10")
        : amountsOf(p, "C09");

  /* ── 자동이체 목록 ── */
  const transfers: TransferRow[] = fixedKeys.map((k) => ({
    item: ITEM_LABEL[k] ?? k,
    amount: fixedAmounts[k] ?? 0,
    cycle: "매월",
    from: "① 생활계좌",
    onFail: ONFAIL_LABEL[onFail] ?? ONFAIL_LABEL.auto_cover,
    notify: notifyPerson ? personLabel(notifyPerson) : "미지정",
  }));
  const transferTotal = transfers.reduce((a, b) => a + b.amount, 0);

  /* ── 3층 계좌 구조 ── */
  const medicalReserve =
    bigSpend === "reserve" || p.track !== "daily" ? living * 6 : living * 3;

  const accounts: AccountLayer[] = [
    {
      n: 1,
      name: "생활계좌",
      purpose: "매달 생활비가 들어오고 자동이체가 나가는 유일한 계좌",
      balancePolicy: living
        ? `잔액은 ${won(Math.round(living * 1.5))}까지 (생활비의 1.5배)`
        : "생활비를 정하면 잔액 상한을 계산해요",
      withdrawal: perTxLimit
        ? `한 번에 ${won(perTxLimit)}까지는 자유롭게 인출`
        : "1회 한도를 아직 정하지 않았어요",
      amount: living,
    },
    {
      n: 2,
      name: "의료예비계좌",
      purpose: "치료비·요양비처럼 예측하기 어려운 지출 전용",
      balancePolicy: living
        ? `목표 잔액 ${won(Math.round(medicalReserve))} (생활비 ${bigSpend === "reserve" || p.track !== "daily" ? 6 : 3}개월분)`
        : "생활비를 정하면 목표 잔액을 계산해요",
      withdrawal:
        bigSpend === "auto_within"
          ? "정해진 한도 안에서 자동으로 지급"
          : bigSpend === "notify_after"
            ? "지급한 뒤 바로 알림"
            : "지정한 사람이 승인하면 지급",
      amount: Math.round(medicalReserve),
    },
    {
      n: 3,
      name: "보전계좌",
      purpose: "원금을 지키는 계좌. 자동이체를 연결하지 않아요.",
      balancePolicy: "1층·2층을 채우고 남은 전액",
      withdrawal: soloLimit
        ? `꺼낼 때 두 사람이 함께 승인 (${won(soloLimit)} 넘으면 감독인 동의)`
        : "꺼낼 때 두 사람이 함께 승인",
    },
  ];

  /* ── 한도 정책 ── */
  const limits: LimitRow[] = [];
  if (perTxLimit !== undefined) {
    limits.push({
      label: "1회 이체 한도",
      value: won(perTxLimit),
      note: "넘으면 잠시 멈추고 확인해요",
    });
    limits.push({
      label: "1일 누적 한도",
      value: won(perTxLimit * 2),
      note: "1회 한도의 2배로 잡았어요",
    });
    limits.push({
      label: "월 누적 한도",
      value: won(Math.max(living * 1.5, perTxLimit * 5)),
      note: "생활비와 1회 한도를 함께 봐서 잡았어요",
    });
  } else {
    limits.push({
      label: "1회 이체 한도",
      value: "미설정",
      note: "정하지 않으면 피해 규모에 상한이 없어요",
    });
  }
  limits.push({
    label: "처음 보내는 계좌는 늦게",
    value: "24시간",
    note: "처음 보내는 계좌는 하루 지나서 보내요",
  });
  if (soloLimit !== undefined) {
    limits.push({
      label: "관리자가 혼자 정할 수 있는 금액",
      value: won(soloLimit),
      note: "넘으면 감독인과 함께 승인",
    });
  }

  /* ── 보호 규칙 ── */
  const chosen = new Set(multiOf(p, "A06"));
  const forbidden = new Set(multiOf(p, "B15"));
  const urgent = new Set(multiOf(p, "C04"));

  // 시작 화면 STEP 2 의 "이미 금융 문제나 피해가 발생했습니다"도 피해 이력으로 본다.
  // C04 는 보류된 caregiver 트랙에만 있어서, 그 신호가 여기 닿지 않으면
  // 트랙 A 에서는 긴급 상황이 설계서에 전혀 반영되지 않는다.
  const incident = urgent.has("fraud") || p.capacity === "incident";

  const fraudRules: FraudRule[] = ALL_FRAUD_RULES.map((r) => {
    let active = chosen.has(r.key);
    if (r.key === "deposit_break" && forbidden.has("break_deposit")) active = true;
    if (r.key === "loan" && forbidden.has("loan")) active = true;
    // burst 는 A06 의 명시적 옵션이 됐다. 트랙 A 는 사용자의 선택을 그대로 따른다.
    if (r.key === "burst" && p.track !== "daily") active = true;
    if (incident) active = true; // 이미 피해가 있었다면 전부 켠다
    return { ...r, active };
  });

  /* ── 상황 기준 규칙 (금융 보호 영역) ──
   * 금액 기준 규칙 아래에 상황 기준 규칙을 더한다. 영역을 답하지 않았으면 조항에 나타나지 않는다.
   * /api/fds 가 같은 policy 를 읽으므로, 여기 적힌 조치와 실제 판단이 어긋나지 않는다. */
  const policy = policyFromProfile(p);
  if (policy) {
    const guardian = notifyPerson ? personLabel(notifyPerson) : "보호자";
    const SIGNAL_TEXT: Record<string, string> = {
      time: "평소 이용하지 않는 시간대",
      pin: "비밀번호 오입력 반복",
      biometric: "터치 패턴 이탈",
      device: "처음 쓰는 기기",
    };
    const action =
      policy.rule === "block"
        ? "바로 차단"
        : policy.rule === "reauth"
          ? "보류하고 본인 재인증"
          : `보류하고 ${guardian} 승인`;
    // 2026-09-07: 조치 뒤에 붙던 "(보호자 승인 후 진행)" 같은 규칙 이름은 조치와 같은 말이라 뺐다.
    fraudRules.push(
      {
        key: "ctx_new_account",
        condition: `처음 보는 개인 계좌로 ${won(policy.newAccountThreshold)} 이상 이체`,
        action,
        notify: guardian,
        active: true,
      },
      {
        key: "ctx_signals",
        condition: policy.signals.length
          ? `처음 보는 계좌로 보낼 때 ${policy.signals.map((k) => SIGNAL_TEXT[k]).join("·")} 신호가 겹치면`
          : "상황 신호는 보지 않음 (금액·계좌만 봄)",
        action: policy.signals.length ? `위험도를 합쳐 ${action} (이유 첨부)` : "금액 기준만 적용",
        notify: policy.signals.length ? guardian : "본인",
        active: policy.signals.length > 0,
      },
      {
        key: "ctx_timeout",
        condition: `차단 뒤 ${josa(guardian, "이가")} 12시간 동안 응답이 없으면`,
        action:
          policy.onTimeout === "hold"
            ? `${TIMEOUT_LABEL[policy.onTimeout]}, 다시 알림`
            : TIMEOUT_LABEL[policy.onTimeout],
        notify: policy.onTimeout === "hold" ? guardian : "본인",
        active: true,
      },
    );
  }

  /* ── 승인·알림 ── */
  const approval = {
    channel: "문자와 앱 알림",
    first: notifyPerson ? personLabel(notifyPerson) : "미지정",
    escalateHours: 12,
    second: supervisor ? personLabel(supervisor) : "아직 정하지 않음",
    fallback:
      "2차도 응답이 없으면 그 거래는 자동으로 차단하고 기록을 남겨요.",
  };

  /* ── 현금흐름 ── */
  const cashflow = {
    fixed: transferTotal,
    living,
    income,
    net: living + transferTotal - income,
    medicalReserve: Math.round(medicalReserve),
  };

  /* ── 자산이 얼마나 버티는지 추정 ── */
  const assetMap = {
    ...amountsOf(p, "B01"),
    ...amountsOf(p, "C08"),
    ...amountsOf(p, "D02"),
  };
  // A10(지금 바로 쓸 수 있는 예금·현금)은 단일 amount 라 자산 맵에 합쳐지지 않는다.
  // 2026-09-07: 상속 영역의 D02 예금과 같은 돈이라 둘을 더하면 예금이 두 번 잡혔다
  // (신탁 제2조 6.9억 vs 제6조 7.8억). 예금은 둘 중 큰 값 하나로만 센다.
  const mappedDeposit = assetMap.deposit ?? 0;
  const liquid = amountOf(p, "A10") ?? 0;
  const assets =
    Object.values(assetMap).reduce((a, b) => a + b, 0) - mappedDeposit + Math.max(mappedDeposit, liquid);
  const monthlyNet = Math.max(0, cashflow.net);

  // 예시: 요양 증액(B08)이 있으면 5년 뒤 요양 진입을 가정한다.
  const { years, series, careStartYear } = projectRunway(
    assets,
    monthlyNet,
    bump,
    bump > 0 ? 5 : Infinity,
  );

  /* ── 플래그 ── */
  const flags: Flag[] = [];

  if (perTxLimit === undefined) {
    flags.push({
      level: "warn",
      title: "1회 이체 한도가 없어요",
      body: "한도가 없으면 보이스피싱 한 번에 계좌 잔액 전부가 빠져나갈 수 있어요. 이 항목 하나가 피해 규모의 상한을 정해요.",
      qid: p.track === "daily" ? "A05" : "B14",
    });
  }

  if (!notifyPerson) {
    flags.push({
      level: "warn",
      title: "이상한 일이 생겼을 때 알릴 사람이 없어요",
      body: "본인이 판단하기 어려운 순간이 바로 위험한 순간이에요. 본인 말고 최소 한 사람은 두는 것이 좋아요.",
      qid: p.track === "daily" ? "A07" : "B12",
    });
  }

  const activeCount = fraudRules.filter((r) => r.active).length;
  if (activeCount < 3) {
    flags.push({
      level: "info",
      title: `보호 규칙이 ${activeCount}개만 켜져 있어요`,
      body: "꺼진 규칙도 대부분 금융기관에 신청할 수 있어요. 필요한 것을 더 켜 둘 수 있어요.",
      qid: "A06",
    });
  }

  if (years !== null && years < 10 && assets > 0) {
    flags.push({
      level: "warn",
      title: `지금대로면 약 ${years}년 뒤에 자산이 바닥나요`,
      body: "수익률과 물가를 넣지 않은 단순 추정이에요. 월 지급액, 요양비 증액폭, 자산 범위를 다시 확인해 주세요.",
    });
  }

  if (incident) {
    flags.push({
      level: "critical",
      title: "이미 피해가 있었거나 의심되는 상황이에요",
      body:
        p.track === "daily"
          ? "지금 바로 할 수 있는 조치가 있어요. 금융감독원 보이스피싱 지급정지 신청(1332), 카드사·은행의 안심차단 서비스, 대출 실행 차단 등록을 먼저 확인해 주세요."
          : "후견 절차와 별개로 지금 바로 할 수 있는 조치가 있어요. 금융감독원 보이스피싱 지급정지 신청(1332), 카드사·은행의 안심차단 서비스, 대출 실행 차단 등록을 먼저 확인해 주세요.",
      // C04 로 되돌아가는 딥링크는 caregiver 트랙에서만 유효하다.
      // 시작 화면이 출처인 경우 돌아갈 질문이 없으므로 qid 를 붙이지 않는다.
      ...(urgent.has("fraud") ? { qid: "C04" } : {}),
    });
  }

  if (urgent.has("account")) {
    flags.push({
      level: "warn",
      title: "통장에 손댈 수 없는 상태예요",
      body: "금융기관에 따라 후견 심판 전이라도 병원비처럼 분명히 본인을 위한 지출에는 예외 절차를 두기도 해요. 거래 은행의 후견 전담 창구에 먼저 물어봐 주세요.",
      qid: "C04",
    });
  }

  /* ── 완성도 ── */
  const checks = [
    living > 0,
    transfers.length > 0,
    perTxLimit !== undefined,
    activeCount >= 3,
    !!notifyPerson,
    !!bigSpend || p.track !== "daily",
    assets > 0 || p.track === "daily",
  ];
  const done = checks.filter(Boolean).length;

  return {
    accounts,
    transfers,
    transferTotal,
    limits,
    fraudRules,
    approval,
    cashflow,
    sustainability: { assets, monthlyNet, years, series, careStartYear },
    invest: buildInvestPrinciples(p),
    flags,
    completeness: Math.round((done / checks.length) * 100),
    missing: checks.length - done,
  };
}
