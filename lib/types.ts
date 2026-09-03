/** NEXT v2 — 공용 타입 정의 */

export type Track = "daily" | "future" | "caregiver" | "estate";
export type Subject = "self" | "family";
export type Capacity = "full" | "declining" | "diagnosed" | "incident";

export type DocKey = "trust" | "guardianship" | "expense";

export type QuestionType =
  | "choice"
  | "multi"
  | "amount"
  | "person"
  | "allocation"
  | "open";

export interface Option {
  value: string;
  label: string;
  hint?: string;
  /** 선택 시 즉시 경고 카드를 띄울 근거 */
  warn?: string;
}

export interface ClauseRef {
  doc: DocKey;
  clause: string; // "제4조" | "§2"
  label: string;
}

export interface Question {
  id: string;
  track: Track;
  section: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: Option[];
  /** multi 타입의 초기 선택값. opt-out 질문(기본 전부 켬)에 쓴다. */
  defaults?: string[];
  /** multi 에서 항목별 금액을 함께 받는다 */
  withAmount?: boolean;
  /** amount 파라미터 (원 단위) */
  min?: number;
  max?: number;
  step?: number;
  presets?: number[];
  unit?: string;
  placeholder?: string;
  optional?: boolean;
  showIf?: (p: Profile) => boolean;
  mapsTo: ClauseRef[];
}

export interface Person {
  relation: string;
  name?: string;
}

export interface AllocationRow {
  asset: string;
  to: string;
}

export type AnswerValue =
  | { kind: "choice"; value: string }
  | { kind: "multi"; values: string[]; amounts?: Record<string, number> }
  | { kind: "amount"; value: number }
  | { kind: "person"; people: Person[] }
  | { kind: "allocation"; rows: AllocationRow[] }
  | { kind: "open"; text: string };

export type Answers = Record<string, AnswerValue>;

export interface TranscriptEntry {
  role: "ai" | "user";
  text: string;
  qid?: string;
  source?: "rule" | "llm";
}

export interface Profile {
  version: 2;
  track: Track | null;
  subject: Subject | null;
  /** subject === 'family' 일 때 대상자와의 관계 */
  subjectRelation?: string;
  capacity: Capacity | null;
  answers: Answers;
  transcript: TranscriptEntry[];
  updatedAt: number;
}

/* ── AI 추출 ─────────────────────────────────────────── */

export interface Extraction {
  /** 대상 질문 id */
  qid: string;
  /** 사용자에게 보여줄 라벨 */
  label: string;
  value: AnswerValue;
  confidence: number;
  /** 근거가 된 원문 조각 */
  evidence?: string;
}

export interface AIResult {
  reply: string;
  extracted: Extraction[];
  source: "rule" | "llm";
}

/* ── 설계 산출물 ──────────────────────────────────────── */

export type ClauseStatus = "set" | "partial" | "missing";

export interface Clause {
  no: string;
  title: string;
  /** 조항 본문. 각 원소는 한 항(項). */
  body: string[];
  status: ClauseStatus;
  /** 이 조항을 채우는 질문 id */
  sources: string[];
  note?: string;
}

export type FlagLevel = "info" | "warn" | "critical";

export interface Flag {
  level: FlagLevel;
  title: string;
  body: string;
  /** 관련 질문으로 딥링크 */
  qid?: string;
}

export interface TrustDesign {
  available: boolean;
  blockedReason?: string;
  type: {
    code: string;
    name: string;
    rationale: string[];
    alternatives: { name: string; why: string }[];
  };
  clauses: Clause[];
  flags: Flag[];
  cost: { label: string; value: string }[];
  completeness: number;
  missing: number;
}

export type ScopeGrant = "delegate" | "consent" | "exclude";

export interface ScopeItem {
  key: string;
  label: string;
  grant: ScopeGrant;
  note?: string;
}

export interface RoadmapStep {
  n: number;
  title: string;
  detail: string;
  period: string;
  docs: string[];
  cost: string;
}

export interface TreeNode {
  question: string;
  answer: string;
  taken: boolean;
}

export type GuardianshipCode =
  | "voluntary"
  | "limited"
  | "specific"
  | "adult"
  | "none";

export interface GuardianshipDesign {
  verdict: {
    code: GuardianshipCode;
    name: string;
    rationale: string[];
    ruledOut: { name: string; why: string }[];
  };
  tree: TreeNode[];
  scopeProperty: ScopeItem[];
  scopePersonal: ScopeItem[];
  guardians: { primary?: Person; backup?: Person };
  supervisor: { assigned: boolean; label: string; note: string };
  effect: string[];
  roadmap: RoadmapStep[];
  flags: Flag[];
  completeness: number;
  missing: number;
}

