import { describe, it, expect } from "vitest";
import { armPath, PERSON, HAND } from "../Person";

const P = { shoulder: { x: 100, y: 100 }, upper: 50, fore: 50 };
const pts = (d: string) =>
  d
    .replace(/[ML]/g, " ")
    .trim()
    .split(/\s+/)
    .map(Number);
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

describe("armPath (2관절 IK)", () => {
  it("어깨에서 시작해 팔꿈치를 거쳐 손목에 닿고, 위팔·아래팔 길이를 지킨다", () => {
    const [sx, sy, ex, ey, wx, wy] = pts(armPath(P, { x: 40, y: 130 }));
    expect([sx, sy]).toEqual([100, 100]);
    expect(dist(sx, sy, ex, ey)).toBeCloseTo(50, 0);
    expect(dist(ex, ey, wx, wy)).toBeCloseTo(50, 0);
    expect(wx).toBeCloseTo(40, 0);
    expect(wy).toBeCloseTo(130, 0);
  });
  it("옆으로 뻗을 때 팔꿈치는 아래로 처진다", () => {
    const [, , , ey] = pts(armPath(P, { x: 30, y: 100 }));
    expect(ey).toBeGreaterThan(100);
  });
  it("닿지 않는 손목은 최대로 뻗은 자리로 당긴다 — 팔이 늘어나지 않는다", () => {
    const [sx, sy, , , wx, wy] = pts(armPath(P, { x: -200, y: 100 }));
    expect(dist(sx, sy, wx, wy)).toBeLessThanOrEqual(100);
    expect(dist(sx, sy, wx, wy)).toBeGreaterThan(98);
  });
  it("손목이 어깨와 겹쳐도 NaN 없이 그린다", () => {
    const d = armPath(P, { x: 100, y: 100 });
    expect(d).not.toMatch(/NaN/);
  });
  it("첫 페인트 자세(restWrist)는 실제 팔 길이 안에 있다", () => {
    const reach = Math.hypot(PERSON.restWrist.x - PERSON.shoulder.x, PERSON.restWrist.y - PERSON.shoulder.y);
    expect(reach).toBeLessThan(PERSON.upper + PERSON.fore);
  });
  it("손 박스는 고지서 오른쪽 가장자리에 걸쳐 있다 (엄지는 종이 위, 손목은 종이 밖)", () => {
    expect(HAND.left).toBeLessThan(1);
    expect(HAND.left + HAND.width * HAND.wrist.x).toBeGreaterThan(1);
  });
});
