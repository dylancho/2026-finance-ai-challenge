/**
 * 목업 인증.
 *
 * 실제 소셜 로그인(구글 등)과 개인 DB 연동은 후속 과제다. 지금은 홈 화면 구성을
 * 확인하기 위한 상태 토글일 뿐이며, 서버에 아무것도 보내지 않는다.
 * 실제 인증이 들어오면 이 모듈만 교체하고 useAuth() 인터페이스는 유지한다.
 */

const KEY = "next.auth.v1";

export interface Session {
  signedIn: boolean;
  name: string;
}

export const GUEST: Session = { signedIn: false, name: "" };

export function readSession(): Session {
  if (typeof window === "undefined") return GUEST;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return GUEST;
    const parsed = JSON.parse(raw) as Session;
    return parsed?.signedIn ? { signedIn: true, name: parsed.name || "사용자" } : GUEST;
  } catch {
    return GUEST;
  }
}

export function saveSession(s: Session): Session {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* 저장 실패는 데모를 막지 않는다 */
    }
  }
  return s;
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}
