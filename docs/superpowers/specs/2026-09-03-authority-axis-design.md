# NEXT — 집행권한 축 (Authority) 설계

작성일 2026-09-03 · 선행 문서 `2026-08-27-ledger-axis-design.md`

---

## 0. 무엇을 만드는가

지금 NEXT는 조항을 낸다. `Profile → buildDesign() → 설계서 3종`. 여기에 `Ledger` 축이 붙어
말한 것과 한 것을 대조하고, 바이오마커가 판단력 저하를 감지해 `TriggerGate`를 발동시킨다.

그런데 트리거가 발동한 다음이 비어 있다.

```ts
// lib/types.ts — 현재
export interface TriggerGate {
  aiAlert: boolean;
  proof: MedicalProof | null;
  fired: boolean;          // ← true 가 되면, 그래서 무엇이 집행되는가?
}
```

`fired: true` 는 "AI가 알렸고 사람이 서류로 확인했다"까지만 말한다. 실제로 신탁 제5조를
집행하려면 **체결된 신탁계약**이 있어야 한다. 그것이 없으면 조항은 문장일 뿐이다.

레포는 이 사실을 이미 알고 있다. 다만 **텍스트로만** 안다.

| 위치 | 내용 |
|---|---|
| `components/common/Disclaimer.tsx` | "AI가 정리한 초안이며 법적 효력이 없습니다" |
| `lib/design/guardianship.ts:291` | "후견계약은 반드시 공정증서로 체결해야 효력이 인정됩니다" |
| `lib/design/guardianship.ts:310` | "감독인이 선임되어야 비로소 효력이 발생한다" |
| `components/plan/ConsultationModal.tsx` | 이름 입력 → "상담 준비 완료" → 닫기. 막다른 길 |

이 축은 그 텍스트를 **상태**로 만든다. 그리고 시뮬레이션이 그 상태를 조회하게 한다.

산출물은 두 가지다.

1. **의뢰서** — 설문 응답에서 조립해 은행 WM·신탁부서·법무법인에 제출하는 「신탁·후견 설계 의뢰서」
2. **집행권한 게이트** — 그 서류가 실제 계약이 되기 전까지 조항이 집행되지 않음을 추적

---

## 1. 원칙 — Profile은 선언, Ledger는 관찰, Authority는 근거

선행 스펙의 분리 원칙을 그대로 잇는다. 세 번째 저장소를 따로 둔다.

| | Profile | Ledger | **Authority** |
|---|---|---|---|
| 정체 | 인터뷰 답변 | 과거 금융 이력 | **법적 도구의 체결 상태** |
| 저장 | `next.profile.v2` | `next.ledger.v1` | **`next.authority.v1`** |
| 의미 | 사용자가 말한 것 | 사용자가 한 것 | **집행할 수 있는 것** |
| 설계서 생성 | 유일한 근거 | 대조군 | **파생. 설계서를 읽기만 한다** |

`buildDesign(profile)` 은 수정하지 않는다. Authority 는 완성된 `DesignSet` 을 입력으로 받아
파생될 뿐이고, 역방향 의존은 없다. 축을 통째로 들어내도 기존 기능은 그대로 돈다.

**AI는 권한을 만들지 않는다.** 이 서비스도, 이 앱의 승인 버튼도 아니다. 권한은 사용자와
전문가 사이에 체결된 계약서에서만 나온다. 축 전체가 이 한 문장을 코드로 옮긴 것이다.

---

## 2. 두 개의 진입점 — 시점이 서류의 성격을 바꾼다

의뢰서은 한 종류가 아니다. **언제 발급되느냐**에 따라 성격이 달라진다.

```
① 평시 (capacity: full)
   설문 완료 → /plan → 전문가 연결 → 의뢰서 전달
   → 변호사·신탁팀이 임의후견계약 / 신탁계약을 체결
   → 서류의 성격: "이 지시를 계약서로 옮겨 달라"

② 이상 감지 후 (capacity: declining / diagnosed)
   바이오마커 경보 + 진단서 → TriggerGate.fired
   → 그런데 체결된 것이 없다 → 집행 근거 없음
   → 서류의 성격: "이 사람이 건강할 때 이렇게 정해두었다.
                   법정후견 청구의 근거로 써 달라"
```

