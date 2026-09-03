export {
  generateLedger,
  demoLedger,
  DEMO_LEDGER_SEEDS,
  FIXED_SPEC,
  type GenerateOptions,
} from "./generate";

export {
  analyze,
  trustContact,
  analyzeBehavior,
  analyzeDecision,
  baselineMonths,
  computeBaseline,
  median,
  percentile,
  reactionsOf,
  riskAversionOf,
  tracksInvestment,
} from "./analyze";

export {
  buildContrasts,
  contrastFor,
  openContrasts,
} from "./contrast";

export {
  bandLabel,
  bandOf,
  BANDS,
  biomarkerSummary,
  evaluateTrigger,
  PROOF_FRESH_DAYS,
  PROOF_LABEL,
  readBiomarker,
  recentIncidentAmount,
} from "./biomarker";

export {
  buildTimeline,
  TIER_ACTIONS,
  TIER_CAPTION,
  TIER_LABEL,
  type TimelineInput,
} from "./timeline";

export {
  narrate,
  ruleNarration,
  rulePersona,
  type NarrationResult,
} from "./narrate";

export {
  attachLedger,
  clearLedgerState,
  clearResolution,
  applyDemoLedger,
  demoLedgerState,
  emptyLedgerState,
  readLedger,
  readLedgerState,
  saveLedgerState,
  setProof,
  setResolution,
} from "./store";

export { observationFor, type Observation } from "./contrast";
