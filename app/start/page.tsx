import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import GateFlow from "../../components/gate/GateFlow";

export default function StartPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<div className="shell-wide" style={{ padding: "80px 0" }} />}>
          <GateFlow />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