②에서 신탁·임의후견은 **새로 만들 수 없다**. 본인의 유효한 의사표시를 전제로 하는
제도이기 때문이고, 레포는 이미 그렇게 판정한다 (`trust.ts:540`, `guardianship.ts:264`).
따라서 의뢰서의 §3는 "계약 조항 초안"이 아니라 **"법원과 후견인에게 전달할 본인의 사전 의사"**
로 제목과 어조가 바뀐다. 내용의 출처는 같다 — 건강할 때의 답변이다.

> 미리 했으면 계약서가 되고, 늦었으면 법원에 낼 근거가 남는다. 어느 쪽이든 빈손이 아니다.

`buildReferral()` 은 `profile.capacity` 를 읽어 `mode: "contract" | "petition"` 을 정한다.
섹션 구조는 동일하고 제목·서문·§5 체크리스트만 갈린다. 두 벌을 따로 만들지 않는다.

---

### 절차를 밟는 사람이 바뀐다

시점은 서류의 성격만 바꾸는 것이 아니라 **실행 주체**도 바꾼다. 진단을 받은 뒤에는 본인이
공증사무소에 가서 계약을 맺는 장면 자체가 성립하지 않고, 그 상태에서 본인이 한 행위는 나중에
효력이 다투어질 수 있다.

`actsAlone(profile)` 이 `subject === "family"` 이거나 `capacity` 가 `diagnosed` · `incident`
인 경우를 걸러낸다 (trust.ts · guardianship.ts 가 두 값을 늘 같이 검사하는 것과 맞춘다).
해당하면 `by === "본인"` 인 단계가 전부 `보호자` 로 바뀌고 그 이유가 `caution` 으로 붙는다.
법원 · 전문가 · 금융기관 단계는 원래 본인이 하는 일이 아니므로 손대지 않는다.

`capacity === "declining"` 은 아직 본인이 할 수 있지만, 이 시기에 한 행위는 나중에 의사능력을
두고 다투어질 수 있다는 `caution` 이 붙는다 (`trust.ts:509` 의 기존 플래그와 같은 내용).

의뢰서에도 같은 사실이 `executor` 와 `executorNote` 로 실린다. 표지의 "제출 주체"가 곧
그 답이다.

## 3. 데이터 모델

`lib/types.ts` 에 추가한다. 기존 타입은 수정하지 않는다.

```ts
export type AuthorityStage =
  | "draft"        // AI 초안. 집행 근거 없음
  | "sent"         // 전문가에게 전달됨
  | "executing"    // 체결 절차 진행 중 (공증 · 등기 · 심판 대기)
  | "effective"    // 효력 발생. 이때부터 집행 근거
  | "unavailable"; // 의사능력 흠결 등으로 신규 설정 불가

export type InstrumentKind =
  | "trust"                  // 신탁계약
  | "voluntary_guardianship" // 임의후견계약
  | "legal_guardianship"     // 법정후견 심판
  | "bank_mandate";          // 금융기관 대리인 지정 · 자동이체 위임

export type ActorKind = "본인" | "전문가" | "법원" | "금융기관";

export interface AuthorityStep {
  n: number;
  label: string;
  by: ActorKind;
  detail?: string;
  period?: string;
}

export interface Instrument {
  kind: InstrumentKind;
  name: string;
  stage: AuthorityStage;
  /**
   * 이 문서가 없으면 집행 근거가 없는 조항들. `"doc:ref"` 형식.
   * `"trust:*"` 로 문서 전체를 덮을 수 있다.
   */
  covers: string[];
  /** 효력이 언제 발생하는지. 제도마다 다르다 */
  effectRule: string;
  steps: AuthorityStep[];
  unavailableReason?: string;
  /** unavailable 일 때의 대안 경로. trust.type.alternatives 를 그대로 인용 */
  fallback?: { name: string; why: string }[];
}

export interface AuthorityState {
  version: 1;
  /** stage 만 저장한다. 나머지는 매번 파생 */
  stages: Partial<Record<InstrumentKind, AuthorityStage>>;
  sentAt: number | null;
}
```

