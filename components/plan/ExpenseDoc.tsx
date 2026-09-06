"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Landmark, Wallet } from "lucide-react";
import { FlagCard } from "./ClauseCard";
import Link from "next/link";
import Disclaimer from "../common/Disclaimer";
import { won, wonShort } from "../../lib/format";
import { choiceOf } from "../../lib/profile";
import { entryQuestionForClause } from "../../lib/questions";
import type { ExpenseDesign, FraudRule, Profile } from "../../lib/types";

/*
 * 지출설계서 — 토스 스타일 (2026-09-06).
 *
 * 원칙: 카드 한 장에 원칙 하나. 큰 숫자 하나와 그 숫자를 설명하는 한 문장이 먼저 오고,
 * 표 대신 목록 행으로 세부를 보여준다. 조항 번호(제N조)는 의뢰서·시뮬레이션이 인용하므로
 * 작은 라벨로 남기고, 카드마다 id="exp-N" 앵커를 달아 다른 화면에서 바로 올 수 있게 한다.
 */

const PAYOUT_LABEL: Record<string, string> = {
  monthly: "매달 1일",
  biweekly: "2주마다",
  weekly: "매주",
  ondemand: "청구할 때",
};

/** 조항 카드 껍데기. 라벨(제N조) → 쉬운 말 제목 → 한 문장 → 세부 순서를 강제한다. */
function Clause({
  n,
  title,
  lede,
  profile,
  children,
}: {
  n: number;
  title: string;
  lede?: React.ReactNode;
  profile: Profile;
  children?: React.ReactNode;
}) {
  return (
    <section className="xd-card" id={`exp-${n}`} aria-labelledby={`exp-${n}-title`}>
      <header className="xd-head">
        <div className="xd-no">제{n}조</div>
        <h3 id={`exp-${n}-title`}>{title}</h3>
        {lede && <p className="xd-lede">{lede}</p>}
      </header>
      {children}
    </section>
  );
}

/* ── 월 현금흐름 (첫 카드) ─────────────────────────────── */

