import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import ReferralShell from "../../components/referral/ReferralShell";

export default function ReferralPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">의뢰서를 불러오는 중입니다…</p>
            </div>
          }
        >
          <ReferralShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