### `covers` 가 핵심이다

어떤 조항이 어떤 문서에 매달려 있는지를 명시적으로 잇는 배선이다. 이것이 없으면 게이트는
"전부 막기" 아니면 "전부 통과"밖에 못 한다.

```
trust 계약 (stage: draft)
  covers: ["trust:*"]

bank_mandate (stage: draft)
  covers: ["expense:§2", "expense:§6"]     // 대행이 필요한 항목만
```

같은 시나리오 안에서 **이상거래 차단은 흐르고 신탁 지급개시는 막히는** 장면이 이 배선에서
나온다. 서비스가 말하는 3단계 권한 체계(AI 독자 / 보호자 동의 / 법적 후견인)가 화면에서
분리되어 보이는 지점이기도 하다.

### 지출설계서 전체를 위임장에 묶지 않는 이유

`bank_mandate` 가 `"expense:*"` 를 덮으면 **이상거래 차단(§4)과 한도 축소(§3)까지 잠긴다.**
그런데 이 둘은 위임 없이 지금 당장 신청할 수 있는 조치이고, 신탁이 막힌 사용자에게 서비스가
바로 그것을 권한다 (`trust.ts` `blockedDesign` → "즉시 가능한 계좌 보호 조치").

여기가 잠기면 그 안내가 거짓말이 된다. 대행이 필요한 §2(자동이체)·§6(대리 결제)만 건다.
`instruments.test.ts` 가 이 경계를 지킨다.

### ref 정규화

시나리오가 내는 ref 에는 항 번호가 붙는다 — `{ doc: "trust", ref: "제5조 ②" }`
(`scenario.ts:464`). `covers` 는 조(條) 단위로 적으므로 `normalizeRef()` 가 머리만 떼어
비교한다. 이것을 빠뜨리면 `제5조 ②` 가 어떤 문서에도 안 걸려 조용히 통과한다.

### 상태만 저장하는 이유

`AuthorityState` 는 `stages` 만 담는다. `covers`, `steps`, `effectRule` 은 설계서에서 매번
파생한다. 설문 답변이 바뀌면 조항이 바뀌고 `covers` 도 따라 바뀌어야 하는데, 스냅샷을
저장해두면 그 순간 낡는다. 저장하는 것은 **사람이 바깥에서 한 일**(체결 여부)뿐이다.

---

## 4. 엔진 — `lib/authority/`

전부 순수 함수다. React 의존 없음. `lib/design/` 과 같은 규약.

### 4.1 `instruments.ts` — `buildInstruments(profile, design): Instrument[]`

기존 설계서에서 파생한다. **새 콘텐츠를 쓰지 않는다.**

| 조건 | 산출 | steps 출처 | effectRule |
|---|---|---|---|
| `design.trust.available` | 신탁계약 (`trust.type.name`) | `trust.cost` + 표준 3단계 | 계약 체결 및 재산 이전 완료 시 |
| `guardianship.verdict.code === "voluntary"` | 임의후견계약 | **`guardianship.roadmap` 그대로** | 가정법원이 임의후견감독인을 선임한 때 |
| `verdict.code` 가 법정후견 계열 | 법정후견 심판 | `guardianship.roadmap` | 심판이 확정된 때 |
| `capacity === "diagnosed"` | 신탁을 `unavailable` (후견은 법정후견으로) | — | — |
| 전 트랙 | 금융기관 대리인 지정 | 표준 2단계 | 금융기관 등록 완료 시 |

`unavailableReason` 은 `trust.blockedReason` 과 `guardianship.verdict.ruledOut[].why` 를
그대로 인용한다. 같은 판단을 두 곳에서 따로 쓰면 반드시 어긋난다.

공정증서 유언은 넣지 않는다. 트랙 D는 유언대용신탁·수익자연속신탁 중심으로 설계되어 있고
(`estate.ts:5`), 유언 작성 여부를 묻는 문항이 없다. 근거 답변이 없는 도구를 만들면 의뢰서 §3에
인용할 것이 없다.

