"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { Instrument, InstrumentKind } from "../../lib/types";
import { instrumentPlain, WHO_LABEL } from "./story";

/*
 * 실제로 체결한 서류 + 누가 결정하나.
 *
 * 여기서 켜고 끄는 것은 앱 바깥에서 벌어진 일(공증·등기·심판·은행 등록)을 앱에 알려주는
 * 입력이다. 앱이 효력을 만드는 것이 아니다 — 그 문장을 카드 안에 그대로 둔다.
 */

const LEGEND: { who: keyof typeof WHO_LABEL; examples: string[] }[] = [
  { who: "auto", examples: ["공과금 자동이체", "이상거래 보류와 알림"] },
  { who: "guardian", examples: ["한도를 넘는 병원비", "안전자산으로 옮기기"] },
  { who: "expert", examples: ["부동산 매각·담보", "큰돈 인출·고액 증여"] },
];

export default function DocsCard({
  instruments,
  blockedCount,
  onToggle,
}: {
  instruments: Instrument[];
  blockedCount: number;
  onToggle: (kind: InstrumentKind, effective: boolean) => void;
}) {
  const usable = instruments.filter((i) => i.stage !== "unavailable");
  const unavailable = instruments.filter((i) => i.stage === "unavailable");
  const allOn = usable.length > 0 && usable.every((i) => i.stage === "effective");
  const noneOn = usable.every((i) => i.stage !== "effective");

  const headline =
    blockedCount > 0
      ? noneOn
        ? `아직 체결한 서류가 없어 ${blockedCount}개 항목이 움직이지 않습니다`
        : `체결하지 않은 서류가 있어 ${blockedCount}개 항목이 움직이지 않습니다`
      : allOn
        ? "서류가 모두 체결되어 위의 모든 항목이 움직입니다"
        : "지금 표시된 항목은 모두 움직입니다";

  return (
    <section className="xd-card sv-card" id="sv-docs" aria-labelledby="sv-docs-t">
      <header className="xd-head">
        <div className="xd-no">실제로 체결한 서류</div>
        <h3 id="sv-docs-t">{headline}</h3>
        <p className="xd-lede">
          설계서는 초안이고, 돈을 움직이는 힘은 체결된 계약에서 나옵니다. 체결 여부는 이 화면에서
          정해지지 않습니다. 공증·등기·법원 심판·은행 등록처럼 앱 바깥에서 끝난 일을 여기에 표시해
          두는 것입니다.
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
                  <span className="s">{on ? `효력 발생 시점 · ${i.effectRule}` : plain.consequence}</span>
                </span>
                <span className={`sv-tag ${on ? "ok" : "off"}`}>{on ? "체결함" : "체결 전"}</span>
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
                <span className="sv-tag off">새로 설정하기 어려움</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sv-docs-foot">
        <Link href="/referral" className="btn outline sm">
          전문가에게 보낼 의뢰서 보기 →
        </Link>
      </div>

      <div className="sv-legend">
        <div className="xd-group-t">누가 결정하나요?</div>
        <div className="sv-legend-grid">
          {LEGEND.map((g) => (
            <div key={g.who} className="sv-legend-item">
              <span className={`sv-tag who ${g.who}`}>{WHO_LABEL[g.who]}</span>
              <ul>
                {g.examples.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="sv-legend-note">
          건강할 때는 대부분 <b>본인 결정</b>입니다. 판단이 흐려질수록 보호자 동의, 진단서가 나온 뒤에는
          후견인·전문가 승인이 필요한 항목이 늘어납니다.
        </p>
      </div>
    </section>
  );
}
