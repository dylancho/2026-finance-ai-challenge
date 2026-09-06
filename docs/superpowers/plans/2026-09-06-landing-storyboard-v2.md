# 랜딩 스토리보드 v2 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/` 랜딩을 스토리보드 v2(고지서 오프닝 → 노트북 무대 → 알림→낙폭 모핑 → 자산관리 다크 → 브릿지 → 상속·신탁 칼럼 → 숫자 → 사람 → CTA)로 교체한다.

**Architecture:** 핀은 스토리보드의 3개 대신 **1개(Stage)**로 합친다 — S0·CH1·CH2·TR 이 노트북·알림 카드라는 같은 DOM 요소를 이어 쓰기 때문에, 핀을 나누면 핀 경계에서 같은 물체가 두 번 그려지는 이음새가 생긴다. Stage 는 GSAP ScrollTrigger 로 `pin + scrub` 되는 마스터 타임라인 하나이고, 위치 계산은 전부 함수형 값이라 리사이즈에 안전하다. CH3 이후는 일반 흐름 섹션이며 기존 `Reveal`(IntersectionObserver) 로 1회 재생한다. **CSS 기본 상태 = 완성 상태**이고, GSAP 은 `from` 트윈으로만 초기 상태를 만든다. 그래서 reduced-motion·JS 미실행에서는 완성 화면이 그대로 보인다.

**Tech Stack:** Next.js 15 / React 19 / gsap 3.15 (`ScrollTrigger`) / `@gsap/react` (`useGSAP`) / lenis 1.3 / vitest.

**Spec:** `docs/landing-storyboard.md` (스토리보드 v2 + 구현 결정)

## Global Constraints

- 한 화면 = 한 메시지.
- `prefers-reduced-motion: reduce` 면 완성 상태를 즉시 표시한다 (핀·스크럽 없음, Lenis 없음).
- 노트북·카드 속 콘텐츠는 전부 실제 컴포넌트 렌더. 스크린샷 금지.
- 사실적 노인 얼굴 비주얼 금지. S8 실사는 얼굴 없는 손 컷.
- 없는 기능은 적지 않는다. 수치는 앱의 실제 데모 데이터(`DEMO_PROFILES.B`, `lib/design`)에서 가져온다.
- 실사 에셋은 `public/landing/s0-door.jpg`, `public/landing/s0-hand.jpg`, `public/landing/s8-basket.jpg` 경로로 고정. 파일이 없으면 CSS/SVG 임시 비주얼이 보인다.
- 장식 모션은 챕터당 1개 (CH2 알림 부상, TR 모핑, CH3 재정렬).
- Lenis 는 랜딩 라우트에서만 켠다.
- 커밋 메시지는 기존 관례(`feat(landing): …`)를 따른다.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `lib/landing/stats.ts` (+test) | S7 숫자: 데모 프로필 B 로 조항 수·공백 수·유지 년수 계산 (순수 함수) |
| `components/landing/gsap.ts` | gsap·ScrollTrigger·useGSAP 플러그인 등록 1회 |
| `components/landing/LenisProvider.tsx` | 랜딩 한정 Lenis, gsap ticker 연결, reduced-motion 이면 미실행 |
| `components/landing/stage/layout.ts` (+test) | offsetParent 체인으로 레이아웃 좌표 계산, FLIP 델타 (순수 함수) |
| `components/landing/stage/phases.ts` (+test) | 마스터 타임라인의 구간 표 (시작 시각, 다크 헤더 구간) |
| `components/landing/stage/Bill.tsx` | 고지서 DOM 컴포넌트 (FLIP 조각 span 포함) |
| `components/landing/stage/Laptop.tsx` | CSS 노트북 프레임 + 화면 3종(집행 일지/계좌 구조/한도) + 알림 카드 |
| `components/landing/stage/Drawdown.tsx` | TR 낙폭 SVG (pathLength=1) |
| `components/landing/stage/Stage.tsx` | 핀 1개, 마스터 타임라인, 헤더 다크 토글 |
| `components/landing/sections/AssetsSection.tsx` | CH3 (모듈 D) |
| `components/landing/sections/BridgeSection.tsx` | BR (모듈 B) |
| `components/landing/sections/EstateSection.tsx` | CH4 (모듈 A, 아코디언) |
| `components/landing/sections/NumbersSection.tsx` + `useCountUp.ts` | S7 |
| `components/landing/sections/PeopleSection.tsx` | S8 |
| `components/landing/sections/ClosingSection.tsx` | S9 |
| `components/landing/Landing.tsx` | 클라이언트 조립 (Lenis + Stage + 섹션들) |
| `app/page.tsx` | 서버: Header + `<Landing stats>` + Footer |
| `app/globals.css` | `/* ── 랜딩 v2 (온보딩) ─` 블록을 v3 블록으로 교체 |
| 삭제 | `components/landing/FeatureSection.tsx`, `FraudSection.tsx`, `mocks.tsx`, `useScrollProgress.ts` |
| `public/landing/README.md` | 에셋 파일명·규격 안내 |

