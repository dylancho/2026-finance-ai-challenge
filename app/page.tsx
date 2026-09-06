'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Badge from '../components/common/Badge';
import MonthlyRuleReview from '../components/fraud/MonthlyRuleReview';
import { TRACK_META } from '../lib/questions';
import type { Track } from '../lib/types';

const TRACK_ORDER: Track[] = ['daily', 'future', 'caregiver', 'estate'];

export default function Home() {
  const [monthlyReviewOpen, setMonthlyReviewOpen] = useState(true);

  return (
    <>
      <Header />
      <main className="shell-wide landing-v2">
        <section className="hero landing-hero">
          <div>
            <div className="eyebrow">NEXT SAFE · YOUR FINANCIAL SAFETY NET</div>
            <h1>
              평소의 나를 배워,
              <br />
              <em className="landing-accent">위험한 순간</em>을 막습니다.
            </h1>
            <p className="hero-sub">
              NEXT는 거래 한도가 아니라 나의 금융 맥락을 봅니다. 평소와 다른 거래가 겹치는 순간,
              AI가 먼저 멈추고 보호자에게 확인을 요청합니다.
            </p>

            <div className="hero-actions">
              <Link href="/fraud-shield" className="btn landing-primary">내 금융 보호하기</Link>

              <button type="button" className="landing-text-link" onClick={() => setMonthlyReviewOpen(true)}>AI 월간 시나리오 점검 →</button>
            </div>

            <p className="hero-note">현재는 레벨 1로 준비하고, 치매 진단 또는 장기요양 등급이 확인되면 레벨 2 보호가 작동합니다.</p>
          </div>

          <aside className="hero-panel" aria-label="설계서 미리보기">
            <div className="label">NEXT SAFE · LIVE PROTECTION</div>
            <h3>
              나의 평소와 다른 순간을
              <br />
              먼저 알아차립니다.
            </h3>
            <div className="hero-clause">
              <span>제4조</span>
              <em>
                새벽 2:15 · 신규 수취계좌 · 비밀번호 2회 오류
              </em>
            </div>
            <div className="hero-clause">
              <span>제5조</span>
              <em>
                행동 패턴 89% 이탈 · 위험도 99%
              </em>
            </div>
            <div className="hero-clause">
              <span>제8조</span>
              <em>
                거래를 일시 정지하고 보호자에게 알립니다.
              </em>
            </div>
            <div className="hero-clause">
              <span>제9조</span>
              <em>보호자 확인 전까지 출금과 이체를 제한합니다.</em>
            </div>
          </aside>
        </section>

        <section className="fds-overview" aria-labelledby="fds-overview-title">
          <div className="fds-overview-copy">
            <div className="eyebrow">SMART FRAUD SHIELD</div>
            <h2 id="fds-overview-title">한도 초과만 보지 않고,<br />평소와 다른 맥락을 봅니다.</h2>
            <p>
              신규 수취계좌, 접속 시간, 비밀번호 입력 행동, 터치 패턴을 함께 분석합니다.
              의심 거래는 먼저 멈추고, 보호자가 확인한 뒤에만 다시 진행됩니다.
            </p>
            <Link href="/fraud-shield" className="btn fds-btn">내 금융 보호 현황 보기</Link>
          </div>
          <div className="fds-overview-card">
            <div className="fds-live"><i /><span>LIVE PROTECTION</span><b>위험도 99%</b></div>
            <div className="fds-scenario"><span>감지된 상황</span><p>새벽 2:15 · 신규 개인 계좌 · 비밀번호 2회 오류 · 행동 패턴 89% 이탈</p></div>
            <ol className="fds-timeline">
              <li><span>01</span><div><b>거래 탐지</b><p>평소 거래 이력이 없는 신규 수취계좌 이체를 감지합니다.</p></div></li>
              <li><span>02</span><div><b>AI Context 분석</b><p>금액·시간·인증·사용자 행동 패턴을 함께 대조합니다.</p></div></li>
              <li><span>03</span><div><b>1차 거래 동결</b><p>복수 고위험 신호가 겹치면 이체를 즉시 일시 정지합니다.</p></div></li>
              <li><span>04</span><div><b>보호자에게 비상 승인 요청</b><p>등록된 보호자에게 거래 맥락과 승인 요청을 보냅니다.</p></div></li>
              <li><span>05</span><div><b>확인 전까지 출금 제한</b><p>보호자 확인 전에는 출금과 이체가 재개되지 않습니다.</p></div></li>
            </ol>
          </div>
        </section>

        <section className="section" id="why">
          <div className="eyebrow">Why NEXT</div>
          <h2>
            문제는 제도가 없다는 것이 아니라,
            <br />
            내 상황에 무엇이 맞는지 모른다는 것입니다.
          </h2>
          <p className="section-lede">
            신탁도 후견도 이미 존재합니다. 하지만 어떤 제도가 지금 가능한지, 무엇을 정해두어야
            하는지는 전문가를 만나기 전까지 알기 어렵습니다.
          </p>

          <div className="grid-3">
            <article className="plain-card">
              <div className="num">01</div>
              <h3>결정의 공백</h3>
              <p>
                판단이 어려워지는 순간 금융 원칙도 함께 멈춥니다. 남은 가족은 매달 무엇을 얼마나
                지급할지 처음부터 협의해야 합니다.
              </p>
            </article>
            <article className="plain-card">
              <div className="num">02</div>
              <h3>때를 놓친 제도</h3>
              <p>
                임의후견과 신탁은 의사능력이 있을 때만 새로 설정할 수 있습니다. 진단을 받은 뒤에는
                선택지가 법정후견으로 좁아집니다.
              </p>
            </article>
            <article className="plain-card">
              <div className="num">03</div>
              <h3>기록되지 않은 원칙</h3>
              <p>
                &ldquo;주식은 급하게 팔지 말라&rdquo;는 말은 기억으로 남을 뿐, 금융기관이 집행할 수
                있는 조항이 되지는 않습니다.
              </p>
            </article>
          </div>
        </section>

        <section className="section" id="how">
          <div className="eyebrow">How it works</div>
          <h2>목적을 먼저 묻고, 그다음에 질문합니다.</h2>
          <p className="section-lede">
            게이트 3문항으로 갈래를 나눕니다. 무엇을 준비하려는지, 누구를 위한 것인지, 그리고 지금
            스스로 결정할 수 있는 상태인지. 세 번째 질문이 어떤 제도가 가능한지를 결정합니다.
          </p>

          <div className="track-row">
            {TRACK_ORDER.map((t, i) => {
              const m = TRACK_META[t];
              return (
                <div className="track-chip" key={t}>
                  <div className="k">TRACK {String.fromCharCode(65 + i)}</div>
                  <h4>{m.name}</h4>
                  <p>{m.caption}</p>
                  <div className="docs">
                    {m.docs.map((d) => (
                      <Badge key={d} tone="info">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid-2">
            <article className="plain-card">
              <div className="num">답변 → 조항</div>
              <h3>모든 질문은 조항 하나에 대응합니다</h3>
              <p>
                &ldquo;어떤 일이 벌어졌을 때 이 계획이 작동해야 할까요?&rdquo;에 대한 답은 신탁설계서
                제4조 지급개시 트리거가 됩니다. 인터뷰 중에 조항이 쌓이는 것을 보실 수 있습니다.
              </p>
            </article>
            <article className="plain-card">
              <div className="num">공백 → 미래</div>
              <h3>비어 있는 조항이 어디서 터지는지 보여줍니다</h3>
              <p>
                시뮬레이터는 시나리오를 따라가며 실제 조항을 인용합니다. 답하지 않은 항목에
                도달하면 흐름이 그 자리에서 멈추고, 그 지점으로 되돌아갈 수 있습니다.
              </p>
            </article>
          </div>
        </section>

        <section className="cta-band">
          <div>
            <h2>미래를 예측하는 대신, 미래의 결정을 준비하세요.</h2>
            <p>
              짧으면 2분, 길어도 10분입니다. 목적에 따라 질문의 수가 달라집니다.
            </p>
          </div>
          <Link href="/start" className="btn">
            시작하기
          </Link>
        </section>
      </main>

      {monthlyReviewOpen && <div className="monthly-popup-backdrop" role="dialog" aria-modal="true" aria-label="AI 월간 시나리오 점검"><section className="monthly-popup"><button type="button" className="monthly-popup-close" onClick={() => setMonthlyReviewOpen(false)} aria-label="닫기">×</button><MonthlyRuleReview name="나" onComplete={() => setMonthlyReviewOpen(false)} /></section></div>}

      <Footer />
    </>
  );
}
