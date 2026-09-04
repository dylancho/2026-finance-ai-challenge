import { describe, expect, it } from "vitest";
import { DEMO_PROFILES, emptyProfile } from "../../profile";
import { buildDesign, runScenario, scenariosFor, findGaps } from "../../design";
import { analyze, buildContrasts, demoLedger, evaluateTrigger, readBiomarker } from "../../ledger";
import { buildInstruments, applyAuthority, buildReferral } from "..";
import { canExecute } from "../gate";

const PROOFS = [null, { kind: "diagnosis" as const, issuedAt: "2026-08-20" }, { kind: "ltci" as const, issuedAt: "2020-01-01" }];
const STAGES: any[] = [{}, { trust: "effective" }, { trust: "effective", bank_mandate: "effective" }, { trust: "sent", voluntary_guardianship: "executing" }];

describe("스모크 — 전 데모 × 전 조합", () => {
  for (const key of ["A", "B", "C", "D"]) {
    it(`${key} 전 조합에서 예외가 나지 않는다`, () => {
      const p = DEMO_PROFILES[key];
      const design = buildDesign(p);
      const ledger = demoLedger(key);
      const reading = ledger ? readBiomarker(ledger) : null;
      for (const proof of PROOFS) {
        const gate = reading ? evaluateTrigger(reading, proof) : null;
        for (const stages of STAGES) {
          const insts = buildInstruments(p, design, { version: 1, stages, sentAt: null, sentTo: null });
          const r = buildReferral(p, design, {
            instruments: insts, ledger, reading, gate, now: 1757000000000,
            contrasts: ledger ? buildContrasts(p, analyze(ledger, p.track), ledger, { version: 1, ledger, resolutions: {}, proof }) : [],
          });
          expect(r.docNo).toBeTruthy();
          expect(r.answers.length).toBeGreaterThan(0);
          expect(r.recipients.length).toBeGreaterThan(0);
          for (const s of scenariosFor(p)) {
            const base = runScenario(p, design, s.id);
            if (!base) continue;
            const out = applyAuthority(base, insts);
            for (const n of out.nodes) for (const c of n.clauses) canExecute(c.doc, c.ref, insts);
          }
        }
      }
      expect(findGaps(p, design)).toBeDefined();
    });
  }

  it("빈 프로필로도 터지지 않는다", () => {
    const p = { ...emptyProfile(), track: "future" as const, subject: "self" as const, capacity: "full" as const };
    const design = buildDesign(p);
    const insts = buildInstruments(p, design);
    const r = buildReferral(p, design, { instruments: insts, now: 1757000000000 });
    expect(r.answers.every((a) => a.answer === null)).toBe(true);
    expect(r.open.length).toBeGreaterThan(0);
  });
});
