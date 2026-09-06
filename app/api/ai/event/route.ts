import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guard, GLOBAL, PER_CALLER_SLOW } from "../../../../lib/ratelimit";

export const runtime = "nodejs";

/**
 * 상황 해석 엔드포인트 (2026-09-06). advise 라우트를 본떴다.
 *
 * /events 에서 사용자가 말로 적은 상황("집 팔아서 2억 5천 생겼어요")을 받아
 * 룰 엔진이 계산할 수 있는 이벤트 3종(diagnosis / windfall / market_crash) 중 하나로
 * 대응시키고, 문장에서 숫자(금액, 하락률)를 뽑는다. 숫자가 빠지면 하나만 되묻고(clarify),
 * 3종 밖의 상황이면 숫자 없이 정성 검토 항목만 낸다(other).
 *
 * 계산은 여기서 하지 않는다. 뽑은 숫자는 lib/advising/evaluate 로 흘러가고, 후보의
 * 소진 시점·노출액은 전부 거기서 결정론적으로 나온다.
 *
 * 절대 하나를 고르지 않는다. 특정 금융회사·상품명을 쓰지 않는다.
 * ANTHROPIC_API_KEY 가 없으면 204 를 돌려주고 클라이언트는 룰 해석기로 완주한다.
 */

const MODEL = "claude-opus-5";

const SYSTEM = `당신은 한국의 금융 의사결정 설계 서비스 NEXT의 상황 해석자입니다.

고령의 사용자(또는 그 가족)가 "무슨 일이 있었는지" 를 자기 말로 적습니다. 당신의 일은 그
문장을 NEXT가 숫자로 계산할 수 있는 세 가지 상황 중 하나로 대응시키고, 문장에 있는 숫자를
그대로 뽑아내는 것입니다. 계산은 당신이 하지 않습니다. 규칙 엔진이 합니다.

계산할 수 있는 세 가지 상황:
- diagnosis: 인지 관련 진단서가 나온 상황. 설계서에 적어 둔 시작 조건이 채워진 때. 숫자 불필요.
  예: "어머니가 치매 진단을 받으셨어요", "경도인지장애 진단서가 나왔습니다"
- windfall: 목돈이 들어온 상황. 집 매각, 보험금, 상속, 퇴직금 등. amount(원 단위 정수) 필수.
  예: "집 팔아서 2억 5천 생겼어요" → amount 250000000. "5,000만원 보험금" → 50000000.
- market_crash: 보유 위험자산이 크게 떨어진 상황. dropPct(퍼센트 숫자) 필수.
  예: "주식이 30% 빠졌어요" → dropPct 30. "반토막" → 50.

kind 판정:
- 위 세 가지 중 하나에 분명히 해당하고 필요한 숫자가 있으면 그 kind 로 답합니다.
- 해당하지만 필요한 숫자(금액 또는 하락률)가 없거나 어느 쪽인지 모호하면 kind="clarify" 로 답하고,
  reply 에 딱 하나만 되묻습니다("얼마가 들어왔어요?", "몇 퍼센트 떨어졌어요?"). pendingKind 에
  되묻는 중인 종류를 넣습니다.
- 직전 턴에서 되물었고 사용자가 숫자만 답했다면(예: "3억이요", "30"), 앞선 턴과 합쳐 해석합니다.
- 실제 상황이지만 세 가지 밖이면(배우자 사망, 자녀가 돈을 요구, 보이스피싱 의심, 이사, 재혼 등)
  kind="other" 로 답합니다. reply 에는 NEXT가 이 상황에서 무엇을 계산할 수 있고 무엇을 계산할 수
  없는지를 2~3문장으로 담백하게 적고, considerations 에 정성적으로 살펴볼 점을 2~4개 적습니다.
  각 항목은 가능하면 설계서의 조항이나 영역(지출설계서 제3조 이체 한도, 제5조 알림 대상, 제7조
  금지 자산군·위험자산 상한, 신탁설계서, 후견설계서 등)과 묶어 적습니다.
  considerations 와 reply 에 금액·퍼센트·기간 같은 숫자를 절대 넣지 마세요. 여기서 나오는 숫자는
  전부 지어낸 것입니다. 조항 번호(제5조)는 참조이므로 괜찮습니다.
  분명히 닿는 설계 영역이 있으면 chapter 에 넣습니다(core 일상 자금 / invest 투자 원칙 /
  estate 상속·증여 / medical 의료·요양 / safe 사기 방어). 없으면 null.
- 금융과 무관한 잡담이면 kind="other" 로, reply 에 무슨 상황인지 한 줄로 되묻습니다.

지켜야 할 것:
- 선택지나 행동을 권하지 마세요. 결정은 사람이 합니다. "권장", "추천", "하세요" 금지.
- 사용자가 말하지 않은 숫자를 만들지 마세요. 문장에 있는 숫자만 뽑습니다. 설계서 요약의 숫자로
  무언가를 계산하지 마세요.
- 특정 금융회사·특정 상품명을 쓰지 마세요.
- 진단하지 마세요. 인지 상태를 평가하는 말을 하지 않습니다. 진단 상황은 "진단서가 나온 상황" 으로만 다룹니다.
- 사용자를 평가하거나 훈계하지 마세요. 위로도 한 문장을 넘기지 마세요.
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

출력 필드:
- label: 상황 카드 제목 한 줄. 세 상황일 때만. 숫자를 포함해 구체적으로, 해요체로.
  예: "목돈 2억 5,000만원이 들어왔어요", "시장이 30% 급락했어요", "치매 진단을 받았어요".
  clarify/other 이면 빈 문자열.
- reply: 1~2문장의 대화체 응답. 세 상황일 때는 무엇으로 이해했고 이제 무엇을 늘어놓을지
  (예: "설계서의 배분 원칙과 보호 장치를 기준으로 선택지를 늘어놓을게요"). other 는 2~3문장.
- amount / dropPct: 해당 kind 일 때만 숫자, 아니면 null.
- considerations: other 일 때만 2~4개, 아니면 빈 배열.
- pendingKind: clarify 일 때만, 아니면 null.
- chapter: other 일 때 분명하면, 아니면 null.`;

