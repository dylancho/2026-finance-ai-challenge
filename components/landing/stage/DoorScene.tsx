import { Person } from "./Person";

/**
 * S0 오프닝의 현관문 장면 — 한국 아파트 철문 앞에 선 사람. 실사 대신 밝고 평평한 일러스트(토스풍).
 *
 * 와이드 숏이다: 문 전체가 벽과 함께 화면 중앙 근처에 실제 비례로 보이고(데스크톱에서 세로 ≈ 60%),
 * 사람은 도어락 쪽에 서서 문짝과 문틀 사이 "문틈"에 꽂힌 고지서로 팔을 뻗는다. 고지서는 DOM(.ld-bill-wrap)
 * 이고 왼쪽 일부가 문틈 선 안쪽으로 clip-path 로 잘려 있다가 스크롤에 따라 옆으로 빠져나온다.
 * 그래서 문틈은 폭이 일정한 진짜 어두운 홈으로 읽혀야 한다 — 종이가 그 홈에서 나온다.
 *
 * 좌표는 viewBox(1600×1000) 기준이며 Stage 가 sliceToScreen 으로 화면 좌표로 옮긴다.
 * viewBox 를 16:10 으로 둔 이유: slice 는 세로가 남는 쪽을 맞추므로, 세로 화면(390×844)에서 보이는 가로 폭이
 * 1000/844×390 ≈ 462 단위가 되어 문틀 왼쪽(570) ~ 사람 오른쪽(1026) 구도가 잘리지 않고 들어온다.
 * 데스크톱(16:9)에서는 0.9배로 조금 작아질 뿐이다(문 세로 ≈ 화면의 55%).
 */

const FRAME_X = 570; // 문틀 바깥 왼쪽
const FRAME_W = 268;
const FRAME_T = 26; // 문틀 두께
const GAP = 8; // 문짝과 문틀 사이 틈 — 모바일(≈0.84배)에서도 한 줄로 또렷이 보이는 폭
const DOOR_TOP = 264; // 문틀 바깥 위
const LEAF_X = FRAME_X + FRAME_T + GAP; // 문짝 왼쪽
const LEAF_R = FRAME_X + FRAME_W - FRAME_T - GAP; // 문짝 오른쪽 = 고지서가 꽂히는 틈의 왼쪽
const LEAF_TOP = DOOR_TOP + FRAME_T + GAP;
const FLOOR = 820; // 문 아래 = 바닥 선. Person 의 발도 여기 선다 (Person.FLOOR 와 같아야 한다)
const LOCK_Y = FLOOR - 270; // 도어락 위 — 고지서 아래, 손잡이 높이

export const DOOR = {
  vw: 1600,
  vh: 1000,
  /** 고지서가 꽂힌 문틈 — 오른쪽(도어락 쪽) 틈. x 는 틈의 왼쪽(문짝 모서리), w 는 틈 폭, y 는 꽂힌 높이(고지서 세로 중심) */
  gap: { x: LEAF_R, w: GAP, y: 520 },
} as const;

