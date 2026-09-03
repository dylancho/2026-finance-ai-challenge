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
  /**
   * 홈 화면 카테고리 버튼에서 넘어올 때의 관심 챕터. 어느 버튼을 눌러도 같은
   * 게이트→이력→코어 인터뷰로 들어가고, 코어를 마친 뒤 챕터 제안 화면에서
   * 이 챕터가 최상단·선택된 상태로 보인다.
   */
  focus?: string;
}

export default function StartLink({ className = "btn", children, focus }: Props) {
  const { session, ready } = useAuth();
  const startPath = focus ? `/start?focus=${encodeURIComponent(focus)}` : "/start";
  const href =
    ready && session.signedIn ? startPath : `/login?next=${encodeURIComponent(startPath)}`;

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
