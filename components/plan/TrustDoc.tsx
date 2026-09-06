import Link from "next/link";
import { ClauseCard, FlagCard } from "./ClauseCard";
import Disclaimer from "../common/Disclaimer";
import type { TrustDesign } from "../../lib/types";

export default function TrustDoc({ design }: { design: TrustDesign }) {
  const setCount = design.clauses.filter((c) => c.status === "set").length;
  const missingCount = design.clauses.filter((c) => c.status === "missing").length;

  if (!design.available) {
    return (
      <div>
        <div className="blocked">
          <h3>신탁설계서는 만들지 않았어요</h3>
          <p>{design.blockedReason}</p>
        </div>

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>대신 살펴볼 수 있는 길</h4>
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

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>이렇게 본 이유</h4>
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
          {/* 영어 소제목(RECOMMENDED STRUCTURE)은 문체 가이드에 따라 뺐다. */}
          <div className="k">검토할 구조</div>
          <h3>{design.type.name}</h3>
          <ul>
            {design.type.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="alts">
            <div className="h">함께 살펴볼 다른 방법</div>
            {design.type.alternatives.map((a) => (
              <div className="a" key={a.name}>
                <b>{a.name}</b> · {a.why}
              </div>
            ))}
          </div>
        </div>

        <div className="clause-list">
          {design.clauses.map((c) => (
            <ClauseCard key={c.no} clause={c} />
          ))}

          {/* 조항마다 수정 링크를 두면 열두 개가 된다. 손봐야 하는 조항에만
              남기고, 나머지는 여기 하나로 모은다. */}
          <div className="clause-foot">
            <span className="m">
              조항 {design.clauses.length}개 중 {setCount}개를 정했어요
              {missingCount > 0 ? ` · ${missingCount}개는 아직이에요` : ""}
            </span>
            <Link href="/interview">답 고쳐서 다시 만들기 →</Link>
          </div>
        </div>

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
              다시 살펴볼 곳
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
            금융기관과 재산 구성에 따라 크게 달라져요. 실제 견적은 상담에서 받아야 해요.
          </p>
        </div>
      </aside>
    </div>
  );
}
