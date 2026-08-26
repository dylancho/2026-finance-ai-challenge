import { ClauseCard, FlagCard } from "./ClauseCard";
import Disclaimer from "../common/Disclaimer";
import type { TrustDesign } from "../../lib/types";

export default function TrustDoc({ design }: { design: TrustDesign }) {
  if (!design.available) {
    return (
      <div>
        <div className="blocked">
          <h3>신탁설계서를 생성하지 않았습니다</h3>
          <p>{design.blockedReason}</p>
        </div>

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>대신 검토할 수 있는 경로</h4>
        {design.type.alternatives.map((a) => (
          <div className="clause partial" key={a.name}>
            <header className="clause-head">
              <span className="ti">{a.name}</span>
            </header>
            <ul className="clause-body">
              <li>{a.why}</li>
            </ul>
          </div>
        ))}

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>판단 근거</h4>
        <div className="clause">
          <ul className="clause-body">
            {design.type.rationale.map((r, i) => (
              <li key={i}>· {r}</li>
            ))}
          </ul>
        </div>
        <Disclaimer />
      </div>
    );
  }

  return (
    <div className="doc">
      <div>
        <div className="verdict">
          <div className="k">RECOMMENDED STRUCTURE — 검토 대상 구조</div>
          <h3>{design.type.name}</h3>
          <ul>
            {design.type.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="alts">
            <div className="h">함께 검토할 수 있는 대안</div>
            {design.type.alternatives.map((a) => (
              <div className="a" key={a.name}>
                <b>{a.name}</b> — {a.why}
              </div>
            ))}
          </div>
        </div>

        {design.clauses.map((c) => (
          <ClauseCard key={c.no} clause={c} />
        ))}

        <Disclaimer />
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
          <h4>비용 안내 (일반 정보)</h4>
          <div className="kv">
            {design.cost.map((c) => (
              <div className="kv-row" key={c.label}>
                <span className="k">{c.label}</span>
                <span className="v">{c.value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 12, lineHeight: 1.7 }}>
            금융기관과 재산 구성에 따라 크게 달라집니다. 실제 견적은 상담이 필요합니다.
          </p>
        </div>
      </aside>
    </div>
  );
}
