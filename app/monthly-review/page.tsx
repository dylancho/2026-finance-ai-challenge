import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import MonthlyRuleReview from "../../components/fraud/MonthlyRuleReview";

export default function MonthlyReviewPage() {
  return <><Header /><main className="monthly-page shell"><div className="monthly-page-intro"><p className="eyebrow">금융 보호</p><h1>매달 하는 상황 점검</h1><p>앱이 매달 만든 상황을 보고 하나 고르면, 판단이 어려울 때 앱이 따를 원칙이 바뀌어요.</p></div><MonthlyRuleReview name="나" /></main><Footer /></>;
}
