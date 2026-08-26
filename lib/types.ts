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
}

export interface ScenarioNode {
  n: number;
  title: string;
  detail: string;
  clauses: ScenarioClause[];
  status: "ok" | "gap";
  gapQid?: string;
  gapMessage?: string;
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
}
