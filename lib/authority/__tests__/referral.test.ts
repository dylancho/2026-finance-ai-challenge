import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "../../profile";
import { buildDesign, findGaps } from "../../design";
import { findQuestion } from "../../questions";
import { buildReferral, describeAnswer } from "../referral";
import { buildInstruments, actsAlone } from "../instruments";

const NOW = Date.UTC(2026, 8, 3, 3, 0, 0); // 2026-09-03 KST 정오
const make = (key: string) => {
  const p = DEMO_PROFILES[key];
  return buildReferral(p, buildDesign(p), { now: NOW });
};

describe("describeAnswer", () => {
  const p = DEMO_PROFILES.B;
  const at = (qid: string) =>
    describeAnswer(findQuestion(qid)!, p.answers[qid]);

  it("선택지는 라벨로 옮긴다", () => {
    expect(at("B11")).toBe("그대로 두고 팔지 않기");
  });
  it("금액은 한국어 표기로 옮긴다", () => {
    expect(at("B07")).toBe("300만원");
  });
  it("복수응답은 금액과 함께 나열한다", () => {
    expect(at("B03")).toContain("2억 4,000만원");
  });
  it("사람은 관계와 이름을 함께 적는다", () => {
    expect(at("B12")).toBe("배우자 (이수정)");
  });
  it("배분은 자산 → 수증자로 적는다", () => {
    expect(at("B21")).toContain("주택 → 배우자");
  });
  it("미응답은 null", () => {
    expect(at("B09")).toBeNull();
  });
});

describe("buildReferral — 부록", () => {
  it("활성 문항을 하나도 빠뜨리지 않는다", () => {
    const p = DEMO_PROFILES.B;
    const r = make("B");
    expect(r.answers).toHaveLength(r.total);
    expect(r.answers.map((a) => a.qid)).toContain("B09");
  });

  it("미응답을 감추지 않고 null 로 싣는다", () => {
    const b09 = make("B").answers.find((a) => a.qid === "B09");
    expect(b09).toBeTruthy();
    expect(b09!.answer).toBeNull();
  });

  it("응답 수를 세어 표지에 쓴다", () => {
    const r = make("B");
    expect(r.answered).toBeLessThan(r.total);
    expect(r.answered).toBe(r.total - 1);
  });
});

describe("buildReferral — 미확정 사항", () => {
  it("findGaps 의 결과를 빠짐없이 옮긴다", () => {
    const p = DEMO_PROFILES.B;
    const gaps = findGaps(p, buildDesign(p));
    expect(make("B").open.map((g) => g.qid)).toEqual(gaps.map((g) => g.qid));
  });
});

describe("buildReferral — 시점이 서류의 성격을 바꾼다", () => {
  it("B(의사능력 정상)는 계약 체결 의뢰서로, 본인이 집행 주체다", () => {
    const r = make("B");
    expect(r.mode).toBe("contract");
    expect(r.title).toBe("신탁·후견 설계 의뢰서");
    expect(r.executor).toBe("본인");
    expect(r.executorNote).toBeUndefined();
    expect(r.recipients).toContain("은행 WM·신탁부서");
  });

  it("C(가족이 대리 · 이미 진단)는 후견 청구 참고자료가 된다", () => {
    const r = make("C");
    expect(r.mode).toBe("petition");
    expect(r.title).toBe("후견 청구 참고자료");
    expect(r.recipients).toContain("가정법원");
  });

  it("본인이 못 하는 상태면 집행 주체가 보호자로 바뀌고 이유가 붙는다", () => {
    const r = make("C");
    expect(r.executor).toBe("보호자");
    expect(r.executorNote).toContain("다투어질 수 있습니다");
  });

  it("청구 참고자료의 고지는 후견인 권한이 법원에서 정해진다고 밝힌다", () => {
    expect(make("C").notice.join(" ")).toContain("가정법원의 심판");
  });
});

