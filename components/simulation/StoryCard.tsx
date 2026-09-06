"use client";

import Link from "next/link";
import type { ScenarioResult, TriggerGate } from "../../lib/types";
import { clauseHref, clauseLabel } from "../../lib/planLinks";
import { PROOF_FRESH_DAYS } from "../../lib/ledger";
import { WHO_LABEL, type Story, type StoryRow } from "./story";

/*
 * 시기 카드 한 장.
 *
 * 순서는 지출설계서 카드와 같다 — 작은 라벨 → 큰 문장 → 한두 문장 설명 → 목록 행.
 * 행 오른쪽의 칩은 두 종류뿐이다. 상태(체결 전 · 진단서 첨부 전 · 조건 충족)와
 * 누가 결정하나(자동 · 본인 · 보호자 동의 · 후견인·전문가 승인).
 */

function Row({ row, fired }: { row: StoryRow; fired: boolean }) {
  const waiting = !row.blocked && row.gated && !fired;
  return (
    <li className={`xd-row sv-row${row.blocked ? " is-blocked" : ""}${waiting ? " is-waiting" : ""}`}>
      <div className="sv-row-main">
        <div className="l">{row.label}</div>
        {row.sub && <div className="s">{row.sub}</div>}
        {row.blocked && <div className="s why">{row.blocked.reason}</div>}
        {row.clause && (
          <Link href={clauseHref(row.clause)} className="sv-link">
            {clauseLabel(row.clause)} →
          </Link>
        )}
        {row.href && (
          <Link href={row.href} className="sv-link">
            {row.hrefLabel ?? "보기"} →
          </Link>
        )}
      </div>
      <div className="sv-tags">
        {row.blocked ? (
          <span className="sv-tag off">{row.blocked.text}</span>
        ) : waiting ? (
          <span className="sv-tag warn">진단서 첨부 전</span>
        ) : row.state ? (
          <span className={`sv-tag ${row.state.tone}`}>{row.state.text}</span>
        ) : null}
        {row.who && <span className={`sv-tag who ${row.who}`}>{WHO_LABEL[row.who]}</span>}
      </div>
    </li>
  );
}

