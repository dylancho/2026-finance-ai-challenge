/**
 * TR 낙폭 곡선. pathLength=1 이라 길이를 재지 않고 stroke-dashoffset 1→0 으로 그린다.
 * 기본(완성) 상태는 dashoffset 0 — CSS 가 아니라 GSAP 이 1 에서 시작시킨다.
 */
export const DRAWDOWN_PATH =
  "M0,150 C80,140 120,150 180,130 S300,110 360,120 S470,90 520,95 C560,98 590,130 620,180 S680,300 720,320 S800,330 850,300 S930,270 1000,280";

export default function Drawdown({ id = "ldDd" }: { id?: string }) {
  return (
    <svg className="ld-drawdown" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff6b61" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ff6b61" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${DRAWDOWN_PATH} L1000,400 L0,400 Z`} fill={`url(#${id})`} data-dd-fill />
      <path
        d={DRAWDOWN_PATH}
        fill="none"
        stroke="#ff6b61"
        strokeWidth="3"
        strokeDasharray="1"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
        data-dd-line
      />
      <line x1="520" y1="95" x2="520" y2="400" stroke="rgba(255,255,255,.18)" strokeDasharray="4 6" />
      <line x1="720" y1="320" x2="720" y2="400" stroke="rgba(255,255,255,.18)" strokeDasharray="4 6" />
    </svg>
  );
}
