import { FlagCard } from "./ClauseCard";
import EditClauseLink from "./EditClauseLink";
import Badge from "../common/Badge";
import Disclaimer from "../common/Disclaimer";
import { personLabel } from "../../lib/format";
import type { GuardianshipDesign, Profile, ScopeItem } from "../../lib/types";

const GRANT_META = {
  delegate: { tone: "ok" as const, label: "위임" },
  consent: { tone: "warn" as const, label: "동의유보" },
  exclude: { tone: "neutral" as const, label: "제외" },
};

function ScopeTable({
  items,
  title,
  profile,
  match,
}: {
  items: ScopeItem[];
  title: string;
  profile: Profile;
  match: (label: string) => boolean;
}) {
  return (
    <>
      <h4 style={{ margin: "26px 0 12px", fontSize: 15 }}>
        {title}
        <EditClauseLink profile={profile} doc="guardianship" clause="제3조" match={match} />
      </h4>
      <div className="scope-grid">
        {items.map((it) => (
          <div
            className={`scope-item ${it.grant === "exclude" ? "exclude" : ""}`}
            key={it.key}
          >
            <span className="lab">
              {it.label}
              {it.note && <span className="nt">{it.note}</span>}
            </span>
            <Badge tone={GRANT_META[it.grant].tone}>{GRANT_META[it.grant].label}</Badge>
          </div>
        ))}
      </div>
    </>
  );
}

export default function GuardianshipDoc({
  design,
  profile,
}: {
  design: GuardianshipDesign;
  profile: Profile;
}) {
  return (
    <div className="doc">
      <div>
        <div className="verdict">
          <div className="k">INSTITUTION VERDICT — 제도 판정</div>
          <h3>{design.verdict.name}</h3>
          <ul>
            {design.verdict.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {design.verdict.ruledOut.length > 0 && (
            <div className="alts">
              <div className="h">해당하지 않는 제도와 그 이유</div>
              {design.verdict.ruledOut.map((r) => (
                <div className="a" key={r.name}>
                  <b>{r.name}</b> — {r.why}
                </div>
              ))}
            </div>
          )}
        </div>

        <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>
          판정 경로
          <EditClauseLink profile={profile} doc="guardianship" clause="제1조" />
        </h4>
        <div className="tree">
          {design.tree.map((n, i) => (
            <div className="tree-node" key={i}>
              <div className="q">{n.question}</div>
              <div className="a">{n.answer}</div>
            </div>
          ))}
        </div>

        <ScopeTable
          items={design.scopeProperty}
          title="재산관리 사무 (9항목)"
          profile={profile}
          match={(l) => !l.includes("신상보호")}
        />
        <ScopeTable
          items={design.scopePersonal}
          title="신상보호 사무 (6항목)"
          profile={profile}
          match={(l) => l.includes("신상보호")}
        />

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>효력 발생 요건</h4>
        <div className="clause set">
          <ul className="clause-body">
            {design.effect.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>

        {design.roadmap.length > 0 && (
          <>
            <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>
              절차 로드맵
              <EditClauseLink profile={profile} doc="guardianship" clause="제5조" />
            </h4>
            <div className="card" style={{ padding: "6px 22px" }}>
              {design.roadmap.map((s) => (
                <div className="roadmap-step" key={s.n}>
                  <div className="n mono">{s.n}</div>
                  <div>
                    <h5>{s.title}</h5>
                    <p>{s.detail}</p>
                    <div className="roadmap-meta">
                      <Badge tone="info">소요 {s.period}</Badge>
                      <Badge tone="neutral">{s.cost}</Badge>
                      {s.docs.map((d) => (
                        <Badge key={d} tone={d.includes("보유") ? "ok" : "warn"}>
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Disclaimer>
          후견 제도의 요건·절차·기간은 사건과 관할 법원에 따라 달라집니다. 위 로드맵은 일반적인
          흐름을 정리한 것으로, 실제 청구 전에 변호사·법무사의 확인이 필요합니다.
        </Disclaimer>
      </div>

      <aside className="doc-side">
        {design.flags.length > 0 && (
          <div>
            <h4
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: "var(--faint)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              검토가 필요한 지점
            </h4>
            {design.flags.map((f, i) => (
              <FlagCard key={i} flag={f} />
            ))}
          </div>
        )}

        <div className="side-card">
          <h4>당사자</h4>
          <div className="kv">
            <div className="kv-row">
              <span className="k">후견인 후보</span>
              <span className="v">{personLabel(design.guardians.primary)}</span>
            </div>
            <div className="kv-row">
              <span className="k">예비 후견인</span>
              <span className="v">{personLabel(design.guardians.backup)}</span>
            </div>
            <div className="kv-row">
              <span className="k">후견감독인</span>
              <span className="v">{design.supervisor.label}</span>
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12, lineHeight: 1.7 }}>
            {design.supervisor.note}
          </p>
        </div>
      </aside>
    </div>
  );
}
