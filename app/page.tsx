import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import StartLink from "../components/landing/StartLink";

/** 실제로 구현된 것만 적는다. 없는 기능을 약속하지 않는다. */
const STAGES: { stage: string; title: string; items: string[] }[] = [
  {
    stage: "1단계",
    title: "지금의 나를 기록해요",
    items: [
      "지난 소비와 투자 습관을 보고, \"평소의 나\"를 기록해둡니다",
      "\"주식은 급하게 팔지 마세요\" 같은 말을 대화로 남기면, 나중에 실제로 지킬 수 있는 약속으로 바꿔둡니다",
      "말과 행동이 다를 때도 있으니, 실제로 어떻게 할지 미리 정해둡니다",
    ],
  },
  {
    stage: "2단계",
    title: "문서로 남겨요",
    items: ["이 약속들을 문서 3가지(자산 관리, 생활비, 돌봄)로 정리해둡니다"],
  },
  {
    stage: "3단계",
    title: "필요할 때만 움직여요",
    items: [
      "평소와 다른 움직임이 보이면 알려드려요 (진단은 아니에요)",
      "실제 진단서가 확인되기 전까지는 아무것도 바뀌지 않아요",
    ],
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="shell-wide">
        <section className="hero">
          <div className="eyebrow">AI Future Financial Decision Service</div>
          <h1>
            내가 결정할 수 없을 때를 위해,
            <br />
            지금의 내가 결정합니다.
          </h1>
          <p className="hero-sub">
            AI가 오늘의 나와 대화해 미래의 나를 위한 금융 의사결정을 설계합니다.
          </p>
          <div className="hero-actions">
            <StartLink>무엇을 준비할지 고르기</StartLink>
            <Link href="/plan?demo=B" className="btn outline">
              완성된 설계서 예시 보기
            </Link>
          </div>
        </section>

        <section className="section" id="service">
          <div className="eyebrow">What NEXT does</div>
          <h2>지금의 판단을 기록해, 미래의 결정으로 잇습니다.</h2>
          <p className="section-lede">
            목적을 먼저 묻고 갈래를 나눕니다. 일상 지출 관리만 필요하시면 신탁이나 후견
            이야기는 꺼내지 않습니다. 준비하시는 목적에 따라 세 갈래 중 하나로 안내하며,
            아래 세 단계가 그 안에서 순서대로 이어집니다.
          </p>

          <ol className="stage-list">
            {STAGES.map((s, i) => (
              <li className="stage-item" key={s.stage}>
                <div className="stage-num mono">{String(i + 1).padStart(2, "0")}</div>
                <div className="stage-body">
                  <div className="eyebrow">{s.stage}</div>
                  <h3>{s.title}</h3>
                  <ul className="stage-sub">
                    {s.items.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="cta-band">
          <div>
            <h2>미래를 예측하는 대신, 미래의 결정을 준비하세요.</h2>
            <p>짧으면 2분, 길어도 10분입니다. 목적에 따라 질문의 수가 달라집니다.</p>
          </div>
          <StartLink>시작하기</StartLink>
        </section>
      </main>
      <Footer />
    </>
  );
}
