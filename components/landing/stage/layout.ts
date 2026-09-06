/**
 * 레이아웃 좌표 헬퍼.
 *
 * offsetLeft/offsetTop 은 CSS transform 을 무시한다. 그래서 GSAP 이 요소를 움직이는 중에도
 * "제자리(transform 없는) 좌표" 를 얻을 수 있고, Stage 의 FLIP 은 전부 이 좌표로 계산한다.
 * 리사이즈 시 ScrollTrigger 가 함수형 값을 다시 부르면 그대로 맞는다.
 */
export interface Box {
  offsetLeft: number;
  offsetTop: number;
  offsetWidth: number;
  offsetHeight: number;
  offsetParent: Box | null;
}

export function layoutOffset(el: Box, root: Box): { left: number; top: number } {
  let left = 0;
  let top = 0;
  let cur: Box | null = el;
  while (cur && cur !== root) {
    left += cur.offsetLeft;
    top += cur.offsetTop;
    cur = cur.offsetParent;
  }
  return { left, top };
}

const center = (el: Box, root: Box) => {
  const o = layoutOffset(el, root);
  return { x: o.left + el.offsetWidth / 2, y: o.top + el.offsetHeight / 2 };
};

/** src 를 dst 자리·크기로 보내는 transform (transform-origin: center 기준) */
export function fitDelta(src: Box, dst: Box, root: Box): { x: number; y: number; scale: number } {
  const a = center(src, root);
  const b = center(dst, root);
  return { x: b.x - a.x, y: b.y - a.y, scale: dst.offsetWidth / src.offsetWidth };
}

/** el 중심을 root 중심으로 보내는 이동량 */
export function centerDelta(el: Box, root: Box): { x: number; y: number } {
  const c = center(el, root);
  return { x: root.offsetWidth / 2 - c.x, y: root.offsetHeight / 2 - c.y };
}
