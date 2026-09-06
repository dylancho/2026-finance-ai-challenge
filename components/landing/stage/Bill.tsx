/**
 * S0 고지서. 투입구에 꽂힌 채로 처음부터 보이므로, 한눈에 "전기요금 청구서" 로 읽혀야 한다.
 * 조각 span 세 개(공급자·금액·납기)가 FLIP 으로 노트북 속 집행 일지 줄로 날아간다.
 * 조각이 날아가는 동안 종이는 사라져야 하므로, 조각을 뺀 나머지에 data-bill-fade 를 붙였다.
 */
export default function Bill() {
  return (
    <div className="ld-bill" role="img" aria-label="한국전력 전기요금 청구서 38,500원, 납기 9월 25일">
      <div className="ld-bill-body">
        <i className="ld-bill-stripe" data-bill-fade aria-hidden />
        <div className="ld-bill-head" data-bill-fade>
          <span className="ld-bill-logo" aria-hidden>
            <i />
          </span>
          <span className="ld-bill-title">
            <b>전기요금 청구서</b>
            <small>2026년 9월분 · 주택용</small>
          </span>
          <span className="ld-bill-no mono">No. 2609-01277</span>
        </div>

        <div className="ld-bill-row" data-bill-row>
          <span data-bill-fade>공급자</span>
          <b data-frag="co">한국전력</b>
        </div>
        <div className="ld-bill-row ld-bill-row--amt" data-bill-row>
          <span data-bill-fade>청구 금액</span>
          <b data-frag="amt">38,500원</b>
        </div>
        <div className="ld-bill-row" data-bill-row>
          <span data-bill-fade>납기한</span>
          <b data-frag="due" className="ld-bill-stamp">
            9/25
          </b>
        </div>

        <div className="ld-bill-meta" data-bill-fade>
          <span>사용량 212 kWh</span>
          <span>전월 대비 +8%</span>
          <span>자동이체 미신청</span>
        </div>
        <div className="ld-bill-tear" data-bill-fade aria-hidden />
        <div className="ld-bill-foot" data-bill-fade>
          <span className="ld-bill-barcode" aria-hidden />
          <span className="mono">고객번호 12-3456-7890</span>
        </div>
      </div>
    </div>
  );
}
