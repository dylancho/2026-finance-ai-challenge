import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guard, GLOBAL, PER_CALLER_SLOW } from "../../../../lib/ratelimit";

export const runtime = "nodejs";

/**
 * 어드바이징 판정층 엔드포인트. narrate 라우트를 본떴다.
 *
 * 룰 엔진(lib/advising/evaluate)이 만든 후보와 impact 를 받아, 후보 간 트레이드오프와
 * "선언된 원칙 vs 관측된 성향" 을 서술한다. 숫자를 다시 계산하지 않는다 — 계산은 이미
 * 결정론적으로 끝났고, 여기서 고쳐 쓰면 화면의 근거와 문장이 어긋난다.
 *
 * 절대 하나를 고르지 않는다. 특정 금융회사·상품명을 쓰지 않는다.
 * ANTHROPIC_API_KEY 가 없으면 204 를 돌려주고 클라이언트는 룰 폴백을 쓴다.
 */

const MODEL = "claude-opus-5";

const SYSTEM = `당신은 한국의 금융 의사결정 설계 서비스 NEXT의 판정 해설자입니다.

사용자의 설계서에서 이미 계산이 끝난 "검토 후보" 들을 받아, 후보 사이의 트레이드오프를
설명하고, 선언해 둔 원칙과 과거 이력에서 관측된 성향이 어긋나는 지점을 짚습니다.

지켜야 할 것:
- 후보 중 하나를 고르거나 권하지 마세요. 결정은 사람이 합니다. "권장", "추천", "하세요" 금지.
- 숫자를 새로 계산하거나 고쳐 쓰지 마세요. 받은 impact(소진 시점, 노출액)를 그대로 인용합니다.
- 받지 않은 사실을 지어내지 마세요.
- 특정 금융회사·특정 상품명을 쓰지 마세요. 자산군·상품 유형 수준까지만 말합니다.
- 단정하지 마세요. 다만 "~로 관측됩니다", "~로 보입니다" 같은 종결을 문장마다 반복하지 말고, 유보의 뜻은 유지하되 표현을 바꿔 가며 쓰세요.
- 번역투("~에 대해", "~를 통해", "~에 있어", "~함에 있어서")와 대시(—)는 쓰지 마세요. 짧은 문장과 긴 문장을 섞어 사람이 쓴 글처럼 리듬을 주세요.
- 진단하지 마세요. 인지장애·치매 여부를 언급하지 않습니다. 진단 이벤트는 "진단서가 제출된 상황" 으로만 다룹니다.
- 매도와 큰 지출이 같은 시점에 겹쳐 있으면(coincidingOutflow) 반드시 그 가능성을 함께 적으세요.
- 사용자를 평가하거나 훈계하지 마세요.
- 존댓말. 담백한 문어체. 이모지 금지.

summary: 3~4문장. 후보들이 어떤 축(소진 시점 / 노출액 / 되돌릴 수 있는가)에서 갈리는지.
tradeoffs: 후보마다 1~2문장. 그 후보를 택했을 때 얻는 것과 잃는 것.
contrastNote: contrast 가 있을 때만 2~3문장. 선언과 관측이 어긋나면 그 의미를, 일치하면 짧게.`;

const TOOL: Anthropic.Tool = {
  name: "record_advice",
  description: "후보 간 트레이드오프 서술과 선언·관측 대조 해석을 기록한다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "tradeoffs", "contrastNote"],
    properties: {
      summary: { type: "string", description: "3~4문장의 전체 서술" },
      tradeoffs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["candidateId", "text"],
          properties: {
            candidateId: { type: "string" },
            text: { type: "string", description: "1~2문장의 트레이드오프" },
          },
        },
      },
      contrastNote: {
        type: "string",
        description: "선언 vs 관측 해석. contrast 가 없으면 빈 문자열.",
      },
    },
  },
  strict: true,
};

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  const limit = guard(req, "advise", PER_CALLER_SLOW, GLOBAL);
  if (!limit.ok) {
    return NextResponse.json(
      { reason: "rate_limited" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_advice" },
      messages: [
        {
          role: "user",
          content: [
            "아래는 한 사용자의 설계서에 상황(이벤트)을 적용해 룰 엔진이 만든 검토 후보입니다.",
            "",
            "```json",
            JSON.stringify(body, null, 1),
            "```",
            "",
            "읽는 법:",
            "- impact.runwayYears: 이 후보를 택했을 때 자산 소진 시점(년). null 이면 30년 이상.",
            "- impact.riskExposure: exposureLabel 이 뜻하는 금액(원).",
            "- reversible: 되돌릴 수 있는 조치인가.",
            "- isDoNothing: '아무것도 하지 않음' 후보. 다른 후보와 동급으로 다룹니다.",
            "- contrast: 선언(인터뷰)과 관측(이력)을 나란히 둔 것. evidence 는 과거 급락 때 실제 행동.",
            "- reentry: 이 판단에 필요한데 아직 선언하지 않은 영역.",
          ].join("\n"),
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) return new NextResponse(null, { status: 204 });

    return NextResponse.json(toolUse.input);
  } catch (error) {
    // 판정층이 죽어도 화면은 룰 폴백으로 완주한다.
    if (error instanceof Anthropic.APIError) {
      console.error("[ai/advise] anthropic error", error.status, error.message);
      return NextResponse.json(
        { reason: `api_${error.status}`, detail: error.message?.slice(0, 300) },
        { status: 200 },
      );
    }
    return NextResponse.json({ reason: "unknown" }, { status: 200 });
  }
}
