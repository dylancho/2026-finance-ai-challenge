import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import LedgerShell from "../../components/ledger/LedgerShell";

export default function LedgerPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">이력을 준비하는 중입니다…</p>
            </div>
          }
        >
          <LedgerShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
