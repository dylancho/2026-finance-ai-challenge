"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "../gsap";
import StartLink from "../StartLink";
import Bill from "./Bill";
import { Laptop, AlertCard } from "./Laptop";
import Candles, { CRASH_INDEX } from "./Candles";
import { DoorBack, DOOR } from "./DoorScene";
import { BillHand, HAND, PERSON, armPath } from "./Person";
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
 * S0 는 짧은 영화 비트다 (2026-09-06 연출 변경: "문에 꽂힌 고지서" → "사람이 꺼내 클로즈업").
 *  A. 와이드 숏 — 실제 비례의 현관문 앞에 선 사람이 문틈에 꽂힌 고지서로 팔을 뻗고 있다.
 *     문과 사람이 가운데를 차지하므로 소개 글(h1)은 좌우 여백에 나눠 앉고, 스크롤을 시작하면 위로 옅어지며 사라진다.
 *  B. 손이 고지서를 뽑는다(0→s0Bill) — DOM 고지서가 문틈 선을 따라 빠져나오고, 문틈 선 왼쪽을 잘라 둔
 *     clip-path 가 함께 풀린다. 꽂혀 있는 동안은 회전 0 — 기울이면 잘린 모서리(고지서 로컬 좌표)가 세로
 *     문틈 선과 어긋나 종이가 문에 붙인 것처럼 보인다. 손은 고지서 래퍼 안에 있어 종이와 같이 움직이고,
 *     사람의 팔은 매 프레임 IK 로 그 손목을 따라간다(updateArm).
 *  C. 카메라 푸시인(s0Bill→s0Laptop) — 고지서가 중앙으로 와 읽히는 크기가 되고, 문+사람은 문틈을 축으로
 *     살짝 커지며 서리 베일 아래로 사라진다.
 * 고지서는 노트북 위 겹에 있어야 조각이 화면 위로 날아간다 — 그래서 S0 장면 밖, 스테이지 직속이다.
 *
 * S0·CH1 은 밝은 장면(토스풍), CH2·TR 은 딥네이비. BG.light 는 .ld-stage 의 CSS 배경과 같은 값이다.
 */

const BG = { light: "#f2f4f8", ivory: "#f5f3ee", navy: "#0c1c36", dark: "#0a0e18" };

// 문구는 docs/writing-style.md(해요체, 짧은 문장, 사람 말)를 따른다. 캡션은 "문제 한 줄 / 해결 한 줄".
const BEATS = [
  { id: 1, h: "공과금은 잊어도 됩니다", p1: "납부 버튼을 누르지 않아도", p2: "정해 둔 대로 자동으로 냅니다" },
  { id: 2, h: "생활비는 나눠서, 안전하게", p1: "한 계좌에 다 두지 않고", p2: "세 개 계좌로 나눠 필요한 만큼만 씁니다" },
  { id: 3, h: "한도는 내가 정한 만큼만", p1: "1회 한도를 100만원으로 정하면", p2: "하루 한도 200만원은 자동으로 따라옵니다" },
];

