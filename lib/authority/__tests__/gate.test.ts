import { describe, expect, it } from "vitest";
import type { Instrument } from "../../types";
import { canExecute, normalizeRef } from "../gate";

function inst(over: Partial<Instrument> = {}): Instrument {
  return {
    kind: "trust",
    name: "유언대용신탁 계약",
    stage: "draft",
    covers: ["trust:*"],
    effectRule: "체결 및 재산 이전 완료 시",
    steps: [],
    basis: [],
    ...over,
  };
}

describe("normalizeRef", () => {
  it("항 번호를 떼고 조 단위로 맞춘다", () => {
    expect(normalizeRef("trust", "제5조 ②")).toBe("trust:제5조");
  });
  it("절 기호도 그대로 다룬다", () => {
    expect(normalizeRef("expense", "§2")).toBe("expense:§2");
  });
});

describe("canExecute", () => {
  it("covers 에 안 걸린 조항은 통과한다 — 집행 근거가 필요 없다", () => {
    const r = canExecute("expense", "§4", [
      inst({ kind: "bank_mandate", covers: ["expense:§2", "expense:§6"] }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.instrument).toBeUndefined();
  });

  it("초안 상태면 차단한다", () => {
    const r = canExecute("trust", "제5조", [inst()]);
    expect(r.ok).toBe(false);
    expect(r.instrument?.kind).toBe("trust");
    expect(r.reason).toContain("초안");
  });

  it("전달만 된 상태도 차단한다 — 전달은 체결이 아니다", () => {
    expect(canExecute("trust", "제5조", [inst({ stage: "sent" })]).ok).toBe(false);
  });

  it("절차 진행 중도 차단한다", () => {
    expect(canExecute("trust", "제5조", [inst({ stage: "executing" })]).ok).toBe(
      false,
    );
  });

  it("effective 면 통과한다", () => {
    const r = canExecute("trust", "제5조", [inst({ stage: "effective" })]);
    expect(r.ok).toBe(true);
    expect(r.instrument?.stage).toBe("effective");
  });

  it("항 번호가 붙은 ref 도 조 단위 covers 에 걸린다", () => {
    const r = canExecute("trust", "제5조 ②", [
      inst({ covers: ["trust:제5조"] }),
    ]);
    expect(r.ok).toBe(false);
  });

  it("unavailable 은 차단하고 이유를 밝힌다", () => {
    const r = canExecute("trust", "제1조", [inst({ stage: "unavailable" })]);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("어려운 상태");
  });

  it("한 조항을 여러 문서가 덮으면 하나라도 effective 면 통과한다", () => {
    const r = canExecute("guardianship", "§2", [
      inst({ kind: "voluntary_guardianship", covers: ["guardianship:*"] }),
      inst({
        kind: "legal_guardianship",
        covers: ["guardianship:*"],
        stage: "effective",
      }),
    ]);
    expect(r.ok).toBe(true);
  });

  it("전부 미체결이면 가장 진행된 것을 대표로 보여준다", () => {
    const r = canExecute("guardianship", "§2", [
      inst({ kind: "voluntary_guardianship", covers: ["guardianship:*"] }),
      inst({
        kind: "legal_guardianship",
        name: "성년후견",
        covers: ["guardianship:*"],
        stage: "executing",
      }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.instrument?.name).toBe("성년후견");
  });
});
