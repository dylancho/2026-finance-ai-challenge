export default function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <p className="disclaimer">
      {children ??
        "본 설계서는 AI가 사용자의 답변을 정리한 초안이며 법적 효력이 없습니다. 신탁·후견 제도의 실제 이용 가능 여부, 조항의 유효성, 세무 효과는 금융기관·변호사·법무사 등 전문가의 확인이 필요합니다."}
    </p>
  );
}
