import type { Advice, AdviceNarration } from "./types";
import { EVENT_META, yearsLabel } from "./evaluate";
import { won } from "../format";

/**
 * 어드바이징 판정층 클라이언트. lib/ledger/narrate.ts 를 본떴다.
 *
 * LLM 의 역할은 후보 간 트레이드오프 서술과 "선언된 원칙 vs 관측된 성향" 대조
 * 해석뿐이다. 숫자는 재계산하지 않고 받은 impact 를 인용한다. 키가 없으면 204 →
 * 룰 폴백 문장으로 화면이 완주한다.
 */

const TIMEOUT_MS = 30_000;

/* ── 룰 폴백 ───────────────────────────────────────── */

export function ruleAdviceNarration(advice: Advice): AdviceNarration {
  const { candidates, event } = advice;
  const meta = EVENT_META[event.kind];
  const years = candidates.map((c) => c.impact.runwayYears ?? null);
  const finite = years.filter((y): y is number => y !== null);
  const exposures = candidates.map((c) => c.impact.riskExposure ?? 0);
  const minEx = Math.min(...exposures);
  const maxEx = Math.max(...exposures);
  const doNothing = candidates.find((c) => c.isDoNothing);

  const hasOpen = years.some((y) => y === null);
  const lo = finite.length ? Math.min(...finite) : null;
  const hi = finite.length ? Math.max(...finite) : null;
  const runwayText = !finite.length
    ? "모두 30년 이상"
    : !hasOpen && lo === hi
      ? `모두 약 ${lo}년`
      : `${lo}년에서 ${hasOpen ? "30년 이상" : `${hi}년`} 사이`;
  const exposureText =
    minEx === maxEx ? `모두 ${won(minEx)}` : `${won(minEx)}에서 ${won(maxEx)} 사이`;
  const summary =
    `후보 ${candidates.length}개의 소진 시점은 ${runwayText}이고, ` +
    `${meta.exposureLabel}은 ${exposureText}입니다. ` +
    (doNothing ? `'${doNothing.title}'도 같은 잣대로 나란히 두었습니다. ` : "") +
    "어느 쪽도 권하지 않습니다. 되돌릴 수 있는지부터 보시는 것도 한 방법입니다.";

  const tradeoffs: AdviceNarration["tradeoffs"] = {};
  for (const c of candidates) {
    tradeoffs[c.id] = {
      text:
        `소진 시점 ${yearsLabel(c.impact.runwayYears ?? null)}, ${meta.exposureLabel} ${won(c.impact.riskExposure ?? 0)}. ` +
        (c.reversible
          ? "되돌릴 수 있는 조치입니다."
          : "되돌리기 어렵습니다. 정하기 전에 지정한 사람과 한 번 확인하는 편이 안전합니다."),
      source: "rule",
    };
  }

  const contrastNote = advice.contrast
    ? {
        text:
          `정해 둔 것은 '${advice.contrast.declared}', 이력은 '${advice.contrast.observed}'입니다. ` +
          "둘이 어긋난다면 급할 때의 선택은 원칙보다 그때 기분을 따라갈 수 있습니다.",
        source: "rule" as const,
      }
    : undefined;

  return { summary: { text: summary, source: "rule" }, tradeoffs, contrastNote };
}

/* ── LLM 경로 ──────────────────────────────────────── */

function payloadOf(advice: Advice) {
  return {
    event: { kind: advice.event.kind, label: advice.event.label, params: advice.event.params },
    exposureLabel: EVENT_META[advice.event.kind].exposureLabel,
    baselineRunwayYears: advice.baselineRunwayYears,
    candidates: advice.candidates.map((c) => ({
      id: c.id,
      title: c.title,
      basis: c.basis,
      impact: c.impact,
      reversible: c.reversible,
      isDoNothing: !!c.isDoNothing,
    })),
    contrast: advice.contrast,
    reentry: advice.reentry,
  };
}

export async function narrateAdvice(advice: Advice): Promise<AdviceNarration> {
  const fallback = ruleAdviceNarration(advice);
  if (typeof window === "undefined") return fallback;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/ai/advise", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadOf(advice)),
      signal: controller.signal,
    });
    if (!res.ok || res.status === 204) return fallback;
    const data = (await res.json()) as {
      summary?: string;
      tradeoffs?: { candidateId: string; text: string }[];
      contrastNote?: string;
    };
    if (!data.summary) return fallback;

    const tradeoffs = { ...fallback.tradeoffs };
    for (const t of data.tradeoffs ?? []) {
      if (t.candidateId && t.text && tradeoffs[t.candidateId]) {
        tradeoffs[t.candidateId] = { text: t.text, source: "llm" };
      }
    }
    return {
      summary: { text: data.summary, source: "llm" },
      tradeoffs,
      contrastNote:
        data.contrastNote && advice.contrast
          ? { text: data.contrastNote, source: "llm" }
          : fallback.contrastNote,
    };
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