export interface AccountLayer {
  n: number;
  name: string;
  purpose: string;
  balancePolicy: string;
  withdrawal: string;
  amount?: number;
}

export interface TransferRow {
  item: string;
  amount: number;
  cycle: string;
  from: string;
  onFail: string;
  notify: string;
}

export interface LimitRow {
  label: string;
  value: string;
  note: string;
}

export interface FraudRule {
  key: string;
  condition: string;
  action: string;
  notify: string;
  active: boolean;
}

export interface ExpenseDesign {
  accounts: AccountLayer[];
  transfers: TransferRow[];
  transferTotal: number;
  limits: LimitRow[];
  fraudRules: FraudRule[];
  approval: {
    channel: string;
    first: string;
    escalateHours: number;
    second: string;
    fallback: string;
  };
  cashflow: {
    fixed: number;
    living: number;
    income: number;
    net: number;
    medicalReserve: number;
  };
  sustainability: {
    assets: number;
    monthlyNet: number;
    years: number | null;
    series: { year: number; balance: number }[];
    careStartYear?: number;
  };
  flags: Flag[];
  completeness: number;
  missing: number;
}

export interface DesignSet {
  trust: TrustDesign | null;
  guardianship: GuardianshipDesign | null;
  expense: ExpenseDesign;
}

/* ── 공백 ─────────────────────────────────────────────── */

export interface Gap {
  qid: string;
  doc: DocKey;
  clause: string;
  what: string;
  consequence: string;
  severity: "high" | "medium" | "low";
}

/* ── 시뮬레이션 ───────────────────────────────────────── */

export interface ScenarioClause {
  doc: DocKey;
  ref: string;
  label: string;
  detail: string;
  /** 집행 근거가 없어 잠긴 조항. applyAuthority() 가 표시한다. */
  locked?: boolean;
}

/** 노드가 집행되지 못한 이유. status === "noauthority" 일 때만 있다. */
export interface NodeAuthority {
  reason: string;
  instrumentName: string;
  effectRule: string;
  /** 잠긴 조항 참조 목록 */
  refs: string[];
}

export interface ScenarioNode {
  n: number;
  title: string;
  detail: string;
  clauses: ScenarioClause[];
  /**
   * ok           집행됨
   * gap          안 채운 칸 — 질문에 답하면 풀린다
   * noauthority  채웠지만 집행 근거가 없는 칸 — 계약을 체결해야 풀린다
   */
  status: "ok" | "gap" | "noauthority";
  gapQid?: string;
  gapMessage?: string;
  authority?: NodeAuthority;
}

export interface Scenario {
  id: string;
  name: string;
  caption: string;
  tracks: Track[];
}

export interface ScenarioResult {
  scenario: Scenario;
  nodes: ScenarioNode[];
  verdict: string[];
  gapCount: number;
  /** applyAuthority() 를 거친 뒤에만 채워진다 */
  blockedCount?: number;
}

/* ── 과거 금융이력 (Ledger) ────────────────────────────
 * Profile 이 "선언"이라면 Ledger 는 "관찰"이다.
 * 서로 덮어쓰지 않는다. 자세한 근거는
 * docs/superpowers/specs/2026-08-27-ledger-axis-design.md §1 참조.
 */

export type LedgerSource = "synthetic" | "mydata";

/** 성향 프리셋. 데모 시드를 의도대로 만들기 위해 쓴다. */
export type LedgerPreset = "panic_seller" | "holder" | "cautious" | "spender";

/** 한 달치 집계. 10년이면 120개. */
export interface MonthRoll {
  ym: string;
  /** 고정비를 제외한 생활비 총액 (원) */
  living: number;
  /** 고정비 카테고리별 실제 납부액 */
  fixed: Record<string, number>;
  txnCount: number;
  avgTxn: number;
  /** 23~06시 거래 비율 0~1 */
  nightRatio: number;
  /** 그 달 처음 보는 수취인 수 */
  newPayees: number;
  /** 그 달 최대 1회 이체액 */
  maxTransfer: number;
  /** 고정비 연체 건수 */
  latePayments: number;
}

