/**
 * S0 오프닝의 사람 — 집에 들어가다 문틈의 고지서를 꺼내는 50~60대. 문과 같은 평평한 일러스트 언어.
 *
 * 뒷모습 3/4 구도라 얼굴은 그리지 않는다(사실적 노인 얼굴 금지 원칙) — 귀·턱선·볼 가장자리만 보인다.
 * 관자놀이와 뒷목에 흰머리가 섞인 짧은 머리, 셔츠 깃 위에 가디건, 주름선 있는 바지, 한 손엔 장바구니.
 * 다른 팔(.ld-person-arm)은 문틈 쪽으로 뻗어 있고, Stage 가 매 프레임 고지서 위 손의 위치를 받아
 * 2관절 IK 로 어깨→팔꿈치→손목 경로를 다시 그린다. 그래서 고지서가 어느 화면 크기에서 어디로 움직이든 팔이 손을 따라간다.
 *
 * 손(BillHand)은 사람이 아니라 고지서 래퍼 안에 있다 — 고지서와 같이 움직여야 "종이를 쥔 손" 으로
 * 읽히기 때문이다. 손목 위치(HAND.wrist)가 곧 IK 의 목표점이다.
 *
 * 좌표는 DoorScene 과 같은 viewBox(1600×1000). 바닥선 FLOOR 는 여기서 정하고 DoorScene 이 가져다 쓴다 —
 * 사람의 발·문 아래·바닥 타일이 한 선에 서야 하는데, 두 파일에 같은 숫자를 따로 두면 한쪽만 고쳐 어긋난다(2026-09-06 에 겪음).
 *
 * 2026-09-06 다시 그림: 동그라미 머리 + 네모 몸통이라 마네킹처럼 보였다("사람 안 같음"). 7등신 비례, 어깨 경사,
 * 살짝 앞으로 숙인 목, 한쪽 다리에 체중을 실은 자세, 옷마다 2~3톤 명암과 주름, 손가락이 있는 손으로 바꿨다.
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

/**
 * 사람의 IK 상수 — 어깨 관절(뻗는 팔 쪽)과 위팔·아래팔 길이(viewBox 단위).
 * 어깨 y = FLOOR − 310: 키 400(≈170cm) 기준 어깨 관절 높이 ≈ 138cm 자리. 고지서(FLOOR − 300)는 그보다 10 아래라
 * 가슴 높이로 팔을 뻗는 자세가 된다. 팔 길이 118 은 실제(≈ 2.6 두신)보다 짧다 — 벽 쪽으로도 뻗는 팔이라 화면에선 줄어 보이는 몫.
 * elbow 는 팔꿈치가 자연스럽게 처지는 방향(+x 에서 시계 방향 라디안): 108° = 아래, 살짝 문 쪽(바깥) — armPath 참고.
 */
export const PERSON = {
  shoulder: { x: 938, y: FLOOR - 310 } as Pt,
  upper: 60,
  fore: 58,
  elbow: (108 * Math.PI) / 180,
  /**
   * 첫 페인트(하이드레이션 전) 손목 위치 — 데스크톱 기준 문틈에 꽂힌 고지서 가장자리.
   * x = 고지서 중심(문틈 선 − 6.4) − 폭/2 + 폭 × (HAND.left + HAND.width × HAND.wrist.x), 폭 = Stage.SEAM_W(128)
   *   = 801.6 − 64 + 128 × (0.845 + 0.4 × 0.9) ≈ 892.
   * y 는 손목이 고지서 세로 중앙에 오도록 HAND.marginTop 을 맞춰 두어 BILL_Y 와 같다.
   */
  restWrist: { x: 892, y: BILL_Y } as Pt,
} as const;

/**
 * 고지서 래퍼 안에서 손이 차지하는 자리(래퍼 너비 비율). 손목은 손 박스의 (0.9, 0.52) 지점.
 * 래퍼 너비 기준이라 문틈 배율이 달라도 손:고지서 비율이 유지된다.
 * 너비 0.4 = 문틈 배율에서 51 단위 — 손등 폭 ≈ 21 단위(9cm), 손목 ≈ 20 단위로 소매(20)와 이어진다.
 * 예전 0.26 은 손이 소매보다 가늘어 인형 손처럼 보였다. left 는 종이 가장자리가 손 박스 x≈62/160 에 오는 값.
 */
