import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import InterviewShell from "../../components/interview/InterviewShell";

export default function InterviewPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">인터뷰를 준비하는 중입니다…</p>
            </div>
          }
        >
          <InterviewShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