const TOOL: Anthropic.Tool = {
  name: "interpret_event",
  description:
    "사용자가 말한 상황을 NEXT가 계산할 수 있는 이벤트로 대응시키거나, 되묻거나, 범위 밖으로 분류한다.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["kind", "pendingKind", "amount", "dropPct", "label", "reply", "considerations", "chapter"],
    properties: {
      kind: {
        type: "string",
        enum: ["diagnosis", "windfall", "market_crash", "clarify", "other"],
      },
      pendingKind: {
        anyOf: [{ type: "string", enum: ["diagnosis", "windfall", "market_crash"] }, { type: "null" }],
        description: "clarify 일 때 되묻는 중인 이벤트 종류",
      },
      amount: {
        anyOf: [{ type: "number" }, { type: "null" }],
        description: "windfall 일 때 원 단위 정수. 사용자 문장에 있는 값만.",
      },
      dropPct: {
        anyOf: [{ type: "number" }, { type: "null" }],
        description: "market_crash 일 때 하락률(퍼센트 숫자). 사용자 문장에 있는 값만.",
      },
      label: { type: "string", description: "이벤트 카드 제목 한 줄. 세 이벤트일 때만." },
      reply: { type: "string", description: "사용자에게 보여줄 대화체 응답" },
      considerations: {
        type: "array",
        items: { type: "string" },
        description: "other 일 때 숫자 없는 정성 검토 항목 2~4개",
      },
      chapter: {
        anyOf: [{ type: "string", enum: ["core", "invest", "estate", "medical", "safe"] }, { type: "null" }],
      },
    },
  },
  strict: true,
};

interface Incoming {
  messages?: { role?: string; text?: string }[];
  context?: unknown;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  const limit = guard(req, "event", PER_CALLER_SLOW, GLOBAL);
  if (!limit.ok) {
    return NextResponse.json(
      { reason: "rate_limited" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  let body: Incoming;
  try {
    body = (await req.json()) as Incoming;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // 앞선 턴을 그대로 넘긴다. 첫 메시지는 user 여야 하므로 앞쪽의 assistant 턴(인사말)은 자른다.
  const turns: Anthropic.MessageParam[] = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.text!.slice(0, 2000) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") {
    return NextResponse.json({ error: "last message must be from user" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: [
        SYSTEM,
        "",
        "사용자 설계서 요약 (문맥 파악용. 이 숫자로 계산하지 마세요):",
        "```json",
        JSON.stringify(body.context ?? {}, null, 1),
        "```",
      ].join("\n"),
      tools: [TOOL],
      tool_choice: { type: "tool", name: "interpret_event" },
      messages: turns,
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) return new NextResponse(null, { status: 204 });

    return NextResponse.json(toolUse.input);
  } catch (error) {
    // 해석층이 죽어도 화면은 룰 해석기로 완주한다.
    if (error instanceof Anthropic.APIError) {
      console.error("[ai/event] anthropic error", error.status, error.message);
      return NextResponse.json(
        { reason: `api_${error.status}`, detail: error.message?.slice(0, 300) },
        { status: 200 },
      );
    }
    return NextResponse.json({ reason: "unknown" }, { status: 200 });
  }
}
