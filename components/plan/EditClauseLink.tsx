import Link from "next/link";
import { entryQuestionForClause } from "../../lib/questions";
import type { DocKey, Profile } from "../../lib/types";

/**
 * 설계서의 한 조항에서 그 조항을 만든 질문으로 돌아가는 링크.
 *
 * 조항과 질문의 대응은 질문 은행의 mapsTo 하나로 유지된다. 여기서는 역인덱스를
 * 조회만 하므로, 질문이 추가되면 링크도 따라 붙는다. 대응하는 질문이 없으면
 * 아무것도 그리지 않는다 — 눌러도 갈 곳이 없는 링크를 만들지 않는다.
 */
export default function EditClauseLink({
  profile,
  doc,
  clause,
  match,
}: {
  profile: Profile;
  doc: DocKey;
  clause: string;
  /** 한 조항이 여러 표로 나뉠 때(예: 후견 제3조 = 재산관리 + 신상보호) 표별 필터 */
  match?: (label: string) => boolean;
}) {
  const target = entryQuestionForClause(profile, doc, clause, match);
  if (!target) return null;

  return (
    <Link
      className="clause-jump"
      href={`/interview?q=${target.id}`}
      title={`${target.id} 질문으로 돌아가 이 조항을 고칩니다`}
    >
      수정 →
    </Link>
  );
}
