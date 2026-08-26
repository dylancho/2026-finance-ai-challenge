import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 선택적 LLM 보강 엔드포인트.
 * ANTHROPIC_API_KEY 가 없으면 204 를 돌려주고, 클라이언트는 룰 엔진 결과를 그대로 쓴다.
 * 데모 환경에서 이 라우트가 죽어도 인터뷰는 정상 진행된다.
 */

interface IncomingQuestion {
  id: string;
  prompt: string;
  type: "choice" | "multi" | "amount" | "person" | "allocation" | "open";
  unit?: string;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

const SYSTEM = `당신은 한국의 금융 의사결정 설계 서비스 NEXT의 답변 해석기입니다.

사용자가 자유롭게 말한 한국어 문장에서, 지금 묻고 있는 질문에 대한 답을 추출합니다.

규칙:
- 사용자가 명시하지 않은 값을 추측해서 만들지 마세요. 확실하지 않으면 아무것도 추출하지 마세요.
- 금액은 원 단위 정수로 변환합니다. "삼백만원" → 3000000, "월 300" → 3000000.
- 부정 표현("팔지 마세요", "증여는 빼고")은 반대 의미로 해석합니다.
- choice/multi 질문은 반드시 제공된 options의 value 중에서만 고릅니다.
- confidence 는 0에서 1 사이의 값으로, 근거가 명확할수록 높게 매깁니다.
- evidence 에는 판단 근거가 된 사용자 문장의 조각을 그대로 넣습니다.

이것은 법률·금융 자문이 아니라 답변 구조화 작업입니다. 조언을 생성하지 마세요.`;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "record_extraction",
  description:
    "사용자 문장에서 추출한 답변을 기록한다. 추출할 것이 없으면 빈 배열을 넘긴다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["extracted"],
    properties: {
      extracted: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "confidence"],
          properties: {
            kind: {
              type: "string",
              enum: ["choice", "multi", "amount", "person", "allocation", "open"],
            },
            value: { type: "string", description: "kind=choice 일 때 옵션 value" },
            values: {
              type: "array",
              items: { type: "string" },
              description: "kind=multi 일 때 옵션 value 목록",
            },
            amount: { type: "number", description: "kind=amount 일 때 원 단위 정수" },
            people: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["relation"],
                properties: {
                  relation: {
                    type: "string",
                    enum: ["배우자", "자녀", "부모", "형제자매", "전문가", "금융기관", "기타"],
                  },
                  name: { type: "string" },
                },
              },
            },
            rows: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["asset", "to"],
                properties: { asset: { type: "string" }, to: { type: "string" } },
              },
            },
            text: { type: "string", description: "kind=open 일 때 원문" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            evidence: { type: "string" },
          },
        },
      },
    },
  },
  strict: true,
};

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  let body: { input?: string; question?: IncomingQuestion };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const { input, question } = body;
  if (!input || !question) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "record_extraction" },
      messages: [
        {
          role: "user",
          content: [
            `질문 (${question.id}, 타입 ${question.type}): ${question.prompt}`,
            question.options?.length
              ? `선택지: ${question.options.map((o) => `${o.value}=${o.label}`).join(" / ")}`
              : "",
            question.min !== undefined || question.max !== undefined
              ? `허용 범위: ${question.min ?? "-"} ~ ${question.max ?? "-"}${question.unit ?? "원"}`
              : "",
            "",
            `사용자 답변: "${input}"`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) return NextResponse.json({ extracted: [] });

    const parsed = toolUse.input as {
      extracted?: {
        kind: string;
        value?: string;
        values?: string[];
        amount?: number;
        people?: { relation: string; name?: string }[];
        rows?: { asset: string; to: string }[];
        text?: string;
        confidence: number;
        evidence?: string;
      }[];
    };

    const extracted = (parsed.extracted ?? [])
      .map((e) => {
        const label = describe(e, question);
        if (!label) return null;
        return {
          qid: question.id,
          label,
          value: toAnswerValue(e),
          confidence: e.confidence,
          evidence: e.evidence,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ extracted });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ extracted: [], reason: "rate_limited" });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { extracted: [], reason: `api_${error.status}` },
        { status: 200 },
      );
    }
    return NextResponse.json({ extracted: [], reason: "unknown" }, { status: 200 });
  }
}

interface Raw {
  kind: string;
  value?: string;
  values?: string[];
  amount?: number;
  people?: { relation: string; name?: string }[];
  rows?: { asset: string; to: string }[];
  text?: string;
  confidence: number;
  evidence?: string;
}

function toAnswerValue(e: Raw) {
  switch (e.kind) {
    case "choice":
      return { kind: "choice" as const, value: e.value ?? "" };
    case "multi":
      return { kind: "multi" as const, values: e.values ?? [] };
    case "amount":
      return { kind: "amount" as const, value: e.amount ?? 0 };
    case "person":
      return { kind: "person" as const, people: e.people ?? [] };
    case "allocation":
      return { kind: "allocation" as const, rows: e.rows ?? [] };
    default:
      return { kind: "open" as const, text: e.text ?? "" };
  }
}

function describe(e: Raw, q: IncomingQuestion): string | null {
  const head = q.prompt.replace(/[?？]/g, "").slice(0, 18);
  switch (e.kind) {
    case "choice": {
      const opt = q.options?.find((o) => o.value === e.value);
      if (!opt) return null;
      return `${head}: ${opt.label}`;
    }
    case "multi": {
      const labels = (e.values ?? [])
        .map((v) => q.options?.find((o) => o.value === v)?.label)
        .filter(Boolean);
      if (!labels.length) return null;
      return `${head}: ${labels.join(", ")}`;
    }
    case "amount": {
      if (e.amount === undefined) return null;
      return `${head}: ${e.amount.toLocaleString("ko-KR")}${q.unit ?? "원"}`;
    }
    case "person": {
      if (!e.people?.length) return null;
      return `${head}: ${e.people
        .map((p) => (p.name ? `${p.relation} ${p.name}` : p.relation))
        .join(", ")}`;
    }
    case "allocation": {
      if (!e.rows?.length) return null;
      return `배분 ${e.rows.length}건: ${e.rows.map((r) => `${r.asset}→${r.to}`).join(", ")}`;
    }
    default:
      return e.text ? `${head}: 기록됨` : null;
  }
}
