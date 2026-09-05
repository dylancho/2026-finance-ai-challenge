"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "next.safe.monthly-rule.v1";
type Choice = "guardian" | "block" | "reauth";
interface Review { month: string; choice: Choice; updatedAt: number }

const OPTIONS: Record<Choice, { title: string; description: string; rule: string }> = {
  guardian: { title: "보호자 승인 후 진행", description: "보호자가 거래 맥락을 확인한 뒤에만 진행합니다.", rule: "신규 개인 계좌로 300만원 이상 송금은 보호자 승인 후 진행" },
  block: { title: "금액과 관계없이 우선 차단", description: "신규 개인 계좌 송금은 모두 멈추고 확인을 요청합니다.", rule: "신규 개인 계좌 송금은 금액과 관계없이 우선 차단" },
  reauth: { title: "본인 재인증 후 진행", description: "본인의 추가 인증이 성공하면 거래를 다시 허용합니다.", rule: "신규 개인 계좌 송금은 본인 재인증 성공 후 진행" },
};

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date());
}

export default function MonthlyRuleReview({ name }: { name: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [ready, setReady] = useState(false);
  const month = currentMonth();

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Review | null;
      setReview(saved?.month === month ? saved : null);
    } catch { setReview(null); }
    setReady(true);
  }, [month]);

  function choose(choice: Choice) {
    const next = { month, choice, updatedAt: Date.now() };
    setReview(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* 화면은 계속 동작 */ }
  }

  if (!ready) return null;
  return <section className="monthly-review" aria-labelledby="monthly-review-title">
    <div className="monthly-review-head"><div><p className="eyebrow">MONTHLY AI CHECK-IN</p><h2 id="monthly-review-title">이번 달에는 이런 결정을 어떻게 할까요?</h2><p>AI가 금융 습관과 최근 위험 신호를 바탕으로 상황을 구성합니다. {name}님의 선택은 판단이 어려운 때 실행할 보호 룰로 업데이트됩니다.</p></div><span>매월 1회</span></div>
    {!review ? <>
      <article className="monthly-scenario"><span>AI가 구성한 상황</span><h3>오랫동안 연락이 없던 지인이 1,200만원을 급히 빌려 달라고 요청했습니다.</h3><p>수취 계좌는 평소 거래 이력이 없는 신규 개인 계좌입니다. 나중에 {name}님이 이 거래를 직접 판단하기 어려운 상태라면, NEXT는 어떻게 처리해야 할까요?</p></article>
      <div className="monthly-choices">{(Object.keys(OPTIONS) as Choice[]).map((choice) => <button key={choice} onClick={() => choose(choice)}><b>{OPTIONS[choice].title}</b><span>{OPTIONS[choice].description}</span></button>)}</div>
    </> : <div className="monthly-updated"><div><span>이번 달 보호 룰이 업데이트되었습니다</span><b>{OPTIONS[review.choice].rule}</b><p>이 룰은 이상거래 분석과 보호자 승인 흐름에 반영됩니다. 다음 점검은 다음 달에 준비됩니다.</p></div><i>✓</i></div>}
  </section>;
}
