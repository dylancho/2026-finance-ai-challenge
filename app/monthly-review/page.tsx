import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import MonthlyRuleReview from "../../components/fraud/MonthlyRuleReview";

export default function MonthlyReviewPage() {
  return <><Header /><main className="monthly-page shell"><div className="monthly-page-intro"><p className="eyebrow">NEXT SAFE</p><h1>이번 달의 보호 원칙</h1><p>짧은 상황 점검으로 AI가 따를 금융 보호 룰을 업데이트하세요.</p></div><MonthlyRuleReview name="나" /></main><Footer /></>;
}