describe("actsAlone", () => {
  it("본인이 건강하면 단독 가능", () => {
    expect(actsAlone(DEMO_PROFILES.B)).toBe(true);
  });
  it("가족이 대리하면 단독 불가", () => {
    expect(actsAlone(DEMO_PROFILES.C)).toBe(false);
  });
});

describe("instruments — 보호자 전환", () => {
  const insts = (key: string) => {
    const p = DEMO_PROFILES[key];
    return buildInstruments(p, buildDesign(p));
  };

  it("B 는 1단계 주체가 본인이다", () => {
    const m = insts("B").find((i) => i.kind === "bank_mandate")!;
    expect(m.steps[0].by).toBe("본인");
  });

  it("C 는 본인 단계가 전부 보호자로 바뀌고 이유가 붙는다", () => {
    const m = insts("C").find((i) => i.kind === "bank_mandate")!;
    expect(m.steps[0].by).toBe("보호자");
    expect(m.steps[0].caution).toContain("보호자");
  });

  it("법원·전문가·금융기관 단계는 그대로 둔다", () => {
    const g = insts("C").find((i) => i.kind === "legal_guardianship")!;
    const court = g.steps.filter((s) => s.by === "법원");
    expect(court.length).toBeGreaterThan(0);
    expect(court.every((s) => !s.caution)).toBe(true);
  });
});

describe("buildReferral — 설문 기반 §2", () => {
  it("금액이 붙은 복수응답을 표로 옮기고 합계를 낸다", () => {
    const t = make("B").assetTables.find((x) => x.qid === "B03")!;
    expect(t.total).toBe(180_000_000 + 240_000_000);
  });

  it("사람·배분 문항을 관계 항목으로 모은다", () => {
    const qids = make("B").roles.map((r) => r.qid);
    expect(qids).toContain("B12");
    expect(qids).toContain("B21");
  });

  it("조항 본문을 새로 쓰지 않고 설계 엔진 문장을 인용한다", () => {
    const p = DEMO_PROFILES.B;
    const design = buildDesign(p);
    const c5 = design.trust!.clauses.find((c) => c.no === "제5조")!;
    const d5 = make("B").directives.find((d) => d.no === "제5조")!;
    expect(d5.body).toEqual(c5.body);
  });

  it("문서번호는 시각을 넣어도 결정적이다", () => {
    expect(make("B").docNo).toBe(
      buildReferral(DEMO_PROFILES.B, buildDesign(DEMO_PROFILES.B), { now: NOW })
        .docNo,
    );
  });
});

describe("참조 법령", () => {
  const insts = (key: string) => {
    const p = DEMO_PROFILES[key];
    return buildInstruments(p, buildDesign(p));
  };
  const ref = (key: string) => {
    const p = DEMO_PROFILES[key];
    return buildReferral(p, buildDesign(p), {
      now: NOW,
      instruments: insts(key),
    });
  };

  it("임의후견에는 공정증서·효력발생·감독인 선임 조문이 붙는다", () => {
    const g = insts("B").find((i) => i.kind === "voluntary_guardianship")!;
    const arts = g.basis.map((b) => `${b.law} ${b.article}`);
    expect(arts).toContain("민법 제959조의14 제2항");
    expect(arts).toContain("민법 제959조의14 제3항");
    expect(arts).toContain("민법 제959조의15 제1항");
  });

  it("조문 전문을 요약하지 않고 그대로 싣는다", () => {
    const g = insts("B").find((i) => i.kind === "voluntary_guardianship")!;
    const form = g.basis.find((b) => b.article === "제959조의14 제2항")!;
    expect(form.text).toBe("후견계약은 공정증서로 체결하여야 한다.");
  });

  it("법정후견은 판정된 유형의 조문만 붙는다", () => {
    const g = insts("C").find((i) => i.kind === "legal_guardianship")!;
    const arts = g.basis.map((b) => b.article);
    expect(arts).toContain("제9조 제1항"); // 성년후견
    expect(arts).not.toContain("제12조 제1항");
  });

  it("금융기관 위임장에는 근거 조문을 지어내지 않는다", () => {
    const m = insts("B").find((i) => i.kind === "bank_mandate")!;
    expect(m.basis).toEqual([]);
  });

  it("신탁 유형에 따라 신탁법 조문이 갈린다", () => {
    const b = insts("B").find((i) => i.kind === "trust")!;
    const d = insts("D").find((i) => i.kind === "trust")!;
    expect(b.basis.map((x) => x.article)).toEqual(["제3조 제1항"]);
    expect(d.basis.map((x) => x.article).length).toBeGreaterThan(1);
  });

  it("설정이 막힌 신탁에는 조문을 달지 않는다", () => {
    const t = insts("C").find((i) => i.kind === "trust")!;
    expect(t.stage).toBe("unavailable");
    expect(t.basis).toEqual([]);
  });

  it("의뢰서는 발급 문서들의 조문을 중복 없이 모은다", () => {
    const arts = ref("B").statutes.map((s) => `${s.law} ${s.article}`);
    expect(new Set(arts).size).toBe(arts.length);
    expect(arts).toContain("신탁법 제3조 제1항");
  });

  it("유류분 조문은 넣지 않는다 — 2024년 헌재 결정으로 변동", () => {
    const all = ref("D").statutes.map((s) => s.article).join(" ");
    expect(all).not.toContain("1112");
  });

  it("고지에 인용 시점 단서를 넣는다", () => {
    expect(ref("B").notice.join(" ")).toContain("개정 여부");
  });

  it("보호자 안내에 법정 청구권자를 명시한다", () => {
    expect(ref("C").executorNote).toContain("4촌 이내의 친족");
  });
});

