import type { AuthorityStage, AuthorityState, InstrumentKind } from "../types";

/**
 * 집행 근거 저장소.
 *
 * Profile(선언) · Ledger(관찰) 과 분리된 키를 쓴다.
 * 여기에 저장되는 것은 사람이 앱 바깥에서 한 일(체결 여부)뿐이다.
 */

const KEY = "next.authority.v1";

export function emptyAuthorityState(): AuthorityState {
  return { version: 1, stages: {}, sentAt: null };
}

export function readAuthorityState(): AuthorityState {
  if (typeof window === "undefined") return emptyAuthorityState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyAuthorityState();
    const parsed = JSON.parse(raw) as AuthorityState;
    if (parsed?.version !== 1) return emptyAuthorityState();
    return { ...emptyAuthorityState(), ...parsed };
  } catch {
    return emptyAuthorityState();
  }
}

export function saveAuthorityState(s: AuthorityState): AuthorityState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* 저장 실패는 데모를 막지 않는다 */
    }
  }
  return s;
}

export function clearAuthorityState() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

/**
 * ?demo= 로 진입하면 체결 상태를 비운다.
 *
 * 체결 상태가 남아 있으면 데모를 다시 열어도 이미 풀려 있어 잠긴 장면을 볼 수 없다.
 * 이력(applyDemoLedger)과 같은 규칙으로 맞춘다.
 */
export function applyDemoAuthority(): AuthorityState {
  return saveAuthorityState(emptyAuthorityState());
}

export function setStage(
  s: AuthorityState,
  kind: InstrumentKind,
  stage: AuthorityStage,
): AuthorityState {
  return { ...s, stages: { ...s.stages, [kind]: stage } };
}

/** 패킷 전달. 아직 초안인 것만 sent 로 옮긴다. */
export function markSent(
  s: AuthorityState,
  kinds: InstrumentKind[],
  now: number,
): AuthorityState {
  const stages = { ...s.stages };
  for (const k of kinds) if ((stages[k] ?? "draft") === "draft") stages[k] = "sent";
  return { ...s, stages, sentAt: now };
}
