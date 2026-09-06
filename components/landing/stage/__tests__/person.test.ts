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
    // 손목이 자연 팔꿈치 자리에서 아래팔 길이보다 멀어 정확한 두 관절 해를 쓰는 자세
    const [sx, sy, ex, ey, wx, wy] = pts(armPath(P, { x: 20, y: 140 }));
    expect([sx, sy]).toEqual([100, 100]);
    expect(dist(sx, sy, ex, ey)).toBeCloseTo(50, 0);
    expect(dist(ex, ey, wx, wy)).toBeCloseTo(50, 0);
    expect(wx).toBeCloseTo(20, 0);
    expect(wy).toBeCloseTo(140, 0);
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
  it("손목이 어깨 가까이 오면(종이를 당김) 팔꿈치는 몸 안으로 들어가지 않고 아래·바깥에 머문다", () => {
    // 기본 elbow 방향 108° = 아래, 살짝 −x(문 쪽). 손목이 어깨 오른쪽 가까이 와도 팔꿈치는 −x 쪽 아래
    const [sx, sy, ex, ey] = pts(armPath(P, { x: 112, y: 115 }));
    expect(ex).toBeLessThan(sx);
    expect(ey).toBeGreaterThan(sy + 30);
  });
  it("경로 전체 길이는 자세와 상관없이 위팔+아래팔이다 — dash 비율로 나눈 굵기 경계가 팔꿈치에 머문다", () => {
    const len = (d: string) => {
      const p = pts(d);
      let t = 0;
      for (let i = 2; i < p.length; i += 2) t += dist(p[i - 2], p[i - 1], p[i], p[i + 1]);
      return t;
    };
    expect(len(armPath(P, { x: 112, y: 115 }))).toBeCloseTo(100, 0); // 접힌 팔(되돌아오는 구간 포함)
    expect(len(armPath(P, { x: 30, y: 100 }))).toBeCloseTo(100, 0); // 뻗은 팔
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
