import { describe, it, expect } from "vitest";
import { layoutOffset, fitDelta, centerDelta, layoutCenter, type Box } from "../layout";

const box = (l: number, t: number, w: number, h: number, parent: Box | null = null): Box => ({
  offsetLeft: l,
  offsetTop: t,
  offsetWidth: w,
  offsetHeight: h,
  offsetParent: parent,
});

describe("layoutOffset", () => {
  it("offsetParent 체인을 root 까지 더한다", () => {
    const root = box(0, 0, 1000, 800);
    const col = box(500, 100, 400, 600, root);
    const el = box(20, 30, 100, 40, col);
    expect(layoutOffset(el, root)).toEqual({ left: 520, top: 130 });
  });
  it("root 자신은 0", () => {
    const root = box(0, 0, 1000, 800);
    expect(layoutOffset(root, root)).toEqual({ left: 0, top: 0 });
  });
});

describe("fitDelta", () => {
  it("중심 이동량과 폭 비율 스케일을 낸다", () => {
    const root = box(0, 0, 1000, 800);
    const src = box(100, 100, 200, 50, root);
    const dst = box(600, 500, 100, 25, root);
    expect(fitDelta(src, dst, root)).toEqual({ x: 450, y: 387.5, scale: 0.5 });
  });
});

describe("centerDelta", () => {
  it("요소 중심을 root 중심으로 보낸다", () => {
    const root = box(0, 0, 1000, 800);
    const el = box(700, 600, 200, 100, root);
    expect(centerDelta(el, root)).toEqual({ x: -300, y: -250 });
  });
});

describe("layoutCenter", () => {
  it("중첩된 요소의 중심을 root 좌표로 낸다", () => {
    const root = box(0, 0, 1000, 800);
    const col = box(500, 100, 400, 600, root);
    const el = box(20, 30, 100, 40, col);
    expect(layoutCenter(el, root)).toEqual({ x: 570, y: 150 });
  });
});
