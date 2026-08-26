export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell-wide">
        <p>
          <strong>NEXT</strong> — 2026 금융 AI 챌린지 프로토타입
        </p>
        <p style={{ marginTop: 10, maxWidth: "62em" }}>
          NEXT가 생성하는 신탁·후견·지출 설계서는 AI가 사용자의 답변을 정리한 초안이며 법적
          효력이 없습니다. 본 서비스는 실제 금융상품 가입, 자산 이동, 계약 체결, 후견인 지정을
          수행하지 않습니다. 신탁·후견 제도의 실제 이용 가능 여부, 조항의 유효성, 세무 효과는
          금융기관·변호사·법무사 등 전문가의 확인이 필요합니다.
        </p>
      </div>
    </footer>
  );
}
