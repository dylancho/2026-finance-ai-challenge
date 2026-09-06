import type {
  BiomarkerReading,
  Chapter as AnswerChapter,
  DesignSet,
  DocKey,
  Instrument,
  LedgerInsight,
  Profile,
  TriggerGate,
} from "../../lib/types";
import { canExecute } from "../../lib/authority";
import { TRIGGER_LABEL } from "../../lib/design";
import { won, personLabel } from "../../lib/format";
import {
  amountOf,
  choiceOf,
  firstAmount,
  multiOf,
  personOf,
} from "../../lib/profile";
import { bandLabel } from "../../lib/ledger";

/*
 * 미리보기(/simulation)의 이야기 데이터 (2026-09-07).
 *
 * 화면은 "설계서대로 하면 앞으로 내 돈이 어떻게 움직이나" 를 세 시기로 나눠 말한다.
 * 여기서는 설계서(design)·체결 상태(instruments)·트리거(gate)·이력(reading)을 읽어
 * 시기별 "일어나는 일" 행을 만든다. 판정은 전부 lib 쪽 엔진이 이미 끝냈고, 이 파일은
 * 그 결과를 사람이 읽는 문장과 태그로 옮기기만 한다. 새 판정 규칙을 여기 넣지 않는다.
 */

export type StoryId = "now" | "signal" | "after";

/** 누가 결정하나. 엔진의 권한 3단계(ApprovalTier)를 사람 말로 옮긴 것 + 본인 결정 */
export type Who = "auto" | "self" | "guardian" | "expert";

export const WHO_LABEL: Record<Who, string> = {
  auto: "자동",
  self: "본인 결정",
  guardian: "보호자 동의",
  expert: "후견인·전문가 승인",
};

export interface StoryClause {
  doc: DocKey;
  ref: string;
}

export interface StoryRow {
  label: string;
  sub?: string;
  who?: Who;
  clause?: StoryClause;
  /** 조항 대신 다른 화면으로 보내는 행 (예: 의뢰서) */
  href?: string;
  hrefLabel?: string;
  /** 체결되지 않은 서류 때문에 실행되지 않는 행. canExecute() 결과다. */
  blocked?: { text: string; reason: string };
  /** 지급개시 조건에 묶인 행 — 진단서가 확인되기 전에는 열리지 않는다 */
  gated?: boolean;
  /** 행 자체의 상태 (지급개시 조건 행처럼 누가 결정하느냐보다 상태가 중요한 행) */
  state?: { tone: "ok" | "warn" | "off"; text: string };
}

export interface SignalSummary {
  score: number;
  bandLabel: string;
  band: BiomarkerReading["band"];
  meaning: string;
  signals: { label: string; baseline: string; observed: string }[];
}

export interface Story {
  id: StoryId;
  n: 1 | 2 | 3;
  /** 목차·세그먼트에 쓰는 짧은 이름 */
  short: string;
  /** 카드 라벨 */
  label: string;
  headline: string;
  lede: string;
  rows: StoryRow[];
  /** 2장에만 있다. 이력이 없으면 null */
  signal?: SignalSummary | null;
  /** 이 시기를 그릴 답변이 없을 때 — 행 대신 안내 카드 하나를 보인다 */
  missing?: { chapter: AnswerChapter; label: string; note: string };
}

export interface StoryInput {
  profile: Profile;
  design: DesignSet;
  instruments: Instrument[];
  gate: TriggerGate | null;
  reading: BiomarkerReading | null;
  insight: LedgerInsight | null;
  hasLedger: boolean;
}

const PAYOUT: Record<string, string> = {
  monthly: "매달 1일",
  biweekly: "2주마다",
  weekly: "매주",
  ondemand: "청구할 때",
};

const MED: Record<string, string> = {
  unlimited: "제한 없이 실비로 지급하고, 30일 안에 증빙을 감독인에게 냅니다",
  total_cap: "누적 한도 안에서 지급하고, 넘는 부분은 감독인 동의를 받습니다",
  yearly_cap: "연간 한도 안에서 지급합니다",
  family: "관리자와 감독인이 협의해 지급 여부를 정합니다",
};