export const HAND = {
  left: 0.845,
  width: 0.4,
  aspect: 160 / 130,
  wrist: { x: 0.9, y: 0.52 } as Pt,
} as const;

/**
 * 2관절 IK. 어깨 S 에서 손목 W 까지, 위팔 L1·아래팔 L2 로 닿는 팔꿈치를 찾아 path d 를 만든다.
 *
 * 평면 IK 만으로는 "종이를 가슴 쪽으로 당기는" 동작을 못 그린다 — 손목이 어깨 가까이 오면 두 해 모두 팔꿈치가
 * 옆으로 튀어나가고, 아래쪽 해는 몸통 안을 가로지른다(2026-09-06 에 겪음). 실제로는 팔이 화면 깊이 방향으로
 * 접히는 것이라, 팔꿈치는 자연스러운 자리 N(어깨에서 elbow 방향으로 L1)에 두고 아래팔이 짧아 보이게 그린다:
 *  - 손목이 N 에서 L2 안이면: 팔꿈치 = N, 아래팔은 N→W (길이 ≤ L2, 줄어든 만큼이 깊이 방향 성분).
 *  - 아니면: 정확한 두 해 중 N 에 가까운 쪽 — 경계(|N−W| = L2)에서 그 해가 곧 N 이라 이어진다.
 * 닿지 않으면 최대로 뻗고, 너무 가까우면 최소로 접는다.
 *
 * 경로 전체 길이는 항상 L1 + L2 다: 아래팔이 짧아진 만큼 손목에서 팔꿈치 쪽으로 되돌아오는 구간을 덧붙인다
 * (같은 선 위라 보이지 않는다). Person 이 pathLength=100 의 dash 비율로 위팔/아래팔 굵기를 나누기 때문에,
 * 길이가 변하면 굵기 경계가 팔꿈치에서 벗어난다.
 */
export function armPath(
  p: { shoulder: Pt; upper: number; fore: number; elbow?: number },
  wrist: Pt,
): string {
  const { shoulder: s, upper: l1, fore: l2, elbow: dir = (108 * Math.PI) / 180 } = p;
  const n = { x: s.x + l1 * Math.cos(dir), y: s.y + l1 * Math.sin(dir) };
  const r = (n: number) => Math.round(n * 10) / 10;
  let e: Pt;
  let w: Pt;
  if (Math.hypot(wrist.x - n.x, wrist.y - n.y) <= l2) {
    e = n;
    w = wrist;
  } else {
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
    e = Math.hypot(e1.x - n.x, e1.y - n.y) <= Math.hypot(e2.x - n.x, e2.y - n.y) ? e1 : e2;
    // 손목은 닿는 범위로 당겨 둔다 — 팔이 늘어나 보이지 않게
    w = { x: s.x + (dx / (raw || 1)) * d, y: s.y + (dy / (raw || 1)) * d };
  }
  let d = `M${r(s.x)} ${r(s.y)} L${r(e.x)} ${r(e.y)} L${r(w.x)} ${r(w.y)}`;
  const foreLen = Math.hypot(w.x - e.x, w.y - e.y);
  // 되돌아오는 구간이 팔꿈치를 지나치면 보이게 되므로 아래팔 길이까지만
  const back = Math.min(l2 - foreLen, foreLen);
  if (back > 0.05) {
    const u = { x: (w.x - e.x) / foreLen, y: (w.y - e.y) / foreLen };
    d += ` L${r(w.x - u.x * back)} ${r(w.y - u.y * back)}`;
  }
  return d;
}

/** 팔꿈치가 팔 경로에서 차지하는 비율(%) — pathLength=100 인 팔 path 의 dash 로 위팔·아래팔을 나눌 때 쓴다 */
const ELBOW_PCT = Math.round((PERSON.upper / (PERSON.upper + PERSON.fore)) * 100);

const SKIN = "#e9c4a6";
const SKIN_SHADE = "#d0a585";
const HAIR = "#6f6f70";
const HAIR_GREY = "#c0c0c1";
const BEARD = "#83838a";
const CARDIGAN = "#28334b"; // 영상 인물의 남색 블루종
const CARDIGAN_SHADE = "#1d2639";
const CARDIGAN_LIT = "#35425f";
const SHIRT = "#222c42"; // 스탠드 칼라 — 셔츠 깃이 아니라 재킷 깃이다
const TROUSERS = "#3d3d44";
const SHOE = "#2a303b";
const BAG = "#d9c3a1";
const BAG_SHADE = "#c2a880";
const INK = "rgba(12,28,54,"; // 그늘·주름 공통 잉크색 — 뒤에 알파만 붙인다
const LIT = "rgba(255,255,255,"; // 하이라이트·림라이트

