import type {
  AccountLayer,
  ExpenseDesign,
  Flag,
  FraudRule,
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
import { personLabel, won } from "../format";

const ITEM_LABEL: Record<string, string> = {
  utility: "전기·가스·수도·관리비",
  maintenance: "아파트 관리비",
  telecom: "통신비",
  insurance: "보험료",
  rent: "월세·대출 이자",
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

const ONFAIL_LABEL: Record<string, string> = {
  auto_cover: "예비계좌에서 자동 충당",
  notify_only: "알림 발송 후 대기",
  notify_guardian: "지정인에게 통보 후 대기",
  hold: "보류 · 승인 요청",
};

const ALL_FRAUD_RULES: Omit<FraudRule, "active">[] = [
  {
    key: "new_payee",
    condition: "최근 6개월 내 거래 이력이 없는 계좌로 1회 한도 초과 이체",
    action: "24시간 보류 후 재확인",
    notify: "1차 관리자",
  },
  {
    key: "night",
    condition: "23시~06시 사이 고액 이체 시도",
    action: "차단",
    notify: "1차 관리자 + 감독인",
  },
  {
    key: "loan",
    condition: "대출 실행 또는 카드 현금서비스 시도",
    action: "차단",
    notify: "전원",
  },
  {
    key: "remote",
    condition: "원격제어 앱이 실행 중인 상태에서의 이체",
    action: "차단",
    notify: "전원",
  },
  {
    key: "overseas",
    condition: "해외 송금 시도",
    action: "차단 후 대면 확인",
    notify: "1차 관리자",
  },
  {
    key: "deposit_break",
    condition: "정기예금·적금 중도해지 시도",
    action: "차단 (금지행위 조항 연동)",
    notify: "전원",
  },
  {
    key: "burst",
    condition: "월 지급액의 3배를 초과하는 인출 또는 이체",
    action: "보류 후 승인 요청",
    notify: "1차 관리자",
  },
];

export function buildExpenseDesign(p: Profile): ExpenseDesign {
  /* ── 입력 수집 (트랙별로 다른 질문에서 같은 값을 끌어온다) ── */
  const living = firstAmount(p, "A02", "B07", "D09") ?? 0;
  const bump = amountOf(p, "B08") ?? 0;
  const income = firstAmount(p, "B02", "C10") ?? 0;
  const perTxLimit = firstAmount(p, "A05", "B14");
  const soloLimit = amountOf(p, "B14");
  const cycle = choiceOf(p, "A03") ?? "monthly";
  const onFail = choiceOf(p, "A04") ?? "auto_cover";
  const bigSpend = choiceOf(p, "A08");
  const notifyPerson = firstPerson(p, "A07", "B12", "C07");
  const supervisor = personOf(p, "B06") ?? personOf(p, "D12");

  const fixedKeys = firstMulti(p, "A01", "B10", "C09");
  const fixedAmounts =
    amountsOf(p, "A01").utility !== undefined || multiOf(p, "A01").length
      ? amountsOf(p, "A01")
      : multiOf(p, "B10").length
        ? amountsOf(p, "B10")
        : amountsOf(p, "C09");

  /* ── 자동이체 매트릭스 ── */
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
      purpose: "월 지급액이 유입되고 자동이체가 빠져나가는 유일한 계좌",
      balancePolicy: living
        ? `잔액 상한 ${won(Math.round(living * 1.5))} (월 지급액의 1.5배)`
        : "월 지급액 확정 후 산정",
      withdrawal: perTxLimit
        ? `1회 ${won(perTxLimit)} 이하 자유 인출`
        : "1회 한도 미설정",
      amount: living,
    },
    {
      n: 2,
      name: "의료예비계좌",
      purpose: "치료비·요양비 등 예측하기 어려운 지출 전용",
      balancePolicy: living
        ? `목표 잔액 ${won(Math.round(medicalReserve))} (월 지급액의 ${bigSpend === "reserve" || p.track !== "daily" ? 6 : 3}개월분)`
        : "목표 잔액 미산정",
      withdrawal:
        bigSpend === "auto_within"
          ? "정해진 한도 내 자동 집행"
          : bigSpend === "notify_after"
            ? "집행 후 즉시 통보"
            : "지정인 승인 후 집행",
      amount: Math.round(medicalReserve),
    },
    {
      n: 3,
      name: "보전계좌",
      purpose: "원금 보전. 자동이체를 연결하지 않는다.",
      balancePolicy: "① · ②를 채우고 남은 전액",
      withdrawal: soloLimit
        ? `출금 시 공동승인 필수 (${won(soloLimit)} 초과 건은 감독인 동의)`
        : "출금 시 공동승인 필수",
    },
  ];

  /* ── 한도 정책 ── */
  const limits: LimitRow[] = [];
  if (perTxLimit !== undefined) {
    limits.push({
      label: "1회 이체 한도",
      value: won(perTxLimit),
      note: "초과 시 보류 후 확인 절차",
    });
    limits.push({
      label: "1일 누적 한도",
      value: won(perTxLimit * 2),
      note: "1회 한도의 2배로 자동 산정",
    });
    limits.push({
      label: "월 누적 한도",
      value: won(Math.max(living * 1.5, perTxLimit * 5)),
      note: "월 지급액과 1회 한도를 함께 반영",
    });
  } else {
    limits.push({
      label: "1회 이체 한도",
      value: "미설정",
      note: "설정하지 않으면 피해 규모의 상한이 없습니다",
    });
  }
  limits.push({
    label: "신규 수취인 지연이체",
    value: "24시간",
    note: "처음 보내는 계좌는 하루 뒤 집행",
  });
  if (soloLimit !== undefined) {
    limits.push({
      label: "관리자 단독 결정 상한",
      value: won(soloLimit),
      note: "초과 시 감독인 공동승인",
    });
  }

  /* ── 이상거래 룰셋 ── */
  const chosen = new Set(multiOf(p, "A06"));
  const forbidden = new Set(multiOf(p, "B15"));
  const urgent = new Set(multiOf(p, "C04"));

  const fraudRules: FraudRule[] = ALL_FRAUD_RULES.map((r) => {
    let active = chosen.has(r.key);
    if (r.key === "deposit_break" && forbidden.has("break_deposit")) active = true;
    if (r.key === "loan" && forbidden.has("loan")) active = true;
    if (r.key === "burst" && (p.track !== "daily" || chosen.size > 0)) active = true;
    if (urgent.has("fraud")) active = true; // 이미 피해가 있었다면 전부 켠다
    return { ...r, active };
  });

  /* ── 승인·알림 ── */
  const approval = {
    channel: "문자 + 앱 푸시",
    first: notifyPerson ? personLabel(notifyPerson) : "미지정",
    escalateHours: 12,
    second: supervisor ? personLabel(supervisor) : "감독인 미지정",
    fallback:
      "2차 대상도 응답하지 않으면 해당 거래는 자동으로 차단하고 이력을 보관한다.",
  };

  /* ── 현금흐름 ── */
  const cashflow = {
    fixed: transferTotal,
    living,
    income,
    net: living + transferTotal - income,
    medicalReserve: Math.round(medicalReserve),
  };

  /* ── 지속가능성 추정 ── */
  const assetMap = {
    ...amountsOf(p, "B01"),
    ...amountsOf(p, "C08"),
    ...amountsOf(p, "D02"),
  };
  const assets = Object.values(assetMap).reduce((a, b) => a + b, 0);
  const monthlyNet = Math.max(0, cashflow.net);

  const series: { year: number; balance: number }[] = [];
  let years: number | null = null;
  let careStartYear: number | undefined;

  if (assets > 0 && monthlyNet > 0) {
    let balance = assets;
    const careAt = bump > 0 ? 5 : Infinity; // 데모: 5년 뒤 요양 진입 가정
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
  }

  /* ── 플래그 ── */
  const flags: Flag[] = [];

  if (perTxLimit === undefined) {
    flags.push({
      level: "warn",
      title: "1회 이체 한도가 없습니다",
      body: "한도가 없으면 보이스피싱 한 번에 계좌 잔액 전부가 빠져나갈 수 있습니다. 이 항목 하나가 피해 규모의 상한을 결정합니다.",
      qid: p.track === "daily" ? "A05" : "B14",
    });
  }

  if (!notifyPerson) {
    flags.push({
      level: "warn",
      title: "이상 상황을 알릴 사람이 없습니다",
      body: "본인이 판단하기 어려운 상황이 바로 위험한 상황입니다. 본인 외 최소 1명을 두시는 것을 권합니다.",
      qid: p.track === "daily" ? "A07" : "B12",
    });
  }

  const activeCount = fraudRules.filter((r) => r.active).length;
  if (activeCount < 3) {
    flags.push({
      level: "info",
      title: `이상거래 룰이 ${activeCount}개만 켜져 있습니다`,
      body: "회색으로 표시된 룰도 대부분 금융기관에서 신청할 수 있는 항목입니다. 필요한 것을 추가로 켜 두세요.",
      qid: "A06",
    });
  }

  if (years !== null && years < 10 && assets > 0) {
    flags.push({
      level: "warn",
      title: `현재 설정으로는 약 ${years}년 후 자금이 소진됩니다`,
      body: "수익률과 물가를 반영하지 않은 단순 추정입니다. 월 지급액, 요양비 증액폭, 또는 자산 범위를 다시 확인해 보세요.",
    });
  }

  if (urgent.has("fraud")) {
    flags.push({
      level: "critical",
      title: "이미 피해가 있었거나 의심되는 상황입니다",
      body: "후견 절차와 별개로 지금 바로 할 수 있는 조치가 있습니다. 금융감독원 보이스피싱 지급정지 신청(1332), 카드사·은행의 안심차단 서비스, 대출 실행 차단 등록을 먼저 확인하세요.",
      qid: "C04",
    });
  }

  if (urgent.has("account")) {
    flags.push({
      level: "warn",
      title: "통장 접근이 막혀 있습니다",
      body: "금융기관마다 후견 심판 전이라도 병원비 등 명백한 본인 이익 지출에 대한 예외 절차를 두고 있는 경우가 있습니다. 거래 금융기관의 후견 전담 창구에 먼저 문의해 보세요.",
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
    flags,
    completeness: Math.round((done / checks.length) * 100),
    missing: checks.length - done,
  };
}
