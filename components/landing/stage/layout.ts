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
  /** DOM 의 offsetParent 는 Element 로 타입돼 있어 넓게 받는다 */
  offsetParent: Box | Element | null;
}

export function layoutOffset(el: Box, root: Box): { left: number; top: number } {
  let left = 0;
  let top = 0;
  let cur: Box | null = el;
  while (cur && cur !== root) {
    left += cur.offsetLeft;
    top += cur.offsetTop;
    cur = cur.offsetParent as Box | null;
  }
  return { left, top };
}

/** el 의 레이아웃 중심 (root 좌표) */
export function layoutCenter(el: Box, root: Box): { x: number; y: number } {
  const o = layoutOffset(el, root);
  return { x: o.left + el.offsetWidth / 2, y: o.top + el.offsetHeight / 2 };
}
const center = layoutCenter;

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

/**
 * preserveAspectRatio="xMidYMid slice" 로 꽉 채운 SVG 의 viewBox 좌표 (px, py) 가
 * 실제 화면(W×H)에서 어디에 오는지. 문 장면의 우편 투입구 위치를 DOM 고지서에 맞출 때 쓴다.
 */
export function sliceToScreen(
  vw: number,
  vh: number,
  W: number,
  H: number,
  px: number,
  py: number,
): { x: number; y: number; s: number } {
  const s = Math.max(W / vw, H / vh);
  return { x: (W - vw * s) / 2 + px * s, y: (H - vh * s) / 2 + py * s, s };
}
