import type { Ledger, LedgerState, MedicalProof, Resolution } from "../types";
import { demoLedger } from "./generate";

/**
 * 관찰 상태 저장소.
 *
 * Profile(선언) 과 완전히 분리된 키를 쓴다. 어느 쪽도 상대를 덮어쓰지 않는다.
 */

const KEY = "next.ledger.v1";

export function emptyLedgerState(): LedgerState {
  return { version: 1, ledger: null, resolutions: {}, proof: null };
}

export function readLedgerState(): LedgerState {
  if (typeof window === "undefined") return emptyLedgerState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyLedgerState();
    const parsed = JSON.parse(raw) as LedgerState;
    if (parsed?.version !== 1) return emptyLedgerState();
    return { ...emptyLedgerState(), ...parsed };
  } catch {
    return emptyLedgerState();
  }
}

export function saveLedgerState(s: LedgerState): LedgerState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* 저장 실패는 데모를 막지 않는다 */
    }
  }
  return s;
}

export function clearLedgerState() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function readLedger(): Ledger | null {
  return readLedgerState().ledger;
}

export function attachLedger(s: LedgerState, ledger: Ledger): LedgerState {
  // 이력이 바뀌면 이전 대조 결과는 근거를 잃는다.
  return { ...s, ledger, resolutions: {} };
}

export function setResolution(
  s: LedgerState,
  qid: string,
  r: Resolution,
): LedgerState {
  return { ...s, resolutions: { ...s.resolutions, [qid]: r } };
}

export function clearResolution(s: LedgerState, qid: string): LedgerState {
  const next = { ...s.resolutions };
  delete next[qid];
  return { ...s, resolutions: next };
}

export function setProof(s: LedgerState, proof: MedicalProof | null): LedgerState {
  return { ...s, proof };
}

/** ?demo=A|B|D 진입 시 짝이 되는 이력을 붙인다. C 는 시드가 없다. */
export function demoLedgerState(key: string): LedgerState | null {
  const ledger = demoLedger(key);
  if (!ledger) return null;
  return { ...emptyLedgerState(), ledger };
}

/**
 * ?demo= 진입 시 그 데모에 맞는 이력으로 갈아끼운다.
 *
 * 시드가 없는 데모(C = caregiver)는 비운다. 폴백으로 이전 데모의 이력을 물려받으면
 * "대리인은 대상자 마이데이터를 열 수 없다" 는 전제가 깨진다.
 */
export function applyDemoLedger(key: string): LedgerState {
  return saveLedgerState(demoLedgerState(key) ?? emptyLedgerState());
}
