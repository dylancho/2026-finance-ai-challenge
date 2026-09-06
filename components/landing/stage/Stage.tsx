"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "../gsap";
import StartLink from "../StartLink";
import Bill from "./Bill";
import { Laptop, AlertCard } from "./Laptop";
import Drawdown from "./Drawdown";
import { centerDelta, fitDelta } from "./layout";
import { T, TOTAL, isDark } from "./phases";

/**
 * S0 → CH1 → CH2 → TR 을 한 번에 담는 핀 무대.
 *
 * 핀이 하나인 이유: 노트북과 알림 카드가 네 장면을 관통하는 같은 물체라서다. 핀을 나누면
 * 경계에서 같은 물체를 두 번 그려야 하고 그 이음새가 보인다.
 *
 * 규칙: CSS 기본 상태가 완성 상태. GSAP 은 from 트윈으로 초기 상태를 만든다.
 * 그래서 reduced-motion(static) 에서는 타임라인 없이 완성 화면이 세로로 쌓여 보인다.
 * 위치 계산은 전부 함수형 값 — 리사이즈 시 ScrollTrigger 가 다시 계산한다.
 */

const BG = { dusk: "#1b1e27", ivory: "#f5f3ee", navy: "#0c1c36", dark: "#0a0e18" };

const BEATS = [
  { id: 1, h: "공과금, 잊어도 됩니다", p1: "직접 납부 버튼을 누를 필요 없이", p2: "정해둔 원칙이 대신 냅니다" },
  { id: 2, h: "생활비는 나눠서, 안전하게", p1: "한 계좌에 다 두는 대신", p2: "세 층으로 나눠 필요한 만큼만 내려옵니다" },
  { id: 3, h: "한도는 당신이 정한 만큼만", p1: "한 번에 100만원을 정하면", p2: "하루 200만원이 자동으로 따라옵니다" },
];

