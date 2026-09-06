"use client";

import { useEffect, useState } from "react";
import { isTouring, TOUR_PERSONA } from "../../lib/demo/tour";
import {
  readRule,
  RULE_CHOICES,
  RULE_OPTIONS,
  RULE_SCENARIO,
  saveRule,
  type RuleChoice,
  type RuleReview,
} from "../../lib/fraud/rule";

/**
 * 이달의 AI 시나리오 점검 (2026-09-07, origin/fsd 11378df 이지수의 문안·편집 흐름을 이식).
 * 저장소는 main 의 lib/fraud/rule 그대로 — 인터뷰 마지막 단계와 같은 원칙을 읽고 쓴다.
 * 한 번 고른 뒤에도 "판단 원칙 바꾸기" 로 선택지를 다시 열 수 있다. 원칙은 한 달에 한 번
 * 정하는 것이지만, 잘못 누른 선택이 한 달 동안 굳어 버리면 안 된다.
 * onComplete 는 이 블록을 다른 화면 안에 끼워 넣을 때 "완료" 버튼을 붙이는 구멍이다.
 */
export default function MonthlyRuleReview({ name: given, onComplete }: { name: string; onComplete?: () => void }) {
  const [review, setReview] = useState<RuleReview | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  // 둘러보기 중에는 "나님" 대신 예시 인물의 이름을 쓴다 (금융 보호 화면과 같은 사람).
  const [name, setName] = useState(given);

  useEffect(() => {
    setReview(readRule());
    if (isTouring()) setName(TOUR_PERSONA.replace(/\(.*$/, ""));
    setEditing(false);
    setReady(true);
  }, []);

  function choose(choice: RuleChoice) {
    setReview(saveRule(choice));
    setEditing(false);
  }

  if (!ready) return null;
  return (
    <section className="monthly-review" aria-labelledby="monthly-review-title">
      <div className="monthly-review-head">
        <div>
          <p className="eyebrow">MONTHLY AI SCENARIO</p>
          <h2 id="monthly-review-title">AI가 이번 달의 상황을 준비했어요</h2>
          <p>AI가 매달 금융 습관과 최근 위험 신호를 바탕으로 시나리오를 생성합니다. {name}님의 선택은 판단이 어려운 때 실행할 NEXT 판단 원칙집에 반영됩니다.</p>
        </div>
        <span>매월 1회</span>
      </div>
      {!review || editing ? (
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
            <span>이번 달 금융 판단 원칙이 저장되었습니다</span>
            <b>{RULE_OPTIONS[review.choice].rule}</b>
            <p>이 선택은 NEXT 판단 원칙집과 보호자 공동 승인 흐름에 반영됩니다. 필요하면 지금 바로 변경할 수 있습니다.</p>
            <div className="monthly-updated-actions">
              <button className="btn outline sm" onClick={() => setEditing(true)}>판단 원칙 바꾸기</button>
              {onComplete && <button className="btn sm" onClick={onComplete}>완료</button>}
            </div>
          </div>
          <i>✓</i>
        </div>
      )}
    </section>
  );
}
