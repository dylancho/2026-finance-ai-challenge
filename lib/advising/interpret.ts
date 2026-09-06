import type { Chapter, LedgerInsight, Profile } from "../types";
import type {
  EventChatMessage,
  EventContext,
  EventInterpretation,
  EventKind,
  LifeEvent,
} from "./types";
import { DEFAULT_DROP_PCT } from "./evaluate";
import { amountOf, choiceOf, multiOf } from "../profile";
import { buildExpenseDesign } from "../design/expense";
import { RISK_CAP_PCT } from "../questions/invest";
import { won } from "../format";

/**
 * 자유 입력 → 이벤트 해석 (2026-09-06).
 *
 * 두 층이다.
 * 1. interpretEvent(): /api/ai/event 를 부른다. Claude 가 문장을 세 이벤트 중 하나로
 *    대응시키고 숫자를 뽑는다. 되묻기(clarify)와 범위 밖(other)도 여기서 갈린다.
 * 2. interpretByRule(): 키워드·숫자 휴리스틱. 키가 없거나(204) 실패·타임아웃일 때
 *    같은 모양을 내서 데모가 멈추지 않게 한다. 정교하지 않아도 된다 — 칩 3종 문장과
 *    "집 팔아서 2억 5천" 수준의 문장을 읽으면 충분하다.
 *
 * 어느 층이든 숫자는 사용자 문장에서 뽑는다. 계산은 lib/advising/evaluate 가 한다.
 */

const TIMEOUT_MS = 40_000;

/* ── 숫자 파싱 ─────────────────────────────────────── */

const 만 = 10_000;
const 억 = 100_000_000;

/**
 * 한국어 금액 → 원. "3억", "2억 5천", "2억 5,000만원", "5,000만원", "3000만원", "2.5억",
 * "1억 2천 5백만원", "300만원", "50000000원" 을 읽는다. 못 읽으면 undefined.
 *
 * 억 뒤에 단위 없이 붙는 "5천" 은 5천만원으로 본다 ("2억 5천"). 억 없이 홀로 "5천" 만
 * 있으면 목돈 문맥에서 5천만원이 자연스러우므로 역시 천만 단위로 읽되, "5천원" 처럼
 * 원이 바로 붙으면 그대로 5,000원이다.
 */
export function parseKoreanAmount(input: string): number | undefined {
  const t = input.replace(/,/g, "").replace(/\s+/g, " ");
  let total = 0;
  let found = false;

  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  let rest = t;
  if (eok) {
    total += parseFloat(eok[1]) * 억;
    found = true;
    rest = t.slice((eok.index ?? 0) + eok[0].length);
    // 억 바로 뒤에 이어지는 천/백/만 단위만 같은 금액의 일부로 본다.
    const tail = rest.match(/^(?:\s*\d+(?:\.\d+)?\s*(?:천만|백만|천|백|만))+/);
    if (tail) {
      const re = /(\d+(?:\.\d+)?)\s*(천만|백만|천|백|만)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(tail[0]))) total += parseFloat(m[1]) * unitOf(m[2]);
      rest = rest.slice(tail[0].length);
    }
    return Math.round(total);
  }

  // 억 없이: 천만/백만/천/백/만 단위
  const re = /(\d+(?:\.\d+)?)\s*(천만|백만|천|백|만)(?!\s*원\s*짜리)/g;
  let m: RegExpExecArray | null;
  let lastEnd = -1;
  while ((m = re.exec(rest))) {
    // "5천원" 은 5,000원 — 천 뒤에 바로 원이 오면 소액 그대로
    if ((m[2] === "천" || m[2] === "백") && /^\s*원/.test(rest.slice(m.index + m[0].length))) {
      total += parseFloat(m[1]) * (m[2] === "천" ? 1_000 : 100);
      found = true;
      continue;
    }
    // 연속된 단위("1천 5백만")만 합산, 떨어진 두 번째 금액은 무시
    if (lastEnd >= 0 && m.index - lastEnd > 3) break;
    total += parseFloat(m[1]) * unitOf(m[2]);
    lastEnd = m.index + m[0].length;
    found = true;
  }
  if (found) return Math.round(total);

  // 순수 숫자 + 원 ("50000000원")
  const raw = rest.match(/(\d{5,})\s*원/);
  if (raw) return parseInt(raw[1], 10);
  return undefined;
}

