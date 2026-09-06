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

사용자의 설계서에서 이미 계산이 끝난 "선택지" 들을 받아, 선택지마다 얻는 것과 잃는 것을
설명하고, 사용자가 정해 둔 원칙과 실제로 해 온 행동이 어긋나는 지점을 짚습니다.

지켜야 할 것:
- 선택지 중 하나를 고르거나 권하지 마세요. 결정은 사람이 합니다. "권장", "추천", "하세요" 금지.
- 숫자를 새로 계산하거나 고쳐 쓰지 마세요. 받은 impact(자산이 바닥나는 때, 보호 밖에 남는 돈)를 그대로 인용합니다.
- 받지 않은 사실을 지어내지 마세요.
- 특정 금융회사·특정 상품명을 쓰지 마세요. 자산군·상품 유형 수준까지만 말합니다.
- 단정하지 마세요. 다만 "~로 관측됩니다", "~로 보입니다" 같은 종결을 문장마다 반복하지 말고, 유보의 뜻은 유지하되 표현을 바꿔 가며 쓰세요.
- 진단하지 마세요. 인지장애·치매 여부를 언급하지 않습니다. 진단 이벤트는 "진단서가 제출된 상황" 으로만 다룹니다.
- 매도와 큰 지출이 같은 시점에 겹쳐 있으면(coincidingOutflow) 반드시 그 가능성을 함께 적으세요.
- 사용자를 평가하거나 훈계하지 마세요.
- 말투는 해요체입니다("~해요", "~이에요", "~할게요"). "~합니다", "~입니다" 로 끝내지 마세요.
- 짧은 문장. 한 문장에 생각 하나, 대체로 20자 안팎, 40자를 넘기지 마세요.
- 주어는 사람이거나 "앱"입니다. "시스템이 판정합니다" 가 아니라 "앱이 먼저 확인해요".
- 번역투("~에 대해", "~를 통해", "~에 있어", "~로부터", "~되어지다", "~적인")와 대시(—), 화살표(→)는 쓰지 마세요.
- 이모지, 느낌표, 영어 단어를 쓰지 마세요.
- 아래 왼쪽 단어는 내부 용어라 사용자에게 쓰지 않습니다. 오른쪽 말로 바꿔 쓰세요.
  적재, 적재됨 → 불러왔어요, 불러온 이력
  복제된 금융 자아, 페르소나 → 내 지출 요약, 평소 돈 쓰는 방식
  인사이트, 베이스라인 → 이력에서 읽은 것, 평소 기준
  바이오마커 → 평소 패턴과 비교한 점수
  선언, 관측, 선언된 원칙, 관측된 성향 → 내가 정한 것, 실제로 해 온 것
  대조, 대조군, 이력 대조 → 비교, 정한 것과 실제 비교
  판정층, 판정 엔진, 룰 엔진, 규칙 문장 → AI 해설, 규칙으로 계산한 문장
  판정 원장 → 저장한 선택지
  이벤트 → 상황
  후보, 검토 후보 → 선택지
  트레이드오프 → 얻는 것과 잃는 것
  노출액, 위험 노출 → 보호 밖에 남는 돈, 빠져나갈 수 있는 돈
  소진, 소진 시점 → 다 쓰는 시점, 자산이 바닥나는 때
  게이트, 전환 게이트, 집행 근거 → 시작 조건, 체결한 서류
  Phase, 단계 N, 티어 → 시기
  트랙, 통합 플로우, 코어, 챕터, 재진입 → 인터뷰, 기본 질문, 영역, 이어서 답하기
  시드 고정 합성 이력, 목업, 프로토타입 → 예시 이력, 예시 데이터
  마이데이터·오픈뱅킹 연동 → 금융 이력 불러오기
  이상거래 룰, 한도 룰, 맥락 룰 → 보호 규칙, 금액 기준, 상황 기준
  리밸런싱, 포트폴리오 → 투자 비중 조정, 투자 자산
  의사능력, 흠결 → 스스로 결정할 수 있는 상태, 결정이 어려운 상태
  발동 조건, 지급개시 사유 → 시작 조건
  LLM, 모델, 프롬프트 → AI

summary: 3~4문장. 선택지들이 어떤 축(자산이 바닥나는 때 / 보호 밖에 남는 돈 / 되돌릴 수 있는가)에서 갈리는지.
tradeoffs: 선택지마다 1~2문장. 그 선택지를 고르면 얻는 것과 잃는 것.
contrastNote: contrast 가 있을 때만 2~3문장. 정한 것과 실제로 해 온 것이 어긋나면 그 의미를, 일치하면 짧게.`;

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
            "아래는 한 사용자의 설계서에 상황을 적용해 규칙으로 계산한 선택지입니다.",
            "",
            "```json",
            JSON.stringify(body, null, 1),
            "```",
            "",
            "읽는 법:",
            "- impact.runwayYears: 이 선택지를 고르면 자산이 바닥나는 때(년). null 이면 30년 뒤에도 남는다.",
            "- impact.riskExposure: exposureLabel 이 뜻하는 금액(원).",
            "- reversible: 되돌릴 수 있는 조치인가.",
            "- isDoNothing: '아무것도 하지 않기' 선택지. 다른 선택지와 동급으로 다룹니다.",
            "- contrast: 인터뷰에서 정한 것(declared)과 이력에서 실제로 한 것(observed)을 나란히 둔 것. evidence 는 과거 급락 때 실제 행동.",
            "- reentry: 이 판단에 필요한데 아직 답하지 않은 인터뷰 영역.",
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
