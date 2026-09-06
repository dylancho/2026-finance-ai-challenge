/**
 * S0 고지서 — 한국전력 주택용 전기요금 청구서를 닮은 가로형 종이(≈1.6:1).
 *
 * 실제 청구서(청록 머리띠, 왼쪽 천공 줄, 연한 하늘색 라벨 칸이 촘촘한 격자, 진한 구획 띠, 큼직한 청구금액 상자,
 * 둥근 파란 수납인, 바코드·전자납부번호)를 DOM/CSS 로만 재현한다 — 사진은 쓰지 않는다.
 *
 * 문틈에 꽂혀 있을 때는 오른쪽 45% 만 보이므로, 그 부분(청구금액 상자·수납인·바코드)만으로도 "고지서" 로 읽혀야 한다.
 * 클로즈업(배율 1, 폭 620px)에서는 격자 글자가 읽히는 크기다.
 *
 * 조각 세 개(공급자·금액·납기)가 FLIP 으로 노트북 속 집행 일지 줄로 날아간다.
 * 조각이 날아가는 동안 종이는 사라져야 하므로, 조각을 뺀 나머지에 data-bill-fade 를 붙였다.
 * 조각을 품고 있어 통째로 지울 수 없는 상자(청구금액 상자·납기 스탬프)는 data-bill-row 로 테두리만 지우고,
 * 그 배경은 별도 겹(i[data-bill-fade])으로 빼서 같이 사라지게 했다. .ld-bill 자체의 배경·그림자는 Stage 가 투명하게 트윈한다.
 *
 * 금액은 고정 상수다. 기본요금 + 전력량요금 + 기후환경요금 + 연료비조정액 = 전기요금계 33,861,
 * 부가가치세 10% = 3,386, 전력산업기반기금 3.7% = 1,253, 합계 38,500 으로 맞아떨어진다.
 */
const CELLS: [string, string, boolean?][] = [
  ["고객번호", "12-3456-7890", true],
  ["청구년월", "2026.09", true],
  ["납기일", "2026.09.25", true],
  ["계약종별", "주택용(저압)"],
  ["계량기번호", "05-2231-118", true],
  ["검침일", "2026.09.03", true],
  ["당월지침", "12,846", true],
  ["전월지침", "12,634", true],
];
const CHARGES: [string, string][] = [
  ["기본요금", "1,600"],
  ["전력량요금", "29,293"],
  ["기후환경요금", "1,908"],
  ["연료비조정액", "1,060"],
];
const TAXES: [string, string][] = [
  ["전기요금계", "33,861"],
  ["부가가치세", "3,386"],
  ["전력산업기반기금", "1,253"],
];

/** 둥근 파란 수납인 — 테두리 글자는 textPath, 가운데는 "수납" */
function Seal() {
  return (
    <svg className="ld-bill-seal" viewBox="0 0 64 64" data-bill-fade aria-hidden>
      <defs>
        <path id="ldSealRing" d="M32 32 m-21 0 a21 21 0 1 1 42 0 a21 21 0 1 1 -42 0" />
      </defs>
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <text fontSize="6.6" fontWeight="700" letterSpacing="0.6" fill="currentColor">
        <textPath href="#ldSealRing" startOffset="0">
          한국전력공사 · 수납인 · 한국전력공사 · 수납인 ·
        </textPath>
      </text>
      <text x="32" y="36.5" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="currentColor">
        수납
      </text>
    </svg>
  );
}

export default function Bill() {
  return (
    <div
      className="ld-bill"
      role="img"
      aria-label="한국전력공사 2026년 9월분 주택용 전기요금 청구서. 청구금액 38,500원, 납기일 9월 25일"
    >
      {/* 문틈에 꽂혀 있을 때 종이가 틈으로 들어가는 쪽의 그늘. 빠져나오며 GSAP 이 지운다. */}
      <i className="ld-bill-fold" data-bill-fade aria-hidden />
      {/* 왼쪽 천공 줄 */}
      <i className="ld-bill-holes" data-bill-fade aria-hidden />

      <div className="ld-bill-body">
        <div className="ld-bill-band" data-bill-fade>
          <small>주택용 전력 · 전자고지</small>
          <b>전기요금 청구서</b>
          <small>2026년 09월분 · 주택용(저압)</small>
        </div>

        <dl className="ld-bill-cells" data-bill-fade>
          {CELLS.map(([k, v, mono]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={mono ? "mono" : undefined}>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="ld-bill-main">
          <div className="ld-bill-col">
            <div className="ld-bill-sec" data-bill-fade>
              요 금 내 역
            </div>
            <table className="ld-bill-use" data-bill-fade>
              <thead>
                <tr>
                  <th>당월 사용량</th>
                  <th>전월</th>
                  <th>전년동월</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>212</b> kWh
                  </td>
                  <td>196 kWh</td>
                  <td>205 kWh</td>
                </tr>
              </tbody>
            </table>
            <dl className="ld-bill-lines" data-bill-fade>
              {CHARGES.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className="mono">{v}</dd>
                </div>
              ))}
              {TAXES.map(([k, v], i) => (
                <div key={k} className={i === 0 ? "sum" : undefined}>
                  <dt>{k}</dt>
                  <dd className="mono">{v}</dd>
                </div>
              ))}
              <div className="total">
                <dt>청구금액</dt>
                <dd className="mono">38,500</dd>
              </div>
            </dl>
          </div>

          <div className="ld-bill-col ld-bill-col--pay">
            <div className="ld-bill-sec" data-bill-fade>
              납 부 안 내
            </div>
            <div className="ld-bill-amt" data-bill-row>
              <i className="ld-bill-amt-bg" data-bill-fade aria-hidden />
              <span className="ld-bill-amt-k" data-bill-fade>
                청구금액
              </span>
              <span className="ld-bill-stamp" data-bill-row>
                <small data-bill-fade>납기</small>
                <b data-frag="due">9/25</b>
              </span>
              <b data-frag="amt">38,500원</b>
            </div>
            <div className="ld-bill-pay" data-bill-fade>
              <span>전자납부번호</span>
              <b className="mono">2609 0127 7385 00</b>
              <i className="ld-bill-barcode" aria-hidden />
              <small className="mono">1203호 · 자동이체 신청 123-4567 · 납기 후 1.5% 가산</small>
            </div>
            <div className="ld-bill-foot">
              <span className="ld-bill-brand">
                <i className="ld-bill-mark" data-bill-fade aria-hidden />
                <span className="ld-bill-brand-txt">
                  <b data-frag="co">한국전력</b>
                  <b data-bill-fade>공사</b>
                </span>
              </span>
              <Seal />
            </div>
          </div>
        </div>

        {/* 실제 청구서 아래쪽의 촘촘한 안내문 — 종이가 비어 보이지 않게 하고 밀도를 준다 */}
        <p className="ld-bill-note" data-bill-fade>
          ※ 납기일까지 미납 시 다음 달 청구서에 연체료(1.5%)가 가산되며, 2개월 이상 미납 시 단전 예고 안내가 발송됩니다.
          자동이체·신용카드·계좌이체 납부 가능 · 고객센터 123 · 전기요금 복지할인 신청은 가까운 지사 또는 사이버지점에서 가능합니다.
        </p>
      </div>
    </div>
  );
}