export default function Stage() {
  const root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "scroll" | "static">("pending");

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMode("static");
        return;
      }
      setMode("scroll");

      const q = gsap.utils.selector(el);
      const one = (s: string) => q(s)[0] as HTMLElement;
      const stillDoor = one(".ld-still--door");
      const stillHand = one(".ld-still--hand");
      const veil = one(".ld-veil");
      const copy1 = one(".ld-s0-copy--1");
      const copy2 = one(".ld-s0-copy--2");
      const billWrap = one(".ld-bill-wrap");
      const billBody = one("[data-bill-body]");
      const laptopWrap = one(".ld-laptop-wrap");
      const laptop = one(".ld-laptop");
      const frags = ["co", "amt", "due"].map((k) => one(`[data-frag="${k}"]`));
      const targets = ["co", "amt", "due"].map((k) => one(`[data-target="${k}"]`));
      const logRest = one("[data-log-rest]");
      const line1000 = one('[data-line="1000"]');
      const line2347 = one('[data-line="2347"]');
      const scrLog = one('[data-screen="log"]');
      const scrAcc = one('[data-screen="accounts"]');
      const scrLim = one('[data-screen="limits"]');
      const chScene = one(".ld-scene--ch");
      const ind01 = one(".ld-ind--01");
      const ind02 = one(".ld-ind--02");
      const beats = [1, 2, 3, 4].map((n) => one(`[data-beat="${n}"]`));
      const alert = one("[data-alert]");
      const trScene = one(".ld-scene--tr");
      const ddLine = one("[data-dd-line]");
      const ddFill = one("[data-dd-fill]");
      const stamp = one(".ld-tr-stamp");
      const trCopy = one(".ld-tr-copy");

      // S0 동안 노트북은 화면 하단 중앙에 있다. 레이아웃 위치(우측 칼럼)와의 차이를 함수로 둔다.
      const s0X = () => centerDelta(laptopWrap, el).x;
      const s0Y = () => centerDelta(laptopWrap, el).y + el.clientHeight * 0.24;
      const fullScale = () =>
        Math.min(el.clientWidth / laptop.offsetWidth, el.clientHeight / laptop.offsetHeight) * 0.96;
      const fullY = () => centerDelta(laptopWrap, el).y + el.clientHeight * 0.02;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => "+=" + window.innerHeight * 9,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (st) => document.body.classList.toggle("ld-dark", isDark(st.progress)),
          onLeave: () => document.body.classList.remove("ld-dark"),
          onLeaveBack: () => document.body.classList.add("ld-dark"),
        },
      });

      /* ── S0. 고지서 오프닝 ── */
      tl.set(laptopWrap, { x: s0X, y: s0Y }, 0);
      tl.set(el, { backgroundColor: BG.dusk }, 0);
      tl.from(stillHand, { autoAlpha: 0, duration: 5 }, T.s0Still);
      tl.from(
        billWrap,
        {
          scale: 0.38,
          y: () => el.clientHeight * 0.18,
          x: () => -el.clientWidth * 0.06,
          autoAlpha: 0,
          duration: 8,
        },
        T.s0Bill,
      );
      tl.to(veil, { opacity: 0.86, duration: 8 }, T.s0Bill);
      tl.from(copy1, { autoAlpha: 0, y: 28, duration: 4 }, T.s0Bill + 4);

      tl.from(laptopWrap, { yPercent: 120, duration: 8 }, T.s0Laptop);
      tl.to(copy1, { autoAlpha: 0, duration: 3 }, T.s0Laptop + 2);
      tl.from(copy2, { autoAlpha: 0, y: 28, duration: 4 }, T.s0Laptop + 5);

      frags.forEach((f, i) => {
        const d = () => {
          const v = fitDelta(f, targets[i], el);
          return { x: v.x + s0X(), y: v.y + s0Y(), scale: v.scale };
        };
        tl.to(
          f,
          { x: () => d().x, y: () => d().y, scale: () => d().scale, duration: 6 },
          T.s0Flip + i * 0.6,
        );
      });
      tl.to(billBody, { autoAlpha: 0, duration: 4 }, T.s0Flip);
      tl.to(frags, { autoAlpha: 0, duration: 1 }, T.s0Flip + 6.5);
      tl.from(targets, { autoAlpha: 0, duration: 1 }, T.s0Flip + 6.5);
      tl.from(logRest, { autoAlpha: 0, duration: 1.5 }, T.s0Flip + 7);

      tl.to(
        laptopWrap,
        { x: () => centerDelta(laptopWrap, el).x, y: fullY, scale: fullScale, duration: 8 },
        T.s0Full,
      );
      tl.to([stillDoor, stillHand, veil, copy2, billWrap], { autoAlpha: 0, duration: 6 }, T.s0Full);
      tl.to(el, { backgroundColor: BG.ivory, duration: 8 }, T.s0Full + 2);

      /* ── CH1. 일상관리 ── */
      tl.to(laptopWrap, { x: 0, y: 0, scale: 1, duration: 7 }, T.ch1Enter);
      tl.from(chScene, { autoAlpha: 0, duration: 4 }, T.ch1Enter + 3);
      tl.from(ind01, { autoAlpha: 0, x: -18, duration: 3 }, T.ch1Enter + 3);

      const beat = (i: number, at: number, out = true) => {
        tl.from(beats[i], { autoAlpha: 0, y: 26, duration: 3 }, at);
        if (out) tl.to(beats[i], { autoAlpha: 0, y: -26, duration: 3 }, at + 7);
      };
      beat(0, T.ch1Beat1);
      tl.from(line1000, { autoAlpha: 0, x: -14, duration: 2 }, T.ch1Beat1 + 1);

      beat(1, T.ch1Beat2);
      tl.to(scrLog, { autoAlpha: 0, duration: 2 }, T.ch1Beat2);
      tl.from(scrAcc, { autoAlpha: 0, y: 12, duration: 3 }, T.ch1Beat2 + 1);

      beat(2, T.ch1Beat3);
      tl.to(scrAcc, { autoAlpha: 0, duration: 2 }, T.ch1Beat3);
      tl.from(scrLim, { autoAlpha: 0, y: 12, duration: 3 }, T.ch1Beat3 + 1);

      /* ── CH2. 금융보호 ── */
      tl.to(el, { backgroundColor: BG.navy, duration: 6 }, T.ch2);
      tl.to(chScene, { attr: { "data-tone": "dark" }, duration: 0.01 }, T.ch2 + 3);
      tl.to(ind01, { autoAlpha: 0, duration: 2 }, T.ch2);
      tl.from(ind02, { autoAlpha: 0, x: -18, duration: 3 }, T.ch2 + 2);
      tl.to(scrLim, { autoAlpha: 0, duration: 2 }, T.ch2);
      tl.to(scrLog, { autoAlpha: 1, duration: 2 }, T.ch2 + 1);
      tl.from(line2347, { autoAlpha: 0, x: -14, duration: 2 }, T.ch2 + 3);
      beat(3, T.ch2 + 2, false);
      tl.from(alert, { autoAlpha: 0, y: 34, scale: 0.92, duration: 4 }, T.ch2 + 6);

      /* ── TR. 알림 → 낙폭 ── */
      tl.to([laptop, chScene], { autoAlpha: 0, duration: 6 }, T.tr);
      tl.to(el, { backgroundColor: BG.dark, duration: 8 }, T.tr);
      tl.to(
        alert,
        {
          x: () => centerDelta(alert, el).x,
          y: () => centerDelta(alert, el).y,
          scale: 2.3,
          duration: 8,
        },
        T.tr,
      );
      tl.from(trScene, { autoAlpha: 0, duration: 4 }, T.tr + 5);
      tl.fromTo(ddLine, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 10 }, T.tr + 6);
      tl.from(ddFill, { autoAlpha: 0, duration: 6 }, T.tr + 10);
      tl.to(alert, { autoAlpha: 0, scale: 2.6, duration: 3 }, T.tr + 8);
      tl.from(stamp, { autoAlpha: 0, scale: 1.7, duration: 3 }, T.tr + 14);
      tl.from(trCopy, { autoAlpha: 0, y: 24, duration: 4 }, T.tr + 16);
      tl.to({}, { duration: TOTAL - T.trHold }, T.trHold);

      return () => document.body.classList.remove("ld-dark");
    },
    { scope: root },
  );

  return (
    <div ref={root} className="ld-stage" data-mode={mode} aria-label="소개">
      {/* S0 */}
      <section className="ld-scene ld-scene--s0">
        <div className="ld-still ld-still--door" aria-hidden>
          <DoorArt />
          <div className="ld-photo" style={{ backgroundImage: "url(/landing/s0-door.jpg)" }} />
        </div>
        <div className="ld-still ld-still--hand" aria-hidden>
          <DoorArt hand />
          <div className="ld-photo" style={{ backgroundImage: "url(/landing/s0-hand.jpg)" }} />
        </div>
        <div className="ld-veil" aria-hidden />
        <div className="ld-s0-copy ld-s0-copy--1">
          <h1>
            매달 옵니다.
            <br />
            그리고, 잊는 날이 옵니다
          </h1>
          <p className="ld-foot">
            치매 진단 6년 전부터 지급 연체가 늘기 시작합니다 — Nicholas 외, JAMA Internal Medicine, 2020
          </p>
        </div>
        <div className="ld-s0-copy ld-s0-copy--2">
          <h2>
            당신이 잊어도,
            <br />
            원칙은 기억합니다
          </h2>
        </div>
        <div className="ld-bill-wrap">
          <Bill />
        </div>
      </section>

      {/* 노트북 — S0·CH1·CH2 를 관통한다 */}
      <div className="ld-laptop-col">
        <div className="ld-laptop-wrap">
          <Laptop />
        </div>
        <AlertCard />
      </div>

      {/* CH1·CH2 카피 칼럼 */}
      <section className="ld-scene ld-scene--ch" data-tone="light">
        <div className="ld-ind">
          <span className="ld-ind--01">
            <i>01</i>일상
          </span>
          <span className="ld-ind--02">
            <i>02</i>보호
          </span>
        </div>
        <div className="ld-beats">
        {BEATS.map((b) => (
          <div className="ld-beat" data-beat={b.id} key={b.id}>
            <h2>{b.h}</h2>
            <p className="ld-cap">
              <span>{b.p1}</span>
              <span>{b.p2}</span>
            </p>
            <StartLink className="ld-cta" focus="core">
              일상 관리 설계 시작 →
            </StartLink>
          </div>
        ))}
        <div className="ld-beat" data-beat={4}>
          <h2>
            이상한 순간,
            <br />
            시스템이 먼저 멈춥니다
          </h2>
          <p className="ld-cap">
            <span>한도 룰 7종과 맥락 룰 3종이 거래를 보고</span>
            <span>어긋나면 보류하고, 12시간 무응답이면 2차로 넘깁니다</span>
          </p>
          <StartLink className="ld-cta" focus="safe">
            금융 보호 설계 시작 →
          </StartLink>
        </div>
        </div>
      </section>

      {/* TR */}
      <section className="ld-scene ld-scene--tr">
        <Drawdown id="ldDdStage" />
        <div className="ld-tr-stamp mono">-25%</div>
        <h2 className="ld-tr-copy">
          그리고 어떤 날은,
          <br />
          시장이 무너집니다
        </h2>
      </section>
    </div>
  );
}

