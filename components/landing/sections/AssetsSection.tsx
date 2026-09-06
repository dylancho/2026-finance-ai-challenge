"use client";

import { useEffect, useRef } from "react";
import Reveal from "../Reveal";
import StartLink from "../StartLink";
import Drawdown from "../stage/Drawdown";

/**
 * CH3 자산관리. 다크 풀블리드 위에 관측 → 선언 → 재배치 카드 3장 (토스 모듈 D).
 * 장식 모션은 재배치 바 하나 — Reveal 이 `in` 을 붙이면 CSS 트랜지션으로 선언 범위 안에 들어간다.
 * 관측 수치는 ledger 데모(B, panic_seller)의 이력 대조 문구와 같다.
 */
export default function AssetsSection() {
  const ref = useRef<HTMLElement>(null);

  // 헤더 다크 토글: 이 섹션이 헤더 아래를 지나는 동안만
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 마운트 직후의 첫 콜백(false)이 Stage 가 켜 둔 다크를 지우면 안 된다 — 들어왔다 나갈 때만 끈다.
    let wasIn = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) document.body.classList.add("ld-dark");
        else if (wasIn) document.body.classList.remove("ld-dark");
        wasIn = e.isIntersecting;
      },
      { rootMargin: "-68px 0px -100% 0px", threshold: 0 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (wasIn) document.body.classList.remove("ld-dark");
    };
  }, []);

  return (
    <section ref={ref} className="ld-assets" id="assets" aria-label="자산관리">
      <div className="ld-assets-bg" aria-hidden>
        <Drawdown id="ldDdAssets" />
      </div>
      <div className="shell-wide">
        <Reveal className="ld-sec-head dark">
          <div className="ld-chip">03 자산</div>
          <h2>투자 원칙은 건강할 때 정해 둡니다</h2>
          <p className="ld-cap">
            <span>급락에 놀라 팔아 버리기 전에</span>
            <span>미리 정한 원칙이 선택지를 먼저 정리합니다</span>
          </p>
        </Reveal>

        <div className="ld-cards3">
          <Reveal className="ld-dcard" delay={0}>
            <div className="ld-dcard-body">
              <span className="ld-dcard-k">실제로 해 온 것 · 거래 이력</span>
              <b>
                지난 급락 때,
                <br />
                7일 만에 42%를 파셨습니다
              </b>
              <div className="ld-mini-dd" aria-hidden>
                <i style={{ height: "62%" }} />
                <i style={{ height: "48%" }} />
                <i style={{ height: "31%" }} />
                <i style={{ height: "36%" }} />
                <i style={{ height: "58%" }} />
              </div>
            </div>
            <p className="ld-cap">
              <span>정해 둔 원칙과 실제 행동이 다르면</span>
              <span>어느 쪽을 따를지 먼저 묻습니다</span>
            </p>
          </Reveal>

          <Reveal className="ld-dcard" delay={140}>
            <div className="ld-dcard-body">
              <span className="ld-dcard-k">내가 정한 것 · 투자 원칙</span>
              <b>위험자산 상한 20%</b>
              <div className="ld-tags">
                <span>파생상품 금지</span>
                <span>레버리지 금지</span>
              </div>
              <div className="ld-declare-note">건강할 때 적어 둔 한 줄이 제7조 투자 원칙이 됩니다.</div>
            </div>
            <p className="ld-cap">
              <span>판단이 또렷할 때 적어 두면</span>
              <span>흔들리는 날에는 그 문장이 기준이 됩니다</span>
            </p>
          </Reveal>

          <Reveal className="ld-dcard" delay={280}>
            <div className="ld-dcard-body">
              <span className="ld-dcard-k">투자 비중 조정 · 정한 범위 안으로</span>
              <div className="ld-pf" role="img" aria-label="투자 자산이 위험자산 20% 안으로 조정된 모습">
                <i className="risk" />
                <i className="safe" />
              </div>
              <div className="ld-pf-legend">
                <span>위험자산</span>
                <span>안전자산</span>
              </div>
              <ul className="ld-options">
                <li className="first">
                  그대로 두기 <small>언제든 되돌릴 수 있음</small>
                </li>
                <li>위험자산 일부 팔기</li>
                <li>생활비 줄이기</li>
                <li>현금화 순서 바꾸기</li>
              </ul>
            </div>
            <p className="ld-cap">
              <span>앱은 선택지를 정리할 뿐,</span>
              <span>결정은 끝까지 사람이 합니다</span>
            </p>
          </Reveal>
        </div>

        <Reveal className="ld-sec-cta" delay={200}>
          <StartLink className="btn light lg" focus="invest">
            자산 관리 설계하기
          </StartLink>
        </Reveal>
      </div>
    </section>
  );
}
