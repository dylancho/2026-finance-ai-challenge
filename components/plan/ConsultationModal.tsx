"use client";

import { useState } from "react";
import type { DesignSet } from "../../lib/types";

const AREAS = [
  { key: "trust", label: "신탁" },
  { key: "guardianship", label: "후견" },
  { key: "expense", label: "생활비·지출 관리" },
  { key: "tax", label: "세무·상속" },
  { key: "all", label: "종합 상담" },
];

export default function ConsultationModal({
  design,
  summary,
  onClose,
}: {
  design: DesignSet;
  summary: string[];
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [time, setTime] = useState("평일 오전");
  const [areas, setAreas] = useState<string[]>(() => {
    const pre: string[] = [];
    if (design.trust?.available) pre.push("trust");
    if (design.guardianship && design.guardianship.verdict.code !== "none")
      pre.push("guardianship");
    pre.push("expense");
    return pre;
  });

  return (
    <div className="backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <>
            <h3>상담 준비가 정리되었습니다</h3>
            <p className="lede">
              아래 요약을 출력하거나 캡처해 금융기관·전문가와의 상담에 가져가시면, 처음부터 상황을
              설명하지 않아도 됩니다.
            </p>
            <div className="attach">
              <b>전달 요약</b>
              {summary.map((s, i) => (
                <div key={i}>· {s}</div>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.8 }}>
              이 화면은 데모입니다. 입력하신 내용은 어디로도 전송되지 않았고, 저장되지도
              않았습니다.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>이제 실제 준비를 시작해볼까요?</h3>
            <p className="lede">
              AI가 정리한 설계서를 바탕으로 금융기관 및 전문가와 상담할 수 있습니다. 아래 정보는
              어디에도 전송되지 않습니다.
            </p>

            <div className="field">
              <label htmlFor="cm-name">이름</label>
              <input
                id="cm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김민수"
              />
            </div>

            <div className="field">
              <label htmlFor="cm-time">연락 가능한 시간</label>
              <select id="cm-time" value={time} onChange={(e) => setTime(e.target.value)}>
                <option>평일 오전</option>
                <option>평일 오후</option>
                <option>평일 저녁</option>
                <option>주말</option>
              </select>
            </div>

            <div className="field">
              <label>관심 분야 (설계서 기준 자동 선택)</label>
              <div className="relation-row" style={{ marginTop: 4 }}>
                {AREAS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className="chip-btn"
                    aria-pressed={areas.includes(a.key)}
                    onClick={() =>
                      setAreas((prev) =>
                        prev.includes(a.key)
                          ? prev.filter((x) => x !== a.key)
                          : [...prev, a.key],
                      )
                    }
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="attach">
              <b>함께 전달될 설계 요약</b>
              {summary.map((s, i) => (
                <div key={i}>· {s}</div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn ghost" onClick={onClose}>
                취소
              </button>
              <button className="btn" disabled={!name.trim()} onClick={() => setSent(true)}>
                상담 준비 완료
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
