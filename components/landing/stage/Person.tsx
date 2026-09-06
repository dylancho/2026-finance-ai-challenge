/**
 * S0 오프닝의 사람 — 집에 들어가다 문틈의 고지서를 꺼내는 50~60대. 문과 같은 평평한 일러스트 언어.
 *
 * 뒷모습 3/4 구도라 얼굴은 그리지 않는다(사실적 노인 얼굴 금지 원칙). 흰머리가 섞인 머리, 가디건,
 * 편한 바지, 한 손엔 장바구니. 다른 팔(.ld-person-arm)은 문틈 쪽으로 뻗어 있고, Stage 가 매 프레임
 * 고지서 위 손의 위치를 받아 2관절 IK 로 어깨→팔꿈치→손목 경로를 다시 그린다. 그래서 고지서가
 * 어느 화면 크기에서 어디로 움직이든 팔이 손을 따라간다.
 *
 * 손(BillHand)은 사람이 아니라 고지서 래퍼 안에 있다 — 고지서와 같이 움직여야 "종이를 쥔 손" 으로
 * 읽히기 때문이다. 손목 위치(HAND.wrist)가 곧 IK 의 목표점이다.
 *
 * 좌표는 DoorScene 과 같은 viewBox(1600×1000). 바닥선 FLOOR 는 여기서 정하고 DoorScene 이 가져다 쓴다 —
 * 사람의 발·문 아래·바닥 타일이 한 선에 서야 하는데, 두 파일에 같은 숫자를 따로 두면 한쪽만 고쳐 어긋난다(2026-09-06 에 겪음).
 */

/**
 * 바닥선(viewBox y). 736 인 이유: 문 높이 556 을 얹으면 문틀 위가 180 — 16:10 화면(1440×900)에서 헤더(68px) 아래로
 * 벽이 ≈ 94px(10%) 만 남고, 바닥은 264 단위(≈ 240px)가 온전히 보인다. 16:9(1920×1080)는 위아래 50 씩 잘리는데
 * 그래도 문틀 위 ≈ 88px, 바닥 214 단위가 남는다.
 */
export const FLOOR = 736;
/** 문틈에 꽂힌 고지서의 세로 중심 — DoorScene.DOOR.gap.y 와 같은 값. 어깨보다 살짝 아래, 도어락보다 위 */
export const BILL_Y = FLOOR - 300;

export interface Pt {
  x: number;
  y: number;
}

/** 사람의 IK 상수 — 어깨 관절(뻗는 팔 쪽)과 위팔·아래팔 길이(viewBox 단위) */
export const PERSON = {
  shoulder: { x: 937, y: FLOOR - 314 } as Pt,
  upper: 56,
  fore: 58,
  /**
   * 첫 페인트(하이드레이션 전) 손목 위치 — 데스크톱 기준 문틈에 꽂힌 고지서 가장자리.
   * x = 고지서 중심(문틈 선 − 6.4) − 폭/2 + 폭 × (HAND.left + HAND.width × HAND.wrist.x), 폭 = Stage.SEAM_W(128).
   * y 는 손목이 고지서 세로 중앙에 오도록 HAND.marginTop 을 맞춰 두어 BILL_Y 와 같다.
   */
  restWrist: { x: 883, y: BILL_Y } as Pt,
} as const;

/**
 * 고지서 래퍼 안에서 손이 차지하는 자리(래퍼 너비 비율). 손목은 손 박스의 (0.94, 0.54) 지점.
 * 래퍼 너비 기준이라 문틈 배율이 달라도 손:고지서 비율이 유지된다.
 */
export const HAND = {
  left: 0.89,
  width: 0.26,
  aspect: 160 / 130,
  wrist: { x: 0.94, y: 0.54 } as Pt,
} as const;

/**
 * 2관절 IK. 어깨 S 에서 손목 W 까지, 위팔 L1·아래팔 L2 로 닿는 팔꿈치를 찾아 path d 를 만든다.
 * 닿지 않으면 최대로 뻗고, 너무 가까우면 최소로 접는다. 팔꿈치는 두 해 중 아래쪽(중력 방향)을 고른다 —
 * 옆으로 뻗은 팔은 팔꿈치가 처지는 게 자연스럽다.
 */