/** 키(viewBox 단위). 문틀 556 대비 0.72 — 50~60대 평균 ≈ 170cm 를 7등신(머리 56)으로 */
const H = 400;

/**
 * 옆얼굴 실루엣 (머리 로컬 좌표). 이마(-29,19) → 눈썹뼈(-31.5,27) → 콧대(-30,30) → 코끝(-35.6,38.6)
 * → 인중(-31.4,41) → 입술(-32,46) → 턱끝(-23.5,57) → 뒤통수(15.5,27).
 * 살갗 채우기와 clipPath 가 같은 문자열을 써야 수염·그늘이 윤곽 밖으로 새지 않는다.
 */
const FACE_D =
  "M-24 4 C-27 9 -29 14 -29.5 19 C-30.5 22 -31.5 25 -31.5 27" +
  " C-31 28.5 -30.5 29.5 -29.8 30.5 C-32.5 33 -36 36.5 -35.6 38.6" +
  " C-35 40.4 -33 41 -31.4 41.2 C-32.4 43 -32.8 45 -31.6 46.4" +
  " C-30.6 48.4 -31.6 50 -30.6 51.6 C-29.6 54 -27 56 -23.5 57" +
  " C-14.5 59 -5.5 57 0.5 52.5 C9.5 46 15 37.5 15.5 27" +
  " C16 15 9 4 -3 0.5 C-11 -1.5 -19 0 -24 4 Z";

/**
 * 사람 그룹. DoorScene 의 SVG 안에서 문 다음(앞)에 그린다.
 *
 * 몸은 <g translate(cx, FLOOR − H)> 안에 "머리 꼭대기 0 → 바닥 400, 몸 중심 x 0" 인 로컬 좌표로 그린다 —
 * 좌표를 읽기 쉽고, FLOOR 만 옮기면 사람이 통째로 같이 선다. 뻗는 팔만은 그룹 밖 절대 좌표다:
 * Stage 의 IK 가 PERSON.shoulder(절대)에서 손목(절대)까지의 d 를 써 넣기 때문이다.
 *
 * 뻗는 팔은 path 하나를 <defs> 에 두고 <use> 여러 겹으로 그린다. IK 가 d 하나만 바꾸면 모든 겹이 따라오고,
 * pathLength=100 덕에 dash 비율로 위팔(0→ELBOW_PCT, 굵게)과 아래팔(→100, 가늘게)을 나눌 수 있다 —
 * 팔이 어떤 자세든 팔꿈치는 항상 위팔 길이만큼 떨어진 지점이라 비율이 변하지 않는다.
 */