`guardianship.roadmap` 의 `RoadmapStep` 에는 `by` 필드가 없다. `title` 과 `docs` 에서 파생한다
(공증사무소 → 전문가, 가정법원 → 법원, 금융기관 → 금융기관, 그 외 → 본인). 매핑은
`instruments.ts` 안에 표로 두고 테스트한다.

`bank_mandate` 를 전 트랙에 두는 이유: daily 트랙에는 신탁도 후견도 없지만 지출설계서는 있다.
"공과금 자동납부도 은행에 위임장을 내야 돈다"는 사실이 이 트랙의 유일한 집행 근거 장면이다.

### 4.2 `gate.ts` — `canExecute(ref, instruments)`

```ts
export function canExecute(
  doc: DocKey,
  ref: string,                 // "제5조 ②"
  instruments: Instrument[],
): ExecutionCheck
```

시나리오 노드가 `ScenarioClause { doc, ref }` 를 그대로 넘길 수 있도록 인자를 둘로 나눈다.

규칙은 셋이다.

1. `covers` 에 걸린 instrument 가 없으면 **통과**. 집행 근거가 필요 없는 조항이다.
2. 걸렸고 `stage === "effective"` 면 **통과**.
3. 그 외 전부 **차단**. `reason` 에 현재 단계와 효력 발생 요건을 담는다.

20줄 남짓이다. 축 전체가 이 함수 하나로 수렴한다.

### 4.3 `referral.ts` — `buildReferral(profile, design, opts?): Referral`

설문 답변에서 전문가 이양 서류를 조립한다. `opts` 로 `LedgerInsight` · `Contrast[]` 를
받으면 §4가 붙고, 없으면 생략한다.

| § | 제목 | 출처 |
|---|---|---|
| 표지 | 문서번호 · 수신 · 제출 주체 · 응답 문항 수 | `docNumber()` · `recipients` · `executor` |
| 1 | 의뢰 개요 | `profile.track` · `subject` · `capacity` · 판정 유형 |
| 2 | 재산 및 관계 현황 | 금액이 붙은 `multi` 응답 → 표, `person`·`allocation` → 관계 |
| 3 | 확정된 지시사항 | `design.trust.clauses` 중 `status !== "missing"` |
| 4 | 미확정 사항 | `findGaps()` 재사용 |
| 5 | 선언과 이력의 대조 | `Contrast[]` (있을 때만) |
| 6 | 절차 · 요건 · 비용 | `guardianship.roadmap` + `trust.cost` |
| 7 | 고지 | 모드별 고정 문구 |
| 부록 A | 설문 응답 원문 | `activeQuestions()` 전 문항. **미응답도 싣는다** |

§2는 문항 id 를 박지 않는다. 트랙마다 자산 문항 번호가 다르므로 "금액이 붙은 복수응답"이라는
형태로 훑는다. A~D 어느 트랙에서도 같은 코드가 돈다.

부록 A 가 이 문서를 상담 메모와 갈라놓는다. §3 의 조항마다 근거 문항 번호가 붙어 있고 부록에
그 문항의 질문과 응답이 원문 그대로 실리므로, 전문가는 지시의 출처를 역추적할 수 있고 나중에
다투어질 때 원본으로 돌아갈 수 있다. **미응답도 응답의 일부로 싣는다** — 빈칸을 감추면 문서가
완성된 것처럼 보이고, 그 상태로 계약이 체결된다.

**§2의 각 항목에는 근거 질문 id를 병기한다.**

```
2-4. 투자자산 운용 지침                                          [B11 · B15]
     보유 주식은 일괄 매각하지 아니하며, 배당금을 생활비 재원으로 한다.
     다만 의료비 부족 시 제7조에 따라 단계적으로 처분할 수 있다.
```

이것이 이 문서를 상담 메모가 아니라 **인수인계 문서**로 만드는 부분이다. 전문가가 "이 지시가
어디서 나왔는가"를 역추적할 수 있고, 다투어질 때 원본 답변으로 돌아갈 수 있다.

§3을 §2보다 뒤에 두되 생략하지 않는 이유: 전문가에게 가장 값진 정보는 **정해진 것이 아니라
정해지지 않은 것**이다. 상담 시간이 거기로 간다.

