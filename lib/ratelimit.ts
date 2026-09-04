/**
 * LLM 라우트용 호출 제한.
 *
 * 심사 기간 동안 URL 이 공개되므로, 누가 /api/ai/* 를 스크립트로 두들기면
 * 요금이 실제로 튄다. 모델을 낮추는 것보다 이쪽이 훨씬 효과적인 방어다.
 *
 * 인스턴스 메모리에만 산다. Fluid Compute 는 인스턴스를 재사용하므로 사실상
 * 동작하지만, 인스턴스가 여러 개로 늘면 한도도 그만큼 늘어난다. 정확한 상한이
 * 필요하면 Anthropic 콘솔의 spend limit 이 최종 방어선이다 — 이것은 어디까지나
 * 우발적·자동화된 폭주를 막는 1차 저지선이다.
 */

interface Window {
  /** 이 창에서 지금까지 센 호출 수 */
  count: number;
  /** 창이 열린 시각 (ms) */
  openedAt: number;
}

export interface LimitSpec {
  /** 창 길이 (ms) */
  windowMs: number;
  /** 창 하나에서 허용할 호출 수 */
  max: number;
}

export interface LimitResult {
  ok: boolean;
  /** 거절했을 때, 다시 시도해도 되는 시각까지 남은 초 */
  retryAfter: number;
}

const buckets = new Map<string, Window>();

/** 메모리가 무한정 자라지 않도록, 만료된 창을 가끔 걷어낸다. */
function sweep(now: number, windowMs: number) {
  if (buckets.size < 5_000) return;
  for (const [key, w] of buckets) {
    if (now - w.openedAt >= windowMs) buckets.delete(key);
  }
}

export function take(key: string, spec: LimitSpec): LimitResult {
  const now = Date.now();
  sweep(now, spec.windowMs);

  const w = buckets.get(key);
  if (!w || now - w.openedAt >= spec.windowMs) {
    buckets.set(key, { count: 1, openedAt: now });
    return { ok: true, retryAfter: 0 };
  }

  if (w.count >= spec.max) {
    const remain = spec.windowMs - (now - w.openedAt);
    return { ok: false, retryAfter: Math.ceil(remain / 1000) };
  }

  w.count += 1;
  return { ok: true, retryAfter: 0 };
}

/**
 * 호출자 식별자.
 *
 * 프록시가 붙인 헤더만 믿는다. 위조가 가능하므로 인증 수단이 아니라
 * "같은 사람의 반복 호출을 대충 묶는" 용도다.
 */
export function callerKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * 라우트별 한도 + 전체 한도를 함께 본다.
 *
 * 전체 한도는 인스턴스 하나가 심사 기간에 낼 수 있는 총 호출 수의 뚜껑이다.
 * IP 를 바꿔 가며 두들기는 경우를 막는다.
 */
export function guard(
  req: Request,
  route: string,
  spec: LimitSpec,
  globalSpec: LimitSpec,
): LimitResult {
  const global = take(`__all__:${route}`, globalSpec);
  if (!global.ok) return global;
  return take(`${route}:${callerKey(req)}`, spec);
}

/* ── 기본 한도 ──
 * 심사위원 한 사람이 10분 안에 이만큼 자유 입력을 할 일은 없다.
 * 정상 사용을 막지 않으면서 스크립트 폭주는 잡는 선이다. */

export const PER_CALLER: LimitSpec = { windowMs: 10 * 60_000, max: 30 };
export const PER_CALLER_SLOW: LimitSpec = { windowMs: 10 * 60_000, max: 15 };
export const GLOBAL: LimitSpec = { windowMs: 60 * 60_000, max: 600 };