describe("주거래 금융기관 안내", () => {
  const withLedger = (key: string, institutions: any[]) => {
    const p = DEMO_PROFILES[key];
    return buildReferral(p, buildDesign(p), {
      now: NOW,
      ledger: { institutions } as any,
    });
  };

  it("주거래 은행 신탁부서를 수신처로 삼는다", () => {
    const r = withLedger("B", [
      { name: "하나은행", share: 0.62, trustDesk: true },
      { name: "카카오뱅크", share: 0.38, trustDesk: false },
    ]);
    expect(r.recipients[0]).toBe("하나은행 WM·신탁부서");
  });

  it("주거래에 신탁 창구가 없으면 다음 기관으로 돌리고 그 사실을 밝힌다", () => {
    const r = withLedger("B", [
      { name: "카카오뱅크", share: 0.55, trustDesk: false },
      { name: "KB국민은행", share: 0.45, trustDesk: true },
    ]);
    expect(r.recipients[0]).toBe("KB국민은행 WM·신탁부서");
    const row = r.overview.find((o) => o.label === "주거래 금융기관")!;
    expect(row.value).toContain("카카오뱅크");
    expect(row.value).toContain("신탁 창구를 두지 않는");
  });

  it("이력이 없으면 기관명을 지어내지 않는다", () => {
    const r = make("B");
    expect(r.recipients[0]).toBe("은행 WM·신탁부서");
    expect(r.overview.some((o) => o.label === "주거래 금융기관")).toBe(false);
  });

  it("이 값이 설문이 아니라 이력에서 왔음을 문서에 적는다", () => {
    const r = withLedger("B", [{ name: "신한은행", share: 0.7, trustDesk: true }]);
    expect(r.overview.find((o) => o.label === "판단 근거")?.value).toContain(
      "금융이력",
    );
  });
});

describe("신탁 비용 표기", () => {
  it("확인되지 않은 보수 요율을 숫자로 적지 않는다", () => {
    // 이 표는 은행 WM 에게 그대로 제출된다. 요율을 지어내면 읽는 사람이 바로 안다.
    const joined = make("B").procedure.map((c) => c.value).join(" ");
    expect(joined).not.toMatch(/0\.\d+\s*~\s*\d+(\.\d+)?%/);
    expect(joined).toContain("신탁계약에서 정합니다");
  });

  it("최저 수탁금액은 공시로 확인된 두 지점을 함께 적는다", () => {
    const v = make("B").procedure.find((c) => c.label === "최저 수탁금액")!.value;
    expect(v).toContain("1,000만원");
    expect(v).toContain("5억원");
  });
});

