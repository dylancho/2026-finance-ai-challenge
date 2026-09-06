"use client";

import Reveal from "../Reveal";
import { useCountUp } from "../useCountUp";
import type { LandingStats } from "../../../lib/landing/stats";

function Num({ n, unit, label }: { n: number; unit: string; label: string }) {
  const { ref, v } = useCountUp(n);
  return (
    <div className="ld-num" ref={ref}>
      <b className="mono">
        {v}
        <small>{unit}</small>
      </b>
      <span>{label}</span>
    </div>
  );
}

/** S7. 숫자는 서버에서 데모 프로필 B 의 실제 설계서로 계산해 내려온다. */
export default function NumbersSection({ stats }: { stats: LandingStats }) {
  return (
    <section className="ld-numbers" aria-label="숫자">
      <div className="shell-wide">
        <Reveal className="ld-sec-head" threshold={0.4}>
          <h2>
            당신의 설계서에는
            <br />
            지금 몇 개의 공백이 있습니까
          </h2>
          <p className="ld-sub">
            데모 프로필 기준. 답한 만큼 조항이 되고, 답하지 않은 곳은 &lsquo;선언되지 않음&rsquo;으로
            남습니다.
          </p>
        </Reveal>
        <div className="ld-nums">
          <Num n={stats.clauses} unit="개" label="조항" />
          <Num n={stats.gaps} unit="개" label="공백" />
          <Num n={stats.years ?? 30} unit={stats.years ? "년" : "년+"} label="생활비 유지" />
        </div>
      </div>
    </section>
  );
}
