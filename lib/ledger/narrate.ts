import type { Contrast, LedgerInsight, Persona, Track } from "../types";
import { won } from "../format";

/**
 * 판정층 클라이언트.
 *
 * 측정층이 낸 숫자를 근거로 "그래서 이 사람은 어떤 사람인가" 를 판단한다.
 * 이 층은 룰로 쓰면 if문 티가 나고, 숫자만으로는 가릴 수 없는 맥락이 있다.
 * (예: 낙폭 매도가 패닉셀인가, 같은 시점 의료비 때문에 현금이 필요했던 것인가)
 *
 * 키가 없으면 룰 폴백으로 떨어진다. 다만 폴백은 동등한 대안이 아니라
 * 데모가 죽지 않게 하는 보험이다. 구간 분류 수준의 문장만 나온다.
 */

/**
 * 판정층을 기다려 주는 시간.
 *
 * 실측 15~16초다. effort 를 낮춰도 줄지 않았다 — 사고가 아니라 출력 길이가
 * 병목이기 때문이다(페르소나 3~5문장 + 항목별 해석). 예전 12초 예산으로는
 * 매번 abort 되어 화면에 룰 문장만 남았다.
 *
 * 호출하는 두 화면 모두 룰 문장을 먼저 세워 두고 결과가 오면 갈아끼우므로,
 * 이 시간 동안 사용자가 빈 화면을 보지는 않는다. 그래서 넉넉히 준다.
 */
const TIMEOUT_MS = 30_000;

export interface NarrationResult {
  persona: Persona;
  interpretations: Record<string, { text: string; source: "rule" | "llm" }>;
}

/* ── 룰 폴백 ───────────────────────────────────────── */

export function rulePersona(insight: LedgerInsight): Persona {
  const parts: string[] = [];
  const b = insight.behavior;

  parts.push(
    `한 달 생활비는 ${won(b.livingMedian)} 선을 유지하셨어요. 고정비 ${b.fixed.length}가지가 매달 같은 날에 빠져나갔어요.`,
  );
  if (b.seasonalPeak) {
    parts.push(`${b.seasonalPeak.note} 시기에 지출이 한 번씩 뛰어요.`);
  }

  const d = insight.decision;
  if (d) {
    const held = Math.round(d.holdRate * 100);
    if (d.riskAversion > 0.7) {
      parts.push(
        `주가가 떨어지면 손실을 피하려는 경향이 뚜렷해요. 실제로 판 하락폭은 ${(d.realizedStopLoss * 100).toFixed(1)}%, 평균 ${d.reactionDays}일 만에 움직이셨어요.`,
      );
    } else if (d.riskAversion > 0.35) {
      parts.push(
        `주가가 떨어졌을 때 일부를 파신 적이 있어요. 팔지 않고 버틴 비율은 ${held}%예요.`,
      );
    } else {
      parts.push(
        `주가가 떨어져도 대체로 팔지 않고 버티셨어요. 팔지 않고 버틴 비율은 ${held}%예요.`,
      );
    }
    const ctx = d.reactions.filter((r) => r.coincidingOutflow);
    if (ctx.length) {
      parts.push(
        `다만 ${ctx.length}건은 같은 때 큰 지출이 겹쳐 있어 단정하기 어려워요.`,
      );
    }
  }

  return { text: parts.join(" "), source: "rule" };
}

export function ruleInterpretations(
  contrasts: Contrast[],
): NarrationResult["interpretations"] {
  const out: NarrationResult["interpretations"] = {};
  for (const c of contrasts) out[c.qid] = { text: c.reason, source: "rule" };
  return out;
}

export function ruleNarration(
  insight: LedgerInsight,
  contrasts: Contrast[],
): NarrationResult {
  return {
    persona: rulePersona(insight),
    interpretations: ruleInterpretations(contrasts),
  };
}

/* ── LLM 경로 ──────────────────────────────────────── */

/** 판정층에 넘기는 근거. 측정층 산출물만 넘어간다. */
function payloadOf(insight: LedgerInsight, contrasts: Contrast[], track: Track | null) {
  return {
    track,
    behavior: {
      livingMedian: insight.behavior.livingMedian,
      livingP90: insight.behavior.livingP90,
      fixed: insight.behavior.fixed.map((f) => ({ label: f.label, amount: f.amount, day: f.day })),
      seasonalPeak: insight.behavior.seasonalPeak,
      unusedSubscriptions: insight.behavior.unusedSubscriptions,
    },
    decision: insight.decision
      ? {
          riskAversion: insight.decision.riskAversion,
          realizedStopLoss: insight.decision.realizedStopLoss,
          holdRate: insight.decision.holdRate,
          reactionDays: insight.decision.reactionDays,
          allocation: insight.decision.allocation,
          reactions: insight.decision.reactions.map((r) => ({
            date: r.date,
            label: r.label,
            drawdown: r.drawdown,
            sold: r.sold,
            portionSold: r.portionSold,
            reactionDays: r.reactionDays,
            coincidingOutflow: r.coincidingOutflow,
          })),
        }
      : null,
    baseline: insight.baseline,
    contrasts: contrasts.map((c) => ({
      qid: c.qid,
      title: c.title,
      declared: c.declared,
      observed: c.observed,
      agreement: c.agreement,
      evidence: c.evidence,
    })),
  };
}

export async function narrate(
  insight: LedgerInsight,
  contrasts: Contrast[],
  track: Track | null,
): Promise<NarrationResult> {
  const fallback = ruleNarration(insight, contrasts);
  if (typeof window === "undefined") return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("/api/ai/narrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadOf(insight, contrasts, track)),
      signal: controller.signal,
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      persona?: { text?: string };
      interpretations?: { qid: string; text: string }[];
    };
    if (!data.persona?.text) return fallback;

    const interpretations = { ...fallback.interpretations };
    for (const i of data.interpretations ?? []) {
      if (i.qid && i.text) interpretations[i.qid] = { text: i.text, source: "llm" };
    }

    return {
      persona: { text: data.persona.text, source: "llm" },
      interpretations,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
