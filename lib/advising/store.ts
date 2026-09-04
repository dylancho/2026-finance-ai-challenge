import type { Candidate, DecisionRecord, LifeEvent } from "./types";

/**
 * 판정 원장. 후보를 "실행" 하는 것이 아니라 "검토 후보로 기록" 한다.
 * Profile(선언)·Ledger(관찰)와 분리된 세 번째 키다.
 */

const KEY = "next.decisions.v1";

export function readDecisions(): DecisionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DecisionRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordDecision(event: LifeEvent, candidate: Candidate): DecisionRecord[] {
  const rec: DecisionRecord = {
    id: `${event.kind}-${candidate.id}-${Date.now()}`,
    at: Date.now(),
    eventKind: event.kind,
    eventLabel: event.label,
    candidateId: candidate.id,
    candidateTitle: candidate.title,
    basis: candidate.basis,
    clause: candidate.clause,
  };
  const next = [rec, ...readDecisions()];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 저장 실패는 데모를 막지 않는다 */
    }
  }
  return next;
}

export function clearDecisions() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}
