"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 긴 섹션(예: height 220vh) 안에 sticky 화면을 두고, 사용자가 그 섹션을 얼마나
 * 지나왔는지를 0~1 로 돌려준다. 토스식 "내릴수록 장면이 바뀌는" 연출의 기반이다.
 *
 * 0: 섹션 상단이 뷰포트 상단에 닿은 시점. 1: sticky 화면이 풀리기 직전.
 * 움직임 줄이기 설정이면 항상 1 (완성된 장면만 보인다).
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) {
        setProgress(rect.top < window.innerHeight * 0.5 ? 1 : 0);
        return;
      }
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}
