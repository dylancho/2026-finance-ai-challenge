import type { AnswerValue, Profile, Track } from "./types";

const KEY = "next.profile.v2";

export function emptyProfile(): Profile {
  return {
    version: 2,
    track: null,
    subject: null,
    capacity: null,
    answers: {},
    transcript: [],
    chaptersCompleted: [],
    updatedAt: Date.now(),
  };
}

export function readProfile(): Profile {
  if (typeof window === "undefined") return emptyProfile();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as Profile;
    if (parsed?.version !== 2) return emptyProfile();
    return { ...emptyProfile(), ...parsed };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: Profile): Profile {
  const next = { ...p, updatedAt: Date.now() };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 저장 실패는 데모를 막지 않는다 */
    }
  }
  return next;
}

export function clearProfile() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

export function setAnswer(p: Profile, qid: string, value: AnswerValue): Profile {
  return { ...p, answers: { ...p.answers, [qid]: value } };
}

export function clearAnswer(p: Profile, qid: string): Profile {
  const answers = { ...p.answers };
  delete answers[qid];
  return { ...p, answers };
}

/* ── 답변 조회 헬퍼 ───────────────────────────────── */

export function choiceOf(p: Profile, qid: string): string | undefined {
  const a = p.answers[qid];
  return a?.kind === "choice" ? a.value : undefined;
}

export function amountOf(p: Profile, qid: string): number | undefined {
  const a = p.answers[qid];
  return a?.kind === "amount" ? a.value : undefined;
}

export function multiOf(p: Profile, qid: string): string[] {
  const a = p.answers[qid];
  return a?.kind === "multi" ? a.values : [];
}

export function amountsOf(p: Profile, qid: string): Record<string, number> {
  const a = p.answers[qid];
  return a?.kind === "multi" ? a.amounts ?? {} : {};
}

export function peopleOf(p: Profile, qid: string) {
  const a = p.answers[qid];
  return a?.kind === "person" ? a.people : [];
}

export function personOf(p: Profile, qid: string) {
  return peopleOf(p, qid)[0];
}

export function allocationOf(p: Profile, qid: string) {
  const a = p.answers[qid];
  return a?.kind === "allocation" ? a.rows : [];
}

export function textOf(p: Profile, qid: string): string {
  const a = p.answers[qid];
  return a?.kind === "open" ? a.text : "";
}

/** 여러 질문 id 중 먼저 답이 있는 것의 금액을 반환 */
export function firstAmount(p: Profile, ...qids: string[]): number | undefined {
  for (const q of qids) {
    const v = amountOf(p, q);
    if (v !== undefined) return v;
  }
  return undefined;
}

export function firstMulti(p: Profile, ...qids: string[]): string[] {
  for (const q of qids) {
    const v = multiOf(p, q);
    if (v.length) return v;
  }
  return [];
}

export function firstPerson(p: Profile, ...qids: string[]) {
  for (const q of qids) {
    const v = personOf(p, q);
    if (v) return v;
  }
  return undefined;
}

/* ── 데모 프로필 ──────────────────────────────────── */

