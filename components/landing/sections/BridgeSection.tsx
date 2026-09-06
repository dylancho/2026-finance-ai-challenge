import Reveal from "../Reveal";

/**
 * 브릿지 글귀 (토스 모듈 B). 웜그레이로 톤을 올리고 중앙 선언문 하나.
 * 공감 문장 속 키워드 칩이 톡톡 등장한다. 섹션 높이를 86vh 로 두어 다음 섹션 상단이
 * 화면 아래에 고개를 내민다.
 */
export default function BridgeSection() {
  const chips = ["신탁", "상속", "의료·요양"];
  return (
    <section className="ld-bridge" aria-label="브릿지">
      <div className="shell-wide">
        <Reveal className="ld-bridge-inner" threshold={0.4}>
          <h2>
            지키는 준비가 끝나면,
            <br />
            남기는 준비예요
          </h2>
          <p className="ld-bridge-line">
            수많은{" "}
            {chips.map((c, i) => (
              <Reveal as="span" className="ld-chip-word" delay={300 + i * 140} key={c}>
                {c}
              </Reveal>
            ))}{" "}
            앞에서, 미루던 결정들
          </p>
        </Reveal>
      </div>
    </section>
  );
}
