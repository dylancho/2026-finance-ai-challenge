import type {
  AnswerValue,
  Statute,
  Contrast,
  DesignSet,
  Gap,
  BiomarkerReading,
  Instrument,
  Ledger,
  MedicalProof,
  Profile,
  TriggerGate,
  Question,
} from "../types";
import { activeQuestions } from "../questions";
import { findGaps } from "../design";
import { trustContact } from "../ledger/analyze";
import { bandLabel } from "../ledger/biomarker";
import { personLabel, won } from "../format";
import { actsAlone } from "./instruments";
import { PETITIONERS, statutesForReferral } from "./statutes";

/**
 * 전문가 이양 서류 — 「신탁·후견 설계 의뢰서」.
 *
 * 설문 답변에서 조립한다. 조항 본문을 새로 쓰지 않는다.
 * buildTrustDesign() 이 이미 결정론적으로 낸 문장을 그대로 인용한다.
 * 여기서 다시 만들면 /plan 화면과 제출 서류가 어긋난다.
 */

/**
 * 발급 시점이 서류의 성격을 바꾼다.
 *
 * contract  본인의 의사능력이 있는 동안 — 계약으로 옮겨 달라는 의뢰
 * petition  이미 판단이 어려워진 뒤 — 법원과 후견인에게 전달할 사전 의사
 */
export type ReferralMode = "contract" | "petition";

export interface ReferralRow {
  label: string;
  amount?: number;
}

export interface ReferralTable {
  qid: string;
  prompt: string;
  rows: ReferralRow[];
  total: number;
}

export interface ReferralField {
  qid: string;
  label: string;
  value: string;
}

export interface ReferralDirective {
  no: string;
  title: string;
  body: string[];
  sources: string[];
}

export interface ReferralAnswer {
  qid: string;
  section: string;
  prompt: string;
  /** null 이면 미응답. 감추지 않고 그대로 싣는다. */
  answer: string | null;
}

/**
 * 이상 탐지 소명.
 *
 * 관측된 것만 싣는다. 진단하지 않는다 — 문서 어디에도 인지장애·치매 여부를 쓰지 않는다.
 * 그것은 의료기관의 몫이고, 여기 실리는 진단서는 의사가 발행한 것이다.
 */
export interface ReferralDetection {
  score: number;
  band: string;
  signals: { label: string; baseline: string; observed: string }[];
  proof: MedicalProof | null;
  proofFresh: boolean;
  fired: boolean;
  /** 발동을 막고 있는 것. AI 경보만으로는 발동하지 않는다 */
  blockedBy: string[];
}

export interface Referral {
  mode: ReferralMode;
  docNo: string;
  title: string;
  subtitle: string;
  recipients: string[];
  /** 이 절차를 실제로 밟을 사람. 본인이 못 하는 상태면 보호자로 바뀐다. */
  executor: "본인" | "보호자";
  executorNote?: string;
  overview: ReferralField[];
  assetTables: ReferralTable[];
  roles: ReferralField[];
  directives: ReferralDirective[];
  open: Gap[];
  procedure: { label: string; value: string }[];
  /** 금융이력 이상 탐지 기록. 없으면 이 절을 싣지 않는다. */
  detection?: ReferralDetection;
  /** 참조 법령. 명문 근거가 있는 것만 싣는다. */
  statutes: Statute[];
  answers: ReferralAnswer[];
  answered: number;
  total: number;
  contrasts: Contrast[];
  notice: string[];
}

/* ── 응답 서술 ─────────────────────────────────────── */

/** 설문 응답을 사람이 읽는 한 줄로 옮긴다. 미응답은 null. */
export function describeAnswer(q: Question, a?: AnswerValue): string | null {
  if (!a) return null;
  const labelOf = (v: string) =>
    q.options?.find((o) => o.value === v)?.label ?? v;

  switch (a.kind) {
    case "choice":
      return labelOf(a.value);
    case "multi": {
      if (!a.values.length) return null;
      return a.values
        .map((v) => {
          const amt = a.amounts?.[v];
          return amt ? `${labelOf(v)} ${won(amt)}` : labelOf(v);
        })
        .join(" / ");
    }
    case "amount":
      return won(a.value);
    case "person":
      return a.people.length
        ? a.people.map((p) => personLabel(p)).join(" / ")
        : null;
    case "allocation":
      return a.rows.length
        ? a.rows.map((r) => `${r.asset} → ${r.to}`).join(" / ")
        : null;
    case "open":
      return a.text.trim() ? `"${a.text.trim()}"` : null;
  }
}

/* ── 조립 ──────────────────────────────────────────── */

