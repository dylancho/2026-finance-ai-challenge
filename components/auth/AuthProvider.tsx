"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clearSession, GUEST, readSession, saveSession, type Session } from "../../lib/auth";

interface AuthValue {
  session: Session;
  /** 서버 렌더와 첫 클라이언트 렌더에서는 false. 하이드레이션 불일치를 막는다. */
  ready: boolean;
  signIn: (name?: string) => void;
  signOut: () => void;
}

const Ctx = createContext<AuthValue>({
  session: GUEST,
  ready: false,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(GUEST);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const signIn = useCallback((name = "사용자") => {
    setSession(saveSession({ signedIn: true, name }));
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(GUEST);
  }, []);

  const value = useMemo(
    () => ({ session, ready, signIn, signOut }),
    [session, ready, signIn, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