/** 체결 안 된 서류에 걸린 행에 태그를 붙인다. 걸리지 않으면 그대로. */
function withGate(row: StoryRow, instruments: Instrument[]): StoryRow {
  if (!row.clause) return row;
  const check = canExecute(row.clause.doc, row.clause.ref, instruments);
  if (check.ok) return row;
  const stage = check.instrument?.stage;
  const short = check.instrument ? instrumentShort(check.instrument.kind) : "관련 서류";
  return {
    ...row,
    blocked: {
      text: stage === "unavailable" ? "새로 설정하기 어려움" : "체결 전 · 실행되지 않음",
      // 행마다 긴 사유를 반복하지 않는다. 무엇을 체결하면 움직이는지 한 줄이면 된다.
      reason:
        stage === "unavailable"
          ? `${short}을(를) 지금 새로 설정하기는 어렵습니다`
          : `${short} 뒤에 움직입니다`,
    },
  };
}

/** 서류의 짧은 이름 (행의 사유 문장용) */
function instrumentShort(kind: Instrument["kind"]): string {
  switch (kind) {
    case "trust":
      return "신탁계약 체결";
    case "voluntary_guardianship":
      return "임의후견계약 공증";
    case "legal_guardianship":
      return "법정후견 심판";
    default:
      return "자동이체·대리인 등록";
  }
}

/* ── 1장 · 지금 (건강할 때) ────────────────────────────── */

function buildNow(i: StoryInput): Story {
  const { profile: p, design, insight } = i;
  const ex = design.expense;
  const living = ex.cashflow.living;
  const payout = PAYOUT[choiceOf(p, "A03") ?? "monthly"] ?? "매달";
  const perTx = firstAmount(p, "A05", "B14");
  const activeRules = ex.fraudRules.filter((r) => r.active).length;
  const first = ex.approval.first;

  const rows: StoryRow[] = [];

  rows.push({
    label:
      living > 0
        ? `생활비 ${won(living)}이 생활계좌로 들어옵니다`
        : "생활비 금액이 아직 정해지지 않았습니다",
    sub: living > 0 ? `${payout} · 자동이체는 이 계좌에서만 나갑니다` : "지출설계서 제1조에서 정합니다",
    who: "auto",
    clause: { doc: "expense", ref: "제1조" },
  });

  rows.push(
    ex.transfers.length
      ? {
          label: `공과금·보험료 ${ex.transfers.length}건, 월 ${won(ex.transferTotal)}이 자동으로 나갑니다`,
          sub: ex.transfers.map((t) => t.item).join(" · "),
          who: "auto",
          clause: { doc: "expense", ref: "제2조" },
        }
      : {
          label: "등록된 자동이체가 없습니다",
          sub: "그 시점에 누군가 손으로 내야 합니다",
          who: "self",
          clause: { doc: "expense", ref: "제2조" },
        },
  );

  rows.push(
    perTx !== undefined
      ? {
          label: `한 번에 ${won(perTx)}까지는 평소처럼 보냅니다`,
          sub: "넘는 금액은 바로 나가지 않고 보류한 뒤 확인합니다",
          who: "self",
          clause: { doc: "expense", ref: "제3조" },
        }
      : {
          label: "1회 이체 한도가 아직 없습니다",
          sub: "한도가 없으면 한 번의 실수로 잔액 전부가 빠져나갈 수 있습니다",
          who: "self",
          clause: { doc: "expense", ref: "제3조" },
        },
  );

  rows.push({
    label:
      activeRules > 0
        ? "처음 보는 계좌·새벽 거래 같은 이상거래는 보류합니다"
        : "이상거래 규칙이 아직 켜져 있지 않습니다",
    sub:
      activeRules > 0
        ? `규칙 ${activeRules}개 · ${first !== "미지정" ? `${first}에게 바로 알립니다` : "알릴 사람은 아직 없습니다"}`
        : "지출설계서 제4조에서 켤 수 있습니다",
    who: "auto",
    clause: { doc: "expense", ref: "제4조" },
  });

  const subs = insight?.behavior.unusedSubscriptions ?? [];
  if (subs.length) {
    const monthly = subs.reduce((a, s) => a + s.amount, 0);
    rows.push({
      label: `안 쓰는 구독 ${subs.length}건 정리를 제안합니다`,
      sub: `월 ${won(monthly)} · 이력에서 찾은 항목이며, 정리는 본인이 결정합니다`,
      who: "self",
    });
  }
  if (insight?.decision) {
    rows.push({
      label: "투자 비중 점검을 1년에 한두 번 제안합니다",
      sub: "제안만 하고, 옮길지는 본인이 정합니다",
      who: "self",
      clause: design.expense.invest ? { doc: "expense", ref: "제7조" } : undefined,
    });
  }

  const gated = rows.map((r) => withGate(r, i.instruments));
  const hasBlocked = gated.some((r) => r.blocked);

  return {
    id: "now",
    n: 1,
    short: "지금",
    label: "1 · 지금, 건강할 때",
    headline:
      living > 0
        ? `${payout} 생활비 ${won(living)}이 나가고, 나머지는 앱이 조용히 지켜봅니다`
        : "생활비가 정해지면, 매달 무엇이 자동으로 움직이는지 여기 보입니다",
    lede: `지금 쓰는 방식 그대로입니다. 자동이체·한도·이상거래 규칙만 뒤에서 돌아가고, 결정은 전부 본인이 합니다.${
      hasBlocked ? " 아래 회색 표시가 붙은 항목은 서류를 체결하기 전까지 움직이지 않습니다." : ""
    }`,
    rows: gated,
  };
}

