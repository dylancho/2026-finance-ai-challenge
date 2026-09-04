"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";

export default function Header() {
  const { session, ready, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="shell-wide header-inner">
        <Link href="/" aria-label="NEXT 홈">
          <div className="brand">NEXT</div>
        </Link>

        {/* ready 전에는 아무것도 렌더하지 않는다. 서버 렌더에는 세션이 없으므로
            바로 그리면 로그인 상태가 한 번 깜빡이며 뒤집힌다. */}
        <nav className="nav" aria-busy={!ready}>
          {ready &&
            (session.signedIn ? (
              <>
                <Link href="/start" className="hide-sm">
                  시작하기
                </Link>
                <Link href="/plan">내 설계서</Link>
                <Link href="/simulation">미리보기</Link>
                <Link href="/events">상황 변화</Link>
                <button className="nav-signout" onClick={signOut}>
                  로그아웃
                </button>
              </>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(pathname === "/login" ? "/start" : pathname)}`}
                className="btn sm"
              >
                로그인
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
