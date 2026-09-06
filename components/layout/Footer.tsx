export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell-wide">
        <p>
          <strong>NEXT</strong> · 2026 금융 AI 챌린지 출품작
        </p>
        {/* 고지 문구라 합니다체를 유지한다. 대신 문장을 짧게 끊었다. */}
        <p style={{ marginTop: 10, maxWidth: "62em" }}>
          NEXT가 만드는 신탁·후견·지출 설계서는 AI가 답변을 정리한 초안이며 법적 효력이 없습니다.
          실제 금융상품 가입, 자산 이동, 계약 체결, 후견인 지정은 하지 않습니다. 제도 이용
          가능 여부, 조항의 효력, 세금은 금융기관·변호사·법무사 등 전문가의 확인이 필요합니다.
        </p>
      </div>
    </footer>
  );
}
