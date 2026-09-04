"use client";

import Link from "next/link";
import type { Instrument, InstrumentKind } from "../../lib/types";

/**
 * 체결 상태 표시줄.
 *
 * 여기서 토글하는 것은 **앱 바깥에서 벌어진 일을 앱에 알려주는 입력**이다.
 * 앱이 효력을 발생시키는 것이 아니다. 그 문장을 줄 안에 그대로 둔다.
 */
export default function AuthorityBar({
  instruments,
  blockedCount,
  onToggle,
}: {
  instruments: Instrument[];
  blockedCount: number;
  onToggle: (kind: InstrumentKind, effective: boolean) => void;
}) {
  const usable = instruments.filter((i) => i.stage !== "unavailable");
  if (!usable.length) return null;

  return (
    <div className="au-bar">
      <div className="au-head">
        <span className="k">집행 근거</span>
        {blockedCount > 0 ? (
          <span className="s blocked">
            {blockedCount}개 단계가 집행되지 못합니다
          </span>
        ) : (
          <span className="s ok">모든 단계에 집행 근거가 있습니다</span>
        )}
        <Link href="/referral" className="au-link">
          의뢰서 보기 →
        </Link>
      </div>

      <div className="au-row">
        {usable.map((i) => {
          const on = i.stage === "effective";
          return (
            <button
              key={i.kind}
              type="button"
              className={`au-toggle${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => onToggle(i.kind, !on)}
            >
              <span className="sw" aria-hidden="true" />
              <span className="tx">
                <b>{i.name}</b>
                <em>{on ? "체결 완료" : i.effectRule}</em>
              </span>
            </button>
          );
        })}
      </div>

      <p className="au-note">
        체결 여부는 이 화면에서 정해지지 않습니다. 공증·등기·법원 심판·금융기관 등록처럼 앱
        바깥에서 끝난 일을 여기에 알려주는 것입니다.
      </p>
    </div>
  );
}
