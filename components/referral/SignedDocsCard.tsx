"use client";

import { Check } from "lucide-react";
import type { Instrument, InstrumentKind } from "../../lib/types";
import { instrumentPlain } from "../../lib/authority";

/*
 * 실제로 체결한 서류 (2026-09-07, 미리보기의 DocsCard 를 의뢰서 마지막 단계로 옮긴 것).
 *
 * 이 서비스의 핵심 주장 — "서류를 실제로 체결하기 전에는 어떤 항목도 실행되지 않는다" —
 * 을 의뢰서를 전달하는 자리에서 그대로 보여 준다. 여기서 켜고 끄는 것은 앱 바깥에서 벌어진
 * 일(공증·등기·심판·은행 등록)을 앱에 알려주는 입력이다. 앱이 효력을 만드는 것이 아니다.
 * 상태는 1단계 카드와 같은 lib/authority 저장소라 여기서 체크하면 어디서든 기억된다.
 * 미리보기의 "누가 결정하나요?" 범례는 의뢰서 맥락에 맞지 않아 뺐다.
 */

export default function SignedDocsCard({
  instruments,
  onToggle,
}: {
  instruments: Instrument[];
  onToggle: (kind: InstrumentKind, effective: boolean) => void;
}) {
  const usable = instruments.filter((i) => i.stage !== "unavailable");
  const unavailable = instruments.filter((i) => i.stage === "unavailable");
  const onCount = usable.filter((i) => i.stage === "effective").length;
  const allOn = usable.length > 0 && onCount === usable.length;

  const headline =
    onCount === 0
      ? "아직 체결한 서류가 없어요. 설계서는 글로만 있어요"
      : allOn
        ? `${onCount}건 모두 체결했어요. 설계서 조항이 실제로 움직일 수 있어요`
        : `${onCount}건 체결했어요. 아직 체결하지 않은 서류에 걸린 항목은 움직이지 않아요`;

  return (
    <section className="rf-docs" aria-labelledby="rf-docs-t">
      <header className="rf-docs-head">
        <div className="rf-docs-k">실제로 체결한 서류</div>
        <h3 id="rf-docs-t">{headline}</h3>
        <p className="rf-docs-lede">
          설계서는 초안이고, 돈을 움직이는 힘은 체결한 계약에서 나와요. 체결 여부는 이 화면에서
          정해지지 않아요. 공증·등기·법원 심판·은행 등록처럼 앱 바깥에서 끝난 일을 여기에 표시해
          두는 거예요.
        </p>
      </header>

      <ul className="xd-list sv-docs">
        {usable.map((i) => {
          const on = i.stage === "effective";
          const plain = instrumentPlain(i);
          return (
            <li key={i.kind} className="xd-row sv-row">
              <button
                type="button"
                className={`sv-check${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => onToggle(i.kind, !on)}
              >
                <span className="box" aria-hidden>
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="tx">
                  <span className="l">{plain.name}</span>
                  <span className="s">{on ? `효력이 생긴 때 · ${i.effectRule}` : plain.consequence}</span>
                </span>
                <span className={`sv-tag ${on ? "ok" : "off"}`}>
                  {on ? "체결함" : "체결 전 · 아직 안 움직여요"}
                </span>
              </button>
            </li>
          );
        })}
        {unavailable.map((i) => {
          const plain = instrumentPlain(i);
          return (
            <li key={i.kind} className="xd-row sv-row is-blocked">
              <div className="sv-row-main">
                <div className="l">{plain.name}</div>
                <div className="s">{i.unavailableReason}</div>
              </div>
              <div className="sv-tags">
                <span className="sv-tag off">새로 만들기 어려움</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
