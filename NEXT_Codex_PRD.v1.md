# NEXT — AI Future Financial Decision Service
## Codex 구현용 PRD / 개발 명세서

### 0. 프로젝트 한 줄 설명

**NEXT**는 사용자가 미래에 스스로 금융 의사결정을 내리기 어려운 상황을 대비해, AI와 대화하며 자신의 금융 의사결정 원칙을 정리하고, 이를 바탕으로 신탁·후견·생활비 관리 등의 준비 방향을 제안하는 금융 AI 서비스의 프로토타입이다.

핵심 메시지:

> **내가 결정할 수 없을 때를 위해, 지금의 내가 결정합니다.**

중요:
- 이것은 금융/법률 자문을 실제로 제공하는 서비스가 아니라 **해커톤 데모용 프로토타입**이다.
- 실제 계약 체결, 자산 이동, 후견인 지정 등을 수행하지 않는다.
- 모든 추천은 "검토가 필요한 예시"로 표시한다.
- 실제 금융기관 API/개인정보/실제 계좌는 사용하지 않는다.
- 데모 데이터와 mock logic으로 완결된 사용자 경험을 만든다.

---

# 1. 구현 목표

Codex가 이 문서를 기준으로 **실제로 실행 가능한 웹 서비스**를 처음부터 구현한다.

사용자가 다음 흐름을 끝까지 경험할 수 있어야 한다.

1. 랜딩 페이지
2. 서비스 소개
3. AI 미래 금융 인터뷰 시작
4. AI와 대화
5. 사용자의 답변을 구조화
6. Future Decision Profile 생성
7. 미래 상황 리스크 분석
8. 신탁/후견/생활비 관리 방향 제안
9. 미래 시나리오 시뮬레이션
10. 개인별 Future Plan 확인
11. 전문가 상담/검토 CTA

가장 중요한 데모 흐름은:

**AI 인터뷰 → 미래 리스크 발견 → 맞춤형 금융 보호 플랜 생성**

이다.

---

# 2. 제품 컨셉

## 문제

치매, 사고, 질병 등으로 금융 의사결정 능력이 떨어지는 상황은 누구에게나 발생할 수 있지만 대부분의 사람은 사전에 다음 질문에 답을 준비하지 않는다.

- 누가 내 금융자산을 관리할 것인가?
- 생활비는 어떻게 지급할 것인가?
- 의료비는 어디까지 사용할 것인가?
- 투자자산은 어떻게 관리할 것인가?
- 가족에게 어떤 권한을 줄 것인가?
- 내가 원하는 금융 의사결정 원칙은 무엇인가?

기존 금융/후견 제도는 존재하지만 고객 입장에서는 제도가 어렵고, 자신의 상황에 어떤 제도가 적합한지 판단하기 어렵다.

## NEXT의 해결 방식

AI가 먼저 사용자의 상황과 가치관을 대화로 파악한다.

사용자는 전문 용어를 몰라도 된다.

예:

사용자:
> "치매에 걸려도 주식은 급하게 팔지 않았으면 좋겠어요."

AI:
> "알겠습니다. 투자자산의 장기 운용을 선호하는 것으로 기록할게요. 그렇다면 생활비와 치료비는 어떤 자산에서 우선 마련되길 원하시나요?"

AI는 자연어 답변을 구조화하여:

- 생활비 원칙
- 의료비 원칙
- 투자 원칙
- 가족 권한
- 자산관리 우선순위
- 미래 의사결정 선호

를 생성한다.

---

# 3. 핵심 사용자 플로우

## Flow A — Landing

URL:
`/`

구성:

- NEXT 로고
- Hero
- 문제 제시
- 서비스 작동 방식
- 핵심 기능 3개
- 마지막 CTA

Hero 문구:

### "내가 결정할 수 없을 때를 위해,
### 지금의 내가 결정합니다."

Sub:
> AI와 대화하며 미래의 금융 의사결정을 미리 설계하세요.

CTA:
`미래 금융 플랜 시작하기`

보조 문구:
> 실제 금융상품 가입이나 자산 이동은 발생하지 않는 데모 서비스입니다.

---

# 4. AI Interview

URL:
`/interview`

화면은 메신저 스타일.

좌측:
- NEXT AI
- 현재 단계
- 질문 카테고리 progress

우측 또는 중앙:
- 채팅 메시지
- 사용자 입력창
- 빠른 선택 버튼