/** 단위 → 원. "2억 5천" 의 천도, 홀로 쓰인 "5천" 도 목돈 문맥에서는 천만으로 읽는다. */
function unitOf(u: string): number {
  switch (u) {
    case "천만":
    case "천":
      return 1_000 * 만;
    case "백만":
    case "백":
      return 100 * 만;
    case "만":
      return 만;
    default:
      return 1;
  }
}

/** "30%", "30퍼센트", "30프로", "반토막" → 퍼센트 숫자. 못 읽으면 undefined. */
export function parsePercent(input: string): number | undefined {
  const t = input.replace(/\s+/g, "");
  const m = t.match(/(\d+(?:\.\d+)?)\s*(%|％|퍼센트|프로|percent)/i);
  if (m) {
    const n = parseFloat(m[1]);
    return n > 0 && n <= 100 ? n : undefined;
  }
  if (/반토막|절반(?:으로|이)?(?:떨어|빠|줄)/.test(t)) return 50;
  return undefined;
}

/* ── 룰 해석 ───────────────────────────────────────── */

const DIAGNOSIS = /치매|진단서|진단을?\s*받|인지\s*장애|경도\s*인지|알츠하이머|확진/;
const CRASH =
  /급락|폭락|떨어|하락|빠졌|빠지|반토막|주가|주식이|증시|코스피|펀드가|평가액|시장이|%|％|퍼센트|프로\b/;
const WINDFALL =
  /목돈|매각|팔아|팔았|팔고|보험금|상속|퇴직금|받았|들어왔|생겼|입금|억|만\s*원|만원|보상금|위로금|당첨/;

export function kindOfText(text: string): EventKind | null {
  if (DIAGNOSIS.test(text)) return "diagnosis";
  if (CRASH.test(text)) return "market_crash";
  if (WINDFALL.test(text)) return "windfall";
  return null;
}

/**
 * 정성 항목에 "지어낸 숫자" 가 섞였는지. 조항 번호(제5조, 제7조 ②)는 숫자가 아니라 참조라서
 * 허용하고, 금액·퍼센트·기간처럼 계산된 것처럼 보이는 숫자만 잡는다.
 */
export function hasInventedNumber(s: string): boolean {
  const stripped = s.replace(/제\s*\d+\s*조/g, "").replace(/\d+\s*항/g, "");
  return /\d/.test(stripped);
}

/** 범위 밖 상황을 위한 정성 항목. 숫자를 넣지 않는다 — 룰이든 모델이든 여기 숫자는 지어낸 것이다. */
const OTHER_CONSIDERATIONS = [
  "지출설계서 제5조 알림 대상: 큰돈이 움직이기 전에 누구에게 먼저 알리기로 했는지",
  "지출설계서 제3조 이체 한도: 한 번에 나갈 수 있는 금액에 상한이 걸려 있는지",
  "지출설계서 제7조 ①·② 금지 자산군과 위험자산 상한: 새 제안이 이 선 안에 있는지",
  "되돌릴 수 있는 조치인지, 한번 하면 돌이키기 어려운 조치인지부터 나누기",
];

function clarifyOf(kind: EventKind): EventInterpretation {
  return {
    kind: "clarify",
    pendingKind: kind,
    source: "rule",
    reply:
      kind === "windfall"
        ? "얼마가 들어왔는지 금액을 알려주시겠어요? 예를 들어 '2억 5천만원'처럼요."
        : "몇 퍼센트 정도 떨어졌는지 알려주시겠어요? 예를 들어 '30%'처럼요.",
  };
}

