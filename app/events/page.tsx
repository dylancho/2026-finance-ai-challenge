import { Suspense } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import EventsShell from "../../components/events/EventsShell";

export default function EventsPage() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="shell-wide" style={{ padding: "80px 0" }}>
              <p className="muted">상황을 준비하는 중입니다…</p>
            </div>
          }
        >
          <EventsShell />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
