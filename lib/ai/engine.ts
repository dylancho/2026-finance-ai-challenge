import type { AIResult, Extraction, Profile, Question } from "../types";
import { acknowledge, ruleExtract } from "./rules";

/** 룰 신뢰도가 이 값 미만이면 LLM 보강을 시도한다. */
const LLM_THRESHOLD = 0.6;
const LLM_TIMEOUT_MS = 2500;

export interface AIInterviewEngine {
  respond(input: string, q: Question, p: Profile): Promise<AIResult>;
}

/**
 * 하이브리드 엔진.
 * 룰 엔진을 항상 먼저 돌리고, 신뢰도가 낮을 때만 LLM 을 호출한다.
 * LLM 이 없거나 실패하면 룰 결과를 그대로 쓴다. 데모는 절대 멈추지 않는다.
 */
export class HybridEngine implements AIInterviewEngine {
  async respond(input: string, q: Question, _p?: Profile): Promise<AIResult> {
    const rule = ruleExtract(input, q);

    if (rule.confidence >= LLM_THRESHOLD || q.type === "open") {
      return {
        reply: acknowledge(rule.extractions, q),
        extracted: rule.extractions,
        source: "rule",
      };
    }

    const llm = await tryLLM(input, q);
    if (llm && llm.length) {
      return { reply: acknowledge(llm, q), extracted: llm, source: "llm" };
    }

    return {
      reply: acknowledge(rule.extractions, q),
      extracted: rule.extractions,
      source: "rule",
    };
  }
}

async function tryLLM(input: string, q: Question): Promise<Extraction[] | null> {
  if (typeof window === "undefined") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input,
        question: {
          id: q.id,
          prompt: q.prompt,
          type: q.type,
          unit: q.unit,
          min: q.min,
          max: q.max,
          options: q.options?.map((o) => ({ value: o.value, label: o.label })),
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { extracted?: Extraction[] };
    return data.extracted ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const engine: AIInterviewEngine = new HybridEngine();