기존 유지: `components/landing/Reveal.tsx`, `StartLink.tsx`.

---

### Task 1: S7 숫자 계산 `lib/landing/stats.ts`

**Files:** Create `lib/landing/stats.ts`, Test `lib/landing/__tests__/stats.test.ts`

**Interfaces:** Consumes `demoProfile(key)` (`lib/profile.ts`), `buildDesign(p)`·`findGaps(p, design)` (`lib/design/index.ts`). Produces `landingStats(key = "B"): { clauses: number; gaps: number; years: number | null }`.

- [ ] Step 1: 실패하는 테스트 — 데모 B 는 clauses > 0, gaps ≥ 0, years null 또는 > 0. 없는 키 "Z" 는 `{clauses:0,gaps:0,years:null}`.
- [ ] Step 2: `npx vitest run lib/landing` → import 실패 확인
- [ ] Step 3: 구현 — 조항 = 신탁 조항 중 status !== "missing" + 지출설계서 limits.length + transfers.length + 활성 fraudRules 수. 공백 = `findGaps(p, d).length`. 년수 = `d.expense.sustainability.years`.
- [ ] Step 4: 통과 확인
- [ ] Step 5: 커밋 `feat(landing): S7 숫자용 데모 통계 함수`

---

### Task 2: 순수 헬퍼 `stage/layout.ts`, `stage/phases.ts`

**Files:** Create `components/landing/stage/layout.ts`, `phases.ts`; Test `components/landing/stage/__tests__/layout.test.ts`, `phases.test.ts`

**Interfaces (Produces):**
```ts
export interface Box { offsetLeft; offsetTop; offsetWidth; offsetHeight; offsetParent: Box | null }
export function layoutOffset(el: Box, root: Box): { left; top }          // offsetParent 체인 합
export function fitDelta(src: Box, dst: Box, root: Box): { x; y; scale }  // 중심 이동 + 폭 비율
export function centerDelta(el: Box, root: Box): { x; y }                 // el 중심 → root 중심
export const T = { s0Still:0, s0Bill:5, s0Laptop:14, s0Flip:22, s0Full:30, ch1Enter:40, ch1Beat1:46, ch1Beat2:56, ch1Beat3:66, ch2:76, tr:92, trHold:112 }
export const TOTAL = 118
export const DARK: [number, number][] = [[0, T.s0Full/TOTAL], [T.ch2/TOTAL, 1]]
export function isDark(progress: number): boolean
```

- [ ] Step 1: 테스트 — layoutOffset 체인 합산(root→col(500,100)→el(20,30) = 520,130), root 자신 0; fitDelta(src 100,100,200,50 → dst 600,500,100,25) = {450, 387.5, 0.5}; centerDelta(el 700,600,200,100 in 1000×800) = {-300,-250}; phases: 라벨 오름차순·TOTAL 미만, DARK 쌍 유효, isDark(0.02)=true, isDark(ch1Beat2/TOTAL)=false, isDark(tr/TOTAL)=true.
- [ ] Step 2: 실패 확인 → Step 3: 구현 → Step 4: 통과 → Step 5: 커밋 `feat(landing): Stage 레이아웃·구간 헬퍼`

---

### Task 3: GSAP 등록 + LenisProvider + 에셋 안내

**Files:** Create `components/landing/gsap.ts`, `LenisProvider.tsx`, `public/landing/README.md`

- `gsap.ts`: `"use client"`, `gsap.registerPlugin(ScrollTrigger, useGSAP)`, re-export 셋.
- `LenisProvider`: useEffect 에서 reduced-motion 이면 return. `new Lenis({ lerp: .11, smoothWheel: true })`, `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t*1000))`, `gsap.ticker.lagSmoothing(0)`, cleanup 에서 ticker.remove + destroy.
- README: 파일명 3개, 장면, 내용, 권장 규격(1920×1080 / 1600×1000) 표.
- [ ] `npx tsc --noEmit -p .` → 커밋 `feat(landing): gsap 등록, Lenis 프로바이더, 에셋 안내`

---

### Task 4: Stage 부품 — Bill, Laptop(화면 3종 + AlertCard), Drawdown