export function DoorBack() {
  const id = "ldDoorK";
  const leafW = LEAF_R - LEAF_X;
  const leafH = FLOOR - LEAF_TOP;
  return (
    <svg className="ld-doorart" viewBox={`0 0 ${DOOR.vw} ${DOOR.vh}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6fa" />
          <stop offset="1" stopColor="#e6eaf0" />
        </linearGradient>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c3c9d3" />
          <stop offset="0.5" stopColor="#d6dbe3" />
          <stop offset="1" stopColor="#b4bbc7" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ede9e1" />
          <stop offset="0.55" stopColor="#e3ded4" />
          <stop offset="1" stopColor="#d4cec2" />
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
          <stop offset="0" stopColor="#dfe3ea" />
          <stop offset="1" stopColor="#cfd4dd" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`${id}-softer`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* 벽 */}
      <rect width="1600" height="1000" fill={`url(#${id}-wall)`} />
      {/* 복도 걸레받이 — 바닥과 벽 사이 띠 */}
      <rect x="0" y={FLOOR - 18} width="1600" height="18" fill="#d5dae2" />
      <rect x="0" y={FLOOR - 18} width="1600" height="2" fill="rgba(255,255,255,0.6)" />

      {/* 문틀이 벽에 드리우는 옅은 그림자 */}
      <rect x={FRAME_X - 8} y={DOOR_TOP - 4} width={FRAME_W + 28} height={FLOOR - DOOR_TOP + 8} fill="rgba(12,28,54,0.12)" filter={`url(#${id}-softer)`} />
      {/* 문틀 */}
      <rect x={FRAME_X} y={DOOR_TOP} width={FRAME_W} height={FLOOR - DOOR_TOP} rx="2" fill={`url(#${id}-frame)`} />
      <rect x={FRAME_X} y={DOOR_TOP} width="5" height={FLOOR - DOOR_TOP} fill="rgba(255,255,255,0.55)" />
      <rect x={FRAME_X} y={DOOR_TOP} width={FRAME_W} height="5" fill="rgba(255,255,255,0.45)" />
      <rect x={FRAME_X + FRAME_W - 5} y={DOOR_TOP} width="5" height={FLOOR - DOOR_TOP} fill="rgba(12,28,54,0.14)" />
      {/* 문틈 (어두운 홈) — 고지서는 오른쪽 틈에 꽂힌다. 폭 GAP 그대로 한 줄로 보여야 한다 */}
      <rect x={FRAME_X + FRAME_T} y={DOOR_TOP + FRAME_T} width={FRAME_W - FRAME_T * 2} height={FLOOR - DOOR_TOP - FRAME_T} fill="#2a303c" />
      {/* 틈 안쪽 깊이감: 문틀 쪽은 더 어둡고 문짝 쪽으로 살짝 밝아진다 */}
      <rect x={LEAF_R} y={DOOR_TOP + FRAME_T} width={GAP} height={FLOOR - DOOR_TOP - FRAME_T} fill="#1c212b" />
      <rect x={LEAF_R} y={DOOR_TOP + FRAME_T} width="2" height={FLOOR - DOOR_TOP - FRAME_T} fill="rgba(255,255,255,0.08)" />

      {/* 문짝 (철문) */}
      <rect x={LEAF_X} y={LEAF_TOP} width={leafW} height={leafH} fill={`url(#${id}-leaf)`} />
      <rect x={LEAF_X} y={LEAF_TOP} width={leafW} height={leafH} fill={`url(#${id}-leafSheen)`} />
      {/* 큰 사각 몰딩 선 */}
      <rect x={LEAF_X + 22} y={LEAF_TOP + 64} width={leafW - 44} height={leafH - 150} rx="2" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <rect x={LEAF_X + 24} y={LEAF_TOP + 66} width={leafW - 48} height={leafH - 154} rx="2" fill="none" stroke="rgba(12,28,54,0.12)" strokeWidth="1.5" />

      {/* 호수 표찰 */}
      <rect x={LEAF_X + 14} y={LEAF_TOP + 18} width="54" height="22" rx="3" fill="#ffffff" />
      <rect x={LEAF_X + 14} y={LEAF_TOP + 18} width="54" height="22" rx="3" fill="none" stroke="rgba(12,28,54,0.14)" strokeWidth="1.2" />
      <text x={LEAF_X + 41} y={LEAF_TOP + 34} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0c1c36" fontFamily="var(--mono), monospace">
        1203
      </text>
      {/* 외시경 */}
      <circle cx={LEAF_X + leafW / 2} cy={LEAF_TOP + 122} r="8" fill="#1f2633" />
      <circle cx={LEAF_X + leafW / 2} cy={LEAF_TOP + 122} r="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={LEAF_X + leafW / 2 - 2.5} cy={LEAF_TOP + 119.5} r="2" fill="rgba(255,255,255,0.45)" />

      {/* 디지털 도어락 — 고지서(gap.y)보다 아래, 손잡이 높이 */}
      <rect x={LEAF_R - 62} y={LOCK_Y} width="40" height="112" rx="8" fill={`url(#${id}-lock)`} />
      <rect x={LEAF_R - 62} y={LOCK_Y} width="40" height="112" rx="8" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
      <rect x={LEAF_R - 55} y={LOCK_Y + 11} width="26" height="40" rx="4" fill="#111620" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}${c}`} cx={LEAF_R - 49 + c * 7} cy={LOCK_Y + 19 + r * 8} r="1.4" fill="rgba(140,170,220,0.4)" />
        )),
      )}
      <circle cx={LEAF_R - 42} cy={LOCK_Y + 63} r="2.6" fill="#3b82f6" />
      <circle cx={LEAF_R - 42} cy={LOCK_Y + 63} r="6" fill="rgba(59,130,246,0.3)" filter={`url(#${id}-soft)`} />
      {/* 레버 손잡이 */}
      <rect x={LEAF_R - 58} y={LOCK_Y + 72} width="11" height="34" rx="5.5" fill="#2c3546" />
      <rect x={LEAF_R - 58} y={LOCK_Y + 72} width="11" height="34" rx="5.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />

      {/* 문짝 가장자리 — 틈 쪽 모서리는 그늘, 경첩 쪽은 하이라이트 */}
      <rect x={LEAF_R - 3} y={LEAF_TOP} width="3" height={leafH} fill="rgba(12,28,54,0.16)" />
      <rect x={LEAF_X} y={LEAF_TOP} width="2" height={leafH} fill="rgba(255,255,255,0.5)" />

      {/* 바닥 타일 */}
      <rect x="0" y={FLOOR} width="1600" height={1000 - FLOOR} fill={`url(#${id}-floor)`} />
      <rect x="0" y={FLOOR} width="1600" height="2" fill="rgba(255,255,255,0.7)" />
      {[80, 400, 720, 1040, 1360].map((x) => (
        <rect key={x} x={x} y={FLOOR} width="2" height={1000 - FLOOR} fill="rgba(12,28,54,0.08)" />
      ))}
      <rect x="0" y={FLOOR + 66} width="1600" height="2" fill="rgba(12,28,54,0.06)" />
      {/* 문 아래 그림자 + 현관 매트 */}
      <rect x={FRAME_X - 16} y={FLOOR} width={FRAME_W + 32} height="24" fill="rgba(12,28,54,0.16)" filter={`url(#${id}-soft)`} />
      <rect x={LEAF_X - 6} y={FLOOR + 10} width={leafW + 12} height="30" rx="4" fill="#c6ccd6" />
      <rect x={LEAF_X - 6} y={FLOOR + 10} width={leafW + 12} height="30" rx="4" fill="none" stroke="rgba(12,28,54,0.10)" strokeWidth="1.5" />

      {/* 사람 — 문 앞(도어락 쪽). DOM 고지서는 이 SVG 위 겹이라 뻗은 팔 끝의 손은 고지서 래퍼 안에 있다 */}
      <Person />
    </svg>
  );
}
