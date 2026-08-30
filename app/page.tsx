import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import StartLink from "../components/landing/StartLink";

/** 실제로 구현된 것만 적는다. 없는 기능을 약속하지 않는다. */
const SERVICES: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "10년 금융 이력을 읽어 기준선을 만듭니다",
    body: "카드 결제, 이체, 공과금 납부 주기, 하락장에서의 매매를 읽어 '가장 건강할 때의 판단 기준'을 세웁니다. 실효 손절선, 위험 회피도, 월 생활비 중앙값처럼 숫자로 남습니다.",
  },
  {
    step: "02",
    title: "대화로 미래의 원칙을 정합니다",
    body: "\"주식은 급하게 팔지 마세요\" 같은 말을 그대로 받아, 신탁설계서 제7조 운용지침 같은 조항으로 바꿉니다.",
  },
  {
    step: "03",
    title: "말한 것과 실제로 한 것을 맞대어 봅니다",
    body: "\"팔지 않겠다\"고 하셨는데 하락 구간마다 매도한 이력이 있다면, 그 조항이 실제로 어느 쪽으로 작동할지 지금 정해야 합니다. 이 대조가 NEXT의 핵심입니다.",
  },
  {
    step: "04",
    title: "조항 수준의 설계서 3종을 만듭니다",
    body: "신탁설계서·후견설계서·지출설계서. 문단이 아니라 조항입니다. 비어 있는 칸은 비어 있다고 표시하고, 그 공백이 나중에 어디서 문제가 되는지 알려드립니다.",
  },
  {
    step: "05",
    title: "평소와 달라진 지점을 감지합니다",
    body: "잔액 확인 반복, 중복 이체, 공과금 연체, 심야 고액 거래. 기준선에서 벌어지면 알립니다. 다만 이것은 진단이 아니며, 판정은 의료기관의 몫입니다.",
  },
  {
    step: "06",
    title: "사람이 확인해야 움직입니다",
    body: "AI 경보만으로는 아무것도 바뀌지 않습니다. 최근 1개월 이내의 의사 진단서나 장기요양보험 등급 발행서가 함께 확인돼야 전환이 시작됩니다. 자산 처분은 법적 후견인의 승인을 거칩니다.",
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
            아래 여섯 가지가 그 안에서 순서대로 이어집니다.
          </p>

          <ol className="svc-list">
            {SERVICES.map((s) => (
              <li className="svc-item" key={s.step}>
                <div className="svc-step mono">{s.step}</div>
                <div className="svc-body">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
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
