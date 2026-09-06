import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROFILES, demoProfile, readProfile } from "../profile";
import { buildDesign, findGaps, runScenario, scenariosFor } from "../design";
import { buildExpenseDesign } from "../design/expense";
import { buildTrustDesign } from "../design/trust";
import { buildGuardianshipDesign } from "../design/guardianship";
import { chapterCompleted, CHAPTER_ORDER, isUnified } from "../questions";
import { demoLedger } from "../ledger/generate";
import { buildContrasts, contrastFor } from "../ledger/contrast";
import { readBiomarker } from "../ledger/biomarker";
import { trustContact } from "../ledger/analyze";
import { readLedger } from "../ledger/store";
import { insightFor } from "../insight";
import { buildReferral } from "../authority/referral";
import { policyFromProfile } from "../fraud/policy";
import { scoreTransaction } from "../fraud/score";
import { landingStats } from "../landing/stats";
import { readSession } from "../auth";
import {
  endTour,
  isTouring,
  readTourBackup,
  startTour,
  TOUR_BACKUP_KEY,
  TOUR_DEMO,
  TOUR_KEY,
  TOUR_KEYS,
  TOUR_VISITOR,
} from "../demo/tour";

/**
 * 심사용 둘러보기 — 데모 K(김영수) 와 시작/종료 복원.
 * 목표치는 docs/demo-data-plan.md. 숫자는 시드가 고정이라 흔들리지 않는다.
 */

const K = () => demoProfile(TOUR_DEMO)!;

describe("데모 K — 41문항 + 추가 문항이 모두 채워진 통합 프로필", () => {
  it("통합 플로우이고 다섯 챕터가 전부 완료 상태다", () => {
    const p = K();
    expect(isUnified(p)).toBe(true);
    for (const ch of CHAPTER_ORDER) expect(chapterCompleted(p, ch)).toBe(true);
  });

  it("세 설계서가 모두 나오고 공백이 0건이다", () => {
    const p = K();
    const trust = buildTrustDesign(p)!;
    const guardianship = buildGuardianshipDesign(p)!;
    const expense = buildExpenseDesign(p);
    expect(trust).not.toBeNull();
    expect(trust.available).toBe(true);
    expect(trust.type.code).toBe("successive");
    expect(trust.missing).toBe(0);
    // 2026-09-07: B14 를 채워 제3조도 "set" — 11개 조항 전부 설정, 완성도 100%
    expect(trust.clauses.filter((c) => c.status !== "set")).toHaveLength(0);
    expect(trust.completeness).toBe(100);
    // 유류분 경고가 뜨지 않는다 (D06 알고 감안 · D03 배분 3행 = 상속인 수)
    expect(trust.flags).toHaveLength(0);
    expect(guardianship).not.toBeNull();
    expect(guardianship.verdict.code).toBe("voluntary");
    expect(guardianship.completeness).toBe(100);
    expect(guardianship.flags).toHaveLength(0);
    expect(expense.completeness).toBe(100);
    expect(expense.flags).toHaveLength(0);
    expect(findGaps(p, buildDesign(p))).toHaveLength(0);
  });

  it("살림 숫자가 은퇴 부부답게 읽힌다 — 수입 250만, 생활비 190만, 고정비 94만, 매달 34만 부족", () => {
    const expense = buildExpenseDesign(K());
    expect(expense.cashflow).toMatchObject({
      income: 2_500_000,
      living: 1_900_000,
      fixed: 940_000,
      net: 340_000,
    });
    // 제6조: 30년 뒤에도 남지만(years null) 기울기는 보인다 — 7억 8,000만에서 3억 아래로
    const s = expense.sustainability;
    expect(s.years).toBeNull();
    expect(s.series[s.series.length - 1].balance).toBeLessThan(300_000_000);
    expect(s.series[s.series.length - 1].balance).toBeGreaterThan(250_000_000);
  });

  it("가족이 화면마다 같다 — 1차 배우자 이정숙, 2차·예비·발동 확인·운용 이양 모두 자녀 김도현", () => {
    const p = K();
    const expense = buildExpenseDesign(p);
    const trust = buildTrustDesign(p)!;
    const guardianship = buildGuardianshipDesign(p)!;
    expect(expense.approval.first).toBe("배우자 (이정숙)");
    expect(expense.approval.second).toBe("자녀 (김도현)");
    expect(trust.clauses.find((c) => c.no === "제4조")!.body[1]).toContain("자녀 (김도현)");
    expect(trust.clauses.find((c) => c.no === "제3조")!.body).toContain("관리자(예비): 자녀 (김도현)");
    expect(guardianship.guardians.backup?.name).toBe("김도현");
    expect(expense.invest?.handover).toBe("자녀 (김도현)에게 맡긴다");
  });

  it("투자 원칙이 원칙 문장으로 읽힌다 — '아무것도 하지 않는다' 가 어디에도 없다", () => {
    const p = K();
    const expense = buildExpenseDesign(p);
    expect(expense.invest?.crashPolicyCode).toBe("consult");
    expect(expense.invest?.crashPolicy).toBe("자녀 (김도현)의 의견을 듣고 정한다");
    expect(JSON.stringify(expense.invest)).not.toContain("아무것도 하지 않는다");
    const r = buildReferral(p, buildDesign(p));
    expect(JSON.stringify(r.answers)).not.toContain("아무것도 하지 않는다");
    // 상속인 수는 원이 아니라 명으로 실린다
    expect(r.answers.find((a) => a.qid === "D01")!.answer).toBe("배우자 1명 / 자녀 2명");
    expect(r.assetTables.map((t) => t.qid)).not.toContain("D01");
  });

  it("이상거래 룰은 한도 룰 7종이 전부 켜지고 맥락 룰 3종이 더해진다", () => {
    const expense = buildExpenseDesign(K());
    const base = expense.fraudRules.filter((r) => !r.key.startsWith("ctx_"));
    const ctx = expense.fraudRules.filter((r) => r.key.startsWith("ctx_"));
    expect(base).toHaveLength(7);
    expect(base.every((r) => r.active)).toBe(true);
    expect(ctx.filter((r) => r.active)).toHaveLength(3);
  });

  it("미리보기 시나리오가 공백 없이 끝까지 간다", () => {
    const p = K();
    const d = buildDesign(p);
    for (const s of scenariosFor(p)) {
      const r = runScenario(p, d, s.id)!;
      const gapQids = r.nodes.filter((n) => n.status === "gap").map((n) => n.gapQid);
      expect(gapQids).toEqual([]);
    }
  });
});