/* ── 2장 · 신호가 보일 때 ─────────────────────────────── */

function signalSummary(reading: BiomarkerReading | null): SignalSummary | null {
  if (!reading) return null;
  const meaning =
    reading.band === "alert"
      ? "평소와 뚜렷하게 달라진 지점이 보이는 구간입니다. 진단은 아니며, 진단서가 있어야 다음 시기로 넘어갑니다."
      : reading.band === "watch"
        ? "평소와 달라지기 시작한 지점이 보입니다. 아직은 알림만 보내는 단계입니다."
        : "평소 패턴과 크게 다른 점이 없습니다. 이 시기는 아직 오지 않았습니다.";
  return {
    score: reading.score,
    band: reading.band,
    bandLabel: bandLabel(reading.band),
    meaning,
    signals: reading.signals.slice(0, 3).map((s) => ({
      label: s.label,
      baseline: s.baseline,
      observed: s.observed,
    })),
  };
}

function buildSignal(i: StoryInput): Story {
  const { design, instruments, reading } = i;
  const ap = design.expense.approval;
  const first = ap.first !== "미지정" ? ap.first : null;
  const second = ap.second !== "미지정" ? ap.second : null;
  // 신탁·후견처럼 본인의 의사표시가 필요한 서류만 본다. 은행 등록은 나중에도 보호자가 할 수 있다.
  const notEffective = instruments.some(
    (x) => x.kind !== "bank_mandate" && x.stage !== "effective" && x.stage !== "unavailable",
  );

  const rows: StoryRow[] = [];

  rows.push({
    label: first ? `${first}에게 먼저 알립니다` : "알림을 받을 사람이 아직 없습니다",
    sub: first
      ? `${ap.channel}로 · ${ap.escalateHours}시간 안에 응답이 없으면 ${second ?? "다음 사람"}에게 넘어갑니다`
      : "지출설계서 제5조에서 정합니다",
    who: "auto",
    clause: { doc: "expense", ref: "제5조" },
  });

  rows.push({
    label: "한도를 넘거나 처음 보는 계좌로 보내는 이체는 보호자가 확인한 뒤 나갑니다",
    sub: "생활비와 공과금 자동이체는 그대로 나갑니다",
    who: "guardian",
    clause: { doc: "expense", ref: "제5조" },
  });

  if (design.trust) {
    rows.push({
      label: "투자자산을 안전한 쪽으로 옮기는 안을 만들어 함께 확인합니다",
      sub: "옮길지는 보호자와 같이 정합니다",
      who: "guardian",
      clause: { doc: "trust", ref: "제7조" },
    });
    rows.push({
      label: "한도를 넘는 병원비는 보호자 동의로 결제합니다",
      who: "guardian",
      clause: { doc: "trust", ref: "제6조" },
    });
  }

  if (notEffective) {
    rows.push({
      label: "신탁·후견 서류를 아직 체결하지 않았다면, 지금이 전문가에게 넘길 시기입니다",
      sub: "판단이 더 흐려진 뒤에는 본인이 새 계약을 맺기 어렵습니다",
      who: "expert",
      href: "/referral",
      hrefLabel: "의뢰서 만들기",
    });
  }

  return {
    id: "signal",
    n: 2,
    short: "신호가 보일 때",
    label: "2 · 신호가 보일 때",
    headline: first
      ? `판단이 흐려지기 시작하면, 앱이 먼저 알아채고 ${first}에게 알립니다`
      : "판단이 흐려지기 시작하면, 앱이 먼저 알아채고 알립니다",
    lede: "이 시기에는 아직 본인이 결정할 수 있습니다. 앱은 대신 결정하지 않고, 지정해 둔 사람이 함께 확인하도록 승인 단계만 늘립니다.",
    rows: rows.map((r) => withGate(r, instruments)),
    signal: signalSummary(reading),
    missing: i.hasLedger
      ? undefined
      : {
          chapter: "core",
          label: "금융 이력",
          note: "이력을 연동하면 평소 패턴과 달라진 지점을 여기서 읽습니다.",
        },
  };
}

