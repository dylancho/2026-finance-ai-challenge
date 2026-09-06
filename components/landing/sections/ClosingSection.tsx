"use client";

import { useEffect, useRef } from "react";
import Reveal from "../Reveal";
import StartLink from "../StartLink";

/** S9 클로징 CTA. S0 의 어스름 톤을 다시 쓴다 — 수미상관. */
export default function ClosingSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 마운트 직후의 첫 콜백(false)이 Stage 가 켜 둔 다크를 지우면 안 된다 — 들어왔다 나갈 때만 끈다.
    let wasIn = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) document.body.classList.add("ld-dark");
        else if (wasIn) document.body.classList.remove("ld-dark");
        wasIn = e.isIntersecting;
      },
      { rootMargin: "-68px 0px -100% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (wasIn) document.body.classList.remove("ld-dark");
    };
  }, []);

  return (
    <section ref={ref} className="ld-closing" aria-label="시작">
      <div className="shell-wide">
        <Reveal className="ld-closing-inner" threshold={0.4}>
          <h2>
            오늘의 당신이,
            <br />
            미래의 당신을 지킵니다
          </h2>
          <p>약 11문항, 3분. 실제 금융상품 가입이나 자산 이동은 없는 데모입니다.</p>
          <StartLink className="btn light lg">지금 기록 시작하기</StartLink>
        </Reveal>
      </div>
    </section>
  );
}
