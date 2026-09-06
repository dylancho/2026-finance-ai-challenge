/**
 * Stage 마스터 타임라인의 구간 표.
 *
 * 단위는 GSAP 타임라인 "초" 지만 scrub 이라 실제로는 스크롤 거리 비율이다.
 * 총 TOTAL 단위 = 스크롤 900vh. 스토리보드 배분(S0 350 / CH1 250 / CH2 150 / TR 120 vh)
 * 을 대략 40 : 29 : 17 : 14 로 옮겼다.
 */
export const T = {
  s0Still: 0, // 비트 A·B: 사람이 문틈에서 고지서를 꺼낸다 (0→6)
  s0Bill: 6, // 비트 C: 카메라 푸시인 — 고지서 중앙 클로즈업 + 카피1
  s0Laptop: 14, // 노트북이 아래에서 떠오른다 (14→20)
  s0Flip: 17, // 조각 FLIP → 집행 일지. 노트북이 아직 올라오는 중에 시작해 고지서를 오래 두지 않는다
  s0Full: 32, // 노트북 풀스크린
  ch1Enter: 40, // 우측으로 물러앉음, 칼럼 오픈, 01 일상
  ch1Beat1: 46,
  ch1Beat2: 56,
  ch1Beat3: 66,
  ch2: 76, // 딥네이비, 02 보호, 경고 줄, 알림 부상
  tr: 92, // 알림 → 낙폭 모핑
  trHold: 112,
} as const;

export const TOTAL = 118;

/** 헤더를 어둡게 두는 진행 구간 (0~1). S0·CH1 은 밝은 장면이라 CH2 부터다. */
export const DARK: [number, number][] = [[T.ch2 / TOTAL, 1]];

export function isDark(progress: number): boolean {
  return DARK.some(([a, b]) => progress >= a && progress <= b);
}
