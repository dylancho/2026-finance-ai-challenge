"use client";

import Link from "next/link";
import { useScrollProgress } from "./useScrollProgress";

/**
 * 금융 보호 섹션. 랜딩에서 유일하게 스크롤 진행에 묶인 장면이다.
 *
 * 섹션 자체는 뷰포트 두 배 높이고, 안쪽 화면은 sticky 로 고정된다. 사용자가 내리는 만큼
 * 신호가 하나씩 켜지고 위험도가 0에서 99까지 오르다가, 끝에 차단 판정이 뜬다.
 * 숫자와 신호는 실제 /api/fds 데모 시나리오(TX_99218)와 같다.
 */

const SIGNALS = [
  { at: 0.12, label: "거래 금액", observed: "8,000,000원", note: "평소 상위 5% 기준의 17배", score: 30 },
  { at: 0.28, label: "거래 대상", observed: "신규 개인 계좌", note: "최근 10년 송금 이력 없음", score: 19 },
  { at: 0.42, label: "사용 시간", observed: "02:15 AM", note: "평소 09:00–20:00", score: 14 },
  { at: 0.54, label: "인증 행동", observed: "비밀번호 오입력 2회", note: "평균 0회", score: 13 },
  { at: 0.66, label: "행동 패턴", observed: "터치 이탈 89%", note: "평균 12%", score: 17 },
  { at: 0.76, label: "접속 환경", observed: "신규 기기", note: "최근 사용 기기 아님", score: 7 },
];

export default function FraudSection() {
  const { ref, progress } = useScrollProgress<HTMLElement>();
  const lit = SIGNALS.filter((s) => progress >= s.at);
  const risk = Math.min(99, lit.reduce((sum, s) => sum + s.score, 0));
  const verdict = progress >= 0.88;

  return (
    <section ref={ref} className="ld-fraud" id="fraud" aria-label="금융 보호">
      <div className="ld-fraud-sticky">
        <div className="shell-wide ld-fraud-inner">
          <div className="ld-copy">
            <div className="ld-step mono">05</div>
            <div className="eyebrow">Smart Fraud Shield</div>
            <h2>
              한도만 보지 않고,
              <br />
              평소와 다른 맥락을 봅니다.
            </h2>
            <p>
              새벽 2시, 처음 보는 계좌, 비밀번호 오류, 낯선 터치 리듬. 하나씩은 별일 아니어도
              겹치면 다른 얘기입니다. NEXT는 인터뷰에서 정한 원칙대로 거래를 멈추고 보호자에게
              묻습니다.
            </p>
            <div className="ld-action">
              <Link href="/fraud-shield" className="btn outline">
                보호 화면 보기
              </Link>
            </div>
            <p className="ld-scroll-hint" aria-hidden style={{ opacity: verdict ? 0 : 1 }}>
              ↓ 내리면서 신호가 쌓이는 걸 보세요
            </p>
          </div>

          <div className="ld-fraud-card" aria-live="polite">
            <div className="ld-fraud-top">
              <span className="mono">LIVE PROTECTION</span>
              <span className={`ld-risk${risk >= 65 ? " hi" : risk >= 35 ? " mid" : ""}`}>
                위험도 <b>{risk}</b>
                <small>/ 100</small>
              </span>
            </div>
            <div className="ld-fraud-tx mono">TX_99218 · 356-0012-9981 · 02:15 AM</div>
            <ul className="ld-signals">
              {SIGNALS.map((s) => {
                const on = progress >= s.at;
                return (
                  <li key={s.label} className={on ? "on" : ""}>
                    <span className="lab">{s.label}</span>
                    <span className="obs">{on ? s.observed : "—"}</span>
                    <span className="note">{on ? s.note : ""}</span>
                    <span className="sc mono">{on ? `+${s.score}` : ""}</span>
                  </li>
                );
              })}
            </ul>
            <div className={`ld-verdict${verdict ? " show" : ""}`}>
              <span className="tag">이체 일시 차단</span>
              <b>보호자 승인 대기</b>
              <small>김하나님에게 판정 근거와 함께 승인 요청을 보냈습니다.</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
