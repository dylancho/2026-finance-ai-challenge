/** S0 고지서. 조각 span 세 개가 FLIP 으로 노트북 속 집행 일지 줄로 날아간다. */
export default function Bill() {
  return (
    <div className="ld-bill" role="img" aria-label="한국전력 전기요금 청구서 38,500원, 납기 9월 25일">
      <div className="ld-bill-body" data-bill-body>
        <div className="ld-bill-head">
          <span className="ld-bill-kind">전기요금 청구서</span>
          <span className="ld-bill-no mono">2026.09</span>
        </div>
        <div className="ld-bill-row">
          <span>공급자</span>
          <b data-frag="co">한국전력</b>
        </div>
        <div className="ld-bill-row">
          <span>청구 금액</span>
          <b data-frag="amt">38,500원</b>
        </div>
        <div className="ld-bill-row">
          <span>납기한</span>
          <b data-frag="due">9/25</b>
        </div>
        <div className="ld-bill-lines" aria-hidden>
          <i />
          <i />
          <i />
        </div>
        <div className="ld-bill-foot mono">고객번호 12-3456-7890 · 자동이체 미신청</div>
      </div>
    </div>
  );
}
