import type { ReactNode } from "react";
import Reveal from "./Reveal";

/**
 * 랜딩의 기능 섹션 한 칸. 왼쪽 글 + 오른쪽 목업. `reverse` 면 좌우를 바꾼다.
 * 글은 아래에서 떠오르고, 목업은 살짝 확대되며 뒤따라 나타난다.
 */

interface Props {
  id?: string;
  step: string;
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  mock: ReactNode;
  reverse?: boolean;
  dark?: boolean;
  /** 제목 아래에 붙는 링크·버튼 */
  action?: ReactNode;
}

export default function FeatureSection({
  id,
  step,
  eyebrow,
  title,
  body,
  mock,
  reverse,
  dark,
  action,
}: Props) {
  return (
    <section
      id={id}
      className={`ld-feature${reverse ? " reverse" : ""}${dark ? " dark" : ""}`}
    >
      <div className="shell-wide ld-feature-inner">
        <Reveal className="ld-copy" threshold={0.35}>
          <div className="ld-step mono">{step}</div>
          <div className="eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          <p>{body}</p>
          {action && <div className="ld-action">{action}</div>}
        </Reveal>
        <Reveal className="ld-mock" delay={140} threshold={0.35}>
          {mock}
        </Reveal>
      </div>
    </section>
  );
}
