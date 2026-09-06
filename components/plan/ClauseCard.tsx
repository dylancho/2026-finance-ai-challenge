import Link from "next/link";
import type { Flag } from "../../lib/types";

/*
 * 설계서 위쪽의 "다시 살펴볼 곳" 카드.
 *
 * 2026-09-07: 조항 한 장을 그리던 ClauseCard 는 뺐다. 신탁설계서가 지출설계서와 같은
 * 카드(components/plan/DocKit.tsx 의 DocCard)로 조항을 그리게 되면서 쓰는 곳이 없어졌다.
 */

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