/**
 * 키워드·숫자 휴리스틱. pendingKind 가 있으면(직전에 되물은 상태) 숫자만 온 답을 그 종류로
 * 이어 붙인다 — "목돈이 생겼어요" → 되묻기 → "3억" 이 windfall 3억이 된다.
 */
export function interpretByRule(
  text: string,
  opts: { pendingKind?: EventKind } = {},
): EventInterpretation {
  const t = text.trim();
  const kind = kindOfText(t) ?? opts.pendingKind ?? null;

  if (kind === "diagnosis") {
    return {
      kind,
      params: {},
      label: "치매 진단을 받았습니다",
      reply:
        "진단서가 나온 상황으로 보고, 설계서에 적어 둔 발동 조건과 한도를 기준으로 검토 후보를 늘어놓겠습니다.",
      source: "rule",
    };
  }

  if (kind === "market_crash") {
    const pct = parsePercent(t);
    if (pct === undefined) {
      // 되묻는 중이었고 숫자만 왔다면 그 숫자를 퍼센트로 본다
      const bare = opts.pendingKind === "market_crash" ? t.match(/^(\d+(?:\.\d+)?)$/) : null;
      if (!bare) return clarifyOf("market_crash");
      return crashOf(parseFloat(bare[1]));
    }
    return crashOf(pct);
  }

  if (kind === "windfall") {
    const amount = parseKoreanAmount(t);
    if (amount === undefined || amount < 만) return clarifyOf("windfall");
    return {
      kind,
      params: { amount },
      label: `목돈 ${won(amount)}이 들어왔습니다`,
      reply: `목돈 ${won(amount)}이 들어온 상황으로 보고, 설계서의 배분 원칙과 보호 장치를 기준으로 검토 후보를 늘어놓겠습니다.`,
      source: "rule",
    };
  }

  return {
    kind: "other",
    source: "rule",
    reply:
      "말씀하신 상황은 NEXT가 숫자로 계산할 수 있는 세 가지(진단서 제출, 목돈 유입, 시장 급락)에 들어가지 않습니다. 계산 없이, 설계서의 어느 원칙과 닿아 있는지만 정리합니다.",
    considerations: OTHER_CONSIDERATIONS,
  };
}

function crashOf(pct: number): EventInterpretation {
  const dropPct = pct > 0 && pct <= 100 ? pct : DEFAULT_DROP_PCT;
  return {
    kind: "market_crash",
    params: { dropPct },
    label: `시장이 ${dropPct}% 급락했습니다`,
    reply: `위험자산이 ${dropPct}% 떨어진 상황으로 보고, 급락 때 하기로 정해 둔 원칙과 이력에서 보인 행동을 나란히 놓겠습니다.`,
    source: "rule",
  };
}

/* ── 설계서 요약 ───────────────────────────────────── */

/** 모델에 넘길 설계서 요약. 숫자는 문맥 파악용이며 계산 근거로 쓰이지 않는다. */
export function eventContextOf(p: Profile, insight: LedgerInsight | null): EventContext {
  const expense = buildExpenseDesign(p);
  const cap = choiceOf(p, "I02");
  const forbidden = multiOf(p, "I01").filter((v) => v !== "none");
  return {
    capacity: p.capacity,
    chaptersCompleted: p.chaptersCompleted,
    totalAssets: expense.sustainability.assets || undefined,
    monthlyLiving: expense.cashflow.living || amountOf(p, "A02") || undefined,
    riskCapPct: cap !== undefined ? RISK_CAP_PCT[cap] : undefined,
    forbidden: forbidden.length ? forbidden : undefined,
    hasLedgerInsight: !!insight,
  };
}

/* ── 이벤트 조립 ───────────────────────────────────── */

let seq = 0;

