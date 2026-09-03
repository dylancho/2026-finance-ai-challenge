import { describe, expect, it } from "vitest";
import { DEMO_PROFILES } from "../../profile";
import { buildDesign } from "../../design";
import type { AuthorityState } from "../../types";
import { actorOf, buildInstruments, instrumentOf } from "../instruments";
import { applyDemoAuthority } from "../store";
import { canExecute } from "../gate";

const build = (key: string, state?: AuthorityState) => {
  const p = DEMO_PROFILES[key];
  return buildInstruments(p, buildDesign(p), state);
};

describe("actorOf — 로드맵 단계의 주체 파생", () => {
  it("가정법원 단계는 법원", () => {
    expect(actorOf("가정법원에 임의후견감독인 선임 청구")).toBe("법원");
  });
  it("공증·등기 단계는 전문가", () => {
    expect(actorOf("공증사무소에서 공정증서 작성")).toBe("전문가");
    expect(actorOf("후견등기 신청")).toBe("전문가");
  });
  it("그 외는 본인", () => {
    expect(actorOf("후견계약 내용 확정")).toBe("본인");
  });
});

describe("buildInstruments", () => {
  it("B(미래 대비, 의사능력 정상)는 신탁·후견·위임장을 모두 낸다", () => {
    const kinds = build("B").map((i) => i.kind);
    expect(kinds).toContain("trust");
    expect(kinds).toContain("bank_mandate");
    expect(kinds.some((k) => k.endsWith("guardianship"))).toBe(true);
  });

  it("모든 문서는 초안에서 시작한다 — 앱이 권한을 만들지 않는다", () => {
    for (const i of build("B")) expect(i.stage).toBe("draft");
  });

  it("C(이미 진단받음)는 신탁을 unavailable 로 내고 대안을 함께 준다", () => {
    const t = instrumentOf(build("C"), "trust");
    expect(t?.stage).toBe("unavailable");
    expect(t?.unavailableReason).toBeTruthy();
    expect(t?.fallback?.length).toBeGreaterThan(0);
  });

  it("C 는 법정후견 경로를 낸다 — 임의후견이 아니다", () => {
    const kinds = build("C").map((i) => i.kind);
    expect(kinds).toContain("legal_guardianship");
    expect(kinds).not.toContain("voluntary_guardianship");
  });

  it("A(일상 트랙, 신탁·후견 없음)에도 위임장은 나온다", () => {
    // 이 트랙의 유일한 집행 근거다. 없으면 축 전체가 A 에서 안 보인다.
    expect(instrumentOf(build("A"), "bank_mandate")).toBeTruthy();
  });

  it("후견 로드맵 단계를 그대로 옮겨 담는다", () => {
    const g = build("B").find((i) => i.kind.endsWith("guardianship"));
    expect(g?.steps.length).toBeGreaterThan(0);
    expect(g?.steps[0].n).toBe(1);
  });

  it("저장된 단계를 얹는다", () => {
    const state: AuthorityState = {
      version: 1,
      stages: { trust: "effective" },
      sentAt: null,
    };
    expect(instrumentOf(build("B", state), "trust")?.stage).toBe("effective");
  });

  it("unavailable 은 저장값으로 뒤집을 수 없다", () => {
    const state: AuthorityState = {
      version: 1,
      stages: { trust: "effective" },
      sentAt: null,
    };
    expect(instrumentOf(build("C", state), "trust")?.stage).toBe("unavailable");
  });
});

describe("위임장의 적용 범위", () => {
  it("이상거래 차단과 한도는 위임 없이도 집행된다", () => {
    // 신탁이 막힌 사용자에게 서비스가 권하는 '지금 당장 가능한 조치'가 이것이다.
    // 여기가 잠기면 그 안내가 거짓말이 된다.
    const insts = build("A");
    expect(canExecute("expense", "§3", insts).ok).toBe(true);
    expect(canExecute("expense", "§4", insts).ok).toBe(true);
  });

  it("자동이체 대행은 위임장이 있어야 집행된다", () => {
    expect(canExecute("expense", "§2", build("A")).ok).toBe(false);
  });
});

describe("데모 진입 시 체결 상태 초기화", () => {
  it("applyDemoAuthority 는 저장된 단계를 비운다", () => {
    // 남아 있으면 데모를 다시 열어도 이미 풀려 있어 잠긴 장면을 볼 수 없다.
    const s = applyDemoAuthority();
    expect(s.stages).toEqual({});
    expect(s.sentAt).toBeNull();
  });

  it("초기화한 상태로는 모든 문서가 초안이다", () => {
    const p = DEMO_PROFILES.B;
    const insts = buildInstruments(p, buildDesign(p), applyDemoAuthority());
    expect(insts.every((i) => i.stage === "draft" || i.stage === "unavailable")).toBe(
      true,
    );
  });
});
