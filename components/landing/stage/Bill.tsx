/**
 * S0 고지서 — 한국전력 주택용 전기요금 청구서를 닮은 세로형 종이.
 *
 * 문틈에 꽂힌 채로 처음부터 보이므로, 오른쪽 절반만 보여도 "전기요금 청구서" 로 읽혀야 한다.
 * 그래서 제목·청구금액·납기 스탬프처럼 한눈에 들어와야 하는 것은 전부 오른쪽 정렬이다.
 *
 * 조각 세 개(공급자·금액·납기)가 FLIP 으로 노트북 속 집행 일지 줄로 날아간다.
 * 조각이 날아가는 동안 종이는 사라져야 하므로, 조각을 뺀 나머지에 data-bill-fade 를 붙였다.
 * 조각을 품고 있어 통째로 지울 수 없는 상자(머리띠·청구금액 박스)는 data-bill-row 로 테두리만 지우고,
 * 그 배경은 별도 겹(i[data-bill-fade])으로 빼서 같이 사라지게 했다.
 *
 * 금액은 고정 상수다. 기본요금 + 전력량요금 + 기후환경요금 + 연료비조정액 = 전기요금계 33,861,
 * 부가가치세 10% = 3,386, 전력산업기반기금 3.7% = 1,253, 합계 38,500 으로 맞아떨어진다.
 */
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

export default function Bill() {
  return (
    <div
      className="ld-bill"
      role="img"
      aria-label="한국전력공사 2026년 9월분 주택용 전기요금 청구서. 청구금액 38,500원, 납기일 9월 25일"
    >
      {/* 문틈에 꽂혀 있을 때 종이가 틈으로 들어가는 쪽의 그늘·접힘. 빠져나오며 GSAP 이 지운다. */}
      <i className="ld-bill-fold" data-bill-fade aria-hidden />

      <div className="ld-bill-head" data-bill-row>
        <i className="ld-bill-head-bg" data-bill-fade aria-hidden />
        <span className="ld-bill-brand">
          <i className="ld-bill-mark" data-bill-fade aria-hidden />
          <span className="ld-bill-brand-txt">
            <b data-frag="co">한국전력</b>
            <b data-bill-fade>공사</b>
            <small data-bill-fade>KEPCO</small>
          </span>
        </span>
        <span className="ld-bill-title" data-bill-fade>
          <b>전기요금 청구서</b>
          <small>2026년 09월분 · 주택용(저압)</small>
        </span>
      </div>

      <dl className="ld-bill-info" data-bill-fade>
        <div>
          <dt>고객번호</dt>
          <dd className="mono">12-3456-7890</dd>
        </div>
        <div>
          <dt>청구년월</dt>
          <dd>2026년 09월</dd>
        </div>
        <div>
          <dt>계약종별</dt>
          <dd>주택용(저압)</dd>
        </div>
        <div>
          <dt>납기일</dt>
          <dd>2026.09.25</dd>
        </div>
      </dl>

      <div className="ld-bill-amt" data-bill-row>
        <i className="ld-bill-amt-bg" data-bill-fade aria-hidden />
        <span className="ld-bill-stamp" data-bill-row>
          <small data-bill-fade>납기</small>
          <b data-frag="due">9/25</b>
        </span>
        <span className="ld-bill-amt-k" data-bill-fade>
          청구금액
        </span>
        <b data-frag="amt">38,500원</b>
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

      <div className="ld-bill-tear" data-bill-fade aria-hidden>
        <span>절취선</span>
      </div>

      <div className="ld-bill-stub" data-bill-fade>
        <div className="ld-bill-stub-row">
          <span>전자납부번호</span>
          <b className="mono">2609 0127 7385 00</b>
        </div>
        <div className="ld-bill-stub-row">
          <span>납부금액</span>
          <b className="mono">38,500원</b>
        </div>
        <i className="ld-bill-barcode" aria-hidden />
        <small className="mono">1203호 · 2026.09.25 까지</small>
      </div>
    </div>
  );
}
