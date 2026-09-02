import { describe, expect, it, vi, afterEach } from "vitest";
import { callerKey, guard, take, type LimitSpec } from "../ratelimit";

const SPEC: LimitSpec = { windowMs: 1000, max: 3 };
const WIDE: LimitSpec = { windowMs: 1000, max: 1_000 };

/** 테스트마다 다른 키를 써서 모듈 전역 버킷이 서로 새지 않게 한다. */
let n = 0;
const key = () => `t${n++}`;

afterEach(() => {
  vi.useRealTimers();
});

describe("take", () => {
  it("한도까지는 통과시키고 그 다음부터 막는다", () => {
    const k = key();
    expect(take(k, SPEC).ok).toBe(true);
    expect(take(k, SPEC).ok).toBe(true);
    expect(take(k, SPEC).ok).toBe(true);
    expect(take(k, SPEC).ok).toBe(false);
  });

  it("막을 때 재시도까지 남은 초를 알려준다", () => {
    const k = key();
    for (let i = 0; i < SPEC.max; i++) take(k, SPEC);
    const r = take(k, SPEC);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
    expect(r.retryAfter).toBeLessThanOrEqual(1);
  });

  it("키가 다르면 서로의 한도를 먹지 않는다", () => {
    const a = key();
    const b = key();
    for (let i = 0; i < SPEC.max; i++) take(a, SPEC);
    expect(take(a, SPEC).ok).toBe(false);
    expect(take(b, SPEC).ok).toBe(true);
  });

  it("창이 지나면 다시 열린다", () => {
    vi.useFakeTimers();
    const k = key();
    for (let i = 0; i < SPEC.max; i++) take(k, SPEC);
    expect(take(k, SPEC).ok).toBe(false);
    vi.advanceTimersByTime(SPEC.windowMs + 1);
    expect(take(k, SPEC).ok).toBe(true);
  });
});

describe("callerKey", () => {
  it("x-forwarded-for 의 첫 주소를 쓴다", () => {
    const req = new Request("http://x/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(callerKey(req)).toBe("1.2.3.4");
  });

  it("헤더가 없으면 unknown 으로 묶는다", () => {
    expect(callerKey(new Request("http://x/"))).toBe("unknown");
  });
});

describe("guard", () => {
  const reqFrom = (ip: string) =>
    new Request("http://x/", { headers: { "x-forwarded-for": ip } });

  it("호출자별로 따로 센다", () => {
    const route = key();
    for (let i = 0; i < SPEC.max; i++) guard(reqFrom("1.1.1.1"), route, SPEC, WIDE);
    expect(guard(reqFrom("1.1.1.1"), route, SPEC, WIDE).ok).toBe(false);
    expect(guard(reqFrom("2.2.2.2"), route, SPEC, WIDE).ok).toBe(true);
  });

  it("IP 를 바꿔도 전체 한도에 걸리면 막는다", () => {
    const route = key();
    const global: LimitSpec = { windowMs: 1000, max: 2 };
    expect(guard(reqFrom("1.1.1.1"), route, SPEC, global).ok).toBe(true);
    expect(guard(reqFrom("2.2.2.2"), route, SPEC, global).ok).toBe(true);
    expect(guard(reqFrom("3.3.3.3"), route, SPEC, global).ok).toBe(false);
  });
});