/** 문틈에 꽂혀 있을 때 고지서 너비 (문 장면 viewBox 단위) — 배율은 화면마다 여기서 역산한다. 문짝 폭 200 의 64%(1.9:1 이라 세로가 낮아진 만큼 조금 키웠다) */
const SEAM_W = 128;
/** 꽂혀 있을 때 문틈 밖으로 보이는 비율 (고지서 너비 기준). .ld-bill-fold 의 그늘 위치(55%)와 짝이다. */
const PEEK = 0.45;
/** 손이 종이에서 떨어지는(사라지는) 데 걸리는 시간 — 그동안만 팔 IK 를 돌린다 */
const HAND_OFF = 1.5;

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
      const intro = all(".ld-s0-intro span");
      const billWrap = one(".ld-bill-wrap");
      const bill = one(".ld-bill");
      const billFold = one(".ld-bill-fold");
      const billHand = one(".ld-bill-hand");
      const person = one(".ld-person");
      const personArm = one(".ld-person-arm");
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
      // 꽂혀 있을 때 배율: 어느 화면에서든 문 대비 같은 크기(SEAM_W)여야 사람·문과 비례가 맞는다
      const slotScale = () => (SEAM_W * gap().s) / billWrap.offsetWidth;
      // 꽂혀 있을 때: 왼쪽 (1-PEEK) 은 문틈 안, 오른쪽 PEEK 만 밖으로 보인다. 잘린 모서리가 정확히 seamX 에 온다.
      const slotX = () => seamX() + SEAM_W * gap().s * (PEEK - 0.5) - layoutCenter(billWrap, el).x;
      const slotY = () => gap().y - layoutCenter(billWrap, el).y;
      // 완전히 빠져나온 자리: 문틈 바로 오른쪽
      const outX = () => seamX() + SEAM_W * gap().s * 0.5 + 6 * gap().s - layoutCenter(billWrap, el).x;
      // 꽂혀 있을 때 문틈 선 왼쪽으로 잘리는 너비 (고지서 로컬 px). 오른쪽·위아래는 음수로 넓혀 종이 밖의 손이 잘리지 않게 한다
      const clipIn = () => `inset(-50% -50% -50% ${Math.round(billWrap.offsetWidth * (1 - PEEK))}px)`;
      const CLIP_OUT = "inset(-50% -50% -50% 0px)";
      // 푸시인 축: 문틈의 고지서 자리. 문+사람이 여기를 중심으로 커져야 카메라가 종이로 다가가는 느낌이 난다
      const pushOrigin = () => `${seamX()}px ${gap().y}px`;

      /* ── 팔 IK: 고지서 위 손의 손목이 지금 화면 어디 있는지 → 문 장면 viewBox 좌표 → 어깨에서 그리로 가는 팔 ──
       * 손은 고지서 래퍼 안에 있어 래퍼의 transform(x·y·scale·rotation, 원점 중앙)을 그대로 따른다.
       * 손이 종이에서 떨어진 뒤(s0Bill + HAND_OFF)에는 마지막 자세로 멈춘다 — 푸시인 중에 팔이 화면 중앙으로 늘어나면 안 된다. */
      const updateArm = () => {
        const g = gap();
        const c = layoutCenter(billWrap, el);
        const tx = Number(gsap.getProperty(billWrap, "x"));
        const ty = Number(gsap.getProperty(billWrap, "y"));
        const sc = Number(gsap.getProperty(billWrap, "scale"));
        const rot = (Number(gsap.getProperty(billWrap, "rotation")) * Math.PI) / 180;
        const lx = billHand.offsetLeft + billHand.offsetWidth * HAND.wrist.x - billWrap.offsetWidth / 2;
        const ly = billHand.offsetTop + billHand.offsetHeight * HAND.wrist.y - billWrap.offsetHeight / 2;
        const px = c.x + tx + sc * (lx * Math.cos(rot) - ly * Math.sin(rot));
        const py = c.y + ty + sc * (lx * Math.sin(rot) + ly * Math.cos(rot));
        const offX = (el.clientWidth - DOOR.vw * g.s) / 2;
        const offY = (el.clientHeight - DOOR.vh * g.s) / 2;
        // 사람 그룹 자체가 x 로 살짝 물러나므로 그만큼 빼서 그룹 로컬 좌표로 만든다
        const lean = Number(gsap.getProperty(person, "x")) || 0;
        personArm.setAttribute("d", armPath(PERSON, { x: (px - offX) / g.s - lean, y: (py - offY) / g.s }));
      };

      // S0 동안 노트북은 화면 하단 중앙에 작게(0.8) 있다. 레이아웃 위치(우측 칼럼)와의 차이를 함수로 둔다.
      const S0_SCALE = 0.8;
      const s0X = () => centerDelta(laptopWrap, el).x;
      const s0Y = () => centerDelta(laptopWrap, el).y + el.clientHeight * 0.34;
      const fullScale = () =>
        Math.min(el.clientWidth / laptop.offsetWidth, el.clientHeight / laptop.offsetHeight) * 0.96;
      /** 화면을 꽉 채우기 직전까지만 커진다 — 다 커지는 걸 보고 나서 움직이면 늦다 */
      const NEAR_FULL = 0.9;
      const fullY = () => centerDelta(laptopWrap, el).y + el.clientHeight * 0.02;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => "+=" + window.innerHeight * 8,
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
          onRefresh: (st) => {
            document.body.classList.toggle("ld-dark", st.scroll() <= st.end && isDark(st.progress));
            updateArm(); // 함수형 좌표가 다시 계산된 뒤 팔도 새 손목 위치로
          },
          // 핀 밖 양쪽 모두 밝은 장면(S0 오프닝 / CH1 다음은 CH3 가 스스로 토글)
          onLeave: () => document.body.classList.remove("ld-dark"),
          onLeaveBack: () => document.body.classList.remove("ld-dark"),
        },
      });

      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __stageTl?: gsap.core.Timeline }).__stageTl = tl; // 브라우저 검증용
      }

      // 팔 IK 는 손이 종이를 쥐고 있는 동안만 — 스크럽 프레임마다 손목을 다시 찾는다
      tl.eventCallback("onUpdate", () => {
        if (tl.time() <= T.s0Bill + HAND_OFF) updateArm();
      });

      /* ── S0-0. 첫 화면 소개 — 스크롤을 시작하면 위로 옅어지며 사라진다 ──
       * CSS 기본 상태가 보이는 상태다: 첫 페인트(하이드레이션 전)와 reduced-motion 에서 그대로 읽힌다. */
      tl.to(intro, { autoAlpha: 0, y: -44, duration: 4, ease: "power1.in", stagger: 0.4 }, 0);

      /* ── S0-1 (비트 B). 손이 문틈에서 고지서를 뽑는다 ── */
      tl.fromTo(
        billWrap,
        { x: slotX, y: slotY, scale: slotScale, rotation: 0, clipPath: clipIn },
        { x: outX, clipPath: CLIP_OUT, duration: T.s0Bill, ease: "power1.out" },
        T.s0Still,
      );
      // 회전은 틈을 거의 다 벗어난 뒤에 붙는다(power2.in) — 끼어 있는 동안 잘린 모서리가 세로 문틈 선과 맞아야 한다
      tl.to(billWrap, { rotation: 4, duration: T.s0Bill, ease: "power2.in" }, T.s0Still);
      // 틈 쪽 그늘·접힘은 종이가 펴지면서 사라진다
      tl.to(billFold, { autoAlpha: 0, duration: T.s0Bill * 0.8, ease: "power1.in" }, T.s0Still);
      // 당기는 사람은 몸을 살짝 뒤로 뺀다 (viewBox 단위)
      tl.fromTo(person, { x: 0 }, { x: 7, duration: T.s0Bill, ease: "power1.out" }, T.s0Still);

      // 틈을 벗어나면 클립을 푼다 — 안 풀면 종이 박스 밖으로 날아가는 조각까지 잘린다
      tl.set(billWrap, { clipPath: "none" }, T.s0Bill);

      /* ── S0-2 (비트 C). 카메라 푸시인: 고지서는 중앙 클로즈업, 문+사람은 문틈을 축으로 커지며 베일 아래로 ── */
      tl.to(billWrap, { x: 0, y: 0, scale: 1, rotation: -1.5, duration: 8, ease: "power1.inOut" }, T.s0Bill);
      tl.to(billHand, { autoAlpha: 0, duration: HAND_OFF }, T.s0Bill);
      tl.fromTo(
        doorBack,
        { scale: 1, transformOrigin: pushOrigin },
        { scale: 1.15, transformOrigin: pushOrigin, duration: 8, ease: "power1.inOut" },
        T.s0Bill,
      );
      tl.to(person, { autoAlpha: 0, duration: 5 }, T.s0Bill + 1);
      tl.to(veil, { opacity: 0.86, duration: 8 }, T.s0Bill);
      // 첫 프레임: fromTo 가 즉시 렌더된 뒤이므로 팔을 지금 손목 자리에 맞춘다
      updateArm();

      /* ── S0-3. 노트북이 떠오른다 ── */
      // 타임라인 0초의 set() 은 리프레시 때 되돌려지므로, S0 위치는 fromTo 의 from 으로 박는다.
      tl.fromTo(
        laptopWrap,
        { x: s0X, y: s0Y, scale: S0_SCALE, yPercent: 120 },
        { yPercent: 0, duration: 6 },
        T.s0Laptop,
      );

      /* ── S0-4. 조각이 날아가 실행 기록 줄에 안착한다 ──
       * 이륙(17)은 노트북이 다 올라오기 전이고, 착지(22~) 무렵 노트북은 이미 커지는 중이다(s0Full=21).
       * 그래서 도착점을 이륙할 때 못 박지 않고 매 프레임 노트북의 현재 transform 으로 되짚는다 —
       * 조각이 움직이는 노트북을 따라가 정확히 그 줄 위에 앉는다.
       * GSAP 의 함수형 값은 트윈이 시작할 때 한 번만 불리므로, 좌표는 트윈이 아니라 진행률(p.v)로 만든다. */
      const FLIGHT = 5;
      const GAP = 1.6;
      const ARC = 40; // 포물선 최고점 (px)
      const UP = 0.35; // 떠오르는 구간이 비행에서 차지하는 몫
      const TRAIL = 0.8; // 착지 뒤 사라지는 동안에도 노트북을 따라가는 시간
      const eOut = gsap.parseEase("power2.out");
      const eIn = gsap.parseEase("power2.in");

      /** i 번째 조각이 "지금 이 순간의" 노트북 위 목적지까지 가려면 얼마나 움직여야 하는지 */
      const dest = (i: number) => {
        const lc = layoutCenter(laptopWrap, el);
        const tc = layoutCenter(targets[i], el);
        const fc = layoutCenter(frags[i], el);
        const ls = Number(gsap.getProperty(laptopWrap, "scale"));
        return {
          x: lc.x + (tc.x - lc.x) * ls + Number(gsap.getProperty(laptopWrap, "x")) - fc.x,
          y: lc.y + (tc.y - lc.y) * ls + Number(gsap.getProperty(laptopWrap, "y")) - fc.y,
          scale: (targets[i].offsetWidth * ls) / frags[i].offsetWidth,
        };
      };

      tl.to(logWait, { autoAlpha: 0, duration: 1 }, T.s0Flip);
      frags.forEach((f, i) => {
        const at = T.s0Flip + i * GAP;
        const rot = i % 2 ? 6 : -6;
        const p = { v: 0 };
        // 종이 조각처럼 떨어져 나온다: 배경(고지서와 같은 누런 종이색)·그림자를 얻는다
        tl.to(f, { backgroundColor: "#f7f1d9", boxShadow: "0 18px 34px -10px rgba(12,28,54,.38)", duration: 1 }, at);
        // 비행: 살짝 떠오른 뒤 포물선으로 떨어진다. 좌표는 매 프레임 지금의 목적지에서 되짚는다.
        tl.to(
          p,
          {
            v: 1,
            duration: FLIGHT + TRAIL,
            onUpdate: () => {
              const d = dest(i);
              const v = Math.min(1, (p.v * (FLIGHT + TRAIL)) / FLIGHT);
              const y = v <= UP ? (d.y - ARC) * eOut(v / UP) : d.y - ARC + ARC * eIn((v - UP) / (1 - UP));
              gsap.set(f, { x: d.x * v, y, scale: 1 + (d.scale - 1) * v, rotation: rot * v });
            },
          },
          at,
        );
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
      // 종이만 사라진다 — 조각은 남아서 날아간다. 배경은 .ld-bill 의 종이색(#f5eed2)을 알파 0 으로 — 흰색으로 가면 사라지며 색이 변한다
      tl.to(billFade, { autoAlpha: 0, duration: 3 }, T.s0Flip + 1);
      tl.to(billRows, { borderColor: "rgba(0,0,0,0)", duration: 3 }, T.s0Flip + 1);
      tl.to(bill, { backgroundColor: "rgba(245,238,210,0)", boxShadow: "0 0 0 0 rgba(0,0,0,0)", duration: 3 }, T.s0Flip + 1);
      const lastLand = T.s0Flip + (frags.length - 1) * GAP + FLIGHT;
      tl.from(logRest, { autoAlpha: 0, x: -6, duration: 1.5, stagger: 0.2 }, lastLand + 0.4);

      /* ── S0-5. 노트북이 커진다 (꽉 차기 직전까지) ──
       * 고지서가 사라지자마자(21) 시작해 조각이 날아가는 내내 함께 커진다. 마지막 조각이 앉는 25.2 를
       * 조금 지나 28 에 멈추고, 그 자리에서 곧장 CH1 의 우측 자리로 넘어간다 — 다 커진 채로 기다리지 않는다.
       * 조각은 dest() 로 이 움직임을 따라간다. */
      tl.to(
        laptopWrap,
        { x: () => centerDelta(laptopWrap, el).x, y: fullY, scale: () => fullScale() * NEAR_FULL, duration: 7 },
        T.s0Full,
      );
      tl.to([doorBack, vignette, veil], { autoAlpha: 0, duration: 6 }, T.s0Full);
      // 고지서 래퍼는 조각이 다 앉은 뒤에 치운다 — s0Full 과 같이 지우면 아직 날고 있는 조각까지 사라진다
      tl.set(billWrap, { autoAlpha: 0 }, lastLand + 1);
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
      {/* S0 — 문 → 비네트 → 베일. 고지서는 아래 스테이지 직속(노트북 위 겹). */}
      <section className="ld-scene ld-scene--s0">
        <div className="ld-door ld-door--back" aria-hidden>
          <DoorBack />
        </div>
        <div className="ld-vignette" aria-hidden />
        <div className="ld-veil" aria-hidden />
        <h1 className="ld-s0-intro">
          <span className="l">미래의 나를 위해</span>
          <span className="r">지금의 내가</span>
        </h1>
      </section>

      {/* 고지서 — 문틈에서 손에 뽑혀 중앙으로, 조각이 노트북 위로 날아간다. 손은 종이와 같이 움직이도록 래퍼 안에 */}
      <div className="ld-bill-anchor">
        <div className="ld-bill-wrap">
          <Bill />
          <BillHand />
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
                일상 관리 설계하기 →
              </StartLink>
            </div>
          ))}
          <div className="ld-beat" data-beat={4}>
            <h2>
              수상한 거래는,
              <br />
              먼저 멈춥니다
            </h2>
            <p className="ld-cap">
              <span>금액 기준 7가지와 상황 기준 3가지로 거래를 살핍니다</span>
              <span>어긋나면 보류하고, 12시간 안에 답이 없으면 다음 사람에게 알립니다</span>
            </p>
            <StartLink className="ld-cta" focus="safe">
              금융 보호 설계하기 →
            </StartLink>
          </div>
        </div>
      </section>

      {/* TR — 알림 카드가 이 차트의 폭락 캔들이 된다 */}
      <section className="ld-scene ld-scene--tr">
        <h2 className="ld-tr-copy">
          그리고 어느 날,
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