describe("데모 K 이력 — 문서의 대조 장면", () => {
  const p = K();
  const l = demoLedger(TOUR_DEMO)!;
  const insight = insightFor(l, p);
  const cs = buildContrasts(p, insight, l);

  it("B11 '팔지 않기' 가 하락 5회 중 4회 매도와 모순된다", () => {
    const c = contrastFor(cs, "B11")!;
    expect(c.agreement).toBe("contradiction");
    expect(c.observed).toContain("5회 중 4회");
    // 그중 한 건은 같은 달 의료비가 겹쳐 "판단이 아니라 현금 필요였을 수 있다" 단서가 붙는다
    expect(c.reason).toContain("현금 필요");
    expect(insight.decision!.reactions.some((r) => r.coincidingOutflow?.amount === 26_000_000)).toBe(true);
  });

  it("A05 한도 300만이 과거 최대 이체(약 762만)에 막힌다", () => {
    const c = contrastFor(cs, "A05")!;
    expect(c.agreement).toBe("contradiction");
    expect(insight.baseline.maxTransfer).toBeGreaterThan(7_000_000);
    expect(insight.baseline.maxTransfer).toBeLessThan(8_000_000);
  });

  it("생활비 190만은 10년 중앙값(약 157만)보다 20% 넘게 높아 대조가 뜬다", () => {
    const c = contrastFor(cs, "A02")!;
    expect(c.agreement).toBe("tension");
    expect(insight.behavior.livingMedian).toBeGreaterThan(1_500_000);
    expect(insight.behavior.livingMedian).toBeLessThan(1_580_000);
  });

  it("8년차부터의 저하 신호로 바이오마커가 경보 구간(70점대)에 든다", () => {
    const r = readBiomarker(l);
    expect(r.band).toBe("alert");
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThan(80);
  });

  it("주거래가 NH농협은행 54% 라 의뢰서 수신처가 이력에서 정해진다", () => {
    const contact = trustContact(l)!;
    expect(contact.primary.name).toBe("NH농협은행");
    expect(contact.primary.share).toBe(0.54);
    expect(contact.redirected).toBe(false);
    const r = buildReferral(p, buildDesign(p), { ledger: l });
    expect(r.recipients[0]).toBe("NH농협은행 WM·신탁부서");
    expect(r.answered).toBe(r.total);
    expect(r.open).toHaveLength(0);
  });

  it("보호 원칙: 250만은 한도 안이지만 S02 기준(200만)에 걸리고, 760만은 신호가 겹쳐 차단된다", () => {
    const policy = policyFromProfile(p)!;
    expect(policy.newAccountThreshold).toBe(2_000_000);
    const a = scoreTransaction(
      { transactionId: "A", amount: 2_500_000, targetAccount: "x", isNewTargetAccount: true, requestTime: "02:00 PM", pinErrorCount: 0, biometricAnomalyScore: 0.1, isNewDevice: false },
      policy,
    );
    const b = scoreTransaction(
      { transactionId: "B", amount: 7_600_000, targetAccount: "y", isNewTargetAccount: true, requestTime: "02:15 AM", pinErrorCount: 2, biometricAnomalyScore: 0.86, isNewDevice: true },
      policy,
    );
    // 점수만으로는 REVIEW(39) — 선언한 원칙이 상태를 끌어올린다
    expect(a.risk_score).toBeLessThan(65);
    expect(a.policyNote).toContain("2,000,000원 이상");
    expect(b.status).toBe("BLOCKED");
    expect(b.risk_score).toBeGreaterThanOrEqual(65);
    expect(b.policyNote).toBeUndefined();
  });
});

