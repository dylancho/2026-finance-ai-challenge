"use client";

import Link from "next/link";
import { useAuth } from "../auth/AuthProvider";

/**
 * 시작 버튼.
 *
 * 로그인 전에는 로그인 화면으로 보내고, 로그인 후에는 곧바로 게이트로 보낸다.
 * 세션을 읽기 전(ready=false)에는 로그인 경로를 기본으로 둔다 — 로그인한 사용자가
 * 로그인 화면에 도착해도 곧바로 되돌려보내지지만, 반대 방향은 게이트가 뚫린다.
 */

interface Props {
  className?: string;
  children: React.ReactNode;
}

export default function StartLink({ className = "btn", children }: Props) {
  const { session, ready } = useAuth();
  const href = ready && session.signedIn ? "/start" : "/login?next=%2Fstart";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