export function Person() {
  const cx = 975; // 몸 중심 x. 문 오른쪽(도어락 쪽)에 서서 몸을 문 쪽으로 살짝 튼 뒷모습
  const g = "ldP";
  return (
    <g className="ld-person" aria-hidden>
      <defs>
        {/* 가디건: 왼쪽(문 쪽)이 밝고 오른쪽으로 돌아가며 어두워지다 맨 가장자리에 림라이트 */}
        <linearGradient id={`${g}-card`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={CARDIGAN_LIT} />
          <stop offset="0.5" stopColor={CARDIGAN} />
          <stop offset="0.84" stopColor={CARDIGAN_SHADE} />
          <stop offset="0.97" stopColor="#1a2234" />
          <stop offset="1" stopColor="#404e6d" />
        </linearGradient>
        <linearGradient id={`${g}-trou`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a4a52" />
          <stop offset="0.5" stopColor={TROUSERS} />
          <stop offset="0.86" stopColor="#323238" />
          <stop offset="1" stopColor="#4d4d56" />
        </linearGradient>
        <linearGradient id={`${g}-skin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={SKIN_SHADE} />
          <stop offset="0.45" stopColor={SKIN} />
          <stop offset="1" stopColor="#ecc9ad" />
        </linearGradient>
        {/* 목: 머리카락·턱 아래 그늘이 아래로 갈수록 걷힌다 */}
        <linearGradient id={`${g}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(12,28,54,0.22)" />
          <stop offset="0.55" stopColor="rgba(12,28,54,0)" />
        </linearGradient>
        <linearGradient id={`${g}-hair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#818184" />
          <stop offset="1" stopColor="#5e5e60" />
        </linearGradient>
        <linearGradient id={`${g}-bag`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e3cfae" />
          <stop offset="0.55" stopColor={BAG} />
          <stop offset="1" stopColor={BAG_SHADE} />
        </linearGradient>
        <clipPath id={`${g}-face`}>
          <path d={FACE_D} />
        </clipPath>
        <filter id={`${g}-soft`} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="3" />
        </filter>

        {/* 뻗는 팔의 원본 경로 — Stage 의 IK 가 d 를 갱신한다. 첫 페인트는 문틈 가장자리로 뻗은 자세 */}
        <path id={`${g}-arm`} className="ld-person-arm" pathLength="100" d={armPath(PERSON, PERSON.restWrist)} />
      </defs>

      <g transform={`translate(${cx} ${FLOOR - H})`}>
        {/* ── 바닥 접지 그림자: 문 그림자와 같은 잉크색. 넓고 옅은 것 하나 + 신발 밑 진한 것 둘 ── */}
        <ellipse cx="-6" cy={H + 3} rx="64" ry="9" fill={`${INK}0.14)`} filter={`url(#${g}-soft)`} />
        <ellipse cx="-38" cy={H + 1} rx="26" ry="4.5" fill={`${INK}0.24)`} filter={`url(#${g}-soft)`} />
        <ellipse cx="26" cy={H + 1} rx="21" ry="4.5" fill={`${INK}0.24)`} filter={`url(#${g}-soft)`} />

        {/* ── 신발: 왼발(문 쪽)은 바깥으로 틀어 앞코가 왼쪽으로 길게, 오른발은 벽 쪽을 향해 뒤꿈치 위주로 짧게 ── */}
        <path d="M-20 384 C-22 376 -44 376 -50 384 C-58 386 -64 392 -62 397 C-60 400 -54 400 -48 400 L-18 400 C-12 400 -12 394 -14 390 C-16 386 -18 385 -20 384 Z" fill={SHOE} />
        <path d="M-63 396 L-13 396 L-12 400 L-63 400 Z" fill="#1b1f27" />
        <path d="M-48 386 C-40 381 -28 381 -22 385" stroke={`${LIT}0.16)`} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M12 384 C10 378 38 378 42 385 C47 388 47 396 45 400 L12 400 C6 400 4 394 6 390 C8 387 10 385 12 384 Z" fill={SHOE} />
        <path d="M5 396 L46 396 L45 400 L6 400 Z" fill="#1b1f27" />
        <path d="M14 385 C22 381 34 381 40 386" stroke={`${LIT}0.14)`} strokeWidth="1.6" strokeLinecap="round" fill="none" />

        {/* ── 바지: 오른다리(화면 오른쪽)에 체중, 왼다리는 무릎을 살짝 굽히고 발끝을 바깥으로 ── */}
        {/* 오른다리 — 곧게 선 다리 */}
        <path d="M2 250 H46 C47 300 44 340 42 388 H10 C8 340 4 300 2 250 Z" fill={`url(#${g}-trou)`} />
        <path d="M24 256 C25 300 25 340 26 386" stroke={`${LIT}0.13)`} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* 왼다리 — 무릎(≈322)에서 종아리가 바깥쪽으로 꺾인다 */}
        <path d="M-48 250 H-4 C-4 290 -8 316 -12 326 C-14 350 -16 372 -18 388 H-50 C-50 372 -48 350 -46 326 C-46 300 -48 280 -48 250 Z" fill={`url(#${g}-trou)`} />
        <path d="M-26 256 C-26 290 -30 340 -34 386" stroke={`${LIT}0.13)`} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* 오금 주름: 굽힌 무릎 뒤에 눌린 천 */}
        <path d="M-41 321 q14 -5 27 1" stroke={`${INK}0.2)`} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M-40 328 q13 4 24 -1" stroke={`${LIT}0.09)`} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* 바짓단이 신발 위에 걸리는 그늘 */}
        <path d="M-49 383 H-18 V388 H-50 Z M10 383 H42 V388 H10 Z" fill={`${INK}0.14)`} />

        {/* ── 몸통(가디건): 어깨는 목에서 어깨끝으로 내려가는 경사, 허리에서 살짝 들어갔다가 밑단이 퍼진다 ── */}
        <path
          d="M-50 90 C-50 82 -40 76 -24 74 L18 74 C34 76 46 82 48 90 C52 125 50 165 48 200 C47 225 48 240 50 254 L-48 254 C-46 240 -46 225 -46 200 C-46 165 -50 125 -50 90 Z"
          fill={`url(#${g}-card)`}
        />
        {/* 등 가운데 솔기 — 3/4 로 튼 몸이라 중심보다 왼쪽에 보인다 */}
        <path d="M-8 78 C-10 130 -10 200 -8 250" stroke={`${INK}0.1)`} strokeWidth="1.5" fill="none" />
        {/* 허리께 눌린 주름 두 줄 */}
        <path d="M8 188 q20 -6 34 4" stroke={`${INK}0.12)`} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M-42 206 q16 4 30 -2" stroke={`${INK}0.1)`} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* 밑단 고무단(리브): 어두운 띠 + 위쪽 밝은 선 */}
        <rect x="-48" y="245" width="98" height="9" fill={`${INK}0.16)`} />
        <rect x="-47" y="245" width="96" height="1.5" fill={`${LIT}0.22)`} />
        {/* 먼 쪽(오른쪽) 윤곽의 림라이트 */}
        <path d="M46 92 C51 125 49 165 47 200 C46 225 47 240 49 252" stroke={`${LIT}0.2)`} strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* ── 재킷 스탠드 칼라: 뒷목을 감싸고 올라선 깃 ── */}
        <path d="M-24 72 Q-3 54 21 67 L21 80 Q-3 63 -24 82 Z" fill={SHIRT} />
        <path d="M-24 82 Q-3 63 21 80" stroke={`${LIT}0.14)`} strokeWidth="1.4" fill="none" />

        {/* ── 목: 머리를 살짝 앞으로 숙여 위가 왼쪽으로 기운다. 머리카락 아래는 그늘 ── */}
        <path d="M-12 46 C-11 55 -10 63 -11 74 L11 74 C10 63 9 55 8 46 Z" fill={`url(#${g}-skin)`} />
        <path d="M-12 46 C-11 55 -10 63 -11 74 L11 74 C10 63 9 55 8 46 Z" fill={`url(#${g}-neck)`} />

        {/* ── 머리: 문 쪽(왼쪽)으로 돌린 3/4 뒷모습. 왼쪽 윤곽이 이마→코→입술→턱의 옆선이다 ──
            좌표는 영상 시안(2.2s 프레임)의 머리 비율을 이 로컬 좌표(머리 폭 52 · 높이 61)로 환산한 값이다.
            사실적인 얼굴은 그리지 않는다: 눈은 점 하나, 입은 선 하나, 나머지는 실루엣과 수염이 말한다. */}
        {/* 살갗 — 두개골 + 옆얼굴. 이마(-29,18) → 눈썹뼈(-31.5,27) → 콧대(-30,30) → 코끝(-36,39)
            → 인중(-31.5,42) → 입술(-32,47) → 턱끝(-27,56.5) */}
        <path d={FACE_D} fill={`url(#${g}-skin)`} />
        {/* 아래 그늘·수염은 얼굴 윤곽으로 잘라 낸다 — 실루엣 밖으로 새면 덩어리로 보인다 */}
        <g clipPath={`url(#${g}-face)`}>
          {/* 광대 아래·턱선 그늘 (뒤통수 쪽으로 갈수록 어둡다) */}
          <path d="M-3 51 C5 45 11 38 14 30 C15 42 9 52 -3 56 Z" fill={`${INK}0.1)`} />
          {/* 수염 — 구레나룻에서 턱선 아래를 통째로 덮는다. 윤곽은 clip 이 잡아 준다 */}
          <path d="M-12 28 C-18 33 -26 39.5 -34 44 L-42 47 L-42 64 L2 64 L0 43 C-2 36 -6 30.5 -12 28 Z" fill={BEARD} />
          {/* 콧수염 — 인중 아래 짧은 띠 */}
          <path d="M-34 41.6 C-29 40.2 -24 40.6 -21.5 42.6 C-25 45.4 -31 46 -35 44.8 Z" fill={BEARD} />
        </g>

        {/* 눈썹 한 획과 눈 점 하나 — 코끝에서 뒤로 8 남짓 들어온 자리 */}
        <path d="M-31 30.5 q4 -2 7.5 -0.8" stroke="#5b5b60" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        <ellipse cx="-28.4" cy="35.6" rx="1.6" ry="2" fill="#2b2b2f" />
        <path d="M-30.4 33.6 q2.2 -1 4.2 -0.2" stroke={SKIN_SHADE} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7" />
        {/* 눈가 잔주름 · 이마 주름 두 줄 */}
        <path d="M-24.5 36.5 q2.2 1 3.6 0.6" stroke={SKIN_SHADE} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M-27.5 14 q5 -2 8.5 -1 M-28.6 18.5 q5 -2 8.5 -1" stroke={SKIN_SHADE} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />

        {/* 입 — 콧수염과 턱수염 사이로 보이는 선 하나 */}
        <path d="M-31.4 47.8 q2.8 1.1 4.6 0.3" stroke="#8b5f57" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.75" />

        {/* 귀 — 구레나룻 뒤, 눈보다 살짝 아래 */}
        <path d="M-11.5 29.5 C-15 28.8 -16.2 33 -14.6 37.2 C-13.8 39.6 -10.8 39.6 -10 37.2 C-9.2 33.8 -10 31.2 -11.5 29.5 Z" fill={SKIN} />
        <path d="M-12.8 32 C-14.5 33.2 -14.1 36.2 -12.4 37.1" stroke={SKIN_SHADE} strokeWidth="1.1" strokeLinecap="round" fill="none" />

        {/* 머리카락 — 뒤로 넘긴 짧은 머리. 앞머리가 이마 위로 솟고, 헤어라인은 (-26,1)→(-20,23)→(-15,32) */}
        <path
          d="M-26 1 C-20 -3.5 -10 -5 -1 -3 C10.5 -0.5 17.5 8 18 21
             C18.5 29 16.5 35 13 39.5 C13.5 31 12 24.5 8.5 20
             C2 22.5 -6 21.5 -12 18 C-16 16 -20 12 -23 8 C-25 5.5 -26 3 -26 1 Z"
          fill={`url(#${g}-hair)`}
        />
        {/* 옆머리 — 귀 위를 덮고 구레나룻으로 내려온다 */}
        <path d="M-23 8 C-20 12 -16 16 -12 18 C-13 23 -13.5 28 -13 32.5 C-16.5 32 -20 29.5 -22 26 C-24.5 21 -24.5 13 -23 8 Z" fill={`url(#${g}-hair)`} />
        {/* 관자놀이·뒷머리 은발 결 — 결을 따라 옅게 */}
        <path d="M-21 13 q7 3.5 13 4.5" stroke={HAIR_GREY} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
        <path d="M-20 17.5 q7 3 12 3.5" stroke={HAIR_GREY} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.45" />
        <path d="M-12 2 q9 -1 15 5" stroke={HAIR_GREY} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M0 -1.5 q9 3.5 12.5 10" stroke={HAIR_GREY} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.3" />
        {/* 뒷통수 윤곽의 림라이트 */}
        <path d="M3 -2.5 C12 1.5 18 11 18 24" stroke={`${LIT}0.16)`} strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* ── 먼 팔(오른팔): 늘어뜨린 채 장바구니를 들고 있다. 소매는 위팔이 굵고 손목으로 가늘어진다 ── */}
        <path
          d="M28 88 C26 120 30 150 32 165 C34 190 36 210 36 224 L56 224 C56 208 58 190 58 165 C58 140 56 112 54 90 C50 82 34 80 28 88 Z"
          fill={CARDIGAN_SHADE}
        />
        {/* 소매 안쪽(몸 쪽) 밝은 면 */}
        <path d="M31 92 C29 120 33 150 35 165 C37 190 39 210 39 222 L46 222 C46 208 46 190 45 165 C44 140 42 112 42 92 Z" fill={`${LIT}0.07)`} />
        {/* 팔꿈치 주름 */}
        <path d="M34 160 q10 4 22 0" stroke={`${INK}0.16)`} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* 바깥쪽 윤곽 림라이트 */}
        <path d="M54 92 C57 120 58 150 58 165 C58 190 57 210 56 222" stroke={`${LIT}0.18)`} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* 소맷부리 */}
        <path d="M35 215 H57 V226 H35 Z" fill={`${INK}0.2)`} />
        <path d="M39 216 V225 M45 216 V225 M51 216 V225" stroke={`${LIT}0.1)`} strokeWidth="1.2" />
        {/* 장바구니 손잡이 — 주먹 안에서 나와 가방으로. 손보다 먼저 그려 주먹이 위를 덮는다 */}
        <path d="M45 250 C40 260 32 268 30 274" stroke={BAG_SHADE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M56 250 C52 260 47 268 46 274" stroke={BAG_SHADE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* 손: 손등 + 손잡이를 감아 쥔 손가락 세 마디 */}
        <path d="M38 226 C36 236 38 246 44 252 C50 256 58 254 60 246 C62 238 60 230 58 226 Z" fill={`url(#${g}-skin)`} />
        <path d="M40 246 c0 -5 8 -5 8 0 v7 c0 4 -8 4 -8 0 z" fill={SKIN} />
        <path d="M47 248 c0 -5 8 -5 8 0 v7 c0 4 -8 4 -8 0 z" fill={SKIN} />
        <path d="M53 246 c0 -5 8 -5 8 0 v6 c0 4 -8 4 -8 0 z" fill={SKIN_SHADE} />
        <path d="M40 253 h21" stroke={SKIN_SHADE} strokeWidth="1.2" opacity="0.7" />

        {/* ── 장바구니(크라프트): 옆면 접힘이 어둡고 위 모서리가 살짝 벌어져 있다. 대파 한 단이 삐죽 ── */}
        <path d="M31 258 L34 250" stroke="#eef2e4" strokeWidth="4" strokeLinecap="round" />
        <path d="M34 250 L38 236" stroke="#7fae5f" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M33 252 L30 240" stroke="#8fbb6c" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M20 274 H54 C55 296 55 318 53 338 C53 341 51 342 48 342 H26 C23 342 21 341 21 338 C19 318 19 296 20 274 Z" fill={`url(#${g}-bag)`} />
        <path d="M20 274 H29 C30 296 30 318 28 342 H26 C23 342 21 341 21 338 C19 318 19 296 20 274 Z" fill={BAG_SHADE} opacity="0.6" />
        <rect x="20" y="274" width="34" height="3.5" fill={`${INK}0.14)`} />
        <path d="M32 282 H50" stroke={`${INK}0.08)`} strokeWidth="1.5" />
      </g>

      {/* ── 뻗는 팔(왼팔): <defs> 의 경로를 겹쳐 그린다. 위팔 굵게 → 아래팔 가늘게, 아래쪽엔 그늘, 팔꿈치엔 주름 ── */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* 그늘 겹: 실제 소매 실루엣. 위팔 26 / 아래팔 21 */}
        <use href={`#${g}-arm`} stroke={CARDIGAN_SHADE} strokeWidth="26" strokeDasharray={`${ELBOW_PCT} 100`} />
        <use href={`#${g}-arm`} stroke={CARDIGAN_SHADE} strokeWidth="21" strokeDasharray={`${100 - ELBOW_PCT} 100`} strokeDashoffset={-ELBOW_PCT} />
        {/* 밝은 겹: 2 위로 올려 아래 가장자리에 그늘 띠가 남는다 */}
        <use href={`#${g}-arm`} y="-2" stroke={CARDIGAN} strokeWidth="23" strokeDasharray={`${ELBOW_PCT} 100`} />
        <use href={`#${g}-arm`} y="-2" stroke={CARDIGAN} strokeWidth="19" strokeDasharray={`${100 - ELBOW_PCT} 100`} strokeDashoffset={-ELBOW_PCT} />
        {/* 윗면 하이라이트 */}
        <use href={`#${g}-arm`} y="-9" stroke={`${LIT}0.12)`} strokeWidth="3" strokeDasharray={`${ELBOW_PCT - 4} 100`} strokeDashoffset="-3" />
        <use href={`#${g}-arm`} y="-7" stroke={`${LIT}0.1)`} strokeWidth="2.5" strokeDasharray={`${100 - ELBOW_PCT - 8} 100`} strokeDashoffset={-(ELBOW_PCT + 4)} />
        {/* 팔꿈치 안쪽에 눌린 주름 두 줄 (butt cap 이라 소매를 가로지르는 짧은 띠) */}
        <use href={`#${g}-arm`} y="-2" stroke={`${INK}0.22)`} strokeWidth="17" strokeLinecap="butt" strokeDasharray="1.6 100" strokeDashoffset={-(ELBOW_PCT - 6)} />
        <use href={`#${g}-arm`} y="-2" stroke={`${INK}0.18)`} strokeWidth="14" strokeLinecap="butt" strokeDasharray="1.4 100" strokeDashoffset={-(ELBOW_PCT + 5)} />
      </g>
    </g>
  );
}

