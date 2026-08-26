"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildDesign, runScenario, scenariosFor } from "../../lib/design";
import { demoProfile, readProfile, saveProfile } from "../../lib/profile";
import { docName } from "../../lib/ai/rules";
import type { Profile } from "../../lib/types";

export default function SimulationShell() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo) {
      const d = demoProfile(demo);
      if (d) {
        saveProfile(d);
        setProfile(d);
        return;
      }
    }
    const p = readProfile();
    if (!p.track) {
      router.replace("/start");
      return;
    }
    setProfile(p);
  }, [router]);

  const scenarios = useMemo(() => (profile ? scenariosFor(profile) : []), [profile]);

  useEffect(() => {
    if (!picked && scenarios.length) setPicked(scenarios[0].id);
  }, [scenarios, picked]);

  const design = useMemo(() => (profile ? buildDesign(profile) : null), [profile]);
  const result = useMemo(
    () => (profile && design && picked ? runScenario(profile, design, picked) : null),
    [profile, design, picked],
  );

  if (!profile || !profile.track) {
    return (
      <div className="shell-wide" style={{ padding: "80px 0" }}>
        <p className="muted">시뮬레이션을 준비하는 중입니다…</p>
      </div>
    );
  }

  const firstGapIdx = result?.nodes.findIndex((n) => n.status === "gap") ?? -1;

  return (
    <div className="sim shell-wide">
      <div className="eyebrow">Clause activation trace</div>
      <h1 style={{ fontSize: "clamp(26px,3.4vw,38px)", margin: "12px 0 10px" }}>
        만약 내일, 내가 결정할 수 없다면?
      </h1>
      <p className="section-lede">
        아래 흐름은 지금 작성된 설계서의 <b>실제 조항</b>을 인용합니다. 답하지 않은 항목에
        도달하면 그 자리에서 멈추고, 무엇이 비었는지 알려드립니다.
      </p>

      <div className="sim-picker">
        {scenarios.map((s) => (
          <button
            key={s.id}
            className="sim-card"
            aria-pressed={picked === s.id}
            onClick={() => setPicked(s.id)}
          >
            <div className="t">{s.name}</div>
            <div className="c">{s.caption}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="sim-body">
          <div className="trace" key={result.scenario.id}>
            {result.nodes.map((n, i) => (
              <div
                className={`node ${n.status}${
                  firstGapIdx >= 0 && i > firstGapIdx ? " dim" : ""
                }`}
                key={n.n}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="idx mono">{n.status === "gap" ? "!" : n.n}</div>
                <div className="box">
                  <h4>{n.title}</h4>
                  <p>{n.detail}</p>

                  {n.clauses.length > 0 && (
                    <div className="clauses">
                      {n.clauses.map((c, ci) => (
                        <div className="cl" key={ci}>
                          <span className="r">
                            {docName(c.doc).replace("설계서", "")} {c.ref}
                          </span>
                          <span className="l">{c.label}</span>
                          <span className="d">{c.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {n.status === "gap" && (
                    <>
                      <div className="gapmsg">{n.gapMessage}</div>
                      {n.gapQid && (
                        <Link
                          href={`/interview?q=${n.gapQid}`}
                          className="btn sm"
                          style={{ marginTop: 12 }}
                        >
                          {n.gapQid}번 질문에 답하고 이 조항 채우기 →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <aside className="verdict-box">
            <div className="k">NEXT AI의 정리</div>
            {result.verdict.map((v, i) => (
              <p key={i}>{v}</p>
            ))}
            <Link href="/plan" className="btn outline">
              내 설계서 보기
            </Link>
            {result.gapCount > 0 && (
              <Link href="/plan" className="btn">
                공백 {result.gapCount}건 채우러 가기
              </Link>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