인터뷰는 6개 카테고리로 구성한다.

## Step 1. 기본 상황

질문:
> "현재 금융자산을 주로 어떻게 관리하고 계신가요?"

선택:
- 예금 중심
- 투자 중심
- 부동산 중심
- 여러 자산을 함께 보유
- 잘 모르겠어요

## Step 2. 가족

질문:
> "만약 앞으로 금융 결정을 직접 내리기 어려워진다면, 가장 믿고 맡길 수 있는 사람은 누구인가요?"

선택:
- 배우자
- 자녀
- 형제자매
- 기타
- 아직 정하지 않았어요

## Step 3. 생활비

질문:
> "판단 능력이 떨어진 상황에서도 매달 반드시 유지되었으면 하는 지출은 무엇인가요?"

선택:
- 생활비
- 병원비
- 요양비
- 가족 지원
- 기타

## Step 4. 투자

질문:
> "갑작스럽게 금융 의사결정을 할 수 없게 된다면 투자자산은 어떻게 관리되길 원하시나요?"

선택:
- 안정적으로 유지
- 필요할 때 일부 매도
- 적극적으로 관리
- 잘 모르겠어요

## Step 5. 의료/요양

질문:
> "치료나 요양을 위해 큰 비용이 필요하다면 어떤 원칙을 가장 중요하게 생각하시나요?"

선택:
- 필요한 비용은 우선 사용
- 일정 금액까지 사용
- 가족과 상의 후 사용
- 잘 모르겠어요

## Step 6. 가족 권한

질문:
> "가족에게 금융관리 권한을 준다면 어느 정도까지 허용하고 싶으신가요?"

선택:
- 생활비 관리만
- 일정 금액까지
- 대부분의 금융업무
- 공동 승인
- 아직 정하지 않았어요

---

# 5. Interview UX

단순 폼처럼 보이지 않게 한다.

각 질문 사이에 AI가 사용자의 답변을 짧게 반영한다.

예:

사용자:
> "배우자에게 맡기고 싶어요."

AI:
> "배우자를 1차 금융관리자로 선호하시는 것으로 이해했어요."

그리고 다음 질문.

AI 메시지에는 작은 `NEXT AI` avatar를 사용한다.

답변이 누적될수록 상단 progress bar가 16%, 33%, 50% ... 로 증가한다.

입력창 placeholder:
`AI에게 편하게 이야기해 주세요.`

사용자가 자유 텍스트를 입력할 수 있도록 하고, 선택 버튼도 제공한다.

---

# 6. Interview 데이터 모델

TypeScript interface 예시:

```ts
interface FutureProfile {
  ageGroup: "50s" | "60s" | "70s" | "unknown";
  assetPreference: "deposit" | "investment" | "real_estate" | "mixed" | "unknown";
  primaryManager: "spouse" | "child" | "sibling" | "other" | "unknown";
  essentialExpenses: string[];
  investmentPreference: "preserve" | "partial_sale" | "active" | "unknown";
  medicalPreference: "priority" | "limit" | "family_consult" | "unknown";
  authorityPreference: "living_expense" | "limited" | "broad" | "joint" | "unknown";
  rawAnswers: {
    questionId: string;
    answer: string;
  }[];
}
```

실제 DB는 필요 없다.
초기 버전에서는 React state/localStorage로 관리한다.

---

# 7. AI 로직

실제 LLM API가 없어도 데모가 자연스럽게 작동해야 한다.

구현은 다음 2단계로 한다.

## MVP

선택지/키워드 기반 mock AI.

예:

- "배우자" → primaryManager = spouse
- "자녀" → primaryManager = child
- "유지" / "팔지" → investmentPreference = preserve
- "생활비" → essentialExpenses에 생활비 추가
- "병원" / "치료" → medicalPreference = priority

## 확장 가능한 구조

나중에 OpenAI API 등을 연결할 수 있도록:

`lib/ai/interview.ts`

에 인터페이스를 만든다.

```ts
export interface AIInterviewEngine {
  respond(
    message: string,
    profile: FutureProfile
  ): Promise<{
    response: string;
    extractedData?: Partial<FutureProfile>;
  }>;
}
```

기본 구현:
`MockInterviewEngine`

---

# 8. 결과 페이지

URL:
`/dashboard`

제목:

### "당신의 미래 금융 플랜"