export interface TradeEvent {
  date: string;
  kind: "buy" | "sell";
  bucket: "equity" | "fund" | "bond";
  amount: number;
  /** 그 시점 시장 낙폭. 0 ~ -1. 매수는 0 */
  marketDrawdown: number;
  /** sell 일 때 보유분 중 매도 비중 0~1 */
  portionSold?: number;
  /** 낙폭 시작일로부터 경과일 */
  daysFromDrawdownStart?: number;
  /** 같은 시점 큰 지출이 있었으면 그 사유. 판정층이 맥락으로 쓴다. */
  coincidingOutflow?: { label: string; amount: number };
}

export type IncidentType =
  | "balance_error"
  | "duplicate_transfer"
  | "late_payment"
  | "night_large"
  | "new_payee_large"
  | "unused_subscription";

/**
 * 거래 금융기관. 고정비 자동이체와 입출금이 어느 기관을 거쳤는지의 관찰값이다.
 * 설문에서 묻지 않는다 — 물어보면 대개 정확히 답하지 못하고, 이력에는 그대로 남는다.
 */
export interface Institution {
  name: string;
  /** 고정비 자동이체·이체 건수 기준 비중 0~1 */
  share: number;
  /** 신탁·후견 관련 상품을 취급하는 기관인가 */
  trustDesk: boolean;
}

export interface Incident {
  date: string;
  type: IncidentType;
  amount?: number;
  note: string;
}

export interface DrawdownWindow {
  start: string;
  end: string;
  /** 최대 낙폭. 음수 */
  depth: number;
  label: string;
}

export interface Ledger {
  version: 1;
  seed: string;
  source: LedgerSource;
  preset: LedgerPreset;
  startYear: number;
  years: number;
  /** 베이스라인 산출에 쓸 앞 구간(년). 전체 평균을 쓰면 감지가 무뎌진다. */
  baselineYears: number;
  months: MonthRoll[];
  trades: TradeEvent[];
  /** 거래 금융기관. 비중 내림차순 */
  institutions?: Institution[];
  incidents: Incident[];
  drawdowns: DrawdownWindow[];
  holdings: { equity: number; bond: number; cash: number };
  generatedAt: number;
}

/* ── 성향 복제 결과 ───────────────────────────────────── */

export interface BehaviorSelf {
  livingMedian: number;
  livingP90: number;
  fixed: { key: string; label: string; amount: number; day: number }[];
  seasonalPeak: { ym: string; amount: number; note: string } | null;
  unusedSubscriptions: { label: string; amount: number; months: number }[];
}

export interface DrawdownReaction {
  date: string;
  label: string;
  drawdown: number;
  sold: boolean;
  portionSold: number;
  reactionDays: number;
  coincidingOutflow?: { label: string; amount: number };
}

export interface DecisionSelf {
  /** 0~1. 낙폭 대비 매도비중 회귀 기울기를 정규화한 값 */
  riskAversion: number;
  /** 매도가 일어난 낙폭들의 중앙값. 음수 */
  realizedStopLoss: number;
  /** 낙폭 이벤트 중 매도하지 않은 비율 0~1 */
  holdRate: number;
  /** 낙폭 시작 → 매도까지 평균 일수 */
  reactionDays: number;
  /** 최근 3년 평균 비중. 합 100 */
  allocation: { equity: number; bond: number; cash: number };
  reactions: DrawdownReaction[];
}

export interface Baseline {
  txnPerMonth: number;
  avgTxn: number;
  nightRatio: number;
  newPayeesPerMonth: number;
  latePerYear: number;
  maxTransfer: number;
  /** 이 베이스라인이 산출된 구간 */
  span: { from: string; to: string };
}

export interface Persona {
  text: string;
  source: "rule" | "llm";
}

export interface LedgerInsight {
  behavior: BehaviorSelf;
  /** daily · caregiver 트랙은 null */
  decision: DecisionSelf | null;
  baseline: Baseline;
  persona: Persona | null;
}

/* ── 대조 ─────────────────────────────────────────────── */

export type Agreement = "aligned" | "tension" | "contradiction";
export type Resolution = "declared" | "observed" | "adjusted";

export interface Contrast {
  qid: string;
  clause: ClauseRef;
  title: string;
  /** 인터뷰에서 말한 것 */
  declared: string;
  /** 이력에서 관찰된 것 */
  observed: string;
  agreement: Agreement;
  reason: string;
  evidence: { label: string; detail: string }[];
  /** "이력대로" 를 골랐을 때 answers 에 쓸 값 */
  observedValue?: AnswerValue;
  resolution?: Resolution;
  /** 판정층이 다시 쓴 해석. 없으면 reason 을 쓴다. */
  interpretation?: { text: string; source: "rule" | "llm" };
}

/* ── 금융 바이오마커 ──────────────────────────────────── */

export type BiomarkerBand = "normal" | "watch" | "alert";

