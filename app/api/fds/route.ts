import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { guard, GLOBAL, PER_CALLER } from "../../../lib/ratelimit";
import {
  fallbackDecision,
  parseTransaction,
  scoreTransaction,
  topReasons,
  type FraudScore,
} from "../../../lib/fraud/score";
import { parsePolicy, RULE_LABEL, TIMEOUT_LABEL } from "../../../lib/fraud/policy";

export const runtime = "nodejs";

/**
 * Smart Fraud Shield 엔드포인트. advise 라우트를 본떴다.
 *
 * 룰 엔진(lib/fraud/score)이 위험도와 신호별 점수를 결정론적으로 만든다.
 * Claude 는 그 결과를 받아 "왜 이런 판단인지" 사용자와 보호자에게 보여줄 문장만 쓴다.
 * 숫자를 다시 계산하지 않는다. 판정층이 죽거나 키가 없으면 룰 기반 문장으로 완주한다.
 *
 * 모델은 가장 가벼운 Haiku 4.5. 실시간 이체 화면에서 도는 호출이라 지연이 짧아야 한다.
 */

const MODEL = "claude-haiku-4-5";

const SYSTEM = `당신은 한국 금융 서비스 NEXT의 이상거래 보호 기능(Smart Fraud Shield)의 판정 해설자입니다.

룰 엔진이 이미 계산을 끝낸 위험도·상태·신호별 점수를 받아, 사용자와 보호자가 읽을 문장을 씁니다.

지켜야 할 것:
- status 와 risk_score 를 바꾸거나 새로 계산하지 마세요. 받은 값을 그대로 전제로 씁니다.
- 받지 않은 사실을 지어내지 마세요. 신호에 없는 정황(전화 내용, 상대방 신원 등)을 단정하지 않습니다.
- 사용자를 평가하거나 훈계하지 마세요. 사용자는 피해자일 수 있습니다.
- policy 는 사용자가 인터뷰에서 직접 정한 보호 원칙입니다. policyNote 가 있으면 그 원칙이 이 판정을 결정한 것이니 decision 에 "직접 정해 두신 원칙에 따라" 라는 뜻을 담아 언급하세요.
- 특정 금융회사·상품명을 쓰지 마세요.
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
  LLM, 모델, 프롬프트 → AI

decision: 2~3문장. 어떤 신호들이 겹쳐서 이 상태가 됐는지, 그래서 지금 거래가 어떻게 처리되는지.
  BLOCKED 면 "거래를 잠시 멈추고 보호자에게 확인을 요청했어요"라는 뜻이 들어가야 합니다.
  ALLOW 면 안심시키되 과장하지 않습니다.
guardianMessage: 1~2문장. 보호자에게 보내는 알림 문구. 무엇을 확인해 달라는지 구체적으로.
summaryReasons: 화면에 불릿으로 보여줄 핵심 사유. 점수가 있는 신호만, 높은 순으로 2~3개. 각 1문장.`;

const TOOL: Anthropic.Tool = {
  name: "record_fraud_verdict",
  description: "이상거래 판정 결과의 사용자·보호자용 서술을 기록한다.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["decision", "guardianMessage", "summaryReasons"],
    properties: {
      decision: { type: "string", description: "2~3문장의 판정 서술" },
      guardianMessage: { type: "string", description: "보호자 알림 문구 1~2문장" },
      summaryReasons: {
        type: "array",
        items: { type: "string" },
        description: "핵심 사유 2~3개, 각 1문장",
      },
    },
  },
};

interface Narrative {
  decision: string;
  guardianMessage: string;
  summaryReasons: string[];
}

function ruleNarrative(score: FraudScore): Narrative {
  const reasons = topReasons(score.signals);
  return {
    decision: fallbackDecision(score.status),
    guardianMessage:
      score.status === "ALLOW"
        ? "평소 범위 안의 거래라 따로 확인하지 않아도 돼요."
        : `${score.transaction.amount.toLocaleString("ko-KR")}원 이체 요청이 평소와 다른 신호와 함께 들어왔어요. 본인이 직접 요청한 거래인지 확인해 주세요.`,
    summaryReasons: reasons,
  };
}

async function narrate(score: FraudScore): Promise<{ narrative: Narrative; narrator: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { narrative: ruleNarrative(score), narrator: "rule" };
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_fraud_verdict" },
      messages: [
        {
          role: "user",
          content: [
            "아래는 한 사용자의 실시간 이체 요청을 룰 엔진이 판정한 결과입니다.",
            "",
            "```json",
            JSON.stringify(
              {
                status: score.status,
                risk_score: score.risk_score,
                transaction: score.transaction,
                baseline: score.baseline,
                signals: score.signals,
                policy: {
                  rule: RULE_LABEL[score.policy.rule],
                  newAccountThreshold: score.policy.newAccountThreshold,
                  watchedSignals: score.policy.signals,
                  onGuardianTimeout: TIMEOUT_LABEL[score.policy.onTimeout],
                },
                policyNote: score.policyNote ?? null,
              },
              null,
              1,
            ),
            "```",
            "",
            "읽는 법:",
            "- status: BLOCKED(일시 정지·보호자 확인 요청) / REVIEW(추가 인증 필요) / ALLOW(정상 처리).",
            "- risk_score: 0~100. 신호별 score 의 합.",
            "- signals[].level: critical > warning > normal. observed 는 이번 거래, baseline 은 평소 기준.",
            "- baseline.knownAccounts: 평소 거래하던 수취계좌.",
            "- policy: 사용자가 정한 보호 원칙. policyNote 가 있으면 점수와 무관하게 그 원칙이 status 를 정했다.",
          ].join("\n"),
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) return { narrative: ruleNarrative(score), narrator: "rule" };

    const input = toolUse.input as Partial<Narrative>;
    const fallback = ruleNarrative(score);
    return {
      narrator: MODEL,
      narrative: {
        decision: input.decision?.trim() || fallback.decision,
        guardianMessage: input.guardianMessage?.trim() || fallback.guardianMessage,
        summaryReasons:
          Array.isArray(input.summaryReasons) && input.summaryReasons.length
            ? input.summaryReasons.slice(0, 3)
            : fallback.summaryReasons,
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("[api/fds] anthropic error", error.status, error.message);
    } else {
      console.error("[api/fds] unknown error", error);
    }
    return { narrative: ruleNarrative(score), narrator: "rule" };
  }
}

export async function POST(req: Request) {
  const limit = guard(req, "fds", PER_CALLER, GLOBAL);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const score = scoreTransaction(parseTransaction(body), parsePolicy(body.policy));
  const { narrative, narrator } = await narrate(score);

  return NextResponse.json({
    status: score.status,
    risk_score: score.risk_score,
    transaction: score.transaction,
    baseline: score.baseline,
    signals: score.signals,
    policy: score.policy,
    policy_note: score.policyNote,
    decision: narrative.decision,
    guardian_message: narrative.guardianMessage,
    summary_reasons: narrative.summaryReasons,
    approval:
      score.status === "ALLOW"
        ? undefined
        : { status: "PENDING", guardian: "김하나", requestedAt: "방금 전", resendCount: 0 },
    narrator,
  });
}
