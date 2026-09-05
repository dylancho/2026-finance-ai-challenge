"use client";

import { useEffect, useState } from "react";
import {
  readRule,
  RULE_CHOICES,
  RULE_OPTIONS,
  RULE_SCENARIO,
  saveRule,
  type RuleChoice,
  type RuleReview,
} from "../../lib/fraud/rule";

export default function MonthlyRuleReview({ name }: { name: string }) {
  const [review, setReview] = useState<RuleReview | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReview(readRule());
    setReady(true);
  }, []);

  function choose(choice: RuleChoice) {
    setReview(saveRule(choice));
  }

  if (!ready) return null;
  return (
    <section className="monthly-review" aria-labelledby="monthly-review-title">
      <div className="monthly-review-head">
        <div>
          <p className="eyebrow">MONTHLY AI CHECK-IN</p>
          <h2 id="monthly-review-title">이번 달에는 이런 결정을 어떻게 할까요?</h2>
          <p>AI가 금융 습관과 최근 위험 신호를 바탕으로 상황을 구성합니다. {name}님의 선택은 판단이 어려운 때 실행할 보호 룰로 업데이트됩니다.</p>
        </div>
        <span>매월 1회</span>
      </div>
      {!review ? (
        <>
          <article className="monthly-scenario">
            <span>AI가 구성한 상황</span>
            <h3>{RULE_SCENARIO.title}</h3>
            <p>{RULE_SCENARIO.body(name)}</p>
          </article>
          <div className="monthly-choices">
            {RULE_CHOICES.map((choice) => (
              <button key={choice} onClick={() => choose(choice)}>
                <b>{RULE_OPTIONS[choice].title}</b>
                <span>{RULE_OPTIONS[choice].description}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="monthly-updated">
          <div>
            <span>이번 달 보호 룰이 업데이트되었습니다</span>
            <b>{RULE_OPTIONS[review.choice].rule}</b>
            <p>이 룰은 이상거래 분석과 보호자 승인 흐름에 반영됩니다. 다음 점검은 다음 달에 준비됩니다.</p>
          </div>
          <i>✓</i>
        </div>
      )}
    </section>
  );
}