상단에는 사용자의 Future Decision Score를 보여준다.

예:

**Future Readiness**
`68 / 100`

설명:
> 현재 일부 의사결정 원칙이 정리되어 있지만, 금융관리 권한과 자산관리 방식에 대한 추가 설계가 필요합니다.

점수는 데모용이다.

---

# 9. Risk Map

4개의 카드.

### 금융자산 관리
예:
`HIGH`

> 판단능력 저하 시 투자자산 관리 공백 가능성

### 생활비
예:
`MEDIUM`

> 정기적인 생활비 지급 계획 필요

### 가족 권한
예:
`HIGH`

> 금융관리 권한을 누구에게 어느 범위까지 부여할지 미정

### 의료/요양
예:
`MEDIUM`

> 장기 요양비 발생 시 자금원칙 추가 설정 권장

각 카드에는:
- 위험도
- 이유
- AI recommendation

을 표시한다.

---

# 10. AI Recommendation

결과 화면에서 다음과 같이 보여준다.

## NEXT AI가 제안하는 준비 방향

### 01. 금융자산 보호
**신탁 활용 검토**

> 향후 금융 의사결정이 어려워질 경우에도 미리 정한 생활비·의료비 등의 목적에 따라 자산을 관리할 수 있도록 신탁 활용을 검토해볼 수 있습니다.

Badge:
`신탁`

### 02. 미래 의사결정 권한
**임의후견 제도 검토**

> 본인이 판단할 수 있을 때 미리 후견인을 정하고 원하는 사무의 범위를 설계하는 방법을 검토할 수 있습니다.

Badge:
`후견`

### 03. 생활비
**정기 지급 플랜**

> 매월 필요한 생활비를 별도로 관리하는 구조를 고려할 수 있습니다.

Badge:
`생활`

하단:
> ※ 위 내용은 금융·법률 자문이 아닌 데모용 정보입니다. 실제 적용 여부는 금융기관 및 전문가와 상담이 필요합니다.

---

# 11. Future Decision Profile

결과 페이지의 가장 중요한 UI.

제목:

## "미래의 나에게 남기는 금융 사용 설명서"

카드 형태:

### 생활비
`월 300만원`
> 안정적인 생활비 지급을 최우선

### 투자
`장기 유지`
> 급격한 매도보다 장기적인 자산 보존 선호

### 의료
`우선 지원`
> 필요한 치료·요양 비용은 우선적으로 사용

### 1차 관리자
`배우자`

### 고액 거래
`공동 확인`

이것은 실제 법적 효력이 없으며 "AI가 정리한 의사결정 초안"임을 명확하게 표시한다.

---

# 12. 미래 시나리오 시뮬레이터

URL:
`/simulation`

이 기능을 반드시 구현한다.
해커톤 데모에서 가장 시각적으로 중요한 부분이다.

화면 제목:

## "만약 내일, 내가 결정할 수 없다면?"

Timeline UI:

`현재`
→ `판단능력 저하`
→ `생활비 발생`
→ `의료비 발생`
→ `자산관리`

사용자가 시나리오를 선택한다.

### Scenario 1
`치매 진단`

### Scenario 2
`갑작스러운 사고`

### Scenario 3
`장기 요양`

시나리오를 선택하면 AI가 Future Decision Profile을 기반으로 가상의 대응 흐름을 보여준다.

예:

```text
치매 진단
   ↓
직접 금융의사결정 어려움
   ↓
미리 설정한 금융관리 원칙 확인
   ↓
생활비 지급
   ↓
의료/요양비 우선 지원
   ↓
지정된 관리체계 검토
```

오른쪽에는:

### AI의 판단

> "현재 설정에서는 배우자를 1차 관리자로 설정하고, 생활비를 우선 지급하는 구조가 적합한 것으로 정리되어 있습니다."

버튼:
`내 플랜 보기`

---

# 13. 전문가 연결

결과 페이지 마지막 CTA:

## "이제 실제 준비를 시작해볼까요?"

설명:
> AI가 정리한 내용을 바탕으로 금융기관 및 전문가와 상담할 수 있습니다.

버튼:
`전문가 상담 준비하기`

누르면 mock 상담 신청 modal.

필드:
- 이름
- 연락 가능한 시간
- 관심 분야
  - 신탁
  - 후견
  - 생활비 관리
  - 종합 상담

실제 제출은 하지 않고 성공 modal만 보여준다.

