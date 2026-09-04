"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/**
 * 목업 로그인.
 *
 * 실제 소셜 인증과 개인 DB 연동은 후속 과제다. 지금은 버튼을 누르면 그대로
 * 로그인 상태가 되고, ?next= 로 넘어온 곳으로 돌아간다.
 */

export default function LoginShell() {
  const router = useRouter();
  const { session, ready, signIn } = useAuth();
  const [next, setNext] = useState("/start");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("next");
    // 오픈 리다이렉트를 막는다. 같은 앱 안의 경로만 허용.
    if (q && q.startsWith("/") && !q.startsWith("//")) setNext(q);
  }, []);

  useEffect(() => {
    if (ready && session.signedIn) router.replace(next);
  }, [ready, session.signedIn, next, router]);

  return (
    <div className="login shell-wide">
      <div className="login-card">
        <div className="eyebrow">Sign in</div>
        <h1>시작하기 전에 로그인해 주세요</h1>
        <p className="login-lede">
          작성하신 설계서와 금융 이력은 본인만 볼 수 있어야 합니다. 로그인해야 다음에 다시
          오셨을 때 이어서 작성할 수 있습니다.
        </p>

        <div className="login-actions">
          <button className="btn lg" onClick={() => signIn()}>
            로그인하고 시작하기
          </button>
          {/* 심사·시연용. 로그인 화면에서 멈추지 않도록 한 번에 통과시킨다. */}
          <button className="btn outline lg" onClick={() => signIn("둘러보는 분")}>
            로그인 없이 둘러보기
          </button>
        </div>

        <p className="login-note mono">
          프로토타입 · 실제 계정 인증을 수행하지 않습니다. 버튼을 누르면 로그인 상태로만
          전환되며, 어떤 정보도 서버로 전송되지 않습니다. 소셜 로그인과 개인 데이터 저장은
          후속 과제입니다.
        </p>

        <Link href="/" className="login-back">
          ← 홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
