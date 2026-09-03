"use client";

import Link from "next/link";
import Badge from "../common/Badge";
import type {
  ApprovalTier,
  BiomarkerReading,
  MedicalProof,
  TimelinePhase,
  TriggerGate,
} from "../../lib/types";
import { bandLabel, PROOF_FRESH_DAYS, PROOF_LABEL } from "../../lib/ledger";
import { docName } from "../../lib/ai/rules";

/**
 * 30년 축 + 트리거 게이트.
 *
 * 게이트는 자물쇠 두 개다. AI 경보만으로는 절대 넘어가지 않는다.
 * 이 화면이 말하는 것: AI 는 알리기만 하고, 사람이 서류로 확인해야 움직인다.
 */

const TIER_TONE: Record<ApprovalTier, "ok" | "warn" | "danger"> = {
  1: "ok",
  2: "warn",
  3: "danger",
};

const TIER_SHORT: Record<ApprovalTier, string> = {
  1: "AI 단독",
  2: "보호자 동의",
  3: "후견인 승인",
};

interface Props {
  phases: TimelinePhase[];
  reading: BiomarkerReading | null;
  gate: TriggerGate | null;
  active: 1 | 2 | 3;
  onPick: (p: 1 | 2 | 3) => void;
  onProof: (p: MedicalProof | null) => void;
}

export default function Timeline({
  phases,
  reading,
  gate,
  active,
  onPick,
  onProof,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="tl">
      <div className="tl-track" role="tablist" aria-label="30년 생애주기">
        {phases.map((p, i) => (
          <div className="tl-cell" key={p.phase}>
            <button
              className={`tl-phase ${p.state}`}
              role="tab"
              aria-selected={active === p.phase}
              aria-label={`Phase ${p.phase} ${p.title} · ${p.span}`}
              onClick={() => onPick(p.phase)}
            >
              <span className="n mono">Phase {p.phase}</span>
              <span className="t">{p.title}</span>
              <span className="s mono">{p.span}</span>
              <span className="c">{p.caption}</span>
            </button>

            {i === 0 && (
              <div className={`tl-gate${gate?.fired ? " fired" : ""}`}>
                <div className="tl-gate-title mono">
                  {gate?.fired ? "전환 발동" : "전환 게이트"}
                </div>

                <div className={`tl-lock${gate?.aiAlert ? " on" : ""}`}>
                  <span className="mark" aria-hidden>
                    {gate?.aiAlert ? "●" : "○"}
                  </span>
                  <div>
                    <div className="l">AI 바이오마커 경보</div>
                    <div className="d mono">
                      {reading
                        ? `${reading.score} / 100 · ${bandLabel(reading.band)}`
                        : "이력 미연동"}
                    </div>
                  </div>
                </div>

                <div className={`tl-lock${gate?.proofFresh ? " on" : ""}`}>
                  <span className="mark" aria-hidden>
                    {gate?.proofFresh ? "●" : "○"}
                  </span>
                  <div>
                    <div className="l">의료 증빙</div>
                    <div className="d mono">
                      {gate?.proof
                        ? `${PROOF_LABEL[gate.proof.kind]} · ${gate.proof.issuedAt}${
                            gate.proofFresh ? "" : " (기한 초과)"
                          }`
                        : `최근 ${PROOF_FRESH_DAYS}일 이내 발행분 필요`}
                    </div>
                  </div>
                </div>

                {reading && (
                  <div className="tl-proof-actions">
                    {gate?.proof ? (
                      <button className="btn ghost sm" onClick={() => onProof(null)}>
                        증빙 제거
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn outline sm"
                          onClick={() => onProof({ kind: "diagnosis", issuedAt: today })}
                        >
                          진단서 첨부
                        </button>
                        <button
                          className="btn outline sm"
                          onClick={() => onProof({ kind: "ltci", issuedAt: today })}
                        >
                          요양등급 첨부
                        </button>
                      </>
                    )}
                  </div>
                )}

                {gate && !gate.fired && gate.blockedBy.length > 0 && (
                  <ul className="tl-blocked">
                    {gate.blockedBy.map((b, k) => (
                      <li key={k}>{b}</li>
                    ))}
                  </ul>
                )}

                {gate?.fired && (
                  <>
                    <p className="tl-fired-note">
                      두 조건이 모두 충족됐습니다. 다만 집행하려면 그 근거가 될 계약이 필요합니다.
                      아래 기록을 그대로 담은 의뢰서를 만들 수 있습니다.
                    </p>
                    <Link href="/referral" className="btn sm" style={{ marginTop: 10 }}>
                      이 기록으로 의뢰서 만들기 →
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {reading && reading.signals.length > 0 && (
        <details className="tl-signals">
          <summary>
            바이오마커 신호 {reading.signals.length}종 — 베이스라인 대비
          </summary>
          <ul>
            {reading.signals.map((s) => (
              <li key={s.key}>
                <span className="l">{s.label}</span>
                <span className="b mono">
                  {s.baseline} → {s.observed}
                </span>
                <span className="bar">
                  <i style={{ width: `${Math.round(s.deviation * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">
            이것은 진단이 아닙니다. 평소 패턴과 달라진 지점을 표시할 뿐이며, 판정은
            의료기관의 몫입니다.
          </p>
        </details>
      )}

      {phases
        .filter((p) => p.phase === active)
        .map((p) => (
          <div className="tl-detail fade-in" key={p.phase}>
            <div className="section-title">
              <h3>
                Phase {p.phase} · {p.title}
              </h3>
              <Badge tone={p.state === "locked" ? "neutral" : "info"}>
                {p.state === "done"
                  ? "기록됨"
                  : p.state === "active"
                    ? "진행 중"
                    : p.state === "locked"
                      ? "게이트 대기"
                      : "예정"}
              </Badge>
            </div>

            <div className="tl-actions">
              {p.actions.map((a, i) => (
                <div className={`tl-action t${a.tier}`} key={i}>
                  <Badge tone={TIER_TONE[a.tier]}>{TIER_SHORT[a.tier]}</Badge>
                  <div>
                    <div className="l">{a.label}</div>
                    {a.clause && (
                      <div className="c mono">
                        {docName(a.clause.doc)} {a.clause.clause} · {a.clause.label}
                      </div>
                    )}
                    <div className="ap">승인 주체 · {a.approver}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
