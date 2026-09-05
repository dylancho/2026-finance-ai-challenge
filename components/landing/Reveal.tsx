"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * 스크롤 진입 애니메이션.
 *
 * 요소가 뷰포트에 일정 비율 들어오면 `in` 클래스를 붙인다. 한 번 나타나면 유지한다.
 * 라이브러리 없이 IntersectionObserver + CSS transition 으로만 한다 — 오프라인 데모에서도
 * 의존성 없이 돌아야 한다. 움직임 줄이기 설정이면 관찰하지 않고 바로 보인다.
 */

interface Props {
  children: ReactNode;
  className?: string;
  /** ms. 같은 섹션 안에서 순차 등장에 쓴다. */
  delay?: number;
  /** 뷰포트에 이만큼 들어오면 시작 (0~1) */
  threshold?: number;
  as?: "div" | "section" | "li" | "span";
  style?: CSSProperties;
}

export default function Reveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.25,
  as: Tag = "div",
  style,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal${shown ? " in" : ""}${className ? ` ${className}` : ""}`}
      style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