function docNumber(p: Profile, now: number): string {
  const d = new Date(now);
  const ymd =
    `${d.getFullYear()}` +
    `${d.getMonth() + 1}`.padStart(2, "0") +
    `${d.getDate()}`.padStart(2, "0");
  return `NEXT-${ymd}-${(p.track ?? "x").slice(0, 1).toUpperCase()}`;
}

const PURPOSE: Record<string, string> = {
  daily: "일상 지출·공과금의 안정적 관리 체계 수립",
  future: "미래 판단력 저하에 대비한 재산관리 및 신상보호 체계 수립",
  caregiver: "가족을 대신한 재산관리 및 신상보호 절차 개시",
  estate: "상속·증여를 포함한 재산 승계 및 관리 체계 수립",
};

const CAPACITY_LABEL: Record<string, string> = {
  full: "현재 스스로 금융 의사결정 가능 — 신탁·임의후견 모두 설정 가능한 시점",
  declining:
    "판단에 어려움이 보이기 시작한 단계 — 체결 시점의 의사능력이 다투어질 수 있음",
  diagnosed:
    "이미 진단을 받은 상태 — 신규 신탁·임의후견 설정이 어려우며 법정후견 경로로 검토",
  incident:
    "이미 금융 피해·사고가 발생한 상태 — 신규 계약 설정이 어려우며 즉시 보호 조치 필요",
};

const NOTICE_STATUTE =
  "인용한 조문은 확인 시점(2026-09-03) 기준이며, 개정 여부와 본 사안에의 적용 여부는 전문가의 확인이 필요합니다.";

const NOTICE_COMMON = [
  "본 문서는 의뢰인의 설문 응답을 정리한 초안이며, 그 자체로 법적 효력이 없습니다.",
  "조항의 유효성, 세무 효과, 제도 이용 가능 여부는 금융기관·변호사·법무사의 확인이 필요합니다.",
  "본 문서에 기재된 재산 금액은 의뢰인이 설문에서 직접 입력한 추정치이며 실사를 거치지 않았습니다.",
];

