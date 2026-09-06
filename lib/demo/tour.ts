import { useSyncExternalStore } from "react";
import { demoProfile, saveProfile } from "../profile";
import { applyDemoLedger } from "../ledger/store";
import { GUEST, readSession, saveSession, type Session } from "../auth";
import { clearDecisions } from "../advising/store";
import { applyDemoAuthority } from "../authority/store";
import { RULE_STORAGE_KEY } from "../fraud/rule";

/**
 * 둘러보기 (2026-09-06).
 *
 * 심사위원은 41문항 인터뷰를 다 답할 수 없다. 헤더의 "둘러보기" 는 심사용 완성 데이터
 * K(김영수, docs/demo-data-plan.md) 를 프로필·이력에 심어 지출·신탁·후견 설계서, 이력
 * 대조, 미리보기, 상황 변화, 의뢰서, 금융 보호까지 모든 화면이 채워진 상태로 만든다.
 *
 * 들어가기 전 상태는 통째로 백업했다가 "내 데이터로 돌아가기" 에서 되돌린다. 이미
 * 둘러보는 중이면 백업을 덮어쓰지 않는다 — 두 번 눌러도 처음 상태가 살아 있어야 한다.
 * 서버 호출은 없다. 저장소만 만진다.
 */

export const TOUR_KEY = "next.tour.v1";
export const TOUR_BACKUP_KEY = "next.tour.backup.v1";
/** DEMO_PROFILES · DEMO_LEDGER_SEEDS 의 키 */
export const TOUR_DEMO = "K";
export const TOUR_VISITOR = "둘러보는 분";
export const TOUR_PERSONA = "김영수(68)";

/**
 * 둘러보기가 덮어쓰는 저장소 키 전부. 각 모듈이 키를 비공개 상수로 두고 있어 여기 다시
 * 적는다. 새 저장소가 생기면 여기에도 더해야 되돌리기가 완전하다.
 */
export const TOUR_KEYS: readonly string[] = [
  "next.profile.v2", // lib/profile.ts
  "next.ledger.v1", // lib/ledger/store.ts
  "next.auth.v1", // lib/auth.ts
  "next.decisions.v1", // lib/advising/store.ts
  "next.authority.v1", // lib/authority/store.ts
  RULE_STORAGE_KEY, // lib/fraud/rule.ts
];

const EVENT = "next:tour";

type Snapshot = Record<string, string | null>;

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* 이벤트를 못 보내도 다음 마운트에서 저장소를 다시 읽는다 */
  }
}

export function isTouring(): boolean {
  return storage()?.getItem(TOUR_KEY) === TOUR_DEMO;
}

/** 둘러보기 이전 상태. 없으면 null (아직 둘러보기 전이거나 백업이 깨졌다). */
export function readTourBackup(): Snapshot | null {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(TOUR_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 둘러보기 시작. 현재 상태를 백업하고 K 를 심는다.
 * 로그아웃 상태면 "둘러보는 분" 으로 로그인시킨다 — 설계서·미리보기 화면은 세션을 전제로 한다.
 */
export function startTour(): void {
  const ls = storage();
  if (!ls) return;

  if (!isTouring()) {
    const snap: Snapshot = {};
    for (const k of TOUR_KEYS) snap[k] = ls.getItem(k);
    try {
      ls.setItem(TOUR_BACKUP_KEY, JSON.stringify(snap));
    } catch {
      /* 백업 실패는 둘러보기를 막지 않는다 */
    }
  }

  if (!readSession().signedIn) saveSession({ signedIn: true, name: TOUR_VISITOR });

  const profile = demoProfile(TOUR_DEMO);
  if (profile) saveProfile(profile);
  applyDemoLedger(TOUR_DEMO);

  // 이전에 남긴 판정 원장·체결 상태·이달의 보호 룰은 지운다. 둘러보기는 항상 처음부터다.
  clearDecisions();
  applyDemoAuthority();
  ls.removeItem(RULE_STORAGE_KEY);

  ls.setItem(TOUR_KEY, TOUR_DEMO);
  notify();
}

/**
 * 둘러보기 종료. 백업을 되돌리고 표식을 지운다.
 * 백업이 비어 있던 키는 지운다 — 둘러보기 전이 빈 상태였으면 빈 상태로 돌아간다.
 * 되돌린 뒤의 세션을 돌려주므로 호출한 쪽이 화면 상태를 맞출 수 있다.
 */
export function endTour(): Session {
  const ls = storage();
  if (!ls) return GUEST;

  const snap = readTourBackup() ?? {};
  for (const k of TOUR_KEYS) {
    const v = snap[k];
    if (typeof v === "string") ls.setItem(k, v);
    else ls.removeItem(k);
  }
  ls.removeItem(TOUR_BACKUP_KEY);
  ls.removeItem(TOUR_KEY);
  notify();
  return readSession();
}

/* ── 훅 ─────────────────────────────────────────────── */

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** 서버 렌더와 첫 클라이언트 렌더에서는 false. 헤더가 하이드레이션 뒤에만 안내 바를 그린다. */
export function useTour(): boolean {
  return useSyncExternalStore(subscribe, isTouring, () => false);
}