/**
 * 고지서 가장자리를 쥔 손. .ld-bill-wrap 안에 절대 배치되어 고지서와 함께 움직인다.
 * 사람 뒤에서 보는 왼손 — 손등이 보이고, 엄지는 종이 위에 눕혀 누르고, 나머지 손가락은 종이 뒤로 말려 들어가
 * 손톱 끝만 아래로 비친다. 종이 가장자리는 박스 x≈62, 손목은 (144, 68).
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
        // margin-top 의 % 는 컨테이너 '너비' 기준 — 손목(0.52)이 래퍼 세로 중앙에 오도록
        marginTop: `${-(HAND.width / HAND.aspect) * HAND.wrist.y * 100}%`,
      }}
    >
    <svg viewBox="0 0 160 130">
      <defs>
        <linearGradient id="ldHand-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efcdb0" />
          <stop offset="0.6" stopColor={SKIN} />
          <stop offset="1" stopColor={SKIN_SHADE} />
        </linearGradient>
      </defs>
      {/* 손이 종이에 드리우는 그늘 */}
      <path d="M30 72 C44 76 58 74 66 68 L66 100 C56 100 40 92 30 82 Z" fill="rgba(12,28,54,0.14)" />
      {/* 소맷부리 — 손목을 중심으로 한 둥근 고무단. 소매가 어느 방향에서 오든(IK 가 정한다) 그 끝을 덮어야 해서 원이다 */}
      <circle cx="144" cy="66" r="33" fill={CARDIGAN_SHADE} />
      <circle cx="144" cy="66" r="27" fill="none" stroke="rgba(12,28,54,0.2)" strokeWidth="4" />
      <circle cx="144" cy="66" r="31.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      {/* 손등: 소맷부리에서 나와 종이 가장자리의 주먹관절까지. 왼쪽 윤곽이 관절 마디로 울퉁불퉁 */}
      <path
        d="M124 34 C100 26 78 30 66 40 C60 44 58 50 60 56 C56 60 56 66 60 70 C56 74 56 80 61 84 C64 92 76 100 92 102 C106 104 118 102 124 98 C132 82 132 50 124 34 Z"
        fill="url(#ldHand-skin)"
      />
      {/* 관절 마디 아래 그늘 */}
      <path d="M62 56 q4 2 6 7 M62 70 q4 2 6 7 M63 84 q4 2 6 6" stroke={SKIN_SHADE} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* 손등 힘줄 두 줄 */}
      <path d="M116 52 C100 50 84 52 70 58 M116 78 C100 82 84 82 70 78" stroke={SKIN_SHADE} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.35" />
      {/* 손목 주름 */}
      <path d="M122 44 q-3 24 0 48" stroke={SKIN_SHADE} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* 엄지 — 종이 위에 눕혀 왼쪽 아래로 누른다. 끝에 손톱 */}
      <path d="M76 40 C62 34 46 38 32 48 C24 54 23 64 31 67 C46 70 60 66 72 58 C78 52 80 46 76 40 Z" fill="url(#ldHand-skin)" />
      <path d="M74 44 q-3 8 1 14" stroke={SKIN_SHADE} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M31 52 C26 54 25 61 30 64 C34 65 37 61 36 56 C35 53 33 51 31 52 Z" fill="rgba(255,255,255,0.32)" />
      {/* 엄지 아래 그늘 — 종이에 눌린 자리 */}
      <path d="M34 66 C46 70 60 67 72 60" stroke="rgba(12,28,54,0.14)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* 종이 뒤로 말려 들어간 손가락 끝 두 개 */}
      <path d="M62 92 q8 8 20 6 q-6 8 -16 4 q-6 -4 -4 -10 z" fill={SKIN_SHADE} />
      <path d="M78 98 q6 4 12 2 q-3 5 -9 4 q-4 -2 -3 -6 z" fill={SKIN_SHADE} opacity="0.85" />
    </svg>
    </span>
  );
}