export function buildReferral(
  p: Profile,
  design: DesignSet,
  opts: {
    instruments?: Instrument[];
    contrasts?: Contrast[];
    ledger?: Ledger | null;
    reading?: BiomarkerReading | null;
    gate?: TriggerGate | null;
    now?: number;
  } = {},
): Referral {
  const now = opts.now ?? Date.now();

  /**
   * 청구 모드로 넘어가는 조건은 둘이다.
   *   ① 설문에서 이미 진단을 받았다고 답한 경우
   *   ② 2조건 게이트가 발동한 경우 (AI 경보 + 최근 1개월 내 진단서·장기요양등급)
   *
   * reading.band 를 직접 보지 않는다. 그러면 회의에서 확정한 2조건 게이트를 우회하게
   * 되고, AI 경보만으로 사람의 법적 지위를 바꾸는 셈이 된다.
   */
  const delegated = !actsAlone(p) || opts.gate?.fired === true;
  const mode: ReferralMode = delegated ? "petition" : "contract";
  const qs = activeQuestions(p);

  /* 부록 — 응답 전문. 미응답도 싣는다. */
  const answers: ReferralAnswer[] = qs.map((q) => ({
    qid: q.id,
    section: q.section,
    prompt: q.prompt,
    answer: describeAnswer(q, p.answers[q.id]),
  }));
  const answered = answers.filter((a) => a.answer !== null).length;

  /* §2 — 금액이 붙은 복수응답을 표로. 트랙별로 문항이 달라 id 를 박지 않는다. */
  const assetTables: ReferralTable[] = [];
  for (const q of qs) {
    const a = p.answers[q.id];
    if (!a || a.kind !== "multi" || !a.amounts) continue;
    const rows = a.values.map((v) => ({
      label: q.options?.find((o) => o.value === v)?.label ?? v,
      amount: a.amounts?.[v],
    }));
    if (!rows.length) continue;
    assetTables.push({
      qid: q.id,
      prompt: q.prompt,
      rows,
      total: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
    });
  }

  /* §2 — 사람과 배분 */
  const roles: ReferralField[] = [];
  for (const q of qs) {
    const a = p.answers[q.id];
    if (!a || (a.kind !== "person" && a.kind !== "allocation")) continue;
    const value = describeAnswer(q, a);
    if (value) roles.push({ qid: q.id, label: q.prompt, value });
  }

  /* §3 — 확정된 지시. 조항은 설계 엔진의 문장을 그대로 인용한다. */
  const directives: ReferralDirective[] = (design.trust?.clauses ?? [])
    .filter((c) => c.status !== "missing")
    .map((c) => ({
      no: c.no,
      title: c.title,
      body: c.body,
      sources: c.sources,
    }));

  /* §5 — 절차·요건·비용 */
  const procedure: { label: string; value: string }[] = [
    ...(design.trust?.cost ?? []),
    ...(design.guardianship?.roadmap ?? []).map((r) => ({
      label: r.title,
      value: [r.period, r.cost].filter(Boolean).join(" · "),
    })),
  ];

  const overview: ReferralField[] = [
    { qid: "", label: "의뢰 목적", value: PURPOSE[p.track ?? ""] ?? "재산관리 체계 수립" },
    {
      qid: "",
      label: "설계 대상",
      value: p.subject === "family" ? (p.subjectRelation ?? "가족") : "본인",
    },
    {
      qid: "",
      label: "의사능력",
      value: CAPACITY_LABEL[p.capacity ?? ""] ?? "미확인",
    },
    {
      qid: "",
      label: "판정 유형",
      value: [
        design.trust?.available ? design.trust.type.name : null,
        design.guardianship?.verdict.code !== "none"
          ? design.guardianship?.verdict.name
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "해당 없음",
    },
  ];

  const petition = mode === "petition";

  const reading = opts.reading ?? null;
  const gate = opts.gate ?? null;
  const detection: ReferralDetection | undefined = reading
    ? {
        score: reading.score,
        band: bandLabel(reading.band),
        // 베이스라인에서 실제로 벗어난 신호만 싣는다. 전부 나열하면 소명이 아니라 목록이 된다.
        signals: reading.signals
          .filter((sg) => sg.deviation > 0)
          .map((sg) => ({
            label: sg.label,
            baseline: sg.baseline,
            observed: sg.observed,
          })),
        proof: gate?.proof ?? null,
        proofFresh: gate?.proofFresh ?? false,
        fired: gate?.fired ?? false,
        blockedBy: gate?.blockedBy ?? [],
      }
    : undefined;

  /* 전달처는 이력에서 정한다. 설문에서 묻지 않는다. */
  const contact = trustContact(opts.ledger ?? null);
  if (contact) {
    overview.push({
      qid: "",
      label: "주거래 금융기관",
      value: contact.redirected
        ? `${contact.primary.name} (거래 비중 ${Math.round(contact.primary.share * 100)}%) — 신탁 창구를 두지 않는 기관이므로 ${contact.recommended.name} 신탁부서를 제안합니다`
        : `${contact.primary.name} (거래 비중 ${Math.round(contact.primary.share * 100)}%)`,
    });
    overview.push({
      qid: "",
      label: "판단 근거",
      value: "고정비 자동이체와 입출금이 거친 기관의 비중. 설문 응답이 아닌 금융이력 관찰값입니다.",
    });
  }

  return {
    mode,
    docNo: docNumber(p, now),
    title: petition ? "후견 청구 참고자료" : "신탁·후견 설계 의뢰서",
    subtitle: petition
      ? "본인이 판단할 수 있을 때 작성한 사전 의사 정리"
      : "본인 작성 설문에 기초한 사전 의사 정리 및 조항 초안",
    recipients: petition
      ? ["가정법원", "후견인 후보자", "법무법인"]
      : [
          contact
            ? `${contact.recommended.name} WM·신탁부서`
            : "은행 WM·신탁부서",
          "법무법인",
        ],
    executor: delegated ? "보호자" : "본인",
    executorNote: !delegated
      ? undefined
      : `본인이 직접 절차를 밟기 어려운 상태입니다. 후견개시 심판은 ${PETITIONERS}가 청구할 수 있으며(민법 제9조·제12조·제14조의2), 본인 단독으로 한 행위는 나중에 효력이 다투어질 수 있습니다.`,
    overview,
    assetTables,
    roles,
    directives,
    open: findGaps(p, design),
    procedure,
    detection,
    statutes: statutesForReferral(
      design,
      (opts.instruments ?? []).map((i) => i.kind),
    ),
    answers,
    answered,
    total: answers.length,
    contrasts: opts.contrasts ?? [],
    notice: petition
      ? [
          "본 문서는 후견개시 심판 청구 시 본인의 사전 의사를 참고자료로 전달하기 위한 것이며, 그 자체로 법적 효력이 없습니다.",
          "후견인의 권한은 가정법원의 심판으로 정해지며, 본 문서가 그 범위를 구속하지 않습니다.",
          ...NOTICE_COMMON.slice(1),
          NOTICE_STATUTE,
        ]
      : [
          NOTICE_COMMON[0],
          "효력은 전문가의 검토를 거쳐 신탁계약·후견계약 등 정식 절차가 체결됨으로써 비로소 발생합니다.",
          ...NOTICE_COMMON.slice(1),
          NOTICE_STATUTE,
        ],
  };
}
