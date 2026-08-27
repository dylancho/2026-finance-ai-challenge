import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import LoginShell from "../../components/auth/LoginShell";

export default function LoginPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">불러오는 중입니다…</p>
            </div>
          }
        >
          <LoginShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
