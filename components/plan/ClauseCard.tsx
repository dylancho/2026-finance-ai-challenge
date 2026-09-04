import Link from "next/link";
import { StatusBadge } from "../common/Badge";
import type { Clause, Flag } from "../../lib/types";

export function ClauseCard({ clause }: { clause: Clause }) {
  return (
    <article className={`clause ${clause.status}`}>
      <header className="clause-head">
        <span className="no mono">{clause.no}</span>
        <span className="ti">{clause.title}</span>
        <StatusBadge status={clause.status} />
      </header>
      <ul className="clause-body">
        {clause.body.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      {clause.note && <p className="clause-note">{clause.note}</p>}
      {clause.sources.length > 0 && (
        <p className="clause-edit">
          <Link href={`/interview?q=${clause.sources[0]}`}>
            {clause.status === "missing"
              ? "이 조항 채우러 가기 →"
              : clause.status === "partial"
                ? "이 조항 마저 채우기 →"
                : "이 조항 수정하기 →"}
          </Link>
        </p>
      )}
    </article>
  );
}

export function FlagCard({ flag }: { flag: Flag }) {
  const icon = flag.level === "critical" ? "!" : flag.level === "warn" ? "△" : "i";
  return (
    <div className={`flag ${flag.level}`}>
      <div className="t">
        <span aria-hidden style={{ fontFamily: "var(--mono)" }}>
          {icon}
        </span>
        {flag.title}
      </div>
      <p>{flag.body}</p>
      {flag.qid && <Link href={`/interview?q=${flag.qid}`}>이 항목 다시 보기 →</Link>}
    </div>
  );
}
