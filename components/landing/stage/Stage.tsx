"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "../gsap";
import StartLink from "../StartLink";
import Bill from "./Bill";
import { Laptop, AlertCard } from "./Laptop";
import Candles, { CRASH_INDEX } from "./Candles";
import { DoorBack, DOOR } from "./DoorScene";
import { centerDelta, layoutCenter, layoutOffset, sliceToScreen } from "./layout";
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
 *
 * S0 의 고지서는 처음부터 현관문 문틈에 "꽂힌" DOM 고지서다(한국식). 스크롤이 곧 꺼내는 손이다.
 * 문틈 선 왼쪽을 clip-path 로 잘라 두었다가 옆으로 빠져나오면서 풀어 준다. 꽂혀 있는 동안은
 * 회전 0 — 기울이면 잘린 모서리(고지서 로컬 좌표)가 세로 문틈 선과 어긋나 종이가 문에 붙인 것처럼 보인다.
 * 고지서는 노트북 위 겹에 있어야 조각이 화면 위로 날아간다 — 그래서 S0 장면 밖, 스테이지 직속이다.
 *
 * S0·CH1 은 밝은 장면(토스풍), CH2·TR 은 딥네이비. BG.light 는 .ld-stage 의 CSS 배경과 같은 값이다.
 */

const BG = { light: "#f2f4f8", ivory: "#f5f3ee", navy: "#0c1c36", dark: "#0a0e18" };

const BEATS = [
  { id: 1, h: "공과금, 잊어도 됩니다", p1: "직접 납부 버튼을 누를 필요 없이", p2: "정해둔 원칙이 대신 냅니다" },
  { id: 2, h: "생활비는 나눠서, 안전하게", p1: "한 계좌에 다 두는 대신", p2: "세 층으로 나눠 필요한 만큼만 내려옵니다" },
  { id: 3, h: "한도는 당신이 정한 만큼만", p1: "한 번에 100만원을 정하면", p2: "하루 200만원이 자동으로 따라옵니다" },
];

