/**
 * Stage 마스터 타임라인의 구간 표.
 *
 * 단위는 GSAP 타임라인 "초" 지만 scrub 이라 실제로는 스크롤 거리 비율이다.
 * 총 TOTAL 단위 = 스크롤 800vh. 스토리보드 배분(S0 / CH1 / CH2 / TR)을 대략 28 : 30 : 16 : 26 으로 옮겼다.
 * 2026-09-07: S0 꼬리를 12 단위 잘랐다 — 노트북이 다 커진 뒤 가만히 있다가 오른쪽으로 가서 늘어졌다.
 * 이후 구간은 통째로 -12 이동, 스크롤 길이도 9vh → 8vh 로 줄여 단위당 스크롤 속도를 그대로 뒀다.
 */
export const T = {
  s0Still: 0, // 비트 A·B: 사람이 문틈에서 고지서를 꺼낸다 (0→6)
  s0Bill: 6, // 비트 C: 카메라 푸시인 — 고지서 중앙 클로즈업
  s0Laptop: 14, // 노트북이 아래에서 떠오른다 (14→20)
  s0Flip: 17, // 조각 FLIP → 집행 일지. 노트북이 아직 올라오는 중에 시작해 고지서를 오래 두지 않는다
  s0Full: 21, // 고지서가 사라지자마자 노트북이 커지기 시작한다 — 조각이 날아가는 동안 함께 (21→28)
  ch1Enter: 28, // 마지막 글자가 앉고(25.2) 조금 뒤, 다 커지길 기다리지 않고 우측으로 물러앉는다
  ch1Beat1: 34,
  ch1Beat2: 44,
  ch1Beat3: 54,
  ch2: 64, // 딥네이비, 02 보호, 경고 줄, 알림 부상
  tr: 80, // 알림 → 낙폭 모핑
  trHold: 100,
} as const;

export const TOTAL = 106;

/** 헤더를 어둡게 두는 진행 구간 (0~1). S0·CH1 은 밝은 장면이라 CH2 부터다. */
export const DARK: [number, number][] = [[T.ch2 / TOTAL, 1]];

export function isDark(progress: number): boolean {
  return DARK.some(([a, b]) => progress >= a && progress <= b);
}
