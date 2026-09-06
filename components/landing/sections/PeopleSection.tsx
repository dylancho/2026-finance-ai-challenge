import Reveal from "../Reveal";

/** S8 사람. 실사 1컷(얼굴 없음). 사진이 없으면 장바구니 실루엣 SVG 가 보인다. */
export default function PeopleSection() {
  return (
    <section className="ld-people" aria-label="사람">
      <div className="ld-people-photo" aria-hidden>
        <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="ld-basket">
          <rect width="800" height="500" fill="#e9e2d6" />
          <path d="M300 250 L600 250 L570 410 L330 410 Z" fill="#b89b7a" />
          <path d="M330 250 C340 170 560 170 570 250" fill="none" stroke="#7c6552" strokeWidth="10" strokeLinecap="round" />
          <circle cx="370" cy="236" r="26" fill="#c94f3f" />
          <circle cx="430" cy="222" r="22" fill="#e0a33c" />
          <circle cx="490" cy="232" r="24" fill="#6c9d4f" />
          <path d="M560 320 C600 300 660 300 700 340 L720 500 L560 500 Z" fill="#9c8172" />
        </svg>
        <div className="ld-photo" style={{ backgroundImage: "url(/landing/s8-basket.jpg)" }} />
      </div>
      <div className="shell-wide">
        <Reveal className="ld-people-copy" threshold={0.4}>
          <h2>
            빼앗는 설계가 아니라,
            <br />
            돌려주는 설계입니다
          </h2>
          <p>
            생활계좌 안에서의 자유는 끝까지 본인의 것입니다.
            <br />
            원칙은 그 바깥을 지킬 뿐입니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
