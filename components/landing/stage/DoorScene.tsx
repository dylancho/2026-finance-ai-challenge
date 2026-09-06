/**
 * S0 오프닝의 현관문 장면. 실사 대신 정돈된 일러스트로 그린다.
 *
 * DOM 고지서는 이 그림 위에 놓이고, 투입구 구멍 선 아래를 clip-path 로 잘라 꽂힌 것처럼 보인다.
 * 스크롤에 따라 잘린 부분이 줄어들며 종이가 틈에서 빠져나온다.
 *
 * 좌표는 viewBox(1600×900) 기준이며 Stage 가 sliceToScreen 으로 화면 좌표로 옮긴다.
 */

export const DOOR = {
  vw: 1600,
  vh: 900,
  /** 투입구 구멍(종이가 나오는 틈) — 위쪽 가장자리·중심 */
  slit: { x1: 716, x2: 884, top: 484, bottom: 502 },
  slotCenterX: 800,
} as const;

const DOOR_X = 470;
const DOOR_W = 660;
const PANEL_X = 530;
const PANEL_W = 540;

/** 그라데이션은 userSpaceOnUse — viewBox 좌표에 고정된다. */
function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-wall`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="900">
        <stop offset="0" stopColor="#2b2f3b" />
        <stop offset="1" stopColor="#141720" />
      </linearGradient>
      <linearGradient id={`${id}-door`} gradientUnits="userSpaceOnUse" x1={DOOR_X} y1="0" x2={DOOR_X + DOOR_W} y2="0">
        <stop offset="0" stopColor="#2a3142" />
        <stop offset="0.5" stopColor="#343c50" />
        <stop offset="1" stopColor="#252b3a" />
      </linearGradient>
      <linearGradient id={`${id}-panel`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="900">
        <stop offset="0" stopColor="#2c3446" />
        <stop offset="1" stopColor="#222938" />
      </linearGradient>
      <linearGradient id={`${id}-brass`} gradientUnits="userSpaceOnUse" x1="700" y1="466" x2="900" y2="518">
        <stop offset="0" stopColor="#8f7440" />
        <stop offset="0.45" stopColor="#dcbe78" />
        <stop offset="0.6" stopColor="#b8965a" />
        <stop offset="1" stopColor="#6f562c" />
      </linearGradient>
      <radialGradient id={`${id}-knob`} cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#e2c98a" />
        <stop offset="0.6" stopColor="#9a7b45" />
        <stop offset="1" stopColor="#4d3c1e" />
      </radialGradient>
      <linearGradient id={`${id}-floor`} gradientUnits="userSpaceOnUse" x1="0" y1="820" x2="0" y2="900">
        <stop offset="0" stopColor="#101319" />
        <stop offset="1" stopColor="#07090d" />
      </linearGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
    </defs>
  );
}

/** 문 패널(움푹 들어간 사각 몰딩). 밝은 위·왼쪽 모서리, 어두운 아래·오른쪽 모서리. */
function Panel({ y, h, id }: { y: number; h: number; id: string }) {
  return (
    <g>
      <rect x={PANEL_X} y={y} width={PANEL_W} height={h} rx="4" fill={`url(#${id}-panel)`} />
      <path d={`M${PANEL_X},${y + h} L${PANEL_X},${y} L${PANEL_X + PANEL_W},${y}`} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="6" />
      <path d={`M${PANEL_X},${y + h} L${PANEL_X + PANEL_W},${y + h} L${PANEL_X + PANEL_W},${y}`} fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="6" />
      <rect x={PANEL_X + 22} y={y + 22} width={PANEL_W - 44} height={h - 44} rx="2" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
    </g>
  );
}

/** 현관문 장면: 벽, 문, 투입구, 손잡이, 바닥 */
export function DoorBack() {
  const id = "ldDoorB";
  const { slit } = DOOR;
  return (
    <svg className="ld-doorart" viewBox={`0 0 ${DOOR.vw} ${DOOR.vh}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Defs id={id} />
      <rect width="1600" height="900" fill={`url(#${id}-wall)`} />
      {/* 문틀 */}
      <rect x={DOOR_X - 26} y="-10" width={DOOR_W + 52} height="860" fill="#1a1e29" />
      <rect x={DOOR_X - 26} y="-10" width="10" height="860" fill="rgba(255,255,255,0.06)" />
      {/* 문 */}
      <rect x={DOOR_X} y="0" width={DOOR_W} height="840" fill={`url(#${id}-door)`} />
      <Panel y={60} h={330} id={id} />
      <Panel y={560} h={240} id={id} />
      {/* 투입구 판 */}
      <rect x="700" y="466" width="200" height="52" rx="8" fill={`url(#${id}-brass)`} />
      <rect x="700" y="466" width="200" height="52" rx="8" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      {/* 구멍 — 종이는 이 앞에 그려지고, 구멍 윗선 아래는 clip 된다 */}
      <rect x={slit.x1} y={slit.top} width={slit.x2 - slit.x1} height={slit.bottom - slit.top} rx="3" fill="#07080c" />
      <rect x={slit.x1} y={slit.bottom - 3} width={slit.x2 - slit.x1} height="5" fill="rgba(255,255,255,0.16)" />
      {/* 손잡이 */}
      <circle cx="1046" cy="470" r="26" fill={`url(#${id}-knob)`} />
      <circle cx="1046" cy="470" r="26" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
      <ellipse cx="1046" cy="500" rx="30" ry="8" fill="rgba(0,0,0,0.35)" filter={`url(#${id}-soft)`} />
      {/* 바닥 */}
      <rect x="0" y="820" width="1600" height="80" fill={`url(#${id}-floor)`} />
      <rect x="0" y="818" width="1600" height="3" fill="rgba(255,255,255,0.05)" />
    </svg>
  );
}
