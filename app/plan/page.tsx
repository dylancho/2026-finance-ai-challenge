import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import PlanShell from "../../components/plan/PlanShell";

export default function PlanPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">설계서를 불러오는 중입니다…</p>
            </div>
          }
        >
          <PlanShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
