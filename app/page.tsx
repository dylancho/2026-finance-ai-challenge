import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import StartLink from "../components/landing/StartLink";

/** 실제로 구현된 것만 적는다. 없는 기능을 약속하지 않는다. */
const STAGES: { title: string; items: React.ReactNode[] }[] = [
  {
    title: "내 생각을 알려주세요",
    items: [
      "평소 돈을 어떻게 쓰고 관리해왔는지 살펴보고, 앞으로도 지키고 싶은 원칙을 정해요",
      <>
        예를 들어 "주식은 급하게 팔지 않기",{" "}
        <strong>"매달 생활비는 이 정도로 유지하기"</strong>처럼 내 뜻을 구체적으로
        남길 수 있어요
      </>,
    ],
  },
  {
    title: "내 뜻을 문서로 남겨요",
    items: [
      "정한 내용을 자산 관리, 생활비, 돌봄에 대한 문서로 정리해드려요",
      "아직 정하지 않은 내용도 함께 확인하며, 더 준비해야 할 부분을 쉽게 알려드려요",
    ],
  },
  {
    title: "필요할 때, 정해둔 대로 도움을 받아요",
    items: [
      "평소와 다른 금융 활동이 나타나면 확인할 수 있도록 알려드려요",
      "다만 서비스가 치매나 판단 능력을 진단하지는 않아요",
      "진단서 등 필요한 확인을 거친 뒤에만, 미리 정해둔 내용에 따라 도움을 받을 수 있어요",
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
          <h1>앞으로를 위해, 지금 내 뜻을 남겨두세요</h1>
          <p className="hero-sub">
            나중에 기억하거나 판단하기 어려워지더라도
            <br />
            내 돈과 생활이 내가 원하는 방식대로 이어질 수 있도록 미리 준비할 수 있어요.
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
          <p className="section-lede">
            생활비 관리, 자산·투자 관리, 상속 준비 중
            <br />
            지금 필요한 것부터 하나씩 안내해드릴게요.
          </p>

          <ol className="stage-list">
            {STAGES.map((s, i) => (
              <li className="stage-item" key={s.title}>
                <div className="stage-num mono">{String(i + 1).padStart(2, "0")}</div>
                <div className="stage-body">
                  <h3>{s.title}</h3>
                  <ul className="stage-sub">
                    {s.items.map((node, idx) => (
                      <li key={idx}>{node}</li>
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
