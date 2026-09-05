import Link from "next/link";
import { Wallet, TrendingUp, ScrollText, ShieldCheck } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import StartLink from "../components/landing/StartLink";
import Reveal from "../components/landing/Reveal";
import FeatureSection from "../components/landing/FeatureSection";
import FraudSection from "../components/landing/FraudSection";
import { ChatMock, LedgerMock, PlanMock, SimulationMock } from "../components/landing/mocks";

/**
 * 랜딩 (온보딩).
 *
 * 세로로 긴 한 페이지. 내릴수록 기능이 하나씩 나타난다. 첫 화면은 문장 하나와 시작 버튼,
 * 그 아래 기능 섹션 다섯 개, 마지막에 시작 CTA. 목업은 이미지가 아니라 실제 화면과 같은
 * 마크업이라 기능이 바뀌면 여기도 같이 바뀐다. 없는 기능은 적지 않는다.
 */

// 네 버튼 모두 같은 게이트 → 이력 → 코어 인터뷰로 들어간다. 누른 카테고리는
// focus 로 전달되어, 코어를 마친 뒤 챕터 제안 화면에서 그 챕터가 맨 위에 선택돼 있다.
const CATEGORIES: { label: string; icon: typeof Wallet; focus: string }[] = [
  { label: "일상 관리", icon: Wallet, focus: "core" },
  { label: "자산·투자 관리", icon: TrendingUp, focus: "invest" },
  { label: "상속 준비", icon: ScrollText, focus: "estate" },
  { label: "금융 보호", icon: ShieldCheck, focus: "safe" },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="ld">
        {/* 01 히어로 */}
        <section className="ld-hero" aria-label="소개">
          <div className="ld-hero-bg" aria-hidden />
          <div className="shell-wide">
            <div className="ld-hero-copy">
              <div className="eyebrow">AI Future Financial Decision Service</div>
              <h1>
                앞으로를 위해,
                <br />
                지금 내 뜻을 남겨두세요
              </h1>
              <p className="hero-sub">
                나중에 기억하거나 판단하기 어려워지더라도
                <br />
                내 돈과 생활이 내가 원하는 방식대로 이어질 수 있도록 미리 준비할 수 있어요.
              </p>
              <div className="hero-actions">
                <StartLink className="btn lg">시작하기</StartLink>
                <Link href="/plan?demo=B" className="btn outline lg">
                  완성된 설계서 예시
                </Link>
              </div>
              <p className="hero-note">약 11문항 · 3분 · 실제 금융상품 가입이나 자산 이동은 없는 데모입니다.</p>
            </div>
            <div className="category-row ld-cats">
              {CATEGORIES.map(({ label, icon: Icon, focus }) => (
                <StartLink className="btn outline category-btn" focus={focus} key={label}>
                  {label}
                  <Icon className="category-icon" strokeWidth={1.5} aria-hidden="true" />
                </StartLink>
              ))}
            </div>
          </div>
          <div className="ld-scroll-cue" aria-hidden>
            <span />
          </div>
        </section>

        {/* 02 인터뷰 */}
        <FeatureSection
          id="interview"
          step="02"
          eyebrow="Interview"
          title={
            <>
              설문이 아니라,
              <br />
              문서를 쓰는 대화입니다.
            </>
          }
          body="목적을 먼저 묻습니다. 공과금 관리가 필요한 분에게 치매와 후견 이야기를 꺼내지 않습니다. 답할 때마다 오른쪽에 조항이 하나씩 쌓이고, 선택지가 마땅치 않으면 그냥 말로 해도 AI가 뜻을 읽어 조항으로 옮깁니다."
          mock={<ChatMock />}
        />

        {/* 03 설계서 */}
        <FeatureSection
          id="plan"
          step="03"
          eyebrow="Design documents"
          title={
            <>
              대화가 끝나면
              <br />
              세 문서가 남습니다.
            </>
          }
          body="신탁·후견·지출 설계서가 조항 단위로 정리됩니다. 아직 정하지 않은 영역은 비워 두지 않고 '선언되지 않음'으로 표시해, 무엇을 더 준비해야 하는지 바로 보입니다."
          mock={<PlanMock />}
          reverse
          action={
            <Link href="/plan?demo=B" className="btn outline">
              설계서 예시 보기
            </Link>
          }
        />

        {/* 04 시뮬레이션·상황 변화 */}
        <FeatureSection
          id="simulation"
          step="04"
          eyebrow="Simulation · Events"
          title={
            <>
              상황이 바뀌면
              <br />
              설계서가 먼저 답합니다.
            </>
          }
          body="시장 급락, 입원, 큰돈이 필요한 날. 설계서에 상황을 적용하면 선택지마다 자산이 언제 소진되는지, 되돌릴 수 있는지, 선언한 원칙과 맞는지를 나란히 보여줍니다. 하나를 골라 주지는 않습니다."
          mock={<SimulationMock />}
          action={
            <Link href="/simulation" className="btn outline">
              시뮬레이션 보기
            </Link>
          }
        />

        {/* 05 금융 보호 — 스크롤 연동 */}
        <FraudSection />

        {/* 06 이력 대조·월간 점검 */}
        <FeatureSection
          id="ledger"
          step="06"
          eyebrow="Ledger · Monthly check-in"
          title={
            <>
              말한 원칙과 실제 행동이
              <br />
              다르면, 묻습니다.
            </>
          }
          body="거래 이력을 연동하면 인터뷰에서 선언한 원칙과 과거 행동을 나란히 놓습니다. 어긋나면 어느 쪽이 앞으로의 나인지 고르게 하고, 매월 한 번 짧은 상황으로 보호 원칙을 다시 확인합니다."
          mock={<LedgerMock />}
          reverse
          action={
            <Link href="/ledger" className="btn outline">
              이력 대조 보기
            </Link>
          }
        />

        {/* 07 마무리 */}
        <section className="ld-final" aria-label="시작">
          <Reveal className="shell-wide ld-final-inner" threshold={0.3}>
            <div className="eyebrow">Start</div>
            <h2>
              미래를 예측하는 대신,
              <br />
              내 뜻을 미리 준비하세요.
            </h2>
            <p>
              필요한 내용만 차근차근 여쭤볼게요. 약 11문항, 3분이면 기본 설계서가 나옵니다.
              <br />
              필요한 부분만 더 답하시면 돼요.
            </p>
            <div className="hero-actions">
              <StartLink className="btn lg light">시작하기</StartLink>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
