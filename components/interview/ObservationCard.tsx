"use client";

import Link from "next/link";
import Badge from "../common/Badge";
import type { Contrast, Resolution } from "../../lib/types";
import type { Observation } from "../../lib/ledger";

/**
 * 인터뷰 중 문항 옆에 붙는 관측 카드.
 *
 * 답하기 전에는 관측값만 보여주고, 답한 뒤 어긋나면 그 자리에서 정할 수 있게 한다.
 * 다만 인터뷰를 멈추지는 않는다 — 미루고 설계서에서 처리해도 된다.
 */

const TONE: Record<Contrast["agreement"], { tone: "ok" | "warn" | "danger"; label: string }> = {
  aligned: { tone: "ok", label: "이력과 일치" },
  tension: { tone: "warn", label: "이력과 어긋남" },
  contradiction: { tone: "danger", label: "이력과 모순" },
};

const RESOLUTION_LABEL: Record<Resolution, string> = {
  declared: "선언 유지",
  observed: "이력대로 수정",
  adjusted: "절충",
};

interface Props {
  observation: Observation | null;
  contrast?: Contrast;
  onResolve: (c: Contrast, r: Resolution) => void;
}

export default function ObservationCard({ observation, contrast, onResolve }: Props) {
  if (!observation && !contrast) return null;

  return (
    <div className={`obs-card${contrast ? ` ${contrast.agreement}` : ""}`}>
      <header className="obs-head">
        <h4>{observation?.title ?? "이력 대조"}</h4>
        {contrast && (
          <Badge tone={TONE[contrast.agreement].tone}>
            {TONE[contrast.agreement].label}
          </Badge>
        )}
      </header>

      {observation && (
        <ul className="obs-lines">
          {observation.lines.map((l, i) => (
            <li key={i}>
              <span className="k">{l.label}</span>
              <span className="v mono">{l.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {contrast && contrast.agreement !== "aligned" && (
        <div className="obs-verdict">
          <p>{contrast.reason}</p>
          {contrast.resolution ? (
            <p className="muted mono">{RESOLUTION_LABEL[contrast.resolution]}(으)로 정하셨습니다</p>
          ) : (
            <>
              <div className="obs-actions">
                <button className="btn outline sm" onClick={() => onResolve(contrast, "declared")}>
                  선언 유지
                </button>
                {contrast.observedValue && (
                  <button
                    className="btn outline sm"
                    onClick={() => onResolve(contrast, "observed")}
                  >
                    이력대로
                  </button>
                )}
                <button className="btn sm" onClick={() => onResolve(contrast, "adjusted")}>
                  절충
                </button>
              </div>
              <p className="obs-defer">
                지금 정하지 않아도 됩니다.{" "}
                <Link href="/plan">설계서의 이력 대조 탭</Link>에서 한꺼번에 볼 수 있습니다.
              </p>
            </>
          )}
        </div>
      )}

      {!contrast && (
        <p className="obs-defer">
          답하시면 이 이력과 맞춰 봅니다. 어긋나도 답이 틀린 것은 아닙니다.
        </p>
      )}
    </div>
  );
}
