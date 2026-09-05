import type { Profile } from "../types";
import { amountOf, choiceOf, multiOf } from "../profile";
import { hasChapter } from "../questions";

/**
 * 금융 보호 챕터(S01~S04)의 답을 판정 엔진이 읽는 형태로 옮긴다.
 * 설계서(제4조 맥락 룰)와 /api/fds 가 같은 policy 를 본다.
 */

export type FraudRulePolicy = "guardian" | "block" | "reauth";
export type FraudSignalKey = "time" | "pin" | "biometric" | "device";
export type GuardianTimeoutPolicy = "hold" | "reauth" | "small_ok";

export interface FraudPolicy {
  /** S01 — 평소와 다른 거래 대응 원칙 */
  rule: FraudRulePolicy;
  /** S02 — 신규 계좌 확인 기준액(원). 이 미만이면 알림만. */
  newAccountThreshold: number;
  /** S03 — 금액 외에 함께 볼 신호 */
  signals: FraudSignalKey[];
  /** S04 — 보호자 무응답 시 */
  onTimeout: GuardianTimeoutPolicy;
}

export const DEFAULT_POLICY: FraudPolicy = {
  rule: "guardian",
  newAccountThreshold: 3_000_000,
  signals: ["time", "pin", "biometric", "device"],
  onTimeout: "hold",
};

export const RULE_LABEL: Record<FraudRulePolicy, string> = {
  guardian: "보호자 승인 후 진행",
  block: "금액과 관계없이 우선 차단",
  reauth: "본인 재인증 후 진행",
};

export const TIMEOUT_LABEL: Record<GuardianTimeoutPolicy, string> = {
  hold: "응답할 때까지 계속 차단",
  reauth: "본인 재인증 성공 시 해제",
  small_ok: "확인 기준액 미만이면 진행",
};

const SIGNAL_KEYS: FraudSignalKey[] = ["time", "pin", "biometric", "device"];

function isRule(v: unknown): v is FraudRulePolicy {
  return v === "guardian" || v === "block" || v === "reauth";
}
function isTimeout(v: unknown): v is GuardianTimeoutPolicy {
  return v === "hold" || v === "reauth" || v === "small_ok";
}

/** 챕터를 선언하지 않았으면 null. 일부만 답했으면 기본값으로 채운다. */
export function policyFromProfile(p: Profile): FraudPolicy | null {
  if (!hasChapter(p, "safe")) return null;
  const rule = choiceOf(p, "S01");
  const threshold = amountOf(p, "S02");
  const signals = multiOf(p, "S03").filter((v): v is FraudSignalKey =>
    (SIGNAL_KEYS as string[]).includes(v),
  );
  const onTimeout = choiceOf(p, "S04");
  return {
    rule: isRule(rule) ? rule : DEFAULT_POLICY.rule,
    newAccountThreshold: threshold ?? DEFAULT_POLICY.newAccountThreshold,
    signals: p.answers.S03 ? signals : DEFAULT_POLICY.signals,
    onTimeout: isTimeout(onTimeout) ? onTimeout : DEFAULT_POLICY.onTimeout,
  };
}

/** API 바디에서 policy 를 읽는다. 없거나 깨졌으면 기본값. */
export function parsePolicy(raw: unknown): FraudPolicy {
  if (!raw || typeof raw !== "object") return DEFAULT_POLICY;
  const r = raw as Record<string, unknown>;
  const threshold = Number(r.newAccountThreshold);
  const signals = Array.isArray(r.signals)
    ? r.signals.filter((v): v is FraudSignalKey => (SIGNAL_KEYS as string[]).includes(String(v)))
    : DEFAULT_POLICY.signals;
  return {
    rule: isRule(r.rule) ? r.rule : DEFAULT_POLICY.rule,
    newAccountThreshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULT_POLICY.newAccountThreshold,
    signals: Array.isArray(r.signals) ? signals : DEFAULT_POLICY.signals,
    onTimeout: isTimeout(r.onTimeout) ? r.onTimeout : DEFAULT_POLICY.onTimeout,
  };
}