/** 해석 결과 → 룰 엔진이 먹는 LifeEvent. 같은 종류라도 매번 새 id 라서 블록이 겹치지 않는다. */
export function eventOf(
  it: Extract<EventInterpretation, { kind: EventKind }>,
): LifeEvent {
  seq += 1;
  const params: Record<string, number> = {};
  if (it.params.amount !== undefined) params.amount = it.params.amount;
  if (it.params.dropPct !== undefined) params.dropPct = it.params.dropPct;
  return { id: `ev-${it.kind}-${Date.now()}-${seq}`, kind: it.kind, label: it.label, params };
}

/* ── API 경로 ──────────────────────────────────────── */

const KINDS: EventKind[] = ["diagnosis", "windfall", "market_crash"];
const CHAPTERS: Chapter[] = ["core", "invest", "estate", "medical", "safe"];

interface Raw {
  kind?: string;
  pendingKind?: string | null;
  amount?: number | null;
  dropPct?: number | null;
  label?: string;
  reply?: string;
  considerations?: string[];
  chapter?: string | null;
}

/** 라우트 응답을 EventInterpretation 으로. 모양이 어긋나면 null → 룰 폴백. */
export function fromApi(raw: Raw): EventInterpretation | null {
  if (!raw || typeof raw.reply !== "string" || !raw.reply.trim()) return null;
  const k = raw.kind;
  if (k === "clarify") {
    const pk = KINDS.find((x) => x === raw.pendingKind);
    return { kind: "clarify", reply: raw.reply, pendingKind: pk, source: "llm" };
  }
  if (k === "other") {
    const considerations = (raw.considerations ?? [])
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      // 방어: 정성 항목에 금액·퍼센트 같은 숫자가 섞이면 그 항목은 버린다 (지어낸 숫자일 가능성)
      .filter((s) => !hasInventedNumber(s))
      .slice(0, 4);
    const chapter = CHAPTERS.find((c) => c === raw.chapter);
    return { kind: "other", reply: raw.reply, considerations, chapter, source: "llm" };
  }
  const kind = KINDS.find((x) => x === k);
  if (!kind) return null;
  const params: { amount?: number; dropPct?: number } = {};
  if (kind === "windfall") {
    if (typeof raw.amount !== "number" || !(raw.amount > 0)) return null;
    params.amount = Math.round(raw.amount);
  }
  if (kind === "market_crash") {
    if (typeof raw.dropPct === "number" && raw.dropPct > 0 && raw.dropPct <= 100) {
      params.dropPct = raw.dropPct;
    }
  }
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label.trim()
      : defaultLabel(kind, params);
  return { kind, params, label, reply: raw.reply, source: "llm" };
}

function defaultLabel(kind: EventKind, params: { amount?: number; dropPct?: number }): string {
  if (kind === "windfall") return `목돈 ${won(params.amount)}이 들어왔습니다`;
  if (kind === "market_crash") return `시장이 ${params.dropPct ?? DEFAULT_DROP_PCT}% 급락했습니다`;
  return "치매 진단을 받았습니다";
}

/**
 * 대화 → 해석. 서버(Claude)를 먼저, 안 되면 룰. 마지막 사용자 발화가 해석 대상이다.
 * pendingKind 는 직전 턴이 되묻기였을 때 그 종류 — 룰 폴백이 숫자만 온 답을 이어 붙이는 데 쓴다.
 */
export async function interpretEvent(
  messages: EventChatMessage[],
  context: EventContext,
  opts: { pendingKind?: EventKind } = {},
): Promise<EventInterpretation> {
  const last = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";
  const fallback = () => interpretByRule(last, opts);
  if (typeof window === "undefined") return fallback();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/ai/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-10), context }),
      signal: controller.signal,
    });
    if (!res.ok || res.status === 204) return fallback();
    const data = (await res.json()) as Raw & { reason?: string };
    if (data.reason) return fallback();
    return fromApi(data) ?? fallback();
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}
