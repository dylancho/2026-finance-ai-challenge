import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guard, GLOBAL, PER_CALLER_SLOW } from "../../../../lib/ratelimit";

export const runtime = "nodejs";

/**
 * 판정층 엔드포인트.
 *
 * 측정층이 낸 숫자를 받아 "그래서 어떤 사람인가" 와 "이 불일치를 어떻게 볼 것인가" 를
 * 판단한다. 숫자를 다시 계산하지 않는다 — 계산은 이미 결정론적으로 끝났고,
 * 여기서 고쳐 쓰면 화면의 근거와 문장이 어긋난다.
 *
 * ANTHROPIC_API_KEY 가 없으면 204 를 돌려주고 클라이언트는 룰 폴백을 쓴다.
 *
 * 여기가 체급이 실제로 드러나는 자리다. 제약이 겹겹이고(숫자 재계산 금지,
 * 진단 금지, 단정 금지, 겹친 지출은 반드시 함께 적기) 정답이 하나로 정해져
 * 있지 않다. 반면 호출은 페이지 진입당 한 번뿐이고 로딩 표시를 띄운 채
 * 기다리므로, 몇 초의 지연은 추출층(/api/ai/parse)만큼 아프지 않다.
 * 그래서 비싼 모델은 이쪽에 쓴다.
 */

const MODEL = "claude-opus-5";

const SYSTEM = `당신은 한국의 금융 의사결정 설계 서비스 NEXT의 분석 해설자입니다.

사용자의 과거 금융 이력에서 이미 계산이 끝난 지표를 받아, 그 사람의 금융 성향을 판단하고
인터뷰 답변과 이력이 어긋나는 지점을 해석합니다.

지켜야 할 것:
- 숫자를 새로 계산하거나 고쳐 쓰지 마세요. 받은 값을 그대로 인용합니다.
- 받지 않은 사실을 지어내지 마세요.
- 단정하지 마세요. 다만 "~로 관측됩니다", "~로 보입니다" 같은 종결을 문장마다 반복하지 말고, 유보의 뜻은 유지하되 표현을 바꿔 가며 쓰세요.
- 진단하지 마세요. 인지장애·치매 여부를 언급하지 않습니다. 그것은 의료기관의 몫입니다.
- 매도와 큰 지출이 같은 시점에 겹쳐 있으면(coincidingOutflow) 반드시 그 가능성을 함께 적으세요.
  판단 때문에 판 것인지 현금이 필요해서 판 것인지는 숫자만으로 가릴 수 없습니다.
- 사용자를 평가하거나 훈계하지 마세요. 관측된 것을 정리해 보여줄 뿐입니다.
- 말투는 해요체입니다("~해요", "~이에요", "~할게요"). "~합니다", "~입니다" 로 끝내지 마세요.
- 짧은 문장. 한 문장에 생각 하나, 대체로 20자 안팎, 40자를 넘기지 마세요.
- 주어는 사람이거나 "앱"입니다. "시스템이 판정합니다" 가 아니라 "앱이 먼저 확인해요".
- 번역투("~에 대해", "~를 통해", "~에 있어", "~로부터", "~되어지다", "~적인")와 대시(—), 화살표(→)는 쓰지 마세요.
- 이모지, 느낌표, 영어 단어를 쓰지 마세요.
- 아래 왼쪽 단어는 내부 용어라 사용자에게 쓰지 않습니다. 오른쪽 말로 바꿔 쓰세요.
  적재, 적재됨 → 불러왔어요, 불러온 이력
  복제된 금융 자아, 페르소나 → 지출 요약, 평소 돈 쓰는 방식
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

성향 판단(persona): 3~5문장. 소비 습관과 투자 대응을 함께 다룹니다. 화면에서는 "지출 요약" 이라는 이름으로 보입니다.
불일치 해석(interpretations): 비교 항목마다 2~3문장. 왜 어긋났는지, 무엇을 정해야 하는지.
  agreement 가 aligned 인 항목은 짧게 한 문장으로 넘어갑니다.`;

const TOOL: Anthropic.Tool = {
  name: "record_narration",
  description: "성향 판단과 불일치 해석을 기록한다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["persona", "interpretations"],
    properties: {
      persona: {
        type: "object",
        additionalProperties: false,
        required: ["text", "basis"],
        properties: {
          text: { type: "string", description: "3~5문장의 성향 판단" },
          basis: {
            type: "array",
            items: { type: "string" },
            description: "판단의 근거로 삼은 지표 이름들",
          },
        },
      },
      interpretations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["qid", "text"],
          properties: {
            qid: { type: "string" },
            text: { type: "string", description: "2~3문장의 해석" },
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

  // 이 라우트는 호출당 입력이 크다(10년치 지표). 폭주 시 요금 영향이 parse 보다 크다.
  const limit = guard(req, "narrate", PER_CALLER_SLOW, GLOBAL);
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
      // thinking 토큰이 이 한도를 같이 먹는다. 해설 3~5문장 + 항목별 해석이
      // 잘리지 않도록 여유를 둔다.
      max_tokens: 4000,
      // medium 은 실측 15초가 걸려 클라이언트 타임아웃을 넘겼다. /ledger 의
      // 페르소나 카드는 사람이 로딩 표시를 보며 기다리는 자리라 그만큼은 못 준다.
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_narration" },
      messages: [
        {
          role: "user",
          content: [
            "아래는 한 사용자의 10년치 금융 이력에서 계산된 지표와, 인터뷰 답변과 비교한 결과입니다.",
            "",
            "```json",
            JSON.stringify(body, null, 1),
            "```",
            "",
            "지표 읽는 법:",
            "- riskAversion 0~1: 낙폭 대비 매도비중 회귀 기울기. 클수록 얕은 하락에도 많이 판다.",
            "- realizedStopLoss: 실제로 매도가 일어난 낙폭의 중앙값 (음수).",
            "- holdRate 0~1: 하락 구간 중 매도하지 않은 비율.",
            "- reactionDays: 하락 시작부터 매도까지 걸린 평균 일수.",
            "- baseline: 건강기 앞 구간에서 뽑은 평소 기준.",
            "- coincidingOutflow: 그 매도와 같은 시점에 있었던 큰 지출.",
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
      console.error("[ai/narrate] anthropic error", error.status, error.message);
      return NextResponse.json(
        { reason: `api_${error.status}`, detail: error.message?.slice(0, 300) },
        { status: 200 },
      );
    }
    return NextResponse.json({ reason: "unknown" }, { status: 200 });
  }
}
