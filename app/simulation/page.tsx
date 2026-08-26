import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import SimulationShell from "../../components/simulation/SimulationShell";

export default function SimulationPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">시뮬레이션을 준비하는 중입니다…</p>
            </div>
          }
        >
          <SimulationShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