export interface BiomarkerSignal {
  key: string;
  label: string;
  weight: number;
  baseline: string;
  observed: string;
  /** 0~1. 베이스라인 대비 이탈도 */
  deviation: number;
}

export interface BiomarkerPoint {
  ym: string;
  score: number;
}

export interface BiomarkerReading {
  score: number;
  band: BiomarkerBand;
  series: BiomarkerPoint[];
  signals: BiomarkerSignal[];
}

export type ProofKind = "diagnosis" | "ltci";

export interface MedicalProof {
  kind: ProofKind;
  /** YYYY-MM-DD */
  issuedAt: string;
}

/** 회의록 "논의 완료" — AI 경보 단독으로는 절대 발동하지 않는다. */
export interface TriggerGate {
  aiAlert: boolean;
  aiScore: number;
  proof: MedicalProof | null;
  /** 발행 1개월 이내인가 */
  proofFresh: boolean;
  fired: boolean;
  blockedBy: string[];
}

/* ── 30년 타임라인 ────────────────────────────────────── */

export type ApprovalTier = 1 | 2 | 3;

export interface TimelineAction {
  label: string;
  tier: ApprovalTier;
  approver: string;
  clause?: ClauseRef;
}

export interface TimelinePhase {
  phase: 1 | 2 | 3;
  title: string;
  span: string;
  caption: string;
  state: "done" | "active" | "future" | "locked";
  actions: TimelineAction[];
  scenarioIds: string[];
}

/** localStorage['next.ledger.v1'] 에 저장되는 관찰 상태 전체 */
export interface LedgerState {
  version: 1;
  ledger: Ledger | null;
  /** 대조 해소 결과. qid → resolution */
  resolutions: Record<string, Resolution>;
  /** 트리거 게이트용 증빙. 없으면 AI 경보만으로는 발동하지 않는다. */
  proof: MedicalProof | null;
}

/* ── 집행권한 (Authority) ──────────────────────────────
 * Profile 이 "선언", Ledger 가 "관찰"이라면 Authority 는 "근거"다.
 * 설계서는 초안이고, 집행 권한은 체결된 계약서에서 나온다.
 * docs/superpowers/specs/2026-09-03-authority-axis-design.md 참조.
 */

export type AuthorityStage =
  | "draft" // AI 초안. 집행 근거 없음
  | "sent" // 전문가에게 전달됨
  | "executing" // 체결 절차 진행 중 (공증 · 등기 · 심판 대기)
  | "effective" // 효력 발생. 이때부터 집행 근거
  | "unavailable"; // 의사능력 흠결 등으로 신규 설정 불가

export type InstrumentKind =
  | "trust"
  | "voluntary_guardianship"
  | "legal_guardianship"
  | "bank_mandate";

export type ActorKind = "본인" | "보호자" | "전문가" | "법원" | "금융기관";

export interface Statute {
  law: string;
  article: string;
  title: string;
  /** 조문 전문. 옮겨 적되 고치지 않는다. */
  text: string;
  url: string;
}

export interface AuthorityStep {
  n: number;
  label: string;
  by: ActorKind;
  detail?: string;
  period?: string;
  /** 의사능력에 따라 이 단계에서 주의할 점 */
  caution?: string;
}

export interface Instrument {
  kind: InstrumentKind;
  name: string;
  stage: AuthorityStage;
  /**
   * 이 문서가 없으면 집행 근거가 없는 조항들. `"doc:ref"` 형식.
   * `"trust:*"` 처럼 문서 전체를 덮을 수 있다.
   */
  covers: string[];
  /** 효력이 언제 발생하는지. 제도마다 다르다 */
  effectRule: string;
  steps: AuthorityStep[];
  unavailableReason?: string;
  /** unavailable 일 때의 대안 경로 */
  fallback?: { name: string; why: string }[];
  /** 근거 조문. 명문 근거가 없는 문서에는 비어 있다. */
  basis: Statute[];
}

export interface AuthorityState {
  version: 1;
  /**
   * 단계만 저장한다. covers · steps · effectRule 은 설계서에서 매번 파생한다.
   * 답변이 바뀌면 조항이 바뀌므로 스냅샷을 저장하면 그 순간 낡는다.
   * 저장하는 것은 사람이 앱 바깥에서 한 일(체결 여부)뿐이다.
   */
  stages: Partial<Record<InstrumentKind, AuthorityStage>>;
  sentAt: number | null;
}

export interface ExecutionCheck {
  ok: boolean;
  instrument?: Instrument;
  reason?: string;
}
