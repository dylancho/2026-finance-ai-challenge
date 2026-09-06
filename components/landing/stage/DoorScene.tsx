/**
 * S0 오프닝의 현관문 장면 — 한국 아파트 철문. 실사 대신 밝고 평평한 일러스트로 그린다(토스풍).
 *
 * 고지서는 우편 투입구가 아니라 문짝과 문틀 사이 "문틈"에 꽂혀 있다(한국식). DOM 고지서의
 * 왼쪽 일부가 문틈 선 안쪽으로 clip-path 로 잘려 있고, 스크롤에 따라 옆으로 빠져나온다.
 * 그래서 문틈은 폭이 일정한 진짜 어두운 홈으로 읽혀야 한다 — 종이가 그 홈에서 나온다.
 *
 * 좌표는 viewBox(1600×900) 기준이며 Stage 가 sliceToScreen 으로 화면 좌표로 옮긴다.
 */

// 카메라가 도어락 쪽에 있는 구도: 문틈(x≈780)이 viewBox 중앙 근처에 와서 모바일 slice 에서도 보인다.
const FRAME_X = 90; // 문틀 바깥 왼쪽
const FRAME_W = 740;
const FRAME_T = 44; // 문틀 두께
const GAP = 12; // 문짝과 문틀 사이 틈 — 모바일(≈0.94배)에서도 한 줄로 또렷이 보이는 폭
const LEAF_X = FRAME_X + FRAME_T + GAP; // 문짝 왼쪽
const LEAF_R = FRAME_X + FRAME_W - FRAME_T - GAP; // 문짝 오른쪽 = 고지서가 꽂히는 틈의 왼쪽
const LEAF_TOP = FRAME_T + GAP;
const LEAF_BOTTOM = 830;

export const DOOR = {
  vw: 1600,
  vh: 900,
  /** 고지서가 꽂힌 문틈 — 오른쪽(도어락 쪽) 틈. x 는 틈의 왼쪽(문짝 모서리), w 는 틈 폭, y 는 꽂힌 높이 */
  gap: { x: LEAF_R, w: GAP, y: 520 },
} as const;