---

# 14. 디자인 방향

## 전체 느낌

**Private banking + AI + 미래지향적 금융**

절대:
- 싸구려 핀테크 느낌
- 과도한 그라데이션
- 게임 UI
- 너무 많은 카드
- 귀여운 AI 챗봇

으로 만들지 않는다.

키워드:

- premium
- calm
- trustworthy
- minimal
- intelligent

## 색상

기본:
- background: #F7F8FA
- text: #111827
- muted: #6B7280
- primary: deep navy 계열
- accent: subtle blue/teal

카드:
- white
- border: very light gray
- shadow: extremely subtle

## Typography

한국어 가독성을 최우선.

가능하면:
- Pretendard
- 또는 system sans-serif

---

# 15. UI 컴포넌트

다음 컴포넌트를 만든다.

```text
components/
  layout/
    Header.tsx
    Footer.tsx

  landing/
    Hero.tsx
    ProblemSection.tsx
    HowItWorks.tsx
    CTASection.tsx

  interview/
    ChatWindow.tsx
    ChatMessage.tsx
    QuickReplies.tsx
    ProgressBar.tsx
    InterviewSummary.tsx

  dashboard/
    ReadinessScore.tsx
    RiskCard.tsx
    RecommendationCard.tsx
    FutureProfileCard.tsx
    PlanTimeline.tsx

  simulation/
    ScenarioSelector.tsx
    SimulationTimeline.tsx
    SimulationResult.tsx

  common/
    Badge.tsx
    Button.tsx
    Modal.tsx
    Disclaimer.tsx
```

---

# 16. 라우팅

Next.js App Router 기준:

```text
/
 /interview
 /dashboard
 /simulation
```

필요하면:
`/consultation`

도 추가.

---

# 17. 기술 스택

권장:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Recharts (필요한 경우)
- React state
- localStorage

외부 API 없이도 실행 가능해야 한다.

---

# 18. 데이터

데모 기본 사용자는 다음처럼 세팅한다.

```ts
const demoProfile = {
  ageGroup: "60s",
  assetPreference: "mixed",
  primaryManager: "spouse",
  essentialExpenses: ["생활비", "의료비"],
  investmentPreference: "preserve",
  medicalPreference: "priority",
  authorityPreference: "joint"
};
```

단, 첫 진입 시에는 기본 데이터를 그대로 보여주지 말고 사용자가 인터뷰를 진행한 결과처럼 보이게 한다.

개발 편의를 위해:

`?demo=true`

를 사용하면 샘플 데이터로 바로 dashboard에 진입할 수 있도록 한다.

---

# 19. Dashboard 점수 계산

데모용 단순 알고리즘:

기본 40점.

다음 항목이 설정되어 있으면 +10:
- primaryManager
- essentialExpenses
- investmentPreference
- medicalPreference
- authorityPreference

최대 90점.

추가적으로 위험도가 높으면 점수를 차감한다.

점수는 실제 금융 위험 평가가 아니라 **UX 시각화용 mock score**이다.

---

# 20. 중요한 AI 표현 원칙

AI가 다음처럼 단정하면 안 된다.

❌
> "당신에게는 치매안심신탁이 반드시 필요합니다."

❌
> "임의후견을 신청하세요."

대신:

⭕
> "현재 답변을 기준으로 신탁 활용을 검토해볼 수 있습니다."

⭕
> "임의후견 제도를 검토할 필요가 있을 수 있습니다."

⭕
> "실제 적용 가능 여부는 전문가 상담이 필요합니다."

---

# 21. Demo Script

발표자가 2분 안에 보여줄 수 있어야 한다.

## Scene 1 — 문제

Landing.

> "만약 내일 내가 금융 결정을 할 수 없다면?"

## Scene 2 — AI Interview

사용자:
> "배우자가 관리했으면 좋겠어요."

AI:
> "배우자를 1차 관리자로 기록했습니다."

사용자:
> "주식은 급하게 팔지 않았으면 좋겠어요."

AI:
> "장기 투자 원칙을 선호하시는 것으로 이해했습니다."

## Scene 3 — AI 분석

Dashboard.

`Future Readiness 68`

Risk:
- 금융자산 관리 HIGH
- 가족 권한 HIGH

## Scene 4 — AI Plan

AI가:

> 신탁 활용 검토
> 임의후견 검토
> 생활비 지급 플랜