---

## 5. 3층 구조 — 어디까지 룰이고 어디부터 LLM인가

선행 스펙의 측정 / 판정 / 서술 3층을 그대로 따른다.

| 층 | 담당 | 이 축에서의 예 |
|---|---|---|
| **측정** | 룰 | `stage`, `canExecute` 판정, `covers` 매핑, gap 목록 |
| **판정** | 룰 | 제도 가부는 이미 `trust.ts` · `guardianship.ts` 가 판정했다. 다시 하지 않는다 |
| **서술** | LLM (선택) | §1 의뢰 취지 문단, §3 각 공백의 "안 정하면 무슨 일이 생기나" |

**조항 본문은 LLM이 쓰지 않는다.** `buildTrustDesign()` 이 이미 결정론적으로 냈고, 그것이
화면에 표시된 문장이다. 의뢰서에서 다시 생성하면 화면과 서류가 어긋난다. 심사 중에 두 화면을
나란히 놓고 비교당하면 그 자리에서 끝난다.

`/api/ai/referral` 은 `/api/ai/narrate` 와 같은 규약을 쓴다. 툴콜 스키마 고정, 키 없으면 204,
클라이언트는 템플릿 폴백. **키 없이 전 구간이 돈다.**

> 프로바이더는 레포 통일성상 `@anthropic-ai/sdk` 를 따른다. 교체 시
> `app/api/ai/referral/route.ts` 한 파일만 바꾸면 되고 출력 스키마는 유지된다.

---

## 6. 화면

```
/  →  /start  →  /ledger  →  /interview  →  /plan  →  /referral  →  /simulation
                                              수정      신규        확장
```

### 신규 `/referral` — 3단

**① 발급 대상 문서**
Instrument 카드. 현재 `stage` 뱃지, `effectRule`, 단계 체크리스트(`by` 로 누가 할 일인지 표기).
`unavailable` 카드는 이유와 `fallback` 경로를 함께 보여준다.

**② 의뢰서**
설문 기반 6섹션 본문. 인쇄 가능 레이아웃. `mode` 에 따라 제목과 서문이 바뀐다.

**③ 전달**
기존 `ConsultationModal` 의 입력(이름 · 연락 가능 시간 · 관심 분야)을 여기로 흡수한다.
"전달" 시 해당 instrument 들이 `draft → sent`. 모달은 삭제한다 — 같은 일을 하는 화면이
둘이 되면 어느 쪽이 진짜인지 알 수 없다.

### 수정 `/plan`

하단 "전문가 연결" 버튼이 모달 대신 `/referral` 로 이동. **탭은 추가하지 않는다.**
설계서 3탭 + gaps + contrast 로 이미 다섯이고, 집행 근거는 설계서의 한 면이 아니라 다음 단계다.

### 확장 `/simulation`

`lib/design/scenario.ts` (938줄) **는 수정하지 않는다.** 선행 스펙과 같은 원칙이다.
`runScenario()` 결과를 후처리하는 래퍼를 얹는다.

```ts
applyAuthority(result: ScenarioResult, instruments: Instrument[]): ScenarioResult
```

노드 상태에 `noauthority` 를 추가한다. `gap`(안 채움)과 구별되어야 한다 — 채웠는데 집행할
수 없는 것이므로 해결 방법이 다르다.

```
③ 요양시설 입소 → 신탁 제5조② 증액 트리거 (+180만)
   🔒 집행 근거 없음
      「유언대용신탁 계약」이 아직 초안 상태입니다.
      효력 발생: 신탁회사와 계약 체결 및 재산 이전 완료 시
      [→ 전문가 연결하기]
```

상단에 데모용 stage 토글을 둔다. 발표 장면은 이렇게 된다.

```
트리거 발동 (바이오마커 74 + 진단서)
   → ①② 통과, ③에서 자물쇠
   → 토글로 신탁계약을 effective 로
   → 같은 노드가 초록으로 흐름
```

**공백의 세 종류가 완성된다.**

