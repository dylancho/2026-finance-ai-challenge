"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { findQuestion } from "../../lib/questions";

/*
 * 설계서 공통 부품 (2026-09-07).
 *
 * 지출설계서(ExpenseDoc)가 먼저 쓴 카드 언어를 신탁·후견·비교 화면이 함께 쓰려고 뽑아냈다.
 * 규칙은 같다 — 카드 한 장에 원칙 하나, 작은 라벨(제N조) → 쉬운 말 제목 → 한 문장 → 세부 목록.
 *
 * 아직 정하지 않은 것은 같은 말로 세 곳에 나타난다.
 *   1. 왼쪽 목차의 점
 *   2. 카드 라벨 옆 꼬리표
 *   3. 카드 안의 안내 블록 — 무엇이 비었는지, 어느 질문에서 채우는지
 * 문서 본문(조항)은 합니다체를 유지하고, 그 문서를 감싸는 안내 문장은 해요체다.
 */

export type CardTone = "missing" | "partial";

const TONE_LABEL: Record<CardTone, string> = {
  missing: "아직 안 정했어요",
  partial: "더 채울 수 있어요",
};

/**
 * 스크롤 위치로 지금 보고 있는 카드를 잡는다. 기준선과 계산 방식은 지출설계서와 같다 —
 * 교차 관찰자는 카드 두 장이 가장자리에 동시에 걸릴 때 튀어서 스크롤마다 직접 계산한다.
 */
export function useActiveCard(prefix: string, dep: unknown): string {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const root = document.querySelector(".xd-col");
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>(`section[id^='${prefix}']`));
    if (cards.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = 96 + 24;
      let current = cards[0].id;
      for (const c of cards) {
        if (c.getBoundingClientRect().top <= line) current = c.id;
      }
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2)
        current = cards[cards.length - 1].id;
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
  }, [prefix, dep]);

  return activeId;
}

export interface RailItem {
  id: string;
  /** 조항 번호처럼 앞에 붙는 작은 라벨 */
  no?: string;
  label: string;
  tone?: CardTone;
}

/** 왼쪽에 고정되는 이동 목록. 데이터는 두지 않고, 비어 있는 카드에만 점을 찍는다. */
export function DocRail({
  items,
  activeId,
  editHref,
  editLabel = "답 수정 →",
  editTitle = "인터뷰로 돌아가 답을 고쳐요",
}: {
  items: RailItem[];
  activeId: string;
  editHref: string;
  editLabel?: string;
  editTitle?: string;
}) {
  return (
    <nav className="xd-rail" aria-label="문서 안 이동">
      {items.map((it) => (
        <a
          key={it.id}
          href={`#${it.id}`}
          className={activeId === it.id ? "is-active" : undefined}
          aria-current={activeId === it.id ? "true" : undefined}
        >
          {it.no && <span className="no">{it.no}</span>}
          <span className="t">{it.label}</span>
          {it.tone && (
            <i className={`dot ${it.tone}`} aria-label={TONE_LABEL[it.tone]} role="img" />
          )}
        </a>
      ))}
      <Link className="xd-rail-edit" href={editHref} title={editTitle}>
        {editLabel}
      </Link>
    </nav>
  );
}

/** 카드 한 장. 라벨 → 제목 → 한 문장 → 세부 순서를 강제한다. */
export function DocCard({
  id,
  label,
  title,
  lede,
  tone,
  tag,
  hero,
  children,
}: {
  id: string;
  label: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: CardTone;
  /** 라벨 오른쪽 꼬리표를 직접 정할 때. 없으면 tone 에 맞는 꼬리표가 붙는다. */
  tag?: { cls: string; label: string };
  /** 문서의 첫 카드. 제목을 크게 쓴다. */
  hero?: boolean;
  children?: React.ReactNode;
}) {
  const chip = tag ?? (tone ? { cls: tone, label: TONE_LABEL[tone] } : undefined);
  return (
    <section
      className={`xd-card${hero ? " xd-hero" : ""}${tone ? ` is-${tone}` : ""}`}
      id={id}
      aria-labelledby={`${id}-t`}
    >
      <header className="xd-head">
        <div className="xd-no">
          <span>{label}</span>
          {chip && <span className={`xd-tag ${chip.cls}`}>{chip.label}</span>}
        </div>
        {hero ? (
          <h2 id={`${id}-t`}>{title}</h2>
        ) : (
          <h3 id={`${id}-t`}>{title}</h3>
        )}
        {lede && <p className="xd-lede">{lede}</p>}
      </header>
      {children}
    </section>
  );
}

/**
 * 비어 있는 항목 안내. 무엇이 비었는지 한 문장, 그리고 그것을 채우는 질문을 그대로 보여준다.
 * 질문 은행에 없는 항목이면 인터뷰 처음으로 보낸다 — 눌러도 갈 곳이 없는 링크는 만들지 않는다.
 */
export function Todo({
  what,
  qid,
  cta = "채우러 가기 →",
}: {
  what: React.ReactNode;
  qid?: string;
  cta?: string;
}) {
  const q = qid ? findQuestion(qid) : undefined;
  return (
    <div className="xd-todo">
      <p className="w">{what}</p>
      <Link className="go" href={q ? `/interview?q=${q.id}` : "/interview"}>
        <span className="q">{q ? q.prompt : "인터뷰에서 이어서 답하기"}</span>
        <span className="c">{cta}</span>
      </Link>
    </div>
  );
}

export interface TodoItem {
  /** 같은 문서 안 카드면 "#trust-4", 질문으로 바로 가면 "/interview?q=B13" */
  href: string;
  label: string;
  what: string;
  cta?: string;
}

/** 문서 맨 위에서 비어 있는 곳을 모아 보여주는 목록. 눌러 그 자리로 간다. */
export function TodoRows({ items }: { items: TodoItem[] }) {
  return (
    <ul className="xd-list">
      {items.map((it) => (
        <li key={it.href}>
          <Link className="xd-row xd-jump" href={it.href}>
            <div className="xd-row-main">
              <div className="l">{it.label}</div>
              <div className="s">{it.what}</div>
            </div>
            <span className="xd-go">{it.cta ?? "보러 가기 →"}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** 조항 본문. 여기만 합니다체다 — 계약서에 그대로 실릴 문장이라 바꾸지 않는다. */
export function DocBody({ lines }: { lines: string[] }) {
  return (
    <ul className="xd-body">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}