**Files:** Create `components/landing/stage/Bill.tsx`, `Laptop.tsx`, `Drawdown.tsx`

**Interfaces (Produces):** data 속성이 Stage 타임라인의 셀렉터다.
- `[data-frag="co|amt|due"]` 고지서 조각(출발: 한국전력 / 38,500원 / 9/25), `[data-target="co|amt|due"]` 집행 일지 08:00 줄의 도착 조각, `[data-log-rest]` 08:00 줄의 나머지, `[data-bill-body]`
- `[data-screen="log|accounts|limits"]`, `[data-line="1000"]`(생활비 분할 지급), `[data-line="2347"]`(처음 보는 계좌 480만원 → 제4조 보류, 1차 관리자 판단 요청)
- `[data-alert]` 알림 카드 (`AlertCard` export), `[data-dd-line]` (pathLength=1), `[data-dd-fill]`
- 화면 내용은 지출설계서 §1 3층 계좌(보전/지급/생활), §3 한도(1회 100만 → 1일 200만 자동 산정, 처음 보내는 계좌 하루 뒤 집행)와 같은 말.
- [ ] tsc → 커밋 `feat(landing): 고지서·노트북·낙폭 부품`

---

### Task 5: Stage.tsx — 핀 1개, 마스터 타임라인

**Files:** Create `components/landing/stage/Stage.tsx`

**DOM:**
```
div.ld-stage[data-mode=pending|scroll|static]
  section.ld-scene--s0: .ld-still--door(DoorArt svg + .ld-photo s0-door.jpg), .ld-still--hand, .ld-veil, .ld-s0-copy--1(h1 "매달 옵니다. 그리고, 잊는 날이 옵니다" + 각주 JAMA 2020), .ld-s0-copy--2(h2 "당신이 잊어도, 원칙은 기억합니다"), .ld-bill-wrap>Bill
  div.ld-laptop-col: .ld-laptop-wrap>Laptop, AlertCard     ← 레이아웃 위치 = CH 위치(우측 56%)
  section.ld-scene--ch[data-tone]: .ld-ind(.ld-ind--01 "01 일상", .ld-ind--02 "02 보호"), .ld-beat[data-beat=1..3](CH1 비트, 문제→해결 캡션, StartLink focus=core), .ld-beat[data-beat=4](CH2 카피, focus=safe)
  section.ld-scene--tr: Drawdown, .ld-tr-stamp "-25%", h2.ld-tr-copy "그리고 어떤 날은, 시장이 무너집니다"
```

**타임라인 (useGSAP, scope root; reduced-motion 이면 setMode("static") 후 return):**
- ScrollTrigger: trigger el, start "top top", end `+= innerHeight*9`, pin, scrub .6, anticipatePin 1, invalidateOnRefresh, onUpdate → `body.classList.toggle("ld-dark", isDark(progress))`, onLeave remove, onLeaveBack add.
- 함수형 오프셋: `s0X = centerDelta(laptopWrap).x`, `s0Y = centerDelta.y + h*0.22`, `fullScale = min(W/laptop.w, H/laptop.h)*0.96`, `fullY = centerDelta.y + h*0.02`.
- S0: set laptopWrap {x:s0X,y:s0Y}; from hand autoAlpha (T.s0Still, 5); from billWrap {scale .38, y h*.22, x -w*.08, autoAlpha 0} (T.s0Bill, 8); veil → .86; copy1 from (T.s0Bill+4); laptopWrap from yPercent 120 (T.s0Laptop, 8); copy1 out, copy2 in; 조각 i: to {x: fitDelta.x + s0X, y: fitDelta.y + s0Y, scale} (T.s0Flip + i*.6, 6); billBody out; frags out / targets in (T.s0Flip+6.5); logRest in; laptopWrap → {x: centerDelta.x, y: fullY, scale: fullScale} (T.s0Full, 8); 스틸·veil·copy2·billWrap out; bg → ivory.
- CH1: laptopWrap → {x0,y0,scale1} (T.ch1Enter, 7); chScene in; ind01 in; beat(i, at): from {autoAlpha 0, y 26} 3, to {autoAlpha 0, y -26} at+7. beat1 + line1000 in; beat2 + log out/accounts in; beat3 + accounts out/limits in.
- CH2: bg → navy; chScene attr data-tone=dark; ind01 out/ind02 in; limits out/log in; line2347 in; beat4 in (out 없음); alert from {autoAlpha 0, y 34, scale .92} (T.ch2+6, 4).
- TR: [laptop, chScene] out (T.tr, 6); bg → dark; alert → {x,y: centerDelta(alert), scale 2.3} (T.tr, 8); trScene in (T.tr+5); ddLine fromTo strokeDashoffset 1→0 (T.tr+6, 10); ddFill in; alert out+scale 2.6 (T.tr+8); stamp from scale 1.7 (T.tr+14); trCopy in (T.tr+16); hold to TOTAL.
- cleanup: body.ld-dark 제거.
- `DoorArt({hand})`: 임시 비주얼 SVG (문·문틈·종이·손 실루엣).
- [ ] tsc → 커밋 `feat(landing): 핀 무대(S0·CH1·CH2·TR) 마스터 타임라인`