export function armPath(
  p: { shoulder: Pt; upper: number; fore: number },
  wrist: Pt,
): string {
  const { shoulder: s, upper: l1, fore: l2 } = p;
  const dx = wrist.x - s.x;
  const dy = wrist.y - s.y;
  const raw = Math.hypot(dx, dy);
  const d = Math.min(Math.max(raw, Math.abs(l1 - l2) + 1), l1 + l2 - 1);
  // 손목이 어깨 위에 겹치면 방향을 정할 수 없다 — 아래로 늘어뜨린 것으로 본다
  const a = raw < 0.001 ? Math.PI / 2 : Math.atan2(dy, dx);
  const cosOff = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.min(1, Math.max(-1, cosOff)));
  const e1 = { x: s.x + l1 * Math.cos(a + off), y: s.y + l1 * Math.sin(a + off) };
  const e2 = { x: s.x + l1 * Math.cos(a - off), y: s.y + l1 * Math.sin(a - off) };
  const e = e1.y >= e2.y ? e1 : e2;
  // 손목은 닿는 범위로 당겨 둔다 — 팔이 늘어나 보이지 않게
  const w = { x: s.x + (dx / (raw || 1)) * d, y: s.y + (dy / (raw || 1)) * d };
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M${r(s.x)} ${r(s.y)} L${r(e.x)} ${r(e.y)} L${r(w.x)} ${r(w.y)}`;
}

const SKIN = "#e9c4a6";
const SKIN_SHADE = "#d6ab8b";
const HAIR = "#6a625b";
const HAIR_GREY = "#b3ada6";
const CARDIGAN = "#55708e";
const CARDIGAN_SHADE = "#46607c";
const SHIRT = "#f3f0ea";
const TROUSERS = "#3f4a5c";
const TROUSERS_SHADE = "#343d4c";
const SHOE = "#2a303b";
const BAG = "#d9c3a1";
const BAG_SHADE = "#c7ad86";

/**
 * 사람 그룹. DoorScene 의 SVG 안에서 문 다음(앞)에 그린다.
 * 뻗는 팔은 path 하나(둥근 선)라 IK 가 d 만 바꾸면 된다. 소매 색 = 가디건 색.
 */
export function Person() {
  const cx = 975; // 몸 중심 x. 문 오른쪽(도어락 쪽)에 서서 몸을 문 쪽으로 살짝 튼 뒷모습
  const floor = FLOOR;
  // 키 ≈ 400 단위(문틀 556 대비 0.72 — 50~60대 평균). 전부 바닥선 기준이라 FLOOR 만 옮기면 사람이 같이 선다
  const shoulderY = floor - 318;
  const hipY = floor - 158;
  const headC = { x: cx - 13, y: floor - 373, r: 27 };
  return (
    <g className="ld-person" aria-hidden>
      {/* 바닥 그림자 */}
      <ellipse cx={cx - 4} cy={floor + 4} rx="58" ry="9" fill="rgba(12,28,54,0.16)" />

      {/* 신발 */}
      <rect x={cx - 42} y={floor - 12} width="40" height="13" rx="6" fill={SHOE} />
      <rect x={cx + 2} y={floor - 12} width="40" height="13" rx="6" fill={SHOE} />

      {/* 바지 — 두 다리, 문 쪽 다리가 반 걸음 앞 */}
      <path d={`M${cx - 44} ${hipY} h42 v${floor - 14 - hipY} q0 6 -6 6 h-30 q-6 0 -6 -6 z`} fill={TROUSERS} />
      <path d={`M${cx + 2} ${hipY} h42 v${floor - 14 - hipY} q0 6 -6 6 h-30 q-6 0 -6 -6 z`} fill={TROUSERS_SHADE} />

      {/* 몸통(가디건) — 어깨는 둥글고 허리로 살짝 좁아진다 */}
      <path
        d={`M${cx - 46} ${shoulderY + 6} q0 -12 12 -14 h68 q12 2 12 14 v${hipY - shoulderY - 10} q0 6 -6 6 h-80 q-6 0 -6 -6 z`}
        fill={CARDIGAN}
      />
      {/* 3/4 뒷모습의 그늘: 문에서 먼 쪽(오른쪽)이 어둡다 */}
      <path d={`M${cx + 14} ${shoulderY - 6} h24 q12 2 12 14 v${hipY - shoulderY - 10} q0 6 -6 6 h-30 z`} fill={CARDIGAN_SHADE} opacity="0.8" />
      {/* 가디건 밑단 */}
      <rect x={cx - 46} y={hipY - 8} width="92" height="3" fill="rgba(255,255,255,0.28)" />
      {/* 셔츠 깃 */}
      <path d={`M${cx - 26} ${shoulderY - 6} q13 10 26 0 q-4 8 -13 9 q-9 -1 -13 -9 z`} fill={SHIRT} />

      {/* 목 */}
      <rect x={headC.x - 9} y={headC.y + 20} width="18" height="18" rx="6" fill={SKIN_SHADE} />

      {/* 머리 — 뒷통수. 흰머리 결 몇 가닥 */}
      <circle cx={headC.x} cy={headC.y} r={headC.r} fill={HAIR} />
      <path d={`M${headC.x - 22} ${headC.y + 8} q22 22 44 0 v10 q-22 14 -44 0 z`} fill={HAIR} />
      <path d={`M${headC.x - 18} ${headC.y - 12} q10 -14 26 -6`} stroke={HAIR_GREY} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d={`M${headC.x - 6} ${headC.y - 22} q14 -2 22 10`} stroke={HAIR_GREY} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d={`M${headC.x + 4} ${headC.y + 2} q8 6 6 16`} stroke={HAIR_GREY} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* 문 쪽으로 튼 얼굴의 볼 한 조각 */}
      <path d={`M${headC.x - 27} ${headC.y + 2} q2 16 14 22 q-8 2 -14 -4 z`} fill={SKIN} />

      {/* 먼 팔 — 늘어뜨린 채 장바구니를 들고 있다 */}
      <path d={`M${cx + 38} ${shoulderY + 4} q6 60 2 126`} stroke={CARDIGAN_SHADE} strokeWidth="19" strokeLinecap="round" fill="none" />
      <circle cx={cx + 39} cy={shoulderY + 138} r="9" fill={SKIN} />
      {/* 장바구니(크라프트) */}
      <path d={`M${cx + 30} ${shoulderY + 140} q9 -18 18 0`} stroke={BAG_SHADE} strokeWidth="2.5" fill="none" />
      <rect x={cx + 20} y={shoulderY + 140} width="38" height="60" rx="3" fill={BAG} />
      <rect x={cx + 20} y={shoulderY + 140} width="12" height="60" rx="3" fill={BAG_SHADE} opacity="0.55" />
      <rect x={cx + 20} y={shoulderY + 140} width="38" height="4" fill="rgba(12,28,54,0.12)" />

      {/* 뻗는 팔 — Stage 가 IK 로 d 를 갱신한다. 첫 페인트는 문틈 가장자리로 뻗은 자세 */}
      <path
        className="ld-person-arm"
        d={armPath(PERSON, PERSON.restWrist)}
        stroke={CARDIGAN}
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
}

/**
 * 고지서 가장자리를 쥔 손. .ld-bill-wrap 안에 절대 배치되어 고지서와 함께 움직인다.
 * 엄지가 종이 위에 놓이고 손바닥·소맷부리가 종이 밖(오른쪽)으로 나간다. 종이 가장자리는 x≈68.
 * 위치·크기는 HAND 상수에서 온다(래퍼 너비 비율) — Stage 의 IK 가 같은 상수로 손목을 찾는다.
 */
export function BillHand() {
  return (
    // 바깥은 span — SVG 요소에는 offsetLeft/offsetWidth 가 없어 Stage 의 IK 가 손목 자리를 잴 수 없다
    <span
      className="ld-bill-hand"
      aria-hidden
      style={{
        left: `${HAND.left * 100}%`,
        width: `${HAND.width * 100}%`,
        aspectRatio: `${HAND.aspect}`,
        // margin-top 의 % 는 컨테이너 '너비' 기준 — 손목(0.54)이 래퍼 세로 중앙에 오도록
        marginTop: `${-(HAND.width / HAND.aspect) * HAND.wrist.y * 100}%`,
      }}
    >
    <svg viewBox="0 0 160 130">
      {/* 소맷부리 */}
      <path d="M118 42 q30 -4 42 18 q-6 26 -34 34 q-14 -20 -8 -52 z" fill={CARDIGAN} />
      {/* 손바닥 */}
      <path d="M70 40 q34 -14 56 6 q10 26 -8 46 q-26 12 -50 -2 q-14 -20 2 -50 z" fill={SKIN} />
      <path d="M96 42 q20 -6 30 6 q8 22 -8 40 q-10 4 -18 0 q10 -20 -4 -46 z" fill={SKIN_SHADE} opacity="0.45" />
      {/* 엄지 — 종이 위에 눕혀 누른다 */}
      <path d="M22 58 q30 -12 60 -4 q10 4 6 14 q-30 10 -62 6 q-10 -6 -4 -16 z" fill={SKIN} />
      <path d="M24 66 q28 6 60 -2" stroke={SKIN_SHADE} strokeWidth="2" fill="none" opacity="0.6" />
      {/* 종이 아래로 말려 들어간 손가락 끝 */}
      <path d="M60 88 q10 10 26 6 q-6 8 -18 6 q-8 -3 -8 -12 z" fill={SKIN_SHADE} />
    </svg>
    </span>
  );
}