function CashflowHero({ cf, payout }: { cf: ExpenseDesign["cashflow"]; payout: string }) {
  const spend = cf.living + cf.fixed;
  const scale = Math.max(cf.income, spend, 1);
  const pctOf = (v: number) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;

  return (
    <section className="xd-card xd-hero" id="exp-cashflow" aria-label="월 현금흐름">
      <div className="xd-no">월 현금흐름</div>
      {cf.living > 0 ? (
        <h2>
          {payout}, 생활비 <em>{won(cf.living)}</em>이 나갑니다
        </h2>
      ) : (
        <h2>생활비가 아직 정해지지 않았습니다</h2>
      )}
      <ul className="xd-facts" aria-label="월 수입·지출 요약">
        <li>
          수입 <b>{won(cf.income)}</b>
        </li>
        <li>
          고정비 <b>{won(cf.fixed)}</b>
        </li>
        <li>
          {cf.net > 0 ? (
            <>
              매달 <b>{won(cf.net)}</b> 부족
            </>
          ) : (
            <>
              매달 <b>{won(-cf.net)}</b> 남음
            </>
          )}
        </li>
      </ul>

      {/* 수입 한 줄, 지출 한 줄. 지출은 생활비·고정비 두 토막으로 나뉜다. 색은 파랑 계열 하나만 쓴다. */}
      <div className="xd-bars" role="img" aria-label={`수입 ${won(cf.income)}, 지출 ${won(spend)}`}>
        <div className="xd-bar">
          <span className="k">수입</span>
          <span className="track">
            <i className="income" style={{ width: pctOf(cf.income) }} />
          </span>
          <span className="v">{wonShort(cf.income)}</span>
        </div>
        <div className="xd-bar">
          <span className="k">지출</span>
          <span className="track">
            <i className="living" style={{ width: pctOf(cf.living) }} />
            <i className="fixed" style={{ width: pctOf(cf.fixed) }} />
          </span>
          <span className="v">{wonShort(spend)}</span>
        </div>
        <div className="xd-legend">
          <span>
            <i className="living" /> 생활비 {wonShort(cf.living)}
          </span>
          <span>
            <i className="fixed" /> 고정비 {wonShort(cf.fixed)}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── 제6조 차트 ────────────────────────────────────────── */

/*
 * 선 하나, 면 하나, 격자 없음. 글자는 SVG 밖 HTML 에 두어 폭이 좁아져도(390px) 작아지지 않게 한다.
 * SVG 는 0~100 좌표계를 늘려 그리므로(preserveAspectRatio none) 선 굵기만 non-scaling 으로 고정한다.
 */
function RunwayChart({ s }: { s: ExpenseDesign["sustainability"] }) {
  const maxY = Math.max(...s.series.map((d) => d.balance));
  const maxX = s.series[s.series.length - 1].year || 1;
  const px = (year: number) => (year / maxX) * 100;
  const py = (bal: number) => (1 - bal / maxY) * 100;

  const line = s.series.map((d) => `${px(d.year)},${py(d.balance)}`).join(" ");
  const area = `0,100 ${line} ${px(maxX)},100`;

  // 주석은 한 점만. 소진 시점이 있으면 그것, 없으면 요양비 증액 시작, 그것도 없으면 마지막 잔액.
  const last = s.series[s.series.length - 1];
  const care =
    s.careStartYear !== undefined ? s.series.find((d) => d.year === s.careStartYear) : undefined;
  const mark =
    s.years !== null
      ? { year: s.years, balance: 0, text: `약 ${s.years}년 뒤 0원` }
      : care
        ? { year: care.year, balance: care.balance, text: `${care.year}년 뒤 요양비 증액` }
        : { year: last.year, balance: last.balance, text: `${last.year}년 뒤 ${wonShort(last.balance)}` };
  const anchorEnd = mark.year > maxX * 0.6;

  return (
    <figure
      className="xd-chart"
      role="img"
      aria-label={`자산 잔액 추이. ${s.years === null ? "30년 이상 유지" : `약 ${s.years}년 후 소진`} 추정.`}
    >
      <div className="xd-chart-top">
        {/* 시작 잔액. 주석이 왼쪽에 붙어 있으면 겹치므로 생략한다. */}
        {mark.year > maxX * 0.25 && <span className="start">{wonShort(s.assets)}</span>}
        <span
          className={`mark ${anchorEnd ? "end" : ""}`}
          style={{ left: `${px(mark.year)}%` }}
        >
          {mark.text}
        </span>
      </div>
      <div className="xd-chart-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="xd-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#xd-fill)" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--blue)"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <i className="pt" style={{ left: `${px(mark.year)}%`, top: `${py(mark.balance)}%` }} />
      </div>
      <figcaption className="xd-chart-axis">
        <span>지금</span>
        <span>{maxX}년 뒤</span>
      </figcaption>
    </figure>
  );
}

/* ── 제4조 규칙 목록 ───────────────────────────────────── */

function RuleRows({ rules }: { rules: FraudRule[] }) {
  return (
    <ul className="xd-list">
      {rules.map((r) => (
        <li className={`xd-row ${r.active ? "" : "off"}`} key={r.key}>
          <div className="xd-row-main">
            <div className="l">{r.condition}</div>
            <div className="s">
              {r.action} · {r.notify}에게 알림
            </div>
          </div>
          <span className={`xd-state ${r.active ? "on" : ""}`}>{r.active ? "켜짐" : "검토 가능"}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── 본문 ──────────────────────────────────────────────── */

const RAIL: { n: number; label: string }[] = [
  { n: 1, label: "계좌 구조" },
  { n: 2, label: "자동이체" },
  { n: 3, label: "한도" },
  { n: 4, label: "이상거래 규칙" },
  { n: 5, label: "승인·알림" },
  { n: 6, label: "지속가능성" },
  { n: 7, label: "투자 원칙" },
];

export default function ExpenseDoc({
  design,
  profile,
}: {
  design: ExpenseDesign;
  profile: Profile;
}) {
  const { cashflow: cf, approval, sustainability: s } = design;
  const payout = PAYOUT_LABEL[choiceOf(profile, "A03") ?? "monthly"] ?? "매달";

  const limitRules = design.fraudRules.filter((r) => !r.key.startsWith("ctx_"));
  const ctxRules = design.fraudRules.filter((r) => r.key.startsWith("ctx_"));
  const activeRules = design.fraudRules.filter((r) => r.active).length;
  const offRules = design.fraudRules.length - activeRules;

  const perTx = design.limits.find((l) => l.label === "1회 이체 한도");
  const hasPerTx = perTx !== undefined && perTx.value !== "미설정";
  const onFail = design.transfers[0]?.onFail;
  const hasRunway = s.series.length > 0 && s.assets > 0;

  // 다른 화면의 "지출설계서 제6조 보기 →" 가 #exp-6 으로 들어오면 그 카드로 내려간다.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("exp-")) return;
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  // 2026-09-07: 스크롤로 어느 카드에 와 있는지 목차에 표시한다 (hover 와 같은 강조).
  // 헤더 아래 96px 선을 기준으로, 그 선을 지난 카드 중 가장 아래 것이 "지금 보는 카드" 다.
  // 교차 관찰자는 가장자리에서 두 카드가 동시에 걸릴 때 튀어서, 스크롤마다 직접 계산한다.
  const [activeId, setActiveId] = useState<string>("exp-cashflow");
  useEffect(() => {
    const root = document.querySelector(".xd-col");
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("section[id^='exp-']"));
    if (cards.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = 96 + 24;
      let current = cards[0].id;
      for (const c of cards) {
        if (c.getBoundingClientRect().top <= line) current = c.id;
      }
      // 바닥까지 내려갔는데 마지막 카드가 기준선에 못 미치면 마지막 카드를 잡는다.
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) current = cards[cards.length - 1].id;
      setActiveId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [design]);

  const editTarget = entryQuestionForClause(profile, "expense", "제1조");
  const railLink = (id: string, no: string | null, label: string) => (
    <a key={id} href={`#${id}`} className={activeId === id ? "is-active" : undefined} aria-current={activeId === id ? "true" : undefined}>
      {no && <span className="no">{no}</span>}
      {label}
    </a>
  );

  return (
    <div className="xd">
      {/* 넓은 화면에서만 보이는 조항 이동 목록. 왼쪽에 고정되고, 데이터는 두지 않는다. */}
      <nav className="xd-rail" aria-label="조항 이동">
        {railLink("exp-cashflow", null, "월 현금흐름")}
        {RAIL.filter((r) => r.n !== 7 || design.invest).map((r) => railLink(`exp-${r.n}`, `제${r.n}조`, r.label))}
        {/* 2026-09-07: 카드마다 붙어 있던 "수정 →" 를 목차 아래 하나로 모았다. 조항별 진입은
            질문 은행의 역인덱스로 첫 조항의 질문으로 가고, 없으면 인터뷰 처음으로 간다. */}
        <Link
          className="xd-rail-edit"
          href={editTarget ? `/interview?q=${editTarget.id}` : "/interview"}
          title="인터뷰로 돌아가 답변을 고칩니다"
        >
          답변 수정 →
        </Link>
      </nav>

      <div className="xd-col">
        <CashflowHero cf={cf} payout={payout} />

        {design.flags.length > 0 && (
          <section className="xd-card" aria-label="검토가 필요한 지점">
            <div className="xd-no">검토가 필요한 지점</div>
            <div className="xd-flags">
              {design.flags.map((f, i) => (
                <FlagCard key={i} flag={f} />
              ))}
            </div>
          </section>
        )}

        {/* 제1조 */}
        <Clause
          n={1}
          title="돈을 세 층으로 나눕니다"
          lede="자동이체는 생활계좌에서만 나갑니다. 보전계좌에는 자동이체를 연결하지 않고, 꺼낼 때는 두 사람이 함께 승인합니다."
          profile={profile}
        >
          <div className="xd-tiers">
            {design.accounts.map((a) => {
              const Icon = a.n === 1 ? Wallet : a.n === 2 ? HeartPulse : Landmark;
              return (
                <div className={`xd-tier l${a.n}`} key={a.n}>
                  <div className="xd-tier-head">
                    <span className="ic" aria-hidden>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="nm">
                      {a.n}층 · {a.name}
                    </span>
                  </div>
                  <div className="xd-tier-amt">{a.amount ? won(a.amount) : "남은 전액"}</div>
                  <p className="xd-tier-p">{a.purpose}</p>
                  <ul className="xd-tier-meta">
                    <li>{a.balancePolicy}</li>
                    <li>{a.withdrawal}</li>
                  </ul>
                </div>
              );
            })}
          </div>
        </Clause>

        {/* 제2조 */}
        <Clause
          n={2}
          title={
            design.transfers.length
              ? `고정지출 ${design.transfers.length}건, 매달 ${won(design.transferTotal)}이 자동으로 나갑니다`
              : "등록된 고정지출이 없습니다"
          }
          lede={
            design.transfers.length ? (
              <>
                모두 1층 생활계좌에서 매월 빠져나갑니다. 잔액이 모자라면 <b>{onFail}</b>
                {design.transfers[0].notify !== "미지정" && (
                  <>
                    하고, {design.transfers[0].notify}에게 알립니다
                  </>
                )}
                .
              </>
            ) : (
              "이 목록이 비어 있으면 그 시점에 누군가 손으로 처리해야 합니다."
            )
          }
          profile={profile}
        >
          {design.transfers.length > 0 && (
            <ul className="xd-list">
              {design.transfers.map((t) => (
                <li className="xd-row" key={t.item}>
                  <div className="xd-row-main">
                    <div className="l">{t.item}</div>
                    <div className="s">
                      {t.cycle} · {t.from}
                    </div>
                  </div>
                  <span className="xd-val">{t.amount ? won(t.amount) : "미기재"}</span>
                </li>
              ))}
              <li className="xd-row total">
                <div className="xd-row-main">
                  <div className="l">합계</div>
                  {cf.living > 0 && (
                    <div className="s">
                      생활비 {won(cf.living)}의 {Math.round((design.transferTotal / cf.living) * 100)}%
                    </div>
                  )}
                </div>
                <span className="xd-val">{won(design.transferTotal)}</span>
              </li>
            </ul>
          )}
        </Clause>

        {/* 제3조 */}
        <Clause
          n={3}
          title={hasPerTx ? `한 번에 ${perTx!.value}까지만 보낼 수 있습니다` : "1회 이체 한도가 아직 없습니다"}
          lede={
            hasPerTx
              ? "한도를 넘는 이체는 바로 나가지 않고 보류한 뒤 확인합니다. 한도 하나가 피해 규모의 상한을 정합니다."
              : "한도가 없으면 한 번의 실수로 잔액 전부가 빠져나갈 수 있습니다. 이 항목 하나가 피해 규모의 상한을 정합니다."
          }
          profile={profile}
        >
          <ul className="xd-list">
            {design.limits.map((l) => (
              <li className="xd-row" key={l.label}>
                <div className="xd-row-main">
                  <div className="l">{l.label}</div>
                  <div className="s">{l.note}</div>
                </div>
                <span className={`xd-val ${l.value === "미설정" ? "muted" : ""}`}>{l.value}</span>
              </li>
            ))}
          </ul>
        </Clause>

        {/* 제4조 */}
        <Clause
          n={4}
          title={`규칙 ${activeRules}개가 거래를 지켜봅니다`}
          lede={
            <>
              금액·시간 같은 한도 기준 {limitRules.length}개
              {ctxRules.length > 0 && <>와 거래의 맥락을 보는 기준 {ctxRules.length}개</>}
              입니다. 걸리면 보류하거나 차단하고 {approval.first}에게 알립니다.
            </>
          }
          profile={profile}
        >
          <div className="xd-chips" aria-label="규칙 요약">
            <span className="xd-chip">
              한도 기준 <b>{limitRules.filter((r) => r.active).length}</b>
            </span>
            {ctxRules.length > 0 && (
              <span className="xd-chip">
                맥락 기준 <b>{ctxRules.filter((r) => r.active).length}</b>
              </span>
            )}
            {offRules > 0 && (
              <span className="xd-chip off">
                꺼진 규칙 <b>{offRules}</b>
              </span>
            )}
          </div>
          <details className="xd-more">
            <summary>규칙 {design.fraudRules.length}개 모두 보기</summary>
            <div className="xd-group">
              <div className="xd-group-t">한도 기준</div>
              <RuleRows rules={limitRules} />
            </div>
            {ctxRules.length > 0 && (
              <div className="xd-group">
                <div className="xd-group-t">맥락 기준</div>
                <RuleRows rules={ctxRules} />
              </div>
            )}
          </details>
        </Clause>

        {/* 제5조 */}
        <Clause
          n={5}
          title={
            approval.first !== "미지정"
              ? `이상이 생기면 ${approval.first}에게 먼저 알립니다`
              : "알림을 받을 사람이 아직 없습니다"
          }
          lede={`${approval.channel}로 알리고, ${approval.escalateHours}시간 안에 응답이 없으면 다음 사람에게 넘어갑니다.`}
          profile={profile}
        >
          <ol className="xd-steps">
            <li>
              <span className="dot">1</span>
              <div>
                <div className="l">1차 · {approval.first}</div>
                <div className="s">{approval.channel}로 즉시 알림</div>
              </div>
            </li>
            <li className="gap">
              <span className="dot line" aria-hidden />
              <div className="s">{approval.escalateHours}시간 무응답이면</div>
            </li>
            <li>
              <span className="dot">2</span>
              <div>
                <div className="l">2차 · {approval.second}</div>
                <div className="s">{approval.fallback}</div>
              </div>
            </li>
          </ol>
        </Clause>

        {/* 제6조 */}
        <Clause
          n={6}
          title={
            !hasRunway
              ? "자산과 월 지출이 입력되면 소진 시점을 추정합니다"
              : s.years === null
                ? "지금 설계대로면 30년 뒤에도 자산이 남습니다"
                : `지금 설계대로면 약 ${s.years}년 뒤 소진됩니다`
          }
          lede={
            hasRunway ? (
              <>
                보유 자산 {won(s.assets)}에서 매달 {won(s.monthlyNet)}씩 꺼내 쓸 때의 단순 계산입니다.{" "}
                <b>수익률·물가·세금은 반영하지 않았습니다.</b>
              </>
            ) : (
              "자산 규모와 월 지출이 모두 있어야 계산할 수 있습니다."
            )
          }
          profile={profile}
        >
          {hasRunway && <RunwayChart s={s} />}
        </Clause>

        {/* 제7조 는 투자 챕터를 선언했을 때만 선다. 건너뛰면 조항을 비워 두지 않고 생략한다. */}
        {design.invest && (
          <Clause
            n={7}
            title={
              design.invest.status === "set"
                ? "시장이 흔들려도 미리 정한 대로 움직입니다"
                : "투자 원칙이 아직 다 정해지지 않았습니다"
            }
            lede="특정 상품이나 금융회사를 정하는 조항이 아닙니다. 상황이 바뀌었을 때 검토 후보를 만드는 기준입니다."
            profile={profile}
          >
            <ul className="xd-list">
              <li className="xd-row">
                <div className="xd-row-main">
                  <div className="l">손대지 않을 자산군</div>
                </div>
                <span
                  className={`xd-val ${!design.invest.forbiddenLabels.length && !profile.answers["I01"] ? "muted" : ""}`}
                >
                  {design.invest.forbiddenLabels.length
                    ? design.invest.forbiddenLabels.join(", ")
                    : profile.answers["I01"]
                      ? "없음 (모두 그대로 둔다)"
                      : "아직 정하지 않음"}
                </span>
              </li>
              <li className="xd-row">
                <div className="xd-row-main">
                  <div className="l">위험자산 상한</div>
                </div>
                <span className={`xd-val ${design.invest.riskCapPct === undefined ? "muted" : ""}`}>
                  {design.invest.riskCapPct !== undefined
                    ? `전체 자산의 ${design.invest.riskCapPct}%`
                    : "아직 정하지 않음"}
                </span>
              </li>
              <li className="xd-row">
                <div className="xd-row-main">
                  <div className="l">시장이 25% 이상 급락하면</div>
                </div>
                <span className={`xd-val ${design.invest.crashPolicy ? "" : "muted"}`}>
                  {design.invest.crashPolicy ?? "아직 정하지 않음"}
                </span>
              </li>
              <li className="xd-row">
                <div className="xd-row-main">
                  <div className="l">판단이 어려워지면 운용은</div>
                </div>
                <span className={`xd-val ${design.invest.handover ? "" : "muted"}`}>
                  {design.invest.handover ?? "아직 정하지 않음"}
                </span>
              </li>
              {design.invest.stance && (
                <li className="xd-row">
                  <div className="xd-row-main">
                    <div className="l">운용지침</div>
                  </div>
                  <span className="xd-val">{design.invest.stance}</span>
                </li>
              )}
            </ul>
          </Clause>
        )}

        <Disclaimer>
          위 계좌 구조와 규칙은 설계 초안입니다. 실제 적용 가능한 한도·차단·알림 서비스의 명칭과
          범위는 거래 금융기관마다 다르므로 개별 확인이 필요합니다.
        </Disclaimer>
      </div>

    </div>
  );
}