---

### Task 6: 흐름 섹션 — CH3·BR·CH4

**Files:** Create `components/landing/sections/AssetsSection.tsx`, `BridgeSection.tsx`, `EstateSection.tsx`

- **AssetsSection** (client): IntersectionObserver(rootMargin "-68px 0px -100% 0px") 로 body.ld-dark 토글. 배경 `.ld-assets-bg>Drawdown` (opacity .32). 헤드 "원칙은 건강할 때 정해둡니다" + 캡션. 카드 3장(Reveal delay 0/140/280): 관측("지난 급락 때, 7일 만에 42%를 파셨습니다" + 미니 바), 선언("위험자산 상한 20%" + 태그 파생상품 금지·레버리지 금지, I01·I02), 재배치(`.ld-pf` 바 — `.reveal.in` 시 risk 58%→20% CSS 트랜지션 + 후보 4개, "아무것도 하지 않음" 첫 번째). 각 카드 아래 문제→해결 캡션. CTA StartLink focus=invest.
- **BridgeSection**: 웜그레이. h2 "지키는 준비가 끝나면, 남기는 준비입니다". 문장 "수많은 [신탁][상속][의료·요양] 앞에서, 미루던 결정들" — 칩은 `Reveal as="span"` delay 300+i*140.
- **EstateSection** (client): 좌 `.ld-chip` "04 상속·신탁·의료", h2 "판단이 어려워지는 날의 절차까지", 아코디언 4항목(useState open, 기본 1): 신탁설계 초안 / 제4조 지급개시 트리거(바이오마커 61+ AND 의료 증빙, AI 단독 발동 없음) / 의료·요양 재무(의료예비계좌, 요양 입소 시 증액) / 승인·에스컬레이션(1차 → 12시간 → 2차 감독). 열린 항목만 설명 + StartLink CTA(focus estate/estate/estate/safe). 우 `.ld-doc`(기울어진 신탁설계서 초안, 제1·2·3·5·8·11조, 11조는 "선언되지 않음" gap) + `.ld-doc-float` 제4조 카드.
- [ ] tsc → 커밋 `feat(landing): 자산·브릿지·상속 섹션`

---

### Task 7: S7·S8·S9 + useCountUp + Landing 조립 + page.tsx

**Files:** Create `components/landing/useCountUp.ts`, `sections/NumbersSection.tsx`, `PeopleSection.tsx`, `ClosingSection.tsx`, `Landing.tsx`; Modify `app/page.tsx`; Delete `FeatureSection.tsx`, `FraudSection.tsx`, `mocks.tsx`, `useScrollProgress.ts`

- `useCountUp(target, ms=1400)` → `{ref, v}`: 요소가 50% 보이면 ease-out cubic 으로 0→target, reduced-motion 즉시 target.
- `NumbersSection({stats: LandingStats})`: h2 "당신의 설계서에는 지금 몇 개의 공백이 있습니까", 카드 3개: 조항 N개 / 공백 M개 / 생활비 유지 약 K년 (years null 이면 "30년+").
- `PeopleSection`: 실사 자리 (`.ld-photo` s8-basket.jpg 위에, 아래 SVG 장바구니 실루엣), 카피 "빼앗는 설계가 아니라, 돌려주는 설계입니다" / "생활계좌 안에서의 자유는 끝까지 본인의 것입니다".
- `ClosingSection` (client, body.ld-dark 토글): S0 어스름 톤, h2 "오늘의 당신이, 미래의 당신을 지킵니다", StartLink "지금 기록 시작하기".
- `Landing({stats})` (client): `<LenisProvider><main className="ld"><Stage/><Assets/><Bridge/><Estate/><Numbers/><People/><Closing/></main></LenisProvider>`.
- `app/page.tsx`: Header + `<Landing stats={landingStats("B")} />` + Footer.
- [ ] git rm 4개 → tsc → 커밋 `feat(landing): 숫자·사람·CTA 섹션, 랜딩 조립`

---

### Task 8: globals.css — 랜딩 v3 블록

