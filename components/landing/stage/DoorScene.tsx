/**
 * S0 오프닝의 현관문 장면 — 한국 아파트 철문. 실사 대신 정돈된 일러스트로 그린다.
 *
 * 고지서는 우편 투입구가 아니라 문짝과 문틀 사이 "문틈"에 꽂혀 있다(한국식). DOM 고지서의
 * 왼쪽 일부가 문틈 선 안쪽으로 clip-path 로 잘려 있고, 스크롤에 따라 옆으로 빠져나온다.
 *
 * 좌표는 viewBox(1600×900) 기준이며 Stage 가 sliceToScreen 으로 화면 좌표로 옮긴다.
 */

// 카메라가 도어락 쪽에 있는 구도: 문틈(x≈780)이 viewBox 중앙 근처에 와서 모바일 slice 에서도 보인다.
const FRAME_X = 90; // 문틀 바깥 왼쪽
const FRAME_W = 740;
const FRAME_T = 44; // 문틀 두께
const GAP = 10; // 문짝과 문틀 사이 틈
const LEAF_X = FRAME_X + FRAME_T + GAP; // 문짝 왼쪽
const LEAF_R = FRAME_X + FRAME_W - FRAME_T - GAP; // 문짝 오른쪽 = 고지서가 꽂히는 틈의 왼쪽
const LEAF_TOP = FRAME_T + GAP;
const LEAF_BOTTOM = 830;

export const DOOR = {
  vw: 1600,
  vh: 900,
  /** 고지서가 꽂힌 문틈 — 오른쪽(도어락 쪽) 틈의 가운데 x, 꽂힌 높이 y */
  gap: { x: LEAF_R + GAP / 2, y: 520 },
} as const;

export function DoorBack() {
  const id = "ldDoorK";
  return (
    <svg className="ld-doorart" viewBox={`0 0 ${DOOR.vw} ${DOOR.vh}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2e36" />
          <stop offset="1" stopColor="#181a20" />
        </linearGradient>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b3d45" />
          <stop offset="0.5" stopColor="#4a4c55" />
          <stop offset="1" stopColor="#33353c" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a867e" />
          <stop offset="0.55" stopColor="#7a766f" />
          <stop offset="1" stopColor="#605d57" />
        </linearGradient>
        <linearGradient id={`${id}-leafSheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="0.45" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.14)" />
        </linearGradient>
        <linearGradient id={`${id}-lock`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#23252c" />
          <stop offset="0.5" stopColor="#30333b" />
          <stop offset="1" stopColor="#1b1d23" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#25272d" />
          <stop offset="1" stopColor="#0f1015" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* 벽 */}
      <rect width="1600" height="900" fill={`url(#${id}-wall)`} />

      {/* 문틀 */}
      <rect x={FRAME_X} y="0" width={FRAME_W} height={LEAF_BOTTOM + FRAME_T} fill={`url(#${id}-frame)`} />
      <rect x={FRAME_X} y="0" width="6" height={LEAF_BOTTOM + FRAME_T} fill="rgba(255,255,255,0.07)" />
      <rect x={FRAME_X + FRAME_W - 6} y="0" width="6" height={LEAF_BOTTOM + FRAME_T} fill="rgba(0,0,0,0.25)" />
      {/* 문틈 (어두운 홈) — 고지서는 오른쪽 틈에 꽂힌다 */}
      <rect x={FRAME_X + FRAME_T} y={FRAME_T} width={FRAME_W - FRAME_T * 2} height={LEAF_BOTTOM - FRAME_T + GAP} fill="#0b0c10" />

      {/* 문짝 (철문) */}
      <rect x={LEAF_X} y={LEAF_TOP} width={LEAF_R - LEAF_X} height={LEAF_BOTTOM - LEAF_TOP} fill={`url(#${id}-leaf)`} />
      <rect x={LEAF_X} y={LEAF_TOP} width={LEAF_R - LEAF_X} height={LEAF_BOTTOM - LEAF_TOP} fill={`url(#${id}-leafSheen)`} />
      {/* 큰 사각 몰딩 선 */}
      <rect x={LEAF_X + 60} y={LEAF_TOP + 110} width={LEAF_R - LEAF_X - 120} height={LEAF_BOTTOM - LEAF_TOP - 220} rx="3" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="2" />
      <rect x={LEAF_X + 63} y={LEAF_TOP + 113} width={LEAF_R - LEAF_X - 126} height={LEAF_BOTTOM - LEAF_TOP - 226} rx="3" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="2" />

      {/* 호수 표찰 */}
      <rect x={LEAF_X + 40} y={LEAF_TOP + 34} width="96" height="36" rx="4" fill="#d9d4c8" />
      <text x={LEAF_X + 88} y={LEAF_TOP + 59} textAnchor="middle" fontSize="20" fontWeight="700" fill="#2a2a2a" fontFamily="var(--mono), monospace">
        1203
      </text>
      {/* 외시경 */}
      <circle cx={(LEAF_X + LEAF_R) / 2} cy="250" r="13" fill="#15161a" />
      <circle cx={(LEAF_X + LEAF_R) / 2} cy="250" r="13" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <circle cx={(LEAF_X + LEAF_R) / 2 - 4} cy="246" r="3" fill="rgba(255,255,255,0.35)" />

      {/* 디지털 도어락 */}
      <rect x={LEAF_R - 120} y="380" width="72" height="190" rx="12" fill={`url(#${id}-lock)`} />
      <rect x={LEAF_R - 120} y="380" width="72" height="190" rx="12" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      <rect x={LEAF_R - 108} y="398" width="48" height="70" rx="6" fill="#111216" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}${c}`} cx={LEAF_R - 96 + c * 12} cy={412 + r * 14} r="2.2" fill="rgba(140,170,220,0.35)" />
        )),
      )}
      <circle cx={LEAF_R - 84} cy="486" r="4" fill="#3b82f6" />
      <circle cx={LEAF_R - 84} cy="486" r="9" fill="rgba(59,130,246,0.25)" filter={`url(#${id}-soft)`} />
      {/* 레버 손잡이 */}
      <rect x={LEAF_R - 112} y="500" width="18" height="56" rx="9" fill="#2a2c33" />
      <rect x={LEAF_R - 112} y="500" width="18" height="56" rx="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

      {/* 문짝 가장자리 하이라이트 (틈 쪽) */}
      <rect x={LEAF_R - 3} y={LEAF_TOP} width="3" height={LEAF_BOTTOM - LEAF_TOP} fill="rgba(255,255,255,0.12)" />
      <rect x={LEAF_X} y={LEAF_TOP} width="3" height={LEAF_BOTTOM - LEAF_TOP} fill="rgba(0,0,0,0.25)" />

      {/* 바닥 타일 */}
      <rect x="0" y={LEAF_BOTTOM + FRAME_T} width="1600" height={900 - LEAF_BOTTOM - FRAME_T} fill={`url(#${id}-floor)`} />
      <rect x="0" y={LEAF_BOTTOM + FRAME_T} width="1600" height="2" fill="rgba(255,255,255,0.08)" />
      {[120, 520, 920, 1320].map((x) => (
        <rect key={x} x={x} y={LEAF_BOTTOM + FRAME_T} width="2" height={900 - LEAF_BOTTOM - FRAME_T} fill="rgba(0,0,0,0.3)" />
      ))}
      {/* 문 아래 그림자 */}
      <rect x={FRAME_X - 20} y={LEAF_BOTTOM + FRAME_T} width={FRAME_W + 40} height="30" fill="rgba(0,0,0,0.35)" filter={`url(#${id}-soft)`} />
    </svg>
  );
}