export function DoorBack() {
  const id = "ldDoorK";
  return (
    <svg className="ld-doorart" viewBox={`0 0 ${DOOR.vw} ${DOOR.vh}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f5f9" />
          <stop offset="1" stopColor="#e4e8ef" />
        </linearGradient>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c6ccd6" />
          <stop offset="0.5" stopColor="#d5dae2" />
          <stop offset="1" stopColor="#b7bec9" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ece8e0" />
          <stop offset="0.55" stopColor="#e2ddd3" />
          <stop offset="1" stopColor="#d3cdc1" />
        </linearGradient>
        <linearGradient id={`${id}-leafSheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="0.45" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(12,28,54,0.06)" />
        </linearGradient>
        <linearGradient id={`${id}-lock`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1f2633" />
          <stop offset="0.5" stopColor="#2c3546" />
          <stop offset="1" stopColor="#171d28" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dde1e8" />
          <stop offset="1" stopColor="#d0d5de" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`${id}-softer`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* 벽 */}
      <rect width="1600" height="900" fill={`url(#${id}-wall)`} />

      {/* 문틀이 벽에 드리우는 옅은 그림자 */}
      <rect x={FRAME_X - 6} y="0" width={FRAME_W + 24} height={LEAF_BOTTOM + FRAME_T + 6} fill="rgba(12,28,54,0.10)" filter={`url(#${id}-softer)`} />
      {/* 문틀 */}
      <rect x={FRAME_X} y="0" width={FRAME_W} height={LEAF_BOTTOM + FRAME_T} fill={`url(#${id}-frame)`} />
      <rect x={FRAME_X} y="0" width="6" height={LEAF_BOTTOM + FRAME_T} fill="rgba(255,255,255,0.55)" />
      <rect x={FRAME_X + FRAME_W - 6} y="0" width="6" height={LEAF_BOTTOM + FRAME_T} fill="rgba(12,28,54,0.14)" />
      {/* 문틈 (어두운 홈) — 고지서는 오른쪽 틈에 꽂힌다. 폭 GAP 그대로 한 줄로 보여야 한다 */}
      <rect x={FRAME_X + FRAME_T} y={FRAME_T} width={FRAME_W - FRAME_T * 2} height={LEAF_BOTTOM - FRAME_T + GAP} fill="#2a303c" />
      {/* 틈 안쪽 깊이감: 문틀 쪽은 더 어둡고 문짝 쪽으로 살짝 밝아진다 */}
      <rect x={LEAF_R} y={FRAME_T} width={GAP} height={LEAF_BOTTOM - FRAME_T + GAP} fill="#1c212b" />
      <rect x={LEAF_R} y={FRAME_T} width="3" height={LEAF_BOTTOM - FRAME_T + GAP} fill="rgba(255,255,255,0.08)" />

      {/* 문짝 (철문) */}
      <rect x={LEAF_X} y={LEAF_TOP} width={LEAF_R - LEAF_X} height={LEAF_BOTTOM - LEAF_TOP} fill={`url(#${id}-leaf)`} />
      <rect x={LEAF_X} y={LEAF_TOP} width={LEAF_R - LEAF_X} height={LEAF_BOTTOM - LEAF_TOP} fill={`url(#${id}-leafSheen)`} />
      {/* 큰 사각 몰딩 선 */}
      <rect x={LEAF_X + 60} y={LEAF_TOP + 110} width={LEAF_R - LEAF_X - 120} height={LEAF_BOTTOM - LEAF_TOP - 220} rx="3" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <rect x={LEAF_X + 63} y={LEAF_TOP + 113} width={LEAF_R - LEAF_X - 126} height={LEAF_BOTTOM - LEAF_TOP - 226} rx="3" fill="none" stroke="rgba(12,28,54,0.12)" strokeWidth="2" />

      {/* 호수 표찰 */}
      <rect x={LEAF_X + 40} y={LEAF_TOP + 34} width="96" height="36" rx="4" fill="#ffffff" />
      <rect x={LEAF_X + 40} y={LEAF_TOP + 34} width="96" height="36" rx="4" fill="none" stroke="rgba(12,28,54,0.14)" strokeWidth="1.5" />
      <text x={LEAF_X + 88} y={LEAF_TOP + 59} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0c1c36" fontFamily="var(--mono), monospace">
        1203
      </text>
      {/* 외시경 */}
      <circle cx={(LEAF_X + LEAF_R) / 2} cy="250" r="13" fill="#1f2633" />
      <circle cx={(LEAF_X + LEAF_R) / 2} cy="250" r="13" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <circle cx={(LEAF_X + LEAF_R) / 2 - 4} cy="246" r="3" fill="rgba(255,255,255,0.45)" />

      {/* 디지털 도어락 */}
      <rect x={LEAF_R - 120} y="380" width="72" height="190" rx="12" fill={`url(#${id}-lock)`} />
      <rect x={LEAF_R - 120} y="380" width="72" height="190" rx="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <rect x={LEAF_R - 108} y="398" width="48" height="70" rx="6" fill="#111620" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}${c}`} cx={LEAF_R - 96 + c * 12} cy={412 + r * 14} r="2.2" fill="rgba(140,170,220,0.4)" />
        )),
      )}
      <circle cx={LEAF_R - 84} cy="486" r="4" fill="#3b82f6" />
      <circle cx={LEAF_R - 84} cy="486" r="9" fill="rgba(59,130,246,0.3)" filter={`url(#${id}-soft)`} />
      {/* 레버 손잡이 */}
      <rect x={LEAF_R - 112} y="500" width="18" height="56" rx="9" fill="#2c3546" />
      <rect x={LEAF_R - 112} y="500" width="18" height="56" rx="9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

      {/* 문짝 가장자리 — 틈 쪽 모서리는 그늘, 경첩 쪽은 하이라이트 */}
      <rect x={LEAF_R - 4} y={LEAF_TOP} width="4" height={LEAF_BOTTOM - LEAF_TOP} fill="rgba(12,28,54,0.16)" />
      <rect x={LEAF_X} y={LEAF_TOP} width="3" height={LEAF_BOTTOM - LEAF_TOP} fill="rgba(255,255,255,0.5)" />

      {/* 바닥 타일 */}
      <rect x="0" y={LEAF_BOTTOM + FRAME_T} width="1600" height={900 - LEAF_BOTTOM - FRAME_T} fill={`url(#${id}-floor)`} />
      <rect x="0" y={LEAF_BOTTOM + FRAME_T} width="1600" height="2" fill="rgba(255,255,255,0.7)" />
      {[120, 520, 920, 1320].map((x) => (
        <rect key={x} x={x} y={LEAF_BOTTOM + FRAME_T} width="2" height={900 - LEAF_BOTTOM - FRAME_T} fill="rgba(12,28,54,0.10)" />
      ))}
      {/* 문 아래 그림자 */}
      <rect x={FRAME_X - 20} y={LEAF_BOTTOM + FRAME_T} width={FRAME_W + 40} height="30" fill="rgba(12,28,54,0.18)" filter={`url(#${id}-soft)`} />
    </svg>
  );
}
