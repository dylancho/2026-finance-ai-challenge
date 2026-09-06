/**
 * TR 캔들차트. 알림 카드가 폭락 캔들(data-crash)로 변해 안착한다.
 *
 * 색 언어: 이 페이지에서 빨강은 위험·하락이다(알림, 보류, 낙폭). 국내 증권 앱 관례(빨강 상승)와
 * 반대지만, 빨간 알림 → 빨간 캔들 변환이 읽히려면 같은 색이어야 한다. 상승은 회청색으로 눌렀다.
 *
 * 기본(완성) 상태는 캔들이 전부 서 있는 것. GSAP 이 from 트윈으로 scaleY 0 에서 키운다.
 */

/** [시가, 종가, 고가, 저가]. 완만한 상승 뒤 폭락(19) 뒤 짧은 반등. */
const OHLC: [number, number, number, number][] = [
  [60, 61.5, 62, 59],
  [61.5, 61, 62.5, 60],
  [61, 63, 63.5, 60.5],
  [63, 62.5, 64, 61.5],
  [62.5, 65, 65.5, 62],
  [65, 67, 67.5, 64.5],
  [67, 66, 68, 65],
  [66, 68.5, 69, 65.5],
  [68.5, 71, 71.5, 68],
  [71, 70, 72, 69],
  [70, 73, 73.5, 69.5],
  [73, 75.5, 76.5, 72.5],
  [75.5, 74.5, 76, 73.5],
  [74.5, 77.5, 78.5, 74],
  [77.5, 79.5, 80.5, 77],
  [79.5, 78.5, 80, 77],
  [78.5, 76, 79, 75],
  [76, 73.5, 76.5, 72.5],
  [73.5, 71, 74, 70],
  [71, 60, 71.5, 58.5], // ← 폭락 캔들 (고점 80.5 대비 -25%)
  [60, 58.5, 61.5, 57],
  [58.5, 61, 62, 58],
  [61, 59.5, 62, 58.5],
  [59.5, 62, 63, 59],
  [62, 61, 63, 60],
  [61, 63, 64, 60.5],
];

export const CRASH_INDEX = 19;
const VW = 1000;
const VH = 420;
const PAD_X = 30;
const TOP = 24;
const BOTTOM = 400;
const P_MIN = 52;
const P_MAX = 84;
const STEP = (VW - PAD_X * 2) / OHLC.length;
const BODY_W = STEP * 0.56;

const y = (p: number) => BOTTOM - ((p - P_MIN) / (P_MAX - P_MIN)) * (BOTTOM - TOP);

export default function Candles() {
  const peak = Math.max(...OHLC.map((c) => c[2]));
  const peakX = PAD_X + OHLC.findIndex((c) => c[2] === peak) * STEP + STEP / 2;
  return (
    <svg className="ld-candles" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden>
      {/* 격자 */}
      {[0.25, 0.5, 0.75].map((f) => {
        const gy = TOP + (BOTTOM - TOP) * f;
        return <line key={f} x1="0" y1={gy} x2={VW} y2={gy} stroke="rgba(255,255,255,0.06)" />;
      })}
      <line x1="0" y1={BOTTOM} x2={VW} y2={BOTTOM} stroke="rgba(255,255,255,0.14)" />
      {/* 고점 기준선 — 여기서 -25% */}
      <line
        x1={peakX}
        y1={y(peak)}
        x2={VW}
        y2={y(peak)}
        stroke="rgba(255,255,255,0.22)"
        strokeDasharray="4 6"
        data-peak-line
      />
      {OHLC.map(([o, c, h, l], i) => {
        const cx = PAD_X + i * STEP + STEP / 2;
        const down = c < o;
        const top = y(Math.max(o, c));
        const bh = Math.max(3, Math.abs(y(o) - y(c)));
        const crash = i === CRASH_INDEX;
        return (
          <g
            key={i}
            className={`ld-candle ${down ? "down" : "up"}`}
            data-candle={i}
            {...(crash ? { "data-crash": "" } : {})}
          >
            <line x1={cx} y1={y(h)} x2={cx} y2={y(l)} strokeWidth="2" />
            <rect
              x={cx - BODY_W / 2}
              y={top}
              width={BODY_W}
              height={bh}
              rx="2"
              {...(crash ? { "data-crash-body": "" } : {})}
            />
          </g>
        );
      })}
    </svg>
  );
}