/** 실사가 없을 때 보이는 임시 비주얼: 문틈과 종이. 사진이 오면 위에 덮인다. */
function DoorArt({ hand = false }: { hand?: boolean }) {
  return (
    <svg className="ld-doorart" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="1600" height="900" fill="#171a22" />
      <rect x="0" y="0" width="700" height="900" fill="#20242e" />
      <rect x="700" y="0" width="28" height="900" fill="#0d0f14" />
      <rect x="728" y="0" width="872" height="900" fill="#262b36" />
      <rect x="620" y="380" width="90" height="120" rx="6" fill="#3a404d" />
      <g transform={hand ? "translate(690 300) rotate(-14)" : "translate(700 330) rotate(-6)"}>
        <rect width="150" height="210" rx="4" fill="#efeadb" />
        <rect x="18" y="26" width="90" height="10" rx="2" fill="#c9c2ae" />
        <rect x="18" y="50" width="114" height="6" rx="2" fill="#d9d3c1" />
        <rect x="18" y="66" width="100" height="6" rx="2" fill="#d9d3c1" />
        <rect x="18" y="82" width="70" height="6" rx="2" fill="#d9d3c1" />
      </g>
      {hand && (
        <path
          d="M1010 560 C960 540 900 520 860 470 L830 430 C820 415 840 400 856 412 L900 450 L930 440 L960 455 L1000 470 C1060 500 1080 560 1010 560 Z"
          fill="#8a7566"
          opacity="0.9"
        />
      )}
    </svg>
  );
}