describe("기존 데모는 그대로다", () => {
  it("랜딩 숫자 landingStats('B') 는 바뀌지 않았다", () => {
    expect(landingStats("B")).toEqual({ clauses: 22, gaps: 1, years: 23 });
  });

  it("A·B·D 프로필은 K 추가 전과 같은 키를 가진다", () => {
    expect(Object.keys(DEMO_PROFILES).sort()).toEqual(["A", "B", "C", "D", "K"]);
  });
});

/* ── 시작/종료 복원 — DOM 없이 window.localStorage 만 흉내 낸다 ── */

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => {
      m.delete(k);
    },
    setItem: (k: string, v: string) => {
      m.set(k, String(v));
    },
  } as Storage;
}

function stubWindow() {
  const localStorage = memoryStorage();
  vi.stubGlobal("window", {
    localStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  return localStorage;
}

describe("둘러보기 시작/종료", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("로그아웃·빈 상태에서 시작하면 K 가 심기고 세션이 생기며, 종료하면 전부 비워진다", () => {
    const ls = stubWindow();
    expect(isTouring()).toBe(false);

    startTour();
    expect(isTouring()).toBe(true);
    expect(ls.getItem(TOUR_KEY)).toBe(TOUR_DEMO);
    expect(readSession()).toEqual({ signedIn: true, name: TOUR_VISITOR });
    expect(readProfile().chaptersCompleted).toEqual(K().chaptersCompleted);
    expect(readLedger()?.seed).toBe(demoLedger(TOUR_DEMO)!.seed);
    // 백업에는 모든 키가 "없었음" 으로 남는다
    const backup = readTourBackup()!;
    for (const k of TOUR_KEYS) expect(backup[k]).toBeNull();

    const session = endTour();
    expect(session.signedIn).toBe(false);
    expect(isTouring()).toBe(false);
    for (const k of TOUR_KEYS) expect(ls.getItem(k)).toBeNull();
    expect(ls.getItem(TOUR_BACKUP_KEY)).toBeNull();
  });

  it("기존 데이터가 있으면 그대로 돌아오고, 두 번 시작해도 첫 백업을 지키며, 둘러보기 중 흔적은 남기지 않는다", () => {
    const ls = stubWindow();
    const mine = JSON.stringify({ ...demoProfile("A")!, updatedAt: 1 });
    ls.setItem("next.profile.v2", mine);
    ls.setItem("next.auth.v1", JSON.stringify({ signedIn: true, name: "김하나" }));
    ls.setItem("next.decisions.v1", "[]");

    startTour();
    expect(readSession().name).toBe("김하나"); // 이미 로그인돼 있으면 이름을 바꾸지 않는다
    expect(readProfile().chaptersCompleted).toHaveLength(5);
    expect(ls.getItem("next.decisions.v1")).toBeNull(); // 판정 원장은 비운다

    // 둘러보는 중에 무언가를 저장한 뒤 다시 시작해도 첫 백업은 유지된다
    ls.setItem("next.decisions.v1", '[{"id":"x"}]');
    startTour();
    expect(readTourBackup()!["next.profile.v2"]).toBe(mine);

    endTour();
    expect(ls.getItem("next.profile.v2")).toBe(mine);
    expect(readSession().name).toBe("김하나");
    expect(ls.getItem("next.decisions.v1")).toBe("[]");
    expect(ls.getItem("next.ledger.v1")).toBeNull();
    expect(isTouring()).toBe(false);
  });
});
