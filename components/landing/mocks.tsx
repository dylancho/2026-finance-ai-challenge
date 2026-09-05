import Badge from "../common/Badge";
import Reveal from "./Reveal";

/**
 * 랜딩 목업.
 *
 * 스크린샷 이미지가 아니라 실제 화면과 같은 마크업을 축소해 그린다.
 * 기능이 바뀌어도 랜딩이 낡지 않고, 이미지 파일을 준비할 필요가 없다.
 * 내용은 전부 실제 질문·조항·시나리오에서 가져온 것이다. 없는 기능을 그리지 않는다.
 */

/** 인터뷰: 묻고 답하면 조항이 된다 */
export function ChatMock() {
  return (
    <div className="ld-phone ld-chat">
      <div className="ld-phone-head">
        <span className="ld-avatar">NX</span>
        <div>
          <b>NEXT AI</b>
          <small>보호 장치 · 일상 자금 관리</small>
        </div>
        <Badge tone="info">A05</Badge>
      </div>
      <div className="ld-chat-stream">
        <Reveal className="msg ai" delay={200}>
          <span className="ld-avatar sm">NX</span>
          <div>
            <div className="bubble">한 번에 이체할 수 있는 최대 금액을 얼마로 할까요?</div>
            <div className="helper">이 금액을 넘는 이체는 보류되고 확인 절차를 거칩니다.</div>
          </div>
        </Reveal>
        <Reveal className="msg user" delay={700}>
          <div className="bubble">100만원</div>
        </Reveal>
        <Reveal className="msg ai" delay={1150}>
          <span className="ld-avatar sm">NX</span>
          <div className="bubble">지출설계서 제3조 1회 이체 한도를 반영했습니다.</div>
        </Reveal>
      </div>
      <Reveal className="ld-chat-input" delay={1500}>
        <span>선택지가 마땅치 않으면 그냥 편하게 말씀해 주세요.</span>
        <i>보내기</i>
      </Reveal>
    </div>
  );
}

/** 설계서: 세 문서에 조항이 쌓인다 */
export function PlanMock() {
  const rows = [
    { doc: "지출설계서", ref: "제3조", label: "1회 이체 한도", val: "100만원", set: true },
    { doc: "지출설계서", ref: "제4조", label: "이상거래 대응 원칙", val: "보호자 승인 후 진행", set: true },
    { doc: "신탁설계서", ref: "제6조", label: "의료비 지급 한도", val: "연간 상한을 두고", set: true },
    { doc: "후견설계서", ref: "제3조", label: "신상보호 선호", val: "가능한 한 집에서", set: true },
    { doc: "신탁설계서", ref: "제11조", label: "잔여재산 귀속", val: "아직 정하지 않음", set: false },
  ];
  return (
    <div className="ld-phone ld-plan">
      <div className="ld-plan-head">
        <div className="eyebrow">Your design documents</div>
        <b>미래의 나에게 남기는 금융 사용 설명서</b>
        <div className="ld-plan-badges">
          <span className="on">✓ 일상 자금 관리</span>
          <span className="on">✓ 금융 보호</span>
          <span>상속 의사 미선언 →</span>
        </div>
      </div>
      <div className="ld-plan-rows">
        {rows.map((r, i) => (
          <Reveal key={r.label} className={`ld-clause${r.set ? "" : " gap"}`} delay={200 + i * 120}>
            <div className="ref mono">
              {r.doc} {r.ref}
            </div>
            <div className="lab">{r.label}</div>
            <div className="val">{r.val}</div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/** 시뮬레이션·상황 변화: 상황을 적용하면 설계서가 답한다 */
export function SimulationMock() {
  return (
    <div className="ld-phone ld-sim">
      <div className="ld-sim-event">
        <span className="eyebrow">상황 변화</span>
        <b>시장이 30% 급락했습니다</b>
        <small>선언한 원칙: 급락 시 팔지 않기 · 위험자산 상한 50%</small>
      </div>
      <div className="ld-sim-rows">
        <Reveal className="ld-sim-row" delay={250}>
          <div>
            <b>아무것도 하지 않음</b>
            <small>되돌릴 수 있음 · 선언과 일치</small>
          </div>
          <div className="ld-runway">
            <span>소진</span>
            <b>15년</b>
          </div>
        </Reveal>
        <Reveal className="ld-sim-row" delay={450}>
          <div>
            <b>위험자산 절반 매도</b>
            <small>되돌릴 수 없음 · 선언과 어긋남</small>
          </div>
          <div className="ld-runway down">
            <span>소진</span>
            <b>13년</b>
          </div>
        </Reveal>
        <Reveal className="ld-sim-row" delay={650}>
          <div>
            <b>생활비 20% 감액</b>
            <small>되돌릴 수 있음</small>
          </div>
          <div className="ld-runway up">
            <span>소진</span>
            <b>18년</b>
          </div>
        </Reveal>
      </div>
      <Reveal className="ld-sim-note" delay={900}>
        NEXT는 하나를 고르지 않습니다. 결정은 사람이 합니다.
      </Reveal>
    </div>
  );
}

/** 이력 대조·월간 점검: 선언과 실제 행동이 다르면 묻는다 */
export function LedgerMock() {
  return (
    <div className="ld-phone ld-ledger">
      <div className="eyebrow">선언 · 관측 대조</div>
      <div className="ld-contrast">
        <div className="ld-contrast-col">
          <span>선언 (인터뷰)</span>
          <b>급락해도 팔지 않는다</b>
        </div>
        <div className="ld-contrast-vs">vs</div>
        <div className="ld-contrast-col warn">
          <span>관측 (거래 이력)</span>
          <b>2022년 급락 때 주식 42% 매도</b>
        </div>
      </div>
      <p className="ld-contrast-q">어느 쪽이 앞으로의 나인가요?</p>
      <div className="ld-contrast-actions">
        <span className="btn outline sm">선언대로</span>
        <span className="btn sm">관측대로 고치기</span>
      </div>
      <Reveal className="ld-monthly" delay={500}>
        <span className="mono">MONTHLY CHECK-IN</span>
        <b>이번 달 점검: 오랫동안 연락 없던 지인이 1,200만원을 빌려 달라고 합니다</b>
        <small>매월 한 번, 짧은 상황으로 보호 원칙을 다시 확인합니다.</small>
      </Reveal>
    </div>
  );
}
