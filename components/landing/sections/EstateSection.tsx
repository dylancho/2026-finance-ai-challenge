"use client";

import { useState } from "react";
import Reveal from "../Reveal";
import StartLink from "../StartLink";

/**
 * CH4 상속·신탁·의료 (토스 모듈 A). 좌 헤드라인 + 아코디언, 우 기울어진 설계서 + 떠 있는 조항 카드.
 * 모션은 최소 — 이 챕터는 느릴수록 신뢰. 항목 내용은 lib/design/trust.ts 조항과 같은 말이다.
 */
const ITEMS = [
  {
    t: "신탁설계 초안",
    d: "재산을 어떻게 운용하고 누구에게 남길지를 조항으로 남깁니다. 제1조 목적부터 제11조 잔여재산 귀속까지, 답하지 않은 조항은 비워 두지 않고 '선언되지 않음'으로 표시합니다.",
    focus: "estate",
    cta: "신탁 설계 시작",
  },
  {
    t: "제4조 지급개시 트리거",
    d: "금융 바이오마커 61점 이상 AND 최근 1개월 내 의료 증빙. 둘 다 있어야 넘어갑니다. AI 단독 발동은 없고, 하나만 있으면 무엇이 부족한지 화면에 표시합니다.",
    focus: "estate",
    cta: "트리거 정하기",
  },
  {
    t: "의료·요양 재무",
    d: "의료예비계좌를 따로 두고, 요양시설 입소가 확인되면 그 달부터 월 지급액을 증액합니다. 치료·요양비는 한도 방식을 본인이 고릅니다.",
    focus: "estate",
    cta: "의료·요양 설계 시작",
  },
  {
    t: "승인·에스컬레이션",
    d: "1차 관리자가 판단하고, 12시간 무응답이면 2차 감독으로 넘어갑니다. 한 사람에게서 멈추지 않도록 미리 정해둡니다.",
    focus: "safe",
    cta: "승인 체계 정하기",
  },
];

const DOC_ROWS: [string, string, string][] = [
  ["제1조", "목적", "치료·요양비 확보와 생활 유지"],
  ["제2조", "신탁재산", "예금·투자 · 부동산 제외"],
  ["제3조", "당사자", "위탁자 본인 · 수탁자 · 감독인"],
  ["제5조", "정기지급", "월 180만원 · 요양 입소 시 증액"],
  ["제8조", "금지행위", "부동산 처분 · 대출 · 증여"],
  ["제11조", "잔여재산 귀속", "선언되지 않음"],
];

export default function EstateSection() {
  const [open, setOpen] = useState(1);
  return (
    <section className="ld-estate" id="estate" aria-label="상속·신탁·의료">
      <div className="shell-wide ld-estate-inner">
        <Reveal className="ld-estate-copy" threshold={0.3}>
          <div className="ld-chip">04 상속·신탁·의료</div>
          <h2>
            판단이 어려워지는 날의
            <br />
            절차까지
          </h2>
          <ul className="ld-acc">
            {ITEMS.map((it, i) => (
              <li key={it.t} className={i === open ? "open" : ""}>
                <button type="button" aria-expanded={i === open} onClick={() => setOpen(i)}>
                  {it.t}
                </button>
                <div className="ld-acc-body" hidden={i !== open}>
                  <p>{it.d}</p>
                  <StartLink className="btn outline sm" focus={it.focus}>
                    {it.cta} →
                  </StartLink>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="ld-estate-visual" delay={120} threshold={0.3}>
          <div className="ld-doc" aria-hidden>
            <div className="ld-doc-h">
              <span className="mono">신탁설계서 · 초안</span>
              <b>미래의 나에게 남기는 재산 운용 원칙</b>
            </div>
            {DOC_ROWS.map(([no, t, v]) => (
              <div className={`ld-doc-row${v === "선언되지 않음" ? " gap" : ""}`} key={no}>
                <span className="mono">{no}</span>
                <b>{t}</b>
                <small>{v}</small>
              </div>
            ))}
          </div>
          <div className="ld-doc-float">
            <span className="mono">제4조 지급개시 트리거</span>
            <b>
              바이오마커 61+ <em>AND</em> 의료 증빙
            </b>
            <small>둘 중 하나만 있으면 무엇이 부족한지 화면에 표시</small>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