export const DEMO_PROFILES: Record<string, Profile> = {
  // A 는 통합 플로우의 "코어만 답한" 데모다. 선택 챕터는 하나도 선언하지 않았다.
  A: {
    ...emptyProfile(),
    track: "daily",
    subject: "self",
    capacity: "full",
    chaptersCompleted: ["core"],
    answers: {
      A01: {
        kind: "multi",
        values: ["utility", "maintenance", "telecom", "insurance"],
        amounts: {
          utility: 180_000,
          maintenance: 250_000,
          telecom: 90_000,
          insurance: 320_000,
        },
      },
      A02: { kind: "amount", value: 1_800_000 },
      A03: { kind: "choice", value: "monthly" },
      A04: { kind: "choice", value: "auto_cover" },
      A05: { kind: "amount", value: 1_000_000 },
      A06: {
        kind: "multi",
        values: ["new_payee", "night", "loan", "remote"],
      },
      A07: { kind: "person", people: [{ relation: "자녀", name: "김하나" }] },
      A08: { kind: "choice", value: "approve" },
      A09: { kind: "amount", value: 1_500_000 },
      A10: { kind: "amount", value: 200_000_000 },
      A11: { kind: "person", people: [{ relation: "형제자매", name: "김정호" }] },
    },
  },
  B: {
    ...emptyProfile(),
    track: "future",
    subject: "self",
    capacity: "full",
    answers: {
      B01: {
        kind: "multi",
        values: ["deposit", "invest", "realestate", "pension"],
        amounts: {
          deposit: 180_000_000,
          invest: 240_000_000,
          realestate: 620_000_000,
          pension: 0,
        },
      },
      B02: { kind: "amount", value: 1_400_000 },
      B03: {
        kind: "multi",
        values: ["deposit", "invest"],
        amounts: { deposit: 180_000_000, invest: 240_000_000 },
      },
      B04: { kind: "choice", value: "living" },
      B05: { kind: "choice", value: "doctor2" },
      B06: { kind: "person", people: [{ relation: "형제자매", name: "김정우" }] },
      B07: { kind: "amount", value: 3_000_000 },
      B08: { kind: "amount", value: 1_800_000 },
      B10: {
        kind: "multi",
        values: ["utility", "telecom", "insurance", "hospital"],
        amounts: {
          utility: 220_000,
          telecom: 80_000,
          insurance: 350_000,
          hospital: 200_000,
        },
      },
      B11: { kind: "choice", value: "preserve" },
      B12: { kind: "person", people: [{ relation: "배우자", name: "이수정" }] },
      B13: { kind: "person", people: [{ relation: "자녀", name: "김서준" }] },
      B14: { kind: "amount", value: 1_000_000 },
      B15: {
        kind: "multi",
        values: ["sell_estate", "loan", "gift", "business"],
      },
      B16: { kind: "choice", value: "expert" },
      B17: { kind: "choice", value: "home" },
      B18: { kind: "multi", values: ["residence", "medical", "facility"] },
      B19: { kind: "choice", value: "supervisor" },
      B20: { kind: "choice", value: "self_supervisor" },
      B21: {
        kind: "allocation",
        rows: [
          { asset: "주택", to: "배우자" },
          { asset: "금융자산", to: "자녀 균등" },
        ],
      },
      B22: {
        kind: "open",
        text: "집은 아내가 사는 동안 팔지 않았으면 합니다. 주식은 급하게 정리하지 말아 주세요.",
      },
      // B09 (의료비 한도) 를 일부러 비워 시뮬레이터에서 공백 노드를 보여준다.
    },
  },
  C: {
    ...emptyProfile(),
    track: "caregiver",
    subject: "family",
    subjectRelation: "부모님",
    capacity: "diagnosed",
    answers: {
      C01: { kind: "choice", value: "parent" },
      C02: {
        kind: "multi",
        values: ["repeat", "unpaid", "odd_transfer", "diagnosed"],
      },
      C03: { kind: "choice", value: "no" },
      C04: { kind: "multi", values: ["hospital_bill", "account", "overdue"] },
      C05: { kind: "amount", value: 3 },
      C06: { kind: "choice", value: "partial" },
      C07: { kind: "person", people: [{ relation: "자녀", name: "박지훈" }] },
      C08: {
        kind: "multi",
        values: ["deposit", "realestate", "pension"],
        amounts: { deposit: 90_000_000, realestate: 380_000_000, pension: 0 },
      },
      C09: {
        kind: "multi",
        values: ["utility", "telecom", "care", "hospital"],
        amounts: {
          utility: 160_000,
          telecom: 60_000,
          care: 1_400_000,
          hospital: 300_000,
        },
      },
      C10: { kind: "amount", value: 900_000 },
      C11: { kind: "multi", values: ["family", "diagnosis", "resident"] },
      C12: { kind: "choice", value: "cannot" },
      C13: {
        kind: "multi",
        values: ["deposit_use", "tax", "medical", "facility"],
      },
      C14: {
        kind: "open",
        text: "아버지 병원비를 제 돈으로 내고 있는데 언제까지 가능할지 모르겠습니다.",
      },
    },
  },
  D: {
    ...emptyProfile(),
    track: "estate",
    subject: "self",
    capacity: "full",
    answers: {
      D01: {
        kind: "multi",
        values: ["spouse", "child"],
        amounts: { spouse: 1, child: 3 },
      },
      D02: {
        kind: "multi",
        values: ["deposit", "invest", "realestate", "business"],
        amounts: {
          deposit: 300_000_000,
          invest: 450_000_000,
          realestate: 1_200_000_000,
          business: 800_000_000,
        },
      },
      D03: {
        kind: "allocation",
        rows: [
          { asset: "본가 주택", to: "배우자" },
          { asset: "사업체 지분", to: "장남" },
          { asset: "금융자산", to: "차남·삼남 균등" },
        ],
      },
      D04: { kind: "choice", value: "yes" },
      D05: { kind: "choice", value: "partial" },
      D06: { kind: "choice", value: "unknown" },
      D07: { kind: "choice", value: "none" },
      D08: { kind: "choice", value: "yes_succeed" },
      D09: { kind: "amount", value: 4_000_000 },
      D10: { kind: "choice", value: "year" },
      D11: { kind: "person", people: [{ relation: "자녀", name: "최민석" }] },
      D12: { kind: "person", people: [{ relation: "전문가", name: "담당 변호사" }] },
      D13: { kind: "multi", values: ["home", "business"] },
      D14: { kind: "choice", value: "likely" },
      D15: { kind: "choice", value: "fair" },
    },
  },
};

export function demoProfile(key: string): Profile | null {
  const k = key.toUpperCase();
  const found = DEMO_PROFILES[k];
  if (!found) return null;
  return { ...found, updatedAt: Date.now() };
}

export function trackOfDemo(key: string): Track | null {
  return demoProfile(key)?.track ?? null;
}