/* ── 3장 · 진단서가 나온 뒤 ───────────────────────────── */

function buildAfter(i: StoryInput): Story {
  const { profile: p, design, instruments, gate } = i;
  const base = {
    id: "after" as const,
    n: 3 as const,
    short: "진단서가 나온 뒤",
    label: "3 · 진단서가 나온 뒤",
  };

  if (!design.trust) {
    return {
      ...base,
      headline: "진단서가 나온 뒤의 일은 아직 그릴 수 없습니다",
      lede: "그때 생활비를 어떻게 이어갈지, 큰 결정은 누가 승인할지는 의료·요양 기준과 상속 의사 답변에서 나옵니다. 답하지 않은 부분은 비워 두고, 지어내지 않습니다.",
      rows: [],
      missing: {
        chapter: "medical",
        label: "의료·요양 기준",
        note: "2분 정도면 답할 수 있습니다. 답하면 이 카드가 실제 조항으로 채워집니다.",
      },
    };
  }

  const fired = gate?.fired ?? false;
  const proofFresh = gate?.proofFresh ?? false;
  const trig = choiceOf(p, "B05");
  const trigLabel = trig ? TRIGGER_LABEL[trig] : undefined;
  const confirmer = personOf(p, "B06");
  const monthly = firstAmount(p, "B07", "A02", "D09");
  const bump = amountOf(p, "B08");
  const med = choiceOf(p, "B09");
  const forbid = multiOf(p, "B15");
  const facility = multiOf(p, "B18").includes("facility") || multiOf(p, "C13").includes("facility");
  const sup = choiceOf(p, "B16");
  const s = design.expense.sustainability;
  const alloc = p.answers["D03"];
  const ex = design.expense;

  const rows: StoryRow[] = [];

  rows.push({
    label: trigLabel ? `지급 개시 조건 · ${trigLabel}` : "지급 개시 조건이 아직 정해지지 않았습니다",
    sub: fired
      ? "조건이 확인되어 신탁이 지급을 시작합니다"
      : proofFresh
        ? "진단서는 있지만 이력에서 평소와 다른 신호가 없어 아직 열리지 않습니다"
        : "진단서를 첨부하면 이 조건이 확인됩니다",
    clause: { doc: "trust", ref: "제4조" },
    state: fired
      ? { tone: "ok", text: "조건 충족" }
      : proofFresh
        ? { tone: "off", text: "신호 없음" }
        : { tone: "warn", text: "진단서 첨부 전" },
  });

  if (confirmer) {
    rows.push({
      label: `${personLabel(confirmer)}이(가) 조건이 채워진 것을 확인해 수탁자에게 알립니다`,
      who: "guardian",
      clause: { doc: "trust", ref: "제4조 ②" },
    });
  }

  if (monthly) {
    rows.push({
      label: `생활비 ${won(monthly)}은 계속 매달 나갑니다`,
      sub: "새로 결정할 사람이 필요 없습니다",
      who: "auto",
      clause: { doc: "trust", ref: "제5조" },
      gated: true,
    });
  }

  if (ex.transfers.length) {
    rows.push({
      label: "병원비·요양비·공과금은 자동으로 나뉘어 결제됩니다",
      sub: `자동이체 ${ex.transfers.length}건 · 월 ${won(ex.transferTotal)}`,
      who: "auto",
      clause: { doc: "expense", ref: "제2조" },
    });
  }

  if (monthly && bump !== undefined && bump > 0) {
    rows.push({
      label: `요양시설에 들어가면 월 지급액이 ${won(monthly)} → ${won(monthly + bump)}으로 올라갑니다`,
      sub: `+${won(bump)} · 가족이 협의할 일이 없습니다`,
      who: "auto",
      clause: { doc: "trust", ref: "제5조 ②" },
      gated: true,
    });
  }

  if (med && MED[med]) {
    rows.push({
      label: `큰 의료비는 ${MED[med]}`,
      who: "guardian",
      clause: { doc: "trust", ref: "제6조" },
      gated: true,
    });
  }

  if (facility) {
    rows.push({
      label: "요양시설 입소 계약은 후견인이 대신 체결합니다",
      who: "expert",
      clause: { doc: "guardianship", ref: "제3조" },
    });
  }

  rows.push(
    forbid.includes("sell_estate")
      ? {
          label: "부동산을 팔거나 담보로 잡는 요청은 거절됩니다",
          sub: "누가 요청해도 수탁자가 막고 감독인에게 알립니다",
          who: "expert",
          clause: { doc: "trust", ref: "제8조" },
        }
      : {
          label: "부동산 매각·담보 대출은 후견인·전문가 승인이 있어야 합니다",
          who: "expert",
          clause: { doc: "trust", ref: "제8조" },
        },
  );

  rows.push({
    label: "큰돈 인출, 고액 증여, 핵심 금융계약 해지도 후견인·전문가 승인이 있어야 합니다",
    sub: "되돌리기 어려운 결정은 앱도 보호자도 혼자 처리하지 않습니다",
    who: "expert",
    clause: { doc: "guardianship", ref: "제2조" },
  });

  if (sup && sup !== "none") {
    rows.push({
      label: "반기마다 감독인이 지급 내역과 남은 재산을 확인합니다",
      who: "expert",
      clause: { doc: "trust", ref: "제9조" },
    });
  }

  if (alloc?.kind === "allocation" && alloc.rows.length) {
    rows.push({
      label: "남은 재산은 정해 둔 대로 배분됩니다",
      sub: alloc.rows.map((r) => `${r.asset} → ${r.to}`).join(" · "),
      who: "expert",
      clause: { doc: "trust", ref: "제11조" },
    });
  }

  if (s.series.length > 0 && s.assets > 0) {
    rows.push({
      label:
        s.years === null
          ? "이대로면 30년 뒤에도 자산이 남는 것으로 추정됩니다"
          : `이대로면 자산은 약 ${s.years}년 뒤 소진될 것으로 추정됩니다`,
      sub: "수익률·물가·세금은 반영하지 않은 단순 계산입니다",
      clause: { doc: "expense", ref: "제6조" },
    });
  }

  const gated = rows.map((r) => withGate(r, instruments));

  return {
    ...base,
    headline: fired
      ? "진단서가 확인되어 신탁이 지급을 시작하고, 큰 결정은 승인 절차로 넘어갑니다"
      : proofFresh
        ? "진단서는 있지만, 이력에서 신호가 없어 아직 지급이 열리지 않습니다"
        : "진단서를 첨부하기 전에는 신탁 지급이 시작되지 않습니다",
    lede: trigLabel
      ? `지급 개시 조건은 「${trigLabel}」입니다. 조건이 채워지면 생활비는 계속 나가고, 부동산·큰돈처럼 되돌리기 어려운 결정만 승인 절차를 거칩니다.`
      : "지급 개시 조건을 정하면 여기에 그 조건이 표시됩니다. 조건이 채워지면 생활비는 계속 나가고, 되돌리기 어려운 결정만 승인 절차를 거칩니다.",
    rows: gated,
  };
}

