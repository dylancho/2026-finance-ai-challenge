"use client";

import { won } from "../../lib/format";
import type { Referral } from "../../lib/authority/referral";

/** 은행 WM·신탁부서·법무법인에 제출하는 문서. 인쇄를 전제로 한 레이아웃. */
export default function ReferralDoc({ r }: { r: Referral }) {
  const sections = groupBySection(r);

  return (
    <article className="rf-doc">
      <header className="rf-cover">
        <span className="no">{r.docNo}</span>
        <h3>{r.title}</h3>
        <p className="sub">{r.subtitle}</p>
        <dl className="rf-cover-meta">
          <dt>수신</dt>
          <dd>{r.recipients.join(" / ")}</dd>
          <dt>작성</dt>
          <dd>NEXT (설문 응답 기반 자동 생성)</dd>
          <dt>제출 주체</dt>
          <dd>{r.executor}</dd>
          <dt>응답 문항</dt>
          <dd>
            {r.total}문항 중 {r.answered}문항 응답
          </dd>
        </dl>
        <span className="rf-stamp">초안 — 법적 효력 없음</span>
      </header>

      {r.executorNote ? (
        <p className="rf-executor-note">
          <b>제출 주체 안내</b>
          {r.executorNote}
        </p>
      ) : null}

      <section className="rf-sec">
        <h4>
          <span className="no">§1</span>의뢰 개요
        </h4>
        <dl className="rf-kv">
          {r.overview.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {r.assetTables.length || r.roles.length ? (
        <section className="rf-sec">
          <h4>
            <span className="no">§2</span>재산 및 관계 현황
            <small>설문 응답 기준 · 실사 미실시</small>
          </h4>

          {r.assetTables.map((t) => (
            <div className="table-wrap" key={t.qid}>
              <table className="rf-table">
                <caption>
                  {t.prompt} <span className="qid">{t.qid}</span>
                </caption>
                <tbody>
                  {t.rows.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className="num">
                        {row.amount ? won(row.amount) : "금액 미기재"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {t.total > 0 ? (
                  <tfoot>
                    <tr>
                      <td>합계</td>
                      <td className="num">{won(t.total)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          ))}

          {r.roles.length ? (
            <dl className="rf-kv">
              {r.roles.map((f) => (
                <div key={f.qid}>
                  <dt>
                    {f.label} <span className="qid">{f.qid}</span>
                  </dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

      {r.directives.length ? (
        <section className="rf-sec">
          <h4>
            <span className="no">§3</span>확정된 지시사항
            <small>각 항목에 근거 문항 번호 병기</small>
          </h4>
          {r.directives.map((d) => (
            <div className="rf-clause" key={d.no}>
              <div className="top">
                <span className="cno">{d.no}</span>
                <span className="cti">{d.title}</span>
                {d.sources.length ? (
                  <span className="qid">{d.sources.join(" · ")}</span>
                ) : null}
              </div>
              <ul>
                {d.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rf-sec">
        <h4>
          <span className="no">§4</span>미확정 사항
        </h4>
        {r.open.length ? (
          r.open.map((g) => (
            <div className="rf-open" key={g.qid}>
              <span className="sev">{g.severity.toUpperCase()}</span>
              <span className="txt">
                <b>
                  {g.clause} {g.what} <span className="qid">{g.qid}</span>
                </b>
                <span>{g.consequence}</span>
              </span>
            </div>
          ))
        ) : (
          <p className="muted">미확정 사항이 없습니다.</p>
        )}
      </section>

      {r.contrasts.length ? (
        <section className="rf-sec">
          <h4>
            <span className="no">§5</span>선언과 금융이력의 대조
          </h4>
          <ul className="rf-list">
            {r.contrasts.map((c) => (
              <li key={c.qid}>
                <span className="qid">{c.qid}</span> {c.declared} ↔ {c.observed}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r.procedure.length ? (
        <section className="rf-sec">
          <h4>
            <span className="no">§{r.contrasts.length ? 6 : 5}</span>절차 · 요건 · 비용
          </h4>
          <ul className="rf-check">
            {r.procedure.map((c, i) => (
              <li key={i}>
                <span className="box">☐</span>
                <span>{c.label}</span>
                <span className="cost">{c.value}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rf-sec">
        <h4>
          <span className="no">§{(r.contrasts.length ? 6 : 5) + 1}</span>고지
        </h4>
        <div className="rf-notice">
          {r.notice.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      </section>

      <span className="rf-appendix">부록 A · 설문 응답 원문</span>
      <section className="rf-sec" style={{ paddingTop: 16 }}>
        <h4>
          <span className="no">A</span>의뢰인 응답 전문
          <small>
            {r.total}문항 중 {r.answered}문항 응답
          </small>
        </h4>
        <div className="table-wrap">
          <table className="rf-table answers">
            <thead>
              <tr>
                <th>문항</th>
                <th>질문</th>
                <th>응답</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <SectionRows key={sec.name} name={sec.name} rows={sec.rows} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}

function SectionRows({
  name,
  rows,
}: {
  name: string;
  rows: Referral["answers"];
}) {
  return (
    <>
      <tr className="grp">
        <td colSpan={3}>{name}</td>
      </tr>
      {rows.map((a) => (
        <tr key={a.qid} className={a.answer === null ? "none" : undefined}>
          <td className="qid">{a.qid}</td>
          <td>{a.prompt}</td>
          <td>{a.answer ?? "미응답 — §4 참조"}</td>
        </tr>
      ))}
    </>
  );
}

function groupBySection(r: Referral) {
  const out: { name: string; rows: Referral["answers"] }[] = [];
  for (const a of r.answers) {
    const last = out[out.length - 1];
    if (last && last.name === a.section) last.rows.push(a);
    else out.push({ name: a.section, rows: [a] });
  }
  return out;
}
