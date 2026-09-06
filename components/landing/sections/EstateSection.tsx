"use client";

import { useState } from "react";
import Reveal from "../Reveal";
import StartLink from "../StartLink";

/**
 * CH4 상속·신탁·의료 (토스 모듈 A). 좌 헤드라인 + 아코디언, 우 기울어진 설계서 + 떠 있는 조항 카드.
 * 모션은 최소 — 이 챕터는 느릴수록 신뢰. 항목 내용은 lib/design/trust.ts 조항과 같은 말이다.
 */
// 안내 문구는 해요체(docs/writing-style.md). 조항 번호·조항 제목은 설계서 본문의 말이라 그대로 둔다.
const ITEMS = [
  {
    t: "신탁설계 초안",
    d: "재산을 어떻게 운용하고 누구에게 남길지 조항으로 정리합니다. 제1조 목적부터 제11조 잔여재산 귀속까지, 답하지 않은 조항은 '아직 정하지 않음'으로 남겨 둡니다.",
    focus: "estate",
    cta: "신탁 설계하기",
  },
  {
    t: "제4조 시작 조건",
    d: "평소와 다른 신호가 기준을 넘고, 최근 1개월 안의 의료 증빙이 있을 때만 시작됩니다. 둘 중 하나만 있으면 무엇이 부족한지 알려 줍니다. AI가 혼자 시작하는 일은 없습니다.",
    focus: "estate",
    cta: "시작 조건 정하기",
  },
  {
    t: "의료·요양 비용",
    d: "의료비 계좌를 따로 둡니다. 요양시설 입소가 확인되면 그 달부터 매달 지급액을 올립니다. 치료비와 요양비 한도는 직접 정합니다.",
    focus: "estate",
    cta: "의료·요양 설계하기",
  },
  {
    t: "승인 순서",
    d: "1차 관리자가 먼저 판단합니다. 12시간 안에 답이 없으면 2차 감독자에게 넘어갑니다. 한 사람에게서 멈추지 않도록 미리 정해 둡니다.",
    focus: "safe",
    cta: "승인 순서 정하기",
  },
];

/** 아직 답하지 않은 조항의 표시. 화면 라벨이라 '선언되지 않음' 대신 사람 말로 쓴다. */
const UNSET = "아직 정하지 않음";

const DOC_ROWS: [string, string, string][] = [
  ["제1조", "목적", "치료·요양비 확보와 생활 유지"],
  ["제2조", "신탁재산", "예금·투자 · 부동산 제외"],
  ["제3조", "당사자", "위탁자 본인 · 수탁자 · 감독인"],
  ["제5조", "정기지급", "월 180만원 · 요양 입소 시 증액"],
  ["제8조", "금지행위", "부동산 처분 · 대출 · 증여"],
  ["제11조", "잔여재산 귀속", UNSET],
];

export default function EstateSection() {
  const [open, setOpen] = useState(1);
  return (
    <section className="ld-estate" id="estate" aria-label="상속·신탁·의료">
      <div className="shell-wide ld-estate-inner">
        <Reveal className="ld-estate-copy" threshold={0.3}>
          <div className="ld-chip">04 상속·신탁·의료</div>
          <h2>
            판단이 흐려져도,
            <br />
            정해 둔 대로 움직입니다
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
              <div className={`ld-doc-row${v === UNSET ? " gap" : ""}`} key={no}>
                <span className="mono">{no}</span>
                <b>{t}</b>
                <small>{v}</small>
              </div>
            ))}
          </div>
          <div className="ld-doc-float">
            {/* 이 카드는 keep-all 이 없어 긴 줄이 낱말 중간에서 끊긴다 — 점수 이름은 라벨로 올리고 본문은 짧게 */}
            <span className="mono">제4조 시작 조건 · 평소 패턴 점수</span>
            <b>
              61점 이상 <em>그리고</em> 의료 증빙
            </b>
            <small>하나만 있으면 무엇이 부족한지 알려 줍니다</small>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
