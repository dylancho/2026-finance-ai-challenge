import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Landing from "../components/landing/Landing";
import { landingStats } from "../lib/landing/stats";

/**
 * 랜딩 (온보딩). 스토리보드: docs/landing-storyboard.md
 *
 * 고지서 오프닝 → 노트북 무대(일상 → 보호) → 알림→낙폭 모핑 → 자산관리 → 브릿지 →
 * 상속·신탁·의료 → 숫자 → 사람 → CTA. 노트북·카드 속 화면은 스크린샷이 아니라 컴포넌트이고,
 * 숫자는 데모 프로필 B 의 실제 설계서에서 계산한다. 없는 기능은 적지 않는다.
 */
export default function Home() {
  return (
    <>
      <Header />
      <Landing stats={landingStats("B")} />
      <Footer />
    </>
  );
}