을 생성.

## Scene 5 — 미래 시뮬레이션

"치매 진단" 선택.

현재의 의사결정 원칙이 미래 상황에서 어떻게 작동하는지 Timeline으로 보여준다.

## Scene 6 — 마무리

> **"미래의 나에게 필요한 것은 새로운 금융상품이 아니라, 지금의 내가 남겨놓은 의사결정입니다."**

---

# 22. 개발 우선순위

반드시 다음 순서로 구현한다.

### P0 — 필수

- Landing
- Interview
- Dashboard
- Simulation
- localStorage
- responsive design
- mock AI
- smooth transitions

### P1

- 상담 modal
- dashboard animation
- score animation
- scenario animation
- demo mode

### P2

- 실제 LLM API adapter
- 실제 금융기관 API 연동 구조
- PDF/리포트 생성
- 로그인

P0가 완성되기 전에는 P1/P2에 시간을 쓰지 않는다.

---

# 23. 애니메이션

과도하게 사용하지 않는다.

사용할 곳:

- 페이지 전환
- chat message 등장
- progress bar
- readiness score
- simulation timeline
- modal

Framer Motion 사용 가능.

애니메이션은 200~500ms 정도의 부드러운 transition을 기본으로 한다.

---

# 24. 반응형

Desktop-first이지만 mobile도 깨지지 않아야 한다.

Desktop:
- max-width 1200px
- 충분한 whitespace
- dashboard 2-column

Mobile:
- 1-column
- chat full width
- 카드 stacking

---

# 25. 접근성

- 버튼은 keyboard 접근 가능
- contrast 확보
- input label 제공
- aria-label 필요 시 사용
- 색상만으로 위험도를 구분하지 않기

---

# 26. README

README에는 다음을 포함한다.

1. 서비스 소개
2. 문제 정의
3. 주요 기능
4. 실행 방법
5. 기술 스택
6. 프로젝트 구조
7. Mock AI 구조
8. 실제 LLM 연결 방법
9. 금융/법률 disclaimer

---

# 27. Codex에게 주는 최종 지시

이 문서를 읽은 뒤 다음 원칙으로 구현한다.

1. **실제로 실행되는 웹앱을 만든다.**
2. placeholder만 있는 화면을 만들지 않는다.
3. 모든 주요 버튼은 실제 화면 이동 또는 modal 동작을 갖는다.
4. Interview에서 입력한 내용이 Dashboard에 반영되어야 한다.
5. 새로고침해도 localStorage를 통해 데모 데이터가 유지되도록 한다.
6. AI는 mock engine으로 구현하되 실제 AI처럼 자연스럽게 보이게 한다.
7. Dashboard의 추천 내용은 Interview 답변에 따라 달라져야 한다.
8. Simulation 결과도 Future Decision Profile을 기반으로 동적으로 바뀌어야 한다.
9. 금융/법률 서비스처럼 신뢰감 있는 디자인을 사용한다.
10. 모바일과 데스크톱 모두에서 완성도 있게 보이게 한다.
11. 실제 금융상품 가입/자산 이동 기능은 구현하지 않는다.
12. 법률·금융 자문으로 오해할 표현을 피한다.
13. 모든 페이지에서 NEXT의 브랜드 아이덴티티가 일관되게 유지되어야 한다.
14. 코드가 복잡해지기 전에 컴포넌트와 데이터 모델을 분리한다.
15. 최종적으로 `npm run dev`로 바로 실행 가능해야 한다.

---

# 28. 최종 카피

브랜드:
**NEXT**

Tagline:
**당신의 다음 결정을 이어가다.**

Hero:
**내가 결정할 수 없을 때를 위해,
지금의 내가 결정합니다.**

AI Interview:
**미래의 나에게 어떤 결정을 남기고 싶나요?**

Profile:
**미래의 나에게 남기는 금융 사용 설명서**

Simulation:
**만약 내일, 내가 결정할 수 없다면?**

Final CTA:
**미래를 예측하는 대신, 미래의 결정을 준비하세요.**

Footer disclaimer:
> NEXT는 금융 및 법률 의사결정을 위한 데모 서비스입니다. 본 서비스의 AI 분석 및 추천은 실제 금융·법률 자문을 대체하지 않으며, 신탁·후견 등 제도의 실제 이용 가능 여부는 금융기관 및 관련 전문가의 확인이 필요합니다.
