import { FlagCard } from "./ClauseCard";
import Badge from "../common/Badge";
import Disclaimer from "../common/Disclaimer";
import { won, wonShort } from "../../lib/format";
import type { ExpenseDesign } from "../../lib/types";

function Sustainability({ s }: { s: ExpenseDesign["sustainability"] }) {
  if (!s.series.length || s.assets <= 0) {
    return (
      <p className="muted" style={{ fontSize: 13 }}>
        자산 규모와 월 지출이 모두 입력되면 소진 시점을 추정해 드립니다.
      </p>
    );
  }

  const W = 560;
  const H = 170;
  const pad = { l: 46, r: 12, t: 12, b: 26 };
  const maxY = Math.max(...s.series.map((d) => d.balance));
  const maxX = s.series[s.series.length - 1].year || 1;

  const x = (year: number) =>
    pad.l + (year / maxX) * (W - pad.l - pad.r);
  const y = (bal: number) =>
    pad.t + (1 - bal / maxY) * (H - pad.t - pad.b);

  const line = s.series.map((d) => `${x(d.year)},${y(d.balance)}`).join(" ");
  const area = `${pad.l},${y(0)} ${line} ${x(maxX)},${y(0)}`;

  return (
    <>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`자산 잔액 추이. 약 ${s.years ?? "30 이상"}년 후 소진 추정.`}
      >
        <line
          x1={pad.l}
          y1={y(0)}
          x2={W - pad.r}
          y2={y(0)}
          stroke="var(--line)"
          strokeWidth="1"
        />
        <polygon points={area} fill="var(--blue-soft)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {s.careStartYear !== undefined && s.careStartYear <= maxX && (
          <>
            <line
              x1={x(s.careStartYear)}
              y1={pad.t}
              x2={x(s.careStartYear)}
              y2={y(0)}
              stroke="var(--warn)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={x(s.careStartYear) + 5}
              y={pad.t + 10}
              fontSize="9"
              fill="var(--warn)"
              fontFamily="var(--mono)"
            >
              요양비 증액
            </text>
          </>
        )}
        <text x={4} y={y(maxY) + 4} fontSize="9" fill="var(--faint)" fontFamily="var(--mono)">
          {wonShort(maxY)}
        </text>
        <text x={4} y={y(0) + 4} fontSize="9" fill="var(--faint)" fontFamily="var(--mono)">
          0
        </text>
        <text x={pad.l} y={H - 8} fontSize="9" fill="var(--faint)" fontFamily="var(--mono)">
          현재
        </text>
        <text
          x={W - pad.r}
          y={H - 8}
          fontSize="9"
          fill="var(--faint)"
          textAnchor="end"
          fontFamily="var(--mono)"
        >
          {maxX}년 후
        </text>
      </svg>
      <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.75, marginTop: 8 }}>
        보유 자산 {won(s.assets)}에서 월 순지출 {won(s.monthlyNet)}을 인출할 때{" "}
        {s.years === null ? "30년 이상 유지" : `약 ${s.years}년 후 소진`}되는 것으로 단순
        추정됩니다. <b>수익률·물가·세금을 반영하지 않은 계산</b>이므로 실제와 다를 수 있습니다.
      </p>
    </>
  );
}

