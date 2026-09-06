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
  /**
   * K — 심사용 완성 데이터 (김영수, 68). 2026-09-06 헤더 "둘러보기" 가 이 프로필을 심는다.
   *
   * 설계 근거는 docs/demo-data-plan.md 다. 심사위원은 41문항 인터뷰를 다 답할 수 없으므로,
   * 다섯 챕터(코어·투자·상속·의료·보호)를 전부 완료한 상태를 손으로 만들어 지출·신탁·후견
   * 설계서와 의뢰서·이상감지가 빠짐없이 채워진 화면을 보여준다. 값은 문서의 표를 그대로 옮겼고,
   * 답변 형태와 선택지 value 는 lib/questions/* 의 정의를 따른다 (엔진이 문자열로 읽는다).
   *
   * 7문항(B04·B05·B06·B12·B13·B19·B20)은 통합 인터뷰의 다섯 챕터에 없는 옛 트랙 B 문항이다.
   * 신탁 제1조(목적)·제4조(지급개시 트리거)·제10조(변경·종료)와 후견의 1차·2차 관리자는 이
   * 문항으로만 채워지므로, 인터뷰 화면을 거치지 않는 데모에서만 함께 넣어 "완성된 설계서"
   * 를 보여준다. 실사용자는 지금 인터뷰로는 같은 완성도에 닿을 수 없다 — 문서가 팀 공유
   * 항목으로 남겨 둔 지점이다. 같은 이유로 B15·B16 두 문항을 더 넣었다 (맨 아래 주석).
   *
   * 랜딩의 숫자 섹션은 계속 B 를 쓴다 (공백 1개가 카피와 맞는다). K 는 공백 0건이다.
   */
  K: {
    ...emptyProfile(),
    track: "daily",
    subject: "self",
    capacity: "full",
    chaptersCompleted: ["core", "invest", "estate", "medical", "safe"],
    answers: {
      /* ── 코어 11문항 — 축 ② 필수생활비 이체 ── */
      A09: { kind: "amount", value: 2_800_000 },
      A10: { kind: "amount", value: 90_000_000 },
      // 관리비·공과금 32만은 옵션이 둘(utility·maintenance)이라 나눠 넣는다. 합계 94만.
      A01: {
        kind: "multi",
        values: ["utility", "maintenance", "telecom", "insurance", "hospital"],
        amounts: {
          utility: 140_000,
          maintenance: 180_000,
          telecom: 90_000,
          insurance: 380_000,
          hospital: 150_000,
        },
      },
      A02: { kind: "amount", value: 1_900_000 },
      A03: { kind: "choice", value: "monthly" },
      A04: { kind: "choice", value: "auto_cover" },
      A05: { kind: "amount", value: 3_000_000 },
      A06: {
        kind: "multi",
        values: ["new_payee", "night", "loan", "remote", "overseas", "deposit_break", "burst"],
      },
      A07: { kind: "person", people: [{ relation: "배우자", name: "이정숙" }] },
      A11: { kind: "person", people: [{ relation: "자녀", name: "김도현" }] },
      A08: { kind: "choice", value: "reserve" },

      /* ── 투자 원칙 6문항 — B11 "팔지 않기" 가 이력의 매도와 대조된다 ── */
      I01: { kind: "multi", values: ["derivative", "crypto"] },
      I02: { kind: "choice", value: "low" },
      I03: { kind: "choice", value: "do_nothing" },
      I04: { kind: "choice", value: "designee" },
      I05: { kind: "person", people: [{ relation: "자녀", name: "김도현" }] },
      B11: { kind: "choice", value: "preserve" },

      /* ── 상속 의사 16문항 — 신탁 조항을 채운다 ── */
      D01: { kind: "multi", values: ["spouse", "child"], amounts: { spouse: 1, child: 2 } },
      // 예금 9,000만은 코어 A10 과 같은 값으로 맞춘다. 총 7억 5,000만.
      D02: {
        kind: "multi",
        values: ["deposit", "invest", "realestate"],
        amounts: { deposit: 90_000_000, invest: 120_000_000, realestate: 480_000_000 },
      },
      D03: {
        kind: "allocation",
        rows: [
          { asset: "주택", to: "배우자" },
          { asset: "금융자산", to: "자녀 균등" },
        ],
      },
      D04: { kind: "choice", value: "yes" },
      D05: { kind: "choice", value: "after" },
      D06: { kind: "choice", value: "unknown" },
      D07: { kind: "choice", value: "none" },
      D08: { kind: "choice", value: "no" },
      D09: { kind: "amount", value: 1_900_000 },
      // 문서의 "판단이 어려워졌을 때부터" 에 해당하는 선택지가 D10 에 없다. 신탁 엔진은
      // D10 을 읽지 않고 부록에만 실리므로 가장 가까운 "천천히, 몇 년 안에" 로 둔다.
      D10: { kind: "choice", value: "later" },
      D11: { kind: "person", people: [{ relation: "배우자", name: "이정숙" }] },
      D12: { kind: "person", people: [{ relation: "전문가", name: "담당 법무사" }] },
      D13: { kind: "multi", values: ["home"] },
      D14: { kind: "choice", value: "unlikely" },
      D15: { kind: "choice", value: "fair" },
      D16: {
        kind: "open",
        text: "집은 아내가 사는 동안 팔지 않았으면 합니다. 나머지는 아이들이 똑같이 나눠 가지면 좋겠습니다.",
      },

      /* ── 의료·요양 4문항 — 신탁·후견을 여는 열쇠 ── */
      B17: { kind: "choice", value: "home" },
      B08: { kind: "amount", value: 1_200_000 },
      B09: { kind: "choice", value: "yearly_cap" },
      B18: { kind: "multi", values: ["residence", "medical", "facility", "visit", "mail", "eol"] },

      /* ── 금융 보호 4문항 — A05(300만)와 S02(200만)를 일부러 다르게 둔다 ── */
      S01: { kind: "choice", value: "guardian" },
      S02: { kind: "amount", value: 2_000_000 },
      S03: { kind: "multi", values: ["time", "pin", "device"] },
      S04: { kind: "choice", value: "reauth" },

      /* ── 추가 7문항 — 신탁 제1·4·10조와 후견 관리자 (위 주석 참조) ── */
      B04: { kind: "choice", value: "living" },
      B05: { kind: "choice", value: "doctor2" },
      B06: { kind: "person", people: [{ relation: "형제자매", name: "김정호" }] },
      B12: { kind: "person", people: [{ relation: "배우자", name: "이정숙" }] },
      B13: { kind: "person", people: [{ relation: "자녀", name: "김도현" }] },
      B19: { kind: "choice", value: "supervisor" },
      B20: { kind: "choice", value: "self_supervisor" },

      /* ── 추가 2문항 (문서 밖) — 미리보기의 치매 시나리오가 B15·B16 을 문자열로 읽는다.
       * 없으면 "부동산 매각" 과 "정기 감독" 단계가 공백으로 멈추고 /interview?q=B15 로 보내는데,
       * 통합 인터뷰에는 그 문항이 없어 막다른 길이 된다. D13(집 처분 금지)·D12(전문가 감독)와
       * 같은 뜻으로 채운다. */
      B15: { kind: "multi", values: ["sell_estate", "loan", "gift"] },
      B16: { kind: "choice", value: "expert" },
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
