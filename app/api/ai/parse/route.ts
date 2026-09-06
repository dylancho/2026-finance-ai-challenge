import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guard, GLOBAL, PER_CALLER } from "../../../../lib/ratelimit";

export const runtime = "nodejs";

/**
 * 선택적 LLM 보강 엔드포인트.
 * ANTHROPIC_API_KEY 가 없으면 204 를 돌려주고, 클라이언트는 룰 엔진 결과를 그대로 쓴다.
 * 데모 환경에서 이 라우트가 죽어도 인터뷰는 정상 진행된다.
 */

/**
 * 추출층.
 *
 * 출력이 좁다 — 주어진 enum 에서 고르거나 정수 하나를 낸다. 게다가 룰 엔진이
 * 쉬운 경우를 이미 다 먹고, 신뢰도가 낮은 문장만 여기로 온다. 체급을 올려도
 * 얻는 게 적고, 사용자는 채팅창에서 문장마다 기다리므로 지연이 곧 체감 품질이다.
 * 판단이 필요한 일은 판정층(/api/ai/narrate)이 맡는다.
 */
const MODEL = "claude-sonnet-5";

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

이것은 법률·금융 자문이 아니라 답변 구조화 작업입니다. 조언을 생성하지 마세요.

문장을 써야 할 때(evidence 밖의 자유 문장이 필요한 경우)는 아래 규칙을 따릅니다.
- 말투는 해요체입니다("~해요", "~이에요", "~할게요"). "~합니다", "~입니다" 로 끝내지 마세요.
- 짧은 문장. 한 문장에 생각 하나, 대체로 20자 안팎, 40자를 넘기지 마세요.
- 주어는 사람이거나 "앱"입니다. "시스템이 판정합니다" 가 아니라 "앱이 먼저 확인해요".
- 번역투("~에 대해", "~를 통해", "~에 있어", "~로부터", "~되어지다", "~적인")와 대시(—), 화살표(→)는 쓰지 마세요.
- 이모지, 느낌표, 영어 단어를 쓰지 마세요.
- 아래 왼쪽 단어는 내부 용어라 사용자에게 쓰지 않습니다. 오른쪽 말로 바꿔 쓰세요.
  적재, 적재됨 → 불러왔어요, 불러온 이력
  복제된 금융 자아, 페르소나 → 내 돈 습관 요약, 평소 돈 쓰는 방식
  인사이트, 베이스라인 → 이력에서 읽은 것, 평소 기준
  바이오마커 → 평소 패턴과 비교한 점수
  선언, 관측, 선언된 원칙, 관측된 성향 → 내가 정한 것, 실제로 해 온 것
  대조, 대조군, 이력 대조 → 비교, 정한 것과 실제 비교
  판정층, 판정 엔진, 룰 엔진, 규칙 문장 → AI 해설, 규칙으로 계산한 문장
  판정 원장 → 검토 기록
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
  LLM, 모델, 프롬프트 → AI`;

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
  // strict 를 켜지 않는다. 이 스키마는 kind 로 갈라지는 합집합이라
  // 어떤 경우에도 쓰이지 않는 속성이 남는데, strict 는 모든 속성이
  // required 이기를 요구해 400 이 난다. 대신 아래 describe() 가 질문
  // 타입과 맞지 않는 추출을 null 로 걸러낸다.
};

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  // 공개 URL 이므로 폭주를 먼저 막는다. 막혀도 클라이언트는 룰 폴백으로 완주한다.
  const limit = guard(req, "parse", PER_CALLER, GLOBAL);
  if (!limit.ok) {
    return NextResponse.json(
      { extracted: [], reason: "rate_limited" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
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
      model: MODEL,
      // thinking 토큰이 이 한도를 같이 먹는다. 2000 이면 툴 호출이 잘릴 수 있다.
      max_tokens: 4000,
      // thinking 은 기본으로 켜져 있다. 값 추출에 깊은 사고는 필요 없고,
      // 사용자가 화면 앞에서 기다리므로 effort 를 낮춰 응답을 앞당긴다.
      output_config: { effort: "low" },
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
      // 조용히 폴백하면 무엇이 잘못됐는지 알 수 없다. 배포 로그에 남긴다.
      console.error("[ai/parse] anthropic error", error.status, error.message);
      return NextResponse.json(
        { extracted: [], reason: `api_${error.status}`, detail: error.message?.slice(0, 300) },
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
      return e.text ? `${head}: 적어 두었어요` : null;
  }
}