/* ── 진입점 ──────────────────────────────────────────── */

export function buildStory(i: StoryInput): Story[] {
  return [buildNow(i), buildSignal(i), buildAfter(i)];
}

/** 체결 전이라 움직이지 않는 행의 수 (서류 카드의 큰 문장에 쓴다) */
export function countBlocked(stories: Story[]): number {
  return stories.reduce((a, s) => a + s.rows.filter((r) => r.blocked).length, 0);
}

/* ── 서류의 쉬운 이름과 "체결 전" 결과 ───────────────── */

export function instrumentPlain(inst: Instrument): { name: string; consequence: string } {
  switch (inst.kind) {
    case "trust":
      return {
        name: `신탁계약 체결 (${inst.name})`,
        consequence: "체결 전에는 생활비 지급·증액·의료비처럼 신탁에서 나가는 돈이 움직이지 않습니다.",
      };
    case "voluntary_guardianship":
      return {
        name: "임의후견계약 공증",
        consequence: "공증하고 법원이 감독인을 정하기 전에는 요양시설 계약처럼 대신 결정하는 일이 안 됩니다.",
      };
    case "legal_guardianship":
      return {
        name: "법정후견 심판",
        consequence: "법원 심판이 확정되기 전에는 대신 결정하는 일이 안 됩니다.",
      };
    default:
      return {
        name: "자동이체·대리인 등록",
        consequence: "은행에 등록하기 전에는 공과금 자동이체를 대신 처리하지 못합니다.",
      };
  }
}