**Files:** Modify `app/globals.css` — `/* ── 랜딩 v2 (온보딩)` 마커부터 `/* ── 반응형 ─` 마커 직전까지 통째로 교체 (node 스크립트로 마커 검색, 라인 번호 하드코딩 금지).

블록 구성 (모두 `.ld-` 접두):
- 공통: `.ld`, lenis html 규칙, `.reveal`, `.btn.lg/.light`, `body.ld-dark .header/.brand/.nav` 다크 변주 + 트랜지션, `.ld-chip`, `.ld-cap`(문제→해결 2줄, 마지막 줄 진하게), `.ld-sec-head`, `.ld-photo`.
- Stage: `.ld-stage` 100vh overflow hidden; `.ld-scene` absolute inset 0; `[data-mode="pending"]` 은 ch·tr·laptop-col visibility hidden; S0 스틸/veil/카피/고지서(종이 질감, -2deg); `.ld-laptop-col` absolute top 68px right 3% width 56% flex center; 노트북 프레임(bezel, 16:10, base); 화면 3종 absolute 겹침; 집행 일지 줄(warn 변주); 3층 계좌; 한도(derived dashed); `.ld-alert` absolute left -4% bottom 20% (화면 밖으로 살짝); `.ld-scene--ch` width 41% 좌측 패딩 `max(28px, calc((100vw - 1320px)/2 + 28px))`, `[data-tone=dark]` 흰 글자; `.ld-beat` absolute 겹침; `.ld-ind` 두 span absolute 겹침; TR: drawdown bottom 62%, stamp, copy.
- Static 모드: `[data-mode="static"]` 에서 scene·laptop-col 을 relative 로 풀어 세로 스택, 스틸·카피1 숨김.
- CH3: 다크 `#0a0e18`, 3분할 카드(모듈 D: 사이 2px, 양끝 라운드), `.ld-pf .risk` 58% → `.reveal.in` 20% (1.4s).
- BR: `#f3efe8`, min-height 86vh(다음 섹션 상단 노출), 칩 pop.
- CH4: 2칼럼, 아코디언(닫힌 항목 연회색, 열린 항목 네이비), `.ld-doc` perspective 기울임, `.ld-doc-float` 네이비 카드.
- S7: 카드 3개 카운트. S8: 그라데이션 오버레이 + 좌 카피. S9: 어스름 radial.
- 반응형 960/640: laptop-col 하단 46vh, ch 칼럼 상단 전폭, 카드·숫자·상속 1칼럼, doc 기울임 제거, float static. reduced-motion: reveal 즉시, pf 20%.
- [ ] tsc + lint → 커밋 `feat(landing): 랜딩 v3 스타일`

---

### Task 9: 브라우저 검증 + 마무리

- [ ] `npm run dev` 백그라운드, Chrome MCP 1440×900 에서 체크리스트: S0 크로스페이드·고지서·카피 교체·조각 안착·풀스크린 / CH1 우측 노트북·01 일상·비트 3·화면 전환 / CH2 네이비·02 보호·경고 줄·알림 부상 / TR 알림 확대→곡선→-25%→카피 / CH3~S9 순서·헤더 다크 토글 / 콘솔 에러 0(이미지 404 허용).
- [ ] 모바일 390×844 통과, 텍스트 겹침 없음.
- [ ] reduced-motion 에뮬레이션 → 정적 스택.
- [ ] `npm test` 전체 통과.
- [ ] 문제 수정 후 커밋 `fix(landing): 브라우저 검증 반영`.

---

## Self-review

- **Spec coverage:** S0(1~4) Task 4·5 / CH1 비트 3 + 캡션 문법 Task 5 / CH2 경고 줄·알림 부상 Task 4·5 / TR 모핑·reduced-motion Task 5·8 / CH3 카드 3장·재배치 Task 6 / BR 칩·다음 카드 고개 Task 6·8 / CH4 아코디언 4항목·문서 목업·떠 있는 조항 Task 6 / S7 카운트업(데모 수치) Task 1·7 / S8 실사·카피 Task 7 / S9 CTA·수미상관 Task 7 / 배경색 아크 Task 5(Stage)·8(섹션) / Lenis 랜딩 한정 Task 3 / 에셋 경로 고정 Task 3·5·7.
- **Deviation:** 핀 3개 → 1개 (Architecture 참고). 스토리보드 "룰 7종" → 실제 한도 룰 7종 + 맥락 룰 3종으로 카피.
- **Type consistency:** `landingStats` 반환형 = `LandingStats`(NumbersSection). `data-*` 셀렉터 Task 4 정의 ↔ Task 5 사용. `T.*` 라벨 Task 2 ↔ Task 5.
