"use client";

import { useEffect, useState } from "react";
import type { AnswerValue, Question } from "../../lib/types";
import { won, wonShort } from "../../lib/format";

const RELATIONS = ["배우자", "자녀", "부모", "형제자매", "전문가", "금융기관"];

export default function QuestionInput({
  question,
  initial,
  onSubmit,
}: {
  question: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  switch (question.type) {
    case "choice":
      return <ChoiceInput q={question} initial={initial} onSubmit={onSubmit} />;
    case "multi":
      return <MultiInput q={question} initial={initial} onSubmit={onSubmit} />;
    case "amount":
      return <AmountInput q={question} initial={initial} onSubmit={onSubmit} />;
    case "person":
      return <PersonInput q={question} initial={initial} onSubmit={onSubmit} />;
    case "allocation":
      return <AllocationInput q={question} initial={initial} onSubmit={onSubmit} />;
    case "open":
      return <OpenInput q={question} initial={initial} onSubmit={onSubmit} />;
  }
}

/* ── choice ──────────────────────────────────────── */

function ChoiceInput({
  q,
  initial,
  onSubmit,
}: {
  q: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  const current = initial?.kind === "choice" ? initial.value : undefined;
  const [warn, setWarn] = useState<string | null>(null);

  return (
    <>
      <div className="opts">
        {q.options?.map((o) => (
          <button
            key={o.value}
            className="opt"
            aria-pressed={current === o.value}
            onClick={() => {
              if (o.warn) setWarn(o.warn);
              onSubmit({ kind: "choice", value: o.value });
            }}
          >
            {o.label}
            {o.hint && <span className="hint">{o.hint}</span>}
          </button>
        ))}
      </div>
      {warn && (
        <div className="gate-warn" style={{ marginTop: 0, marginBottom: 14 }}>
          <p>{warn}</p>
        </div>
      )}
    </>
  );
}

/* ── multi (+ 금액) ──────────────────────────────── */

function MultiInput({
  q,
  initial,
  onSubmit,
}: {
  q: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  // defaults 는 화면의 초기 선택일 뿐이다. 제출하기 전에는 답으로 저장되지 않는다.
  // 이력 대조에서 "이력대로"를 고르면 initial 이 생기므로 그쪽이 defaults 를 덮는다.
  const [values, setValues] = useState<string[]>(
    initial?.kind === "multi" ? initial.values : (q.defaults ?? []),
  );
  const [amounts, setAmounts] = useState<Record<string, number>>(
    initial?.kind === "multi" ? (initial.amounts ?? {}) : {},
  );

  useEffect(() => {
    setValues(initial?.kind === "multi" ? initial.values : (q.defaults ?? []));
    setAmounts(initial?.kind === "multi" ? (initial.amounts ?? {}) : {});
  }, [q.id, q.defaults, initial]);

  function toggle(v: string) {
    setValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  }

  const unitLabel = q.id === "D01" ? "명" : "원";

  return (
    <>
      <div className="opts">
        {q.options?.map((o) => (
          <button
            key={o.value}
            className="opt"
            aria-pressed={values.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
            {o.hint && <span className="hint">{o.hint}</span>}
          </button>
        ))}
      </div>

      {q.withAmount && values.length > 0 && (
        <div className="multi-amounts">
          {values.map((v) => {
            const label = q.options?.find((o) => o.value === v)?.label ?? v;
            return (
              <div className="multi-amount-row" key={v}>
                <label htmlFor={`amt-${q.id}-${v}`}>
                  {label}
                  {unitLabel === "원" && amounts[v] ? (
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                      {won(amounts[v])}
                    </span>
                  ) : null}
                </label>
                <input
                  id={`amt-${q.id}-${v}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={unitLabel === "명" ? "인원" : "금액 (원)"}
                  value={amounts[v] ?? ""}
                  onChange={(e) =>
                    setAmounts((prev) => ({
                      ...prev,
                      [v]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <button
        className="btn"
        disabled={!values.length}
        onClick={() => onSubmit({ kind: "multi", values, amounts })}
      >
        {values.length ? `${values.length}개 선택 완료` : "항목을 골라 주세요"}
      </button>
    </>
  );
}

/* ── amount ──────────────────────────────────────── */

function AmountInput({
  q,
  initial,
  onSubmit,
}: {
  q: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  const min = q.min ?? 0;
  const max = q.max ?? 10_000_000;
  const step = q.step ?? 100_000;
  const isCount = q.unit === "명";

  const [value, setValue] = useState<number>(
    initial?.kind === "amount"
      ? initial.value
      : (q.presets?.[1] ?? Math.round((min + max) / 4 / step) * step),
  );

  useEffect(() => {
    setValue(
      initial?.kind === "amount"
        ? initial.value
        : (q.presets?.[1] ?? Math.round((min + max) / 4 / step) * step),
    );
  }, [q.id, initial, min, max, step, q.presets]);

  return (
    <>
      <div className="amount-row">
        <div className="amount-val">{isCount ? `${value}명` : won(value)}</div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={q.prompt}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
      {q.presets && (
        <div className="amount-presets">
          {q.presets.map((p) => (
            <button
              key={p}
              className="chip-btn"
              aria-pressed={value === p}
              onClick={() => setValue(p)}
            >
              {isCount ? `${p}명` : wonShort(p)}
            </button>
          ))}
        </div>
      )}
      <button className="btn" onClick={() => onSubmit({ kind: "amount", value })}>
        {isCount ? `${value}명으로 확정` : `${won(value)}으로 확정`}
      </button>
    </>
  );
}

/* ── person ──────────────────────────────────────── */

function PersonInput({
  q,
  initial,
  onSubmit,
}: {
  q: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  const first = initial?.kind === "person" ? initial.people[0] : undefined;
  const [relation, setRelation] = useState(first?.relation ?? "");
  const [name, setName] = useState(first?.name ?? "");

  useEffect(() => {
    const p = initial?.kind === "person" ? initial.people[0] : undefined;
    setRelation(p?.relation ?? "");
    setName(p?.name ?? "");
  }, [q.id, initial]);

  return (
    <>
      <div className="opts">
        {RELATIONS.map((r) => (
          <button
            key={r}
            className="opt"
            aria-pressed={relation === r}
            onClick={() => setRelation(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="multi-amount-row" style={{ marginBottom: 12 }}>
        <label htmlFor={`nm-${q.id}`}>이름 (선택 — 설계서에 표기됩니다)</label>
        <input
          id={`nm-${q.id}`}
          className="text-input"
          value={name}
          placeholder="예: 이수정"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <button
        className="btn"
        disabled={!relation}
        onClick={() =>
          onSubmit({
            kind: "person",
            people: [{ relation, name: name.trim() || undefined }],
          })
        }
      >
        확정
      </button>
    </>
  );
}

/* ── allocation ──────────────────────────────────── */

function AllocationInput({
  q,
  initial,
  onSubmit,
}: {
  q: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  const [rows, setRows] = useState<{ asset: string; to: string }[]>(
    initial?.kind === "allocation" && initial.rows.length
      ? initial.rows
      : [{ asset: "", to: "" }],
  );

  useEffect(() => {
    setRows(
      initial?.kind === "allocation" && initial.rows.length
        ? initial.rows
        : [{ asset: "", to: "" }],
    );
  }, [q.id, initial]);

  function update(i: number, key: "asset" | "to", v: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  }

  const valid = rows.filter((r) => r.asset.trim() && r.to.trim());

  return (
    <>
      {rows.map((r, i) => (
        <div className="alloc-row" key={i}>
          <input
            className="text-input"
            placeholder="자산 (예: 본가 주택)"
            value={r.asset}
            aria-label={`자산 ${i + 1}`}
            onChange={(e) => update(i, "asset", e.target.value)}
          />
          <div className="arrow">→</div>
          <input
            className="text-input"
            placeholder="받을 사람 (예: 배우자)"
            value={r.to}
            aria-label={`수증자 ${i + 1}`}
            onChange={(e) => update(i, "to", e.target.value)}
          />
          <button
            className="btn ghost sm"
            aria-label="행 삭제"
            onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
          >
            ✕
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          className="btn outline sm"
          onClick={() => setRows((p) => [...p, { asset: "", to: "" }])}
        >
          + 항목 추가
        </button>
        <button
          className="btn sm"
          disabled={!valid.length}
          onClick={() => onSubmit({ kind: "allocation", rows: valid })}
        >
          {valid.length}건 확정
        </button>
      </div>
    </>
  );
}

/* ── open ────────────────────────────────────────── */

function OpenInput({
  q,
  initial,
  onSubmit,
}: {
  q: Question;
  initial?: AnswerValue;
  onSubmit: (v: AnswerValue) => void;
}) {
  const [text, setText] = useState(initial?.kind === "open" ? initial.text : "");

  useEffect(() => {
    setText(initial?.kind === "open" ? initial.text : "");
  }, [q.id, initial]);

  return (
    <div className="free-row">
      <textarea
        rows={3}
        value={text}
        placeholder={q.placeholder ?? "자유롭게 적어 주세요."}
        aria-label={q.prompt}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="btn"
        disabled={!text.trim() && !q.optional}
        onClick={() => onSubmit({ kind: "open", text: text.trim() })}
      >
        {text.trim() ? "기록" : "건너뛰기"}
      </button>
    </div>
  );
}