/** 시나리오 한 편 — 접힌 한 줄 요약, 펼치면 단계별 진행 */
function Example({ result }: { result: ScenarioResult }) {
  const nodes = result.nodes;
  const lead = nodes[1] ?? nodes[0];
  const oneLiner = !lead
    ? ""
    : lead.status === "gap"
      ? `「${lead.title}」 단계에서 멈춥니다`
      : lead.status === "noauthority"
        ? `「${lead.title}」 단계가 서류 체결 전이라 실행되지 않습니다`
        : lead.detail;
  const stops = result.gapCount > 0 || (result.blockedCount ?? 0) > 0;
  // 엔진 문장의 줄표(—)는 이 화면에서 가운뎃점으로 편다. 한 줄 요약에서 줄표가 겹치면 읽기 어렵다.
  const plain = (t: string) => t.replace(/\s—\s/g, " · ");

  return (
    <details className={`sv-ex${stops ? " stops" : ""}`}>
      <summary>
        <span className="sv-ex-name">{result.scenario.name}</span>
        <span className="sv-ex-line">{plain(oneLiner)}</span>
      </summary>
      <ol className="sv-steps">
        {nodes.map((n) => (
          <li className={n.status} key={n.n}>
            <span className="n">{n.status === "gap" ? "!" : n.n}</span>
            <div className="b">
              <div className="l">{n.title}</div>
              <div className="s">{plain(n.detail)}</div>
              {n.status === "gap" && (
                <div className="sv-stop">
                  <b>여기서 멈춥니다.</b> {n.gapMessage}
                  {n.gapQid && (
                    <Link href={`/interview?q=${n.gapQid}`} className="sv-link">
                      답하고 채우기 →
                    </Link>
                  )}
                </div>
              )}
              {n.status === "noauthority" && n.authority && (
                <div className="sv-stop off">
                  <b>서류 체결 전이라 실행되지 않습니다.</b> {n.authority.reason}
                </div>
              )}
              {n.clauses.length > 0 && (
                <div className="sv-cl">
                  {n.clauses.map((c, i) => (
                    <Link
                      key={i}
                      href={clauseHref(c)}
                      className={`sv-link${c.locked ? " off" : ""}`}
                      title={`${c.label} · ${c.detail}`}
                    >
                      {clauseLabel(c)} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

function SignalBlock({ story }: { story: Story }) {
  const s = story.signal;
  if (!s) return null;
  return (
    <div className={`sv-signal ${s.band}`}>
      <div className="sv-signal-head">
        <div>
          <div className="k">지금 내 이력에서는</div>
          <div className="v">
            평소 패턴과 비교한 점수 <b>{s.score}점</b>
            <span className={`sv-tag ${s.band === "alert" ? "warn" : s.band === "watch" ? "warn" : "ok"}`}>{s.bandLabel}</span>
          </div>
        </div>
      </div>
      <p className="sv-signal-p">{s.meaning}</p>
      {s.signals.length > 0 && (
        <ul className="sv-signal-list">
          {s.signals.map((x) => (
            <li key={x.label}>
              <span className="l">{x.label}</span>
              <span className="v">
                평소 {x.baseline} → 최근 {x.observed}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="sv-signal-note">진단이 아닙니다. 평소와 달라진 지점을 표시할 뿐이며, 판정은 의료기관의 몫입니다.</p>
    </div>
  );
}

function ProofControl({
  gate,
  onProof,
}: {
  gate: TriggerGate | null;
  onProof: (attach: boolean) => void;
}) {
  const attached = !!gate?.proof;
  return (
    <div className="sv-proof">
      <div className="sv-seg-q">진단서를 첨부했나요?</div>
      <div className="sv-seg small" role="tablist" aria-label="진단서 첨부 여부">
        <button type="button" role="tab" aria-selected={!attached} className={!attached ? "is-on" : undefined} onClick={() => onProof(false)}>
          첨부 전
        </button>
        <button type="button" role="tab" aria-selected={attached} className={attached ? "is-on" : undefined} onClick={() => onProof(true)}>
          진단서 첨부함
        </button>
      </div>
      <p className="sv-proof-note">
        {attached
          ? `의사 진단서 · ${gate?.proof?.issuedAt} 발행으로 표시했습니다. 앱이 판정하는 것이 아니라, 받아 둔 서류를 알려주는 것입니다.`
          : `첨부 전에는 신탁 지급 개시가 열리지 않습니다. 실제로는 최근 ${PROOF_FRESH_DAYS}일 이내 발행된 의사 진단서나 장기요양보험 등급 발행서가 필요합니다.`}
      </p>
      {gate?.fired && (
        <Link href="/referral" className="btn sm">
          이 기록으로 의뢰서 만들기 →
        </Link>
      )}
    </div>
  );
}

export default function StoryCard({
  story,
  current,
  fired,
  gate,
  examples,
  onProof,
}: {
  story: Story;
  current: boolean;
  fired: boolean;
  gate: TriggerGate | null;
  examples: ScenarioResult[];
  onProof: (attach: boolean) => void;
}) {
  const missingHref =
    story.missing?.chapter === "core" && story.id === "signal"
      ? "/ledger"
      : `/interview?chapter=${story.missing?.chapter ?? "medical"}`;
  const missingCta = story.id === "signal" && story.missing ? "이력 연동하기 →" : "답하기 →";

  return (
    <section className={`xd-card sv-card${current ? " is-current" : ""}`} id={`sv-${story.id}`} aria-labelledby={`sv-${story.id}-t`}>
      <header className="xd-head">
        <div className="xd-no">
          {story.label}
          {current && <span className="sv-now">지금 보는 시기</span>}
        </div>
        <h3 id={`sv-${story.id}-t`}>{story.headline}</h3>
        <p className="xd-lede">{story.lede}</p>
      </header>

      {story.id === "after" && !story.missing && <ProofControl gate={gate} onProof={onProof} />}

      {story.id === "signal" && (story.signal ? <SignalBlock story={story} /> : null)}

      {story.missing && (
        <div className="sv-missing">
          <div>
            <div className="l">
              {story.id === "signal"
                ? "이 시기를 미리 보려면 금융 이력 연동이 필요합니다"
                : `이 시기를 미리 보려면 ${story.missing.label} 영역 답변이 필요합니다`}
            </div>
            <div className="s">{story.missing.note}</div>
          </div>
          <Link href={missingHref} className="btn sm">
            {missingCta}
          </Link>
        </div>
      )}

      {story.rows.length > 0 && (
        <ul className="xd-list sv-list">
          {story.rows.map((r) => (
            <Row key={r.label} row={r} fired={fired} />
          ))}
        </ul>
      )}

      {examples.length > 0 && (
        <div className="sv-examples">
          <div className="xd-group-t">예: 이런 일이 생기면</div>
          {examples.map((r) => (
            <Example key={r.scenario.id} result={r} />
          ))}
        </div>
      )}
    </section>
  );
}
