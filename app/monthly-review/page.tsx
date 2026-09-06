import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import MonthlyRuleReview from "../../components/fraud/MonthlyRuleReview";

export default function MonthlyReviewPage() {
  return <><Header /><main className="monthly-page shell"><div className="monthly-page-intro"><p className="eyebrow">NEXT SAFE</p><h1>AI 월간 시나리오 점검</h1><p>AI가 매달 만든 상황을 선택해, NEXT 판단 원칙집을 업데이트하세요.</p></div><MonthlyRuleReview name="나" /></main><Footer /></>;
}
