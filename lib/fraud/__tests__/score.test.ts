import { describe, expect, it } from "vitest";
import { parseTransaction, scoreTransaction, topReasons, fallbackDecision } from "../score";

describe("fraud score", () => {
  it("기본(빈 바디) 시나리오는 차단된다", () => {
    const r = scoreTransaction(parseTransaction({}));
    expect(r.status).toBe("BLOCKED");
    expect(r.risk_score).toBe(99);
    expect(r.signals.filter((s) => s.level === "critical").map((s) => s.key)).toEqual([
      "amount",
      "recipient",
    ]);
    expect(topReasons(r.signals)).toHaveLength(3);
  });

  it("평소 범위 안의 거래는 허용된다", () => {
    const r = scoreTransaction(
      parseTransaction({
        transaction_id: "TX_1",
        amount: 180_000,
        target_account: "110-123-456789",
        is_new_target_account: false,
        request_time: "11:42 AM",
        pin_error_count: 0,
        biometric_anomaly_score: 0.14,
        is_new_device: false,
      }),
    );
    expect(r.status).toBe("ALLOW");
    expect(r.risk_score).toBe(0);
    expect(r.signals.every((s) => s.level === "normal")).toBe(true);
    expect(topReasons(r.signals)).toEqual([]);
  });

  it("신규 계좌 + 야간 + 인증 실패 1회가 겹치면 검토 상태", () => {
    const r = scoreTransaction(
      parseTransaction({
        amount: 300_000,
        is_new_target_account: true,
        request_time: "11:30 PM",
        pin_error_count: 1,
        biometric_anomaly_score: 0.1,
        is_new_device: false,
      }),
    );
    expect(r.risk_score).toBe(39);
    expect(r.status).toBe("REVIEW");
  });

  it("12시간제 PM 을 야간으로 읽는다", () => {
    const night = scoreTransaction(parseTransaction({ request_time: "10:05 PM" }));
    const day = scoreTransaction(parseTransaction({ request_time: "10:05 AM" }));
    expect(night.signals.find((s) => s.key === "time")!.score).toBe(14);
    expect(day.signals.find((s) => s.key === "time")!.score).toBe(0);
  });

  it("폴백 서술은 상태마다 다르다", () => {
    expect(fallbackDecision("BLOCKED")).not.toBe(fallbackDecision("ALLOW"));
    expect(fallbackDecision("REVIEW")).toContain("확인");
  });
});

describe("fraud policy", () => {
  const base = {
    amount: 1_500_000,
    is_new_target_account: true,
    request_time: "11:00 AM",
    pin_error_count: 0,
    biometric_anomaly_score: 0.1,
    is_new_device: false,
  };

  it("점수가 낮아도 '우선 차단' 원칙이면 신규 계좌는 차단", () => {
    const r = scoreTransaction(parseTransaction(base), {
      rule: "block", newAccountThreshold: 3_000_000, signals: ["time", "pin", "biometric", "device"], onTimeout: "hold",
    });
    expect(r.risk_score).toBeLessThan(35);
    expect(r.status).toBe("BLOCKED");
    expect(r.policyNote).toContain("우선 차단");
  });

  it("기준액 이상이면 '보호자 승인' 원칙이 상태 하한을 정한다", () => {
    const r = scoreTransaction(parseTransaction({ ...base, amount: 3_500_000 }), {
      rule: "guardian", newAccountThreshold: 3_000_000, signals: [], onTimeout: "hold",
    });
    expect(r.status).toBe("BLOCKED");
    expect(r.policyNote).toContain("3,000,000원");
  });

  it("기준액 미만이면 원칙이 개입하지 않는다", () => {
    const r = scoreTransaction(parseTransaction(base), {
      rule: "guardian", newAccountThreshold: 3_000_000, signals: [], onTimeout: "hold",
    });
    expect(r.status).toBe("ALLOW");
    expect(r.policyNote).toBeUndefined();
  });

  it("보지 않기로 한 신호는 점수에서 빠진다", () => {
    const all = scoreTransaction(parseTransaction({}));
    const none = scoreTransaction(parseTransaction({}), {
      rule: "reauth", newAccountThreshold: 3_000_000, signals: [], onTimeout: "hold",
    });
    expect(all.risk_score).toBe(99);
    expect(none.risk_score).toBe(49); // 금액 30 + 신규 계좌 19
    expect(none.status).toBe("REVIEW");
  });
});
