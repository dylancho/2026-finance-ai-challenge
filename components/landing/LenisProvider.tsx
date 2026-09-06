"use client";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";

/**
 * 랜딩 라우트 한정 부드러운 스크롤.
 *
 * gsap ticker 에 붙여 ScrollTrigger 와 같은 프레임에 돈다. 움직임 줄이기 설정이면
 * 아무것도 하지 않는다 — 네이티브 스크롤 그대로.
 */
export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    // 검증·디버그용. window.scrollTo 는 Lenis 가 되돌리므로 스크립트 스크롤은 이걸로 한다.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // ScrollTrigger 가 핀 스페이서를 넣으면 문서 높이가 바뀐다. Lenis 는 자기 limit 을 그때
    // 다시 재야 한다 — 안 그러면 옛 문서 끝에서 스크롤이 막힌다.
    const onRefresh = () => lenis.resize();
    ScrollTrigger.addEventListener("refresh", onRefresh);
    ScrollTrigger.refresh();
    return () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);
  return <>{children}</>;
}
