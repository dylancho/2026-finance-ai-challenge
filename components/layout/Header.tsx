"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { endTour, startTour, TOUR_PERSONA, useTour } from "../../lib/demo/tour";

export default function Header() {
  const { session, ready, signOut } = useAuth();
  const pathname = usePathname();
  const touring = useTour();

  /**
   * 2026-09-06 둘러보기. 저장소를 갈아끼운 뒤 전체 내비게이션으로 넘어간다 — 세션
   * 컨텍스트와 각 화면의 셸이 마운트 시점에 저장소를 읽으므로, 클라이언트 라우팅으로는
   * 같은 화면에 서 있을 때 갱신되지 않는다.
   */
  const start = () => {
    startTour();
    window.location.assign("/plan");
  };
  const end = () => {
    endTour();
    window.location.assign("/");
  };

  const tourButton = (
    <button type="button" className="btn outline sm" onClick={start}>
      둘러보기
    </button>
  );

  return (
    <>
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
                  {/* 2026-09-06: 이력 연동은 게이트→인터뷰 사이 단계가 아니라 여기서 들어간다.
                      시작하기와 같은 "준비" 성격이라 좁은 화면에서는 함께 숨긴다. */}
                  <Link href="/ledger" className="hide-sm">
                    이력 연동
                  </Link>
                  <Link href="/plan">내 설계서</Link>
                  <Link href="/simulation">미리보기</Link>
                  <Link href="/events">상황 변화</Link>
                  <Link href="/fraud-shield">금융 보호</Link>
                  {/* 둘러보는 중에는 안내 바가 나가는 길을 맡는다. 좁은 화면에서는
                      시작하기·이력 연동과 함께 숨긴다 — 로그아웃하면 로그인 옆에 다시 보인다. */}
                  {!touring && <span className="hide-sm">{tourButton}</span>}
                  <button className="nav-signout" onClick={signOut}>
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  {tourButton}
                  <Link
                    href={`/login?next=${encodeURIComponent(pathname === "/login" ? "/start" : pathname)}`}
                    className="btn sm"
                  >
                    로그인
                  </Link>
                </>
              ))}
          </nav>
        </div>
      </header>

      {ready && touring && (
        <div className="tour-bar" role="status">
          <div className="shell-wide tour-bar-inner">
            <p>
              <b>둘러보기 중</b> · {TOUR_PERSONA} 예시 데이터로 모든 기능을 볼 수 있습니다. 답변은
              가상이며 인터뷰를 거치지 않았습니다.
            </p>
            <button type="button" className="tour-exit" onClick={end}>
              내 데이터로 돌아가기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