/** 문틈에 꽂혀 있을 때 고지서 배율 */
const SLOT_SCALE = 0.6;
/** 꽂혀 있을 때 문틈 밖으로 보이는 비율 (고지서 너비 기준). .ld-bill-fold 의 그늘 위치(54%)와 짝이다. */
const PEEK = 0.46;

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
      const all = (s: string) => q(s) as HTMLElement[];
      const doorBack = one(".ld-door--back");
      const vignette = one(".ld-vignette");
      const veil = one(".ld-veil");
      const copy1 = one(".ld-s0-copy--1");
      const copy2 = one(".ld-s0-copy--2");
      const billWrap = one(".ld-bill-wrap");
      const bill = one(".ld-bill");
      const billFold = one(".ld-bill-fold");
      const billFade = all("[data-bill-fade]");
      const billRows = all("[data-bill-row]");
      const laptopWrap = one(".ld-laptop-wrap");
      const laptop = one(".ld-laptop");
      const frags = ["co", "amt", "due"].map((k) => one(`[data-frag="${k}"]`));
      const targets = ["co", "amt", "due"].map((k) => one(`[data-target="${k}"]`));
      const logWait = one("[data-log-wait]");
      const logRest = all("[data-log-rest]");
      const line0800 = one('[data-line="0800"]');
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
      const alertKids = all(".ld-alert > *");
      const trScene = one(".ld-scene--tr");
      const candles = all("[data-candle]");
      const crash = one("[data-crash]");
      const crashBody = one("[data-crash-body]");
      const peakLine = one("[data-peak-line]");
      const stamp = one(".ld-tr-stamp");
      const trCopy = one(".ld-tr-copy");

      /* ── 좌표 함수 (리사이즈마다 다시 계산) ── */
      // 문틈의 화면 좌표 (x 는 틈의 왼쪽 = 문짝 모서리, s 는 viewBox→화면 배율)
      const gap = () => sliceToScreen(DOOR.vw, DOOR.vh, el.clientWidth, el.clientHeight, DOOR.gap.x, DOOR.gap.y);
      // 종이가 틈에서 나오는 선: 틈 폭의 절반 지점. 왼쪽에 어두운 홈이 한 줄 남아야 "틈에 끼어 있다" 로 읽힌다.
      const seamX = () => {
        const g = gap();
        return g.x + DOOR.gap.w * g.s * 0.5;
      };
      // 꽂혀 있을 때: 왼쪽 (1-PEEK) 은 문틈 안, 오른쪽 PEEK 만 밖으로 보인다. 잘린 모서리가 정확히 seamX 에 온다.
      const slotX = () => seamX() + billWrap.offsetWidth * SLOT_SCALE * (PEEK - 0.5) - layoutCenter(billWrap, el).x;
      const slotY = () => gap().y - layoutCenter(billWrap, el).y;
      // 완전히 빠져나온 자리: 문틈 바로 오른쪽
      const outX = () => seamX() + billWrap.offsetWidth * SLOT_SCALE * 0.5 + 10 - layoutCenter(billWrap, el).x;
      // 꽂혀 있을 때 문틈 선 왼쪽으로 잘리는 너비 (고지서 로컬 px)
      const clipIn = () => `inset(0px 0px 0px ${Math.round(billWrap.offsetWidth * (1 - PEEK))}px)`;

      // S0 동안 노트북은 화면 하단 중앙에 작게(0.8) 있다. 레이아웃 위치(우측 칼럼)와의 차이를 함수로 둔다.
      const S0_SCALE = 0.8;
      const s0X = () => centerDelta(laptopWrap, el).x;
      const s0Y = () => centerDelta(laptopWrap, el).y + el.clientHeight * 0.34;
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
          onUpdate: (st) => {
            document.body.classList.toggle("ld-dark", isDark(st.progress));
            // 문자열 attr 은 트윈이 아니라 진행률로 정한다 (attr 트윈은 렌더를 멈춘다)
            chScene.dataset.tone = st.progress >= (T.ch2 + 3) / TOTAL ? "dark" : "light";
          },
          // 리프레시(리사이즈·복원) 시점에도 진행률에 맞는 헤더 톤이어야 한다 — onUpdate 는 스크롤 전엔 안 불린다
          onRefresh: (st) =>
            document.body.classList.toggle("ld-dark", st.scroll() <= st.end && isDark(st.progress)),
          // 핀 밖 양쪽 모두 밝은 장면(S0 오프닝 / CH1 다음은 CH3 가 스스로 토글)
          onLeave: () => document.body.classList.remove("ld-dark"),
          onLeaveBack: () => document.body.classList.remove("ld-dark"),
        },
      });

      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __stageTl?: gsap.core.Timeline }).__stageTl = tl; // 브라우저 검증용
      }

      /* ── S0-1. 문틈에서 고지서가 옆으로 빠져나온다 (스크롤 = 꺼내는 손) ── */
      tl.fromTo(
        billWrap,
        { x: slotX, y: slotY, scale: SLOT_SCALE, rotation: 0, clipPath: clipIn },
        { x: outX, clipPath: "inset(0px 0px 0px 0px)", duration: T.s0Bill, ease: "power1.out" },
        T.s0Still,
      );
      // 회전은 틈을 거의 다 벗어난 뒤에 붙는다(power2.in) — 끼어 있는 동안 잘린 모서리가 세로 문틈 선과 맞아야 한다
      tl.to(billWrap, { rotation: 3, duration: T.s0Bill, ease: "power2.in" }, T.s0Still);
      // 틈 쪽 그늘·접힘은 종이가 펴지면서 사라진다
      tl.to(billFold, { autoAlpha: 0, duration: T.s0Bill * 0.8, ease: "power1.in" }, T.s0Still);

      // 틈을 벗어나면 클립을 푼다 — 안 풀면 종이 박스 밖으로 날아가는 조각까지 잘린다
      tl.set(billWrap, { clipPath: "none" }, T.s0Bill);

      /* ── S0-2. 중앙으로 다가와 읽을 수 있는 크기가 된다 ── */
      tl.to(billWrap, { x: 0, y: 0, scale: 1, rotation: -2, duration: 8, ease: "power1.inOut" }, T.s0Bill);
      tl.to(veil, { opacity: 0.86, duration: 8 }, T.s0Bill);
      tl.from(copy1, { autoAlpha: 0, y: 28, duration: 4 }, T.s0Bill + 3);

      /* ── S0-3. 노트북이 떠오르고 카피가 바뀐다 ── */
      // 타임라인 0초의 set() 은 리프레시 때 되돌려지므로, S0 위치는 fromTo 의 from 으로 박는다.
      tl.fromTo(
        laptopWrap,
        { x: s0X, y: s0Y, scale: S0_SCALE, yPercent: 120 },
        { yPercent: 0, duration: 8 },
        T.s0Laptop,
      );
      tl.to(copy1, { autoAlpha: 0, duration: 3 }, T.s0Laptop + 2);
      tl.from(copy2, { autoAlpha: 0, y: 28, duration: 4 }, T.s0Laptop + 5);

      /* ── S0-4. 조각이 날아가 집행 일지에 안착한다 ── */
      const FLIGHT = 5;
      const GAP = 1.6;
      tl.to(logWait, { autoAlpha: 0, duration: 1 }, T.s0Flip);
      frags.forEach((f, i) => {
        const at = T.s0Flip + i * GAP;
        // 도착점: 노트북이 S0 위치(x,y 오프셋 + 0.8 배)에 있을 때 target 이 실제로 보이는 자리
        const d = () => {
          const lc = layoutCenter(laptopWrap, el);
          const tc = layoutCenter(targets[i], el);
          const fc = layoutCenter(f, el);
          return {
            x: lc.x + (tc.x - lc.x) * S0_SCALE + s0X() - fc.x,
            y: lc.y + (tc.y - lc.y) * S0_SCALE + s0Y() - fc.y,
            scale: (targets[i].offsetWidth * S0_SCALE) / f.offsetWidth,
          };
        };
        // 종이 조각처럼 떨어져 나온다: 배경·그림자를 얻고, 살짝 떠오른 뒤 포물선으로 떨어진다
        tl.to(f, { backgroundColor: "#ffffff", boxShadow: "0 18px 34px -10px rgba(12,28,54,.38)", duration: 1 }, at);
        tl.to(f, { x: () => d().x, duration: FLIGHT }, at);
        tl.to(f, { y: () => d().y - 40, duration: FLIGHT * 0.35, ease: "power2.out" }, at);
        tl.to(f, { y: () => d().y, duration: FLIGHT * 0.65, ease: "power2.in" }, at + FLIGHT * 0.35);
        tl.to(f, { scale: () => d().scale, rotation: i % 2 ? 6 : -6, duration: FLIGHT }, at);
        // 안착: 조각이 사라지며 그 자리에 글자가 튀어 오르고, 줄이 한 번 번쩍인다
        const land = at + FLIGHT;
        tl.to(f, { autoAlpha: 0, duration: 0.6 }, land);
        tl.from(targets[i], { autoAlpha: 0, scale: 1.6, duration: 1.2, ease: "back.out(2.5)" }, land);
        tl.fromTo(
          line0800,
          { backgroundColor: "#dbe8fb", borderColor: "#8fb6ee" },
          { backgroundColor: "#ffffff", borderColor: "#e6eaf0", duration: 2.2, immediateRender: false },
          land,
        );
      });
      // 종이만 사라진다 — 조각은 남아서 날아간다
      tl.to(billFade, { autoAlpha: 0, duration: 3 }, T.s0Flip + 1);
      tl.to(billRows, { borderColor: "rgba(0,0,0,0)", duration: 3 }, T.s0Flip + 1);
      tl.to(bill, { backgroundColor: "rgba(255,255,255,0)", boxShadow: "0 0 0 0 rgba(0,0,0,0)", duration: 3 }, T.s0Flip + 1);
      const lastLand = T.s0Flip + (frags.length - 1) * GAP + FLIGHT;
      tl.from(logRest, { autoAlpha: 0, x: -6, duration: 1.5, stagger: 0.2 }, lastLand + 0.4);

      /* ── S0-5. 노트북 풀스크린 ── */
      tl.to(
        laptopWrap,
        { x: () => centerDelta(laptopWrap, el).x, y: fullY, scale: fullScale, duration: 8 },
        T.s0Full,
      );
      tl.to([doorBack, vignette, veil, copy2, billWrap], { autoAlpha: 0, duration: 6 }, T.s0Full);
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
      tl.to(ind01, { autoAlpha: 0, duration: 2 }, T.ch2);
      tl.from(ind02, { autoAlpha: 0, x: -18, duration: 3 }, T.ch2 + 2);
      tl.to(scrLim, { autoAlpha: 0, duration: 2 }, T.ch2);
      tl.to(scrLog, { autoAlpha: 1, duration: 2 }, T.ch2 + 1);
      tl.from(line2347, { autoAlpha: 0, x: -14, duration: 2 }, T.ch2 + 3);
      beat(3, T.ch2 + 2, false);
      tl.from(alert, { autoAlpha: 0, y: 34, scale: 0.92, duration: 4 }, T.ch2 + 6);

      /* ── TR. 알림 카드 → 폭락 캔들 ──
       * 카드가 튕겨나와 잠깐 커졌다가, 글자가 사라지고 폭이 좁아지며 빨갛게 물들어
       * 캔들 하나가 된다. 그 자리에 진짜 폭락 캔들이 있어서 안착하는 순간 바꿔친다. */
      const crashBox = () => {
        const r = crashBody.getBoundingClientRect();
        const e = el.getBoundingClientRect();
        return { cx: r.left - e.left + r.width / 2, cy: r.top - e.top + r.height / 2, w: r.width, h: r.height };
      };
      const MORPH_AT = T.tr + 4;
      const MORPH = 7;
      const LAND = MORPH_AT + MORPH;

      tl.to([laptop, chScene], { autoAlpha: 0, duration: 5 }, T.tr);
      tl.to(el, { backgroundColor: BG.dark, duration: 8 }, T.tr);
      // 1) 튕겨나와 주목
      tl.to(
        alert,
        { x: () => centerDelta(alert, el).x, y: () => centerDelta(alert, el).y - el.clientHeight * 0.04, scale: 1.25, duration: 4, ease: "power2.out" },
        T.tr,
      );
      tl.from(trScene, { autoAlpha: 0, duration: 3 }, T.tr + 2);
      // 2) 카드가 캔들로: 글자 페이드 → 크기·위치·색이 캔들과 같아진다
      // 글자는 카드가 실제로 줄어들기 시작할 때 지운다 — 빈 카드가 오래 떠 있지 않게
      tl.to(alertKids, { autoAlpha: 0, duration: 2 }, MORPH_AT + MORPH * 0.4);
      tl.to(
        alert,
        {
          x: () => crashBox().cx - (layoutOffset(alert, el).left + crashBox().w / 2),
          y: () => crashBox().cy - (layoutOffset(alert, el).top + crashBox().h / 2),
          width: () => crashBox().w,
          height: () => crashBox().h,
          scale: 1,
          borderRadius: 2,
          padding: 0,
          backgroundColor: "#ff6b61",
          borderColor: "#ff6b61",
          boxShadow: "0 0 42px rgba(255,107,97,0.55)",
          duration: MORPH,
          ease: "power2.in", // 머물다가 캔들로 빨려들 듯
        },
        MORPH_AT,
      );
      // 폭락 전 캔들들이 왼쪽부터 자라며 차트 맥락을 만든다
      const before = candles.slice(0, CRASH_INDEX);
      const after = candles.slice(CRASH_INDEX + 1);
      tl.from(before, { scaleY: 0, transformOrigin: "50% 100%", duration: 2.5, stagger: (MORPH - 2.5) / before.length }, MORPH_AT);
      // 3) 안착: 카드 ↔ 진짜 캔들 교체, 반등 캔들, 고점선, 스탬프, 카피
      tl.from(crash, { autoAlpha: 0, duration: 0.4 }, LAND);
      tl.to(alert, { autoAlpha: 0, duration: 0.4 }, LAND + 0.2);
      tl.from(after, { scaleY: 0, transformOrigin: "50% 100%", duration: 2, stagger: 0.5 }, LAND + 0.4);
      tl.from(peakLine, { autoAlpha: 0, duration: 2 }, LAND);
      tl.from(stamp, { autoAlpha: 0, scale: 1.7, duration: 3, ease: "back.out(2)" }, LAND + 1);
      tl.from(trCopy, { autoAlpha: 0, y: 24, duration: 4 }, LAND + 3);
      tl.to({}, { duration: TOTAL - T.trHold }, T.trHold);

      return () => document.body.classList.remove("ld-dark");
    },
    { scope: root },
  );

  return (
    <div ref={root} className="ld-stage" data-mode={mode} aria-label="소개">
      {/* S0 — 문 → 비네트 → 베일 → 카피. 고지서는 아래 스테이지 직속(노트북 위 겹). */}
      <section className="ld-scene ld-scene--s0">
        <div className="ld-door ld-door--back" aria-hidden>
          <DoorBack />
        </div>
        <div className="ld-vignette" aria-hidden />
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
      </section>

      {/* 고지서 — 투입구에서 나와 중앙으로, 조각이 노트북 위로 날아간다 */}
      <div className="ld-bill-anchor">
        <div className="ld-bill-wrap">
          <Bill />
        </div>
      </div>

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

      {/* TR — 알림 카드가 이 차트의 폭락 캔들이 된다 */}
      <section className="ld-scene ld-scene--tr">
        <h2 className="ld-tr-copy">
          그리고 어떤 날은,
          <br />
          시장이 무너집니다
        </h2>
        <div className="ld-tr-chart">
          <Candles />
          <div className="ld-tr-stamp mono">-25%</div>
        </div>
      </section>
    </div>
  );
}