import { evaluateTrigger, generateLedger, readBiomarker } from "../../ledger";

describe("이상 탐지 → 의뢰서", () => {
  const ledger = generateLedger("demo-B-panic", {
    preset: "panic_seller",
    decline: true,
    declineFromYear: 8,
  });
  const reading = readBiomarker(ledger);
  const AS_OF = new Date("2026-09-03T00:00:00Z");

  const build = (proof: any, key = "B") => {
    const p = DEMO_PROFILES[key];
    return buildReferral(p, buildDesign(p), {
      now: NOW,
      ledger,
      reading,
      gate: evaluateTrigger(reading, proof, AS_OF),
    });
  };

  it("이력이 없으면 탐지 절을 싣지 않는다", () => {
    expect(make("B").detection).toBeUndefined();
  });

  it("탐지 기록에 점수·구간·관측 신호를 싣는다", () => {
    const d = build(null).detection!;
    expect(d.score).toBe(reading.score);
    expect(d.band).toBeTruthy();
    expect(d.signals.every((s) => s.baseline && s.observed)).toBe(true);
  });

  it("이탈이 없는 신호는 싣지 않는다 — 소명이지 목록이 아니다", () => {
    const d = build(null).detection!;
    expect(d.signals.length).toBeLessThanOrEqual(reading.signals.length);
  });

  it("AI 경보만으로는 청구 모드로 넘어가지 않는다", () => {
    // 회의에서 확정한 2조건 게이트. 여기가 뚫리면 서비스 논리가 붕괴한다.
    const r = build(null);
    expect(r.detection!.fired).toBe(false);
    expect(r.mode).toBe("contract");
    expect(r.executor).toBe("본인");
    expect(r.detection!.blockedBy.length).toBeGreaterThan(0);
  });

  it("시드 B 는 경보 구간에 도달한다 — 아래 케이스의 전제", () => {
    expect(reading.band).toBe("alert");
    expect(reading.score).toBeGreaterThanOrEqual(61);
  });

  it("진단서가 붙고 게이트가 발동하면 청구 참고자료로 바뀐다", () => {
    const r = build({ kind: "diagnosis", issuedAt: "2026-08-20" });
    expect(r.detection!.fired).toBe(true);
    expect(r.mode).toBe("petition");
    expect(r.title).toBe("후견 청구 참고자료");
    expect(r.executor).toBe("보호자");
    expect(r.recipients).toContain("가정법원");
  });

  it("발행 1개월이 지난 증빙은 신선하지 않다고 표시한다", () => {
    const d = build({ kind: "diagnosis", issuedAt: "2026-01-05" }).detection!;
    expect(d.proofFresh).toBe(false);
    expect(d.fired).toBe(false);
  });

  it("진단서가 있어도 AI 경보가 없으면 발동하지 않는다", () => {
    // 2조건 게이트의 나머지 절반. 서류만으로도 넘어가면 안 된다.
    const quiet = generateLedger("demo-A-spender", {
      preset: "spender",
      decline: false,
    });
    const qr = readBiomarker(quiet);
    const p = DEMO_PROFILES.B;
    const r = buildReferral(p, buildDesign(p), {
      now: NOW,
      ledger: quiet,
      reading: qr,
      gate: evaluateTrigger(
        qr,
        { kind: "diagnosis", issuedAt: "2026-08-20" },
        AS_OF,
      ),
    });
    expect(qr.band).not.toBe("alert");
    expect(r.detection!.fired).toBe(false);
    expect(r.mode).toBe("contract");
    expect(r.detection!.blockedBy.join(" ")).toContain("경보");
  });

  it("증빙 종류와 발행일을 그대로 싣는다", () => {
    const d = build({ kind: "ltci", issuedAt: "2026-08-20" }).detection!;
    expect(d.proof).toEqual({ kind: "ltci", issuedAt: "2026-08-20" });
  });
});