export default function ExpenseDoc({ design }: { design: ExpenseDesign }) {
  const activeRules = design.fraudRules.filter((r) => r.active).length;

  return (
    <div className="doc">
      <div>
        <h4 style={{ margin: "0 0 12px", fontSize: 15 }}>§1. 3층 계좌 구조</h4>
        <div className="accounts">
          {design.accounts.map((a) => (
            <div className="account" key={a.n}>
              <div className="lv mono">{a.n}</div>
              <div>
                <h5>
                  {a.name}
                  {a.amount ? <span>{won(a.amount)}</span> : null}
                </h5>
                <p>{a.purpose}</p>
                <div className="pol">
                  <Badge tone="neutral">{a.balancePolicy}</Badge>
                  <Badge tone="info">{a.withdrawal}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>§2. 자동이체 매트릭스</h4>
        {design.transfers.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>항목</th>
                  <th style={{ textAlign: "right" }}>금액</th>
                  <th>주기</th>
                  <th>출금계좌</th>
                  <th>실패 시</th>
                  <th>통보</th>
                </tr>
              </thead>
              <tbody>
                {design.transfers.map((t) => (
                  <tr key={t.item}>
                    <td>{t.item}</td>
                    <td className="num">{t.amount ? won(t.amount) : "미기재"}</td>
                    <td>{t.cycle}</td>
                    <td>{t.from}</td>
                    <td>{t.onFail}</td>
                    <td>{t.notify}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>합계</td>
                  <td className="num">{won(design.transferTotal)}</td>
                  <td colSpan={4}>
                    생활비 대비{" "}
                    {design.cashflow.living
                      ? `${Math.round((design.transferTotal / design.cashflow.living) * 100)}%`
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>
            등록된 고정지출이 없습니다. 이 표가 비어 있으면 그 시점에 누군가 손으로 처리해야
            합니다.
          </p>
        )}

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>§3. 한도 정책</h4>
        <div className="table-wrap">
          <table className="data">
            <tbody>
              {design.limits.map((l) => (
                <tr key={l.label}>
                  <td style={{ width: "34%" }}>{l.label}</td>
                  <td className="num" style={{ textAlign: "left", width: "22%" }}>
                    {l.value}
                  </td>
                  <td className="muted">{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>
          §4. 이상거래 룰셋{" "}
          <span className="mono" style={{ fontSize: 12, color: "var(--faint)" }}>
            {activeRules}/{design.fraudRules.length} 활성
          </span>
        </h4>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>조건</th>
                <th>조치</th>
                <th>통보</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {design.fraudRules.map((r) => (
                <tr key={r.key} className={r.active ? "" : "off"}>
                  <td>{r.condition}</td>
                  <td>{r.action}</td>
                  <td>{r.notify}</td>
                  <td>
                    {r.active ? (
                      <Badge tone="ok">활성</Badge>
                    ) : (
                      <Badge tone="neutral">추가 검토 가능</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>§5. 승인·알림 체계</h4>
        <div className="clause set">
          <ul className="clause-body">
            <li>① 통보 채널: {design.approval.channel}</li>
            <li>② 1차 대상: {design.approval.first}</li>
            <li>
              ③ {design.approval.escalateHours}시간 내 응답이 없으면 {design.approval.second}
              에게 에스컬레이션한다.
            </li>
            <li>④ {design.approval.fallback}</li>
          </ul>
        </div>

        <h4 style={{ margin: "28px 0 12px", fontSize: 15 }}>§6. 지속가능성 추정</h4>
        <div className="card" style={{ padding: "18px 20px" }}>
          <Sustainability s={design.sustainability} />
        </div>

        <Disclaimer>
          위 계좌 구조와 룰셋은 설계 초안입니다. 실제 적용 가능한 한도·차단·알림 서비스의 명칭과
          범위는 거래 금융기관마다 다르므로 개별 확인이 필요합니다.
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
          <h4>월 현금흐름</h4>
          <div className="kv">
            <div className="kv-row">
              <span className="k">생활비</span>
              <span className="v">{won(design.cashflow.living)}</span>
            </div>
            <div className="kv-row">
              <span className="k">고정지출</span>
              <span className="v">{won(design.cashflow.fixed)}</span>
            </div>
            <div className="kv-row">
              <span className="k">월 수입</span>
              <span className="v">− {won(design.cashflow.income)}</span>
            </div>
            <div className="kv-row">
              <span className="k">순 인출액</span>
              <span className="v" style={{ color: "var(--danger)" }}>
                {won(design.cashflow.net)}
              </span>
            </div>
            <div className="kv-row">
              <span className="k">의료예비 목표</span>
              <span className="v">{won(design.cashflow.medicalReserve)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