| 탭 · 상태 | 의미 | 해결 |
|---|---|---|
| `gaps` | 안 채운 칸 | 질문에 답한다 |
| `contrast` | 채웠는데 사실과 어긋나는 칸 | 선언 / 이력 / 절충 중 고른다 |
| **`noauthority`** | **채웠는데 집행할 수 없는 칸** | **전문가와 계약을 체결한다** |

---

## 7. 검증

`vitest` · 기존 `lib/ledger/__tests__/` 패턴을 따른다.

### 테스트하는 것

| 대상 | 방법 | 이유 |
|---|---|---|
| `canExecute` | draft 차단 / effective 통과 / covers 밖 통과 | 여기가 뚫리면 축 전체가 무의미해진다 |
| `buildInstruments` | `capacity === "diagnosed"` → 신탁 · 임의후견이 `unavailable` 인지 | 게이트 논리의 붕괴 지점 |
| `buildInstruments` | daily 트랙에서도 `bank_mandate` 가 나오는지 | 신탁 없는 트랙의 유일한 집행 근거 |
| `buildReferral` | `findGaps()` 의 모든 gap 이 §4에 빠짐없이 들어가는지 | 전문가가 놓치면 안 되는 것 |
| `buildReferral` | `capacity` 별 `mode` 분기 | contract / petition 이 뒤바뀌면 문서가 틀린다 |
| `buildReferral` | 활성 문항을 하나도 빠뜨리지 않고, 미응답을 `null` 로 싣는지 | 빈칸을 감추면 완성된 문서로 보인다 |
| `resolveActors` | 본인이 못 하는 상태에서 `본인` 단계가 `보호자` 로 바뀌는지 | 진단 후 본인 단독 행위는 효력이 다투어진다 |
| `applyAuthority` | 기존 `gap` 노드를 `noauthority` 로 덮어쓰지 않는지 | 두 상태는 해결 방법이 다르다 |

### 테스트하지 않는 것

LLM 출력 문장(비결정적, 스키마 계약만 검사), UI 스냅샷, 인쇄 레이아웃.

---

## 8. 구현 순서

각 단계가 끝날 때마다 독립적으로 시연 가능하다.

1. **기반** — 타입, `store.ts`, `instruments.ts`, `gate.ts`, 테스트
2. **의뢰서** — `referral.ts`, `/referral` ①②③, `/plan` 버튼 연결, `ConsultationModal` 제거
3. **게이팅** — `applyAuthority`, `/simulation` 확장, stage 토글 ← **데모 하이라이트**
4. **서술층** — `/api/ai/referral`, §1 · §3 LLM 승격

3단계까지가 발표 필수 경로다. 4는 키가 준비되면 붙인다. 폴백이 먼저 깔리므로 LLM은 언제
붙어도 앞 단계를 흔들지 않는다.

---

## 9. 범위 밖

이 축에서 다루지 않는다. 별건으로 처리한다.

- 설계서 조항 직접 수정
- 인터뷰 뒤로가기
- 트랙 미선택 시 "자산 · 투자관리 설계중" 오탐 표기
- 실제 전자서명 · 전송 · 신탁사 API 연동

---

## 10. 표현 원칙

선행 스펙 §8의 연장이다.

**앱은 권한을 만들지 않는다.** 화면 어디에서도 "승인 완료" · "권한 부여" 라고 쓰지 않는다.
`effective` 뱃지 옆에는 항상 무엇이 체결되어 그렇게 되었는지가 함께 표시된다.

**`effective` 로의 전환은 앱 안에서 일어나는 일이 아니다.** 데모의 stage 토글은 바깥에서
벌어진 일(공증 · 등기 · 심판 · 금융기관 등록)을 앱에 알려주는 입력이지, 앱이 내리는 결정이
아니다. 토글 옆에 그 문장을 명시한다.

**의뢰서는 초안이다.** 표지와 §7에 다음을 고정 문구로 싣는다.

> 본 문서는 AI가 사용자의 답변을 정리한 초안이며, 그 자체로 법적 효력이 없습니다.
> 효력은 전문가의 검토를 거쳐 신탁계약 · 후견계약 · 공정증서 유언 등 정식 절차가
> 체결됨으로써 비로소 발생합니다.
