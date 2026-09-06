/**
 * CSS 노트북 프레임. 화면 3종은 겹쳐 놓고 Stage 타임라인이 크로스페이드한다.
 * 내용은 지출설계서 §1(3층 계좌)·§2(자동이체)·§3(한도)·제4조(보류) 와 같은 말이다 —
 * 스크린샷이 아니라 컴포넌트라서 설계서가 바뀌면 여기도 같이 바뀐다.
 */
export function Laptop() {
  return (
    <div className="ld-laptop">
      <div className="ld-laptop-screen">
        <div className="ld-app-bar">
          <span className="dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="ld-app-title">NEXT · 집행 일지</span>
          <span className="mono">지출설계서 v3</span>
        </div>
        <div className="ld-screens">
          <LogScreen />
          <AccountsScreen />
          <LimitsScreen />
        </div>
      </div>
      <div className="ld-laptop-base" aria-hidden />
    </div>
  );
}

function LogScreen() {
  return (
    <div className="ld-screen ld-log" data-screen="log">
      <div className="ld-screen-h">
        오늘의 집행 <small>2026-09-25</small>
      </div>
      <ul>
        <li className="ld-log-line" data-line="0800">
          <span className="mono t">[08:00]</span>
          <span className="body">
            {/* 조각이 도착하기 전: 수신 대기. 도착하면 조각 자리(target)와 나머지 글(rest)이 채워진다. */}
            <span className="ld-log-wait" data-log-wait>
              고지서 수신 중<i>…</i>
            </span>
            <b data-target="co">한국전력</b>
            <span data-log-rest> 전기요금 </span>
            <b data-target="amt">38,500원</b>
            <span data-log-rest> · 납기 </span>
            <b data-target="due">9/25</b>
            <span data-log-rest> · §2 자동이체 집행 완료</span>
          </span>
          <span className="ok" data-log-rest>
            완료
          </span>
        </li>
        <li className="ld-log-line" data-line="1000">
          <span className="mono t">[10:00]</span>
          <span className="body">
            생활비 1,800,000원 · §1 생활계좌로 <b>분할 지급</b> (1/2회차)
          </span>
          <span className="ok">완료</span>
        </li>
        <li className="ld-log-line warn" data-line="2347">
          <span className="mono t">[23:47]</span>
          <span className="body">
            처음 보는 계좌로 <b>4,800,000원</b> 이체 시도 → <b>제4조 보류</b> · 1차 관리자 판단 요청
          </span>
          <span className="hold">보류</span>
        </li>
      </ul>
    </div>
  );
}

function AccountsScreen() {
  return (
    <div className="ld-screen ld-accounts" data-screen="accounts">
      <div className="ld-screen-h">
        §1 계좌 구조 <small>3층</small>
      </div>
      <div className="ld-tier ld-tier--3">
        <span className="k">③ 보전계좌</span>
        <b>원금 보전 · 자동이체를 연결하지 않음</b>
      </div>
      <div className="ld-tier-arrow" aria-hidden>
        ↓ 월 1회, 정해진 금액만
      </div>
      <div className="ld-tier ld-tier--2">
        <span className="k">② 지급계좌</span>
        <b>월 지급액이 유입되고 자동이체가 빠져나가는 유일한 계좌</b>
      </div>
      <div className="ld-tier-arrow" aria-hidden>
        ↓ 생활비 분할 지급
      </div>
      <div className="ld-tier ld-tier--1">
        <span className="k">① 생활계좌</span>
        <b>본인이 자유롭게 쓰는 돈</b>
      </div>
    </div>
  );
}

function LimitsScreen() {
  return (
    <div className="ld-screen ld-limits" data-screen="limits">
      <div className="ld-screen-h">
        §3 한도 <small>본인이 정한 만큼만</small>
      </div>
      <div className="ld-limit">
        <span>1회 이체 한도</span>
        <b>1,000,000원</b>
        <small>초과 시 보류 후 확인 절차</small>
      </div>
      <div className="ld-limit derived">
        <span>1일 누적 한도</span>
        <b>2,000,000원</b>
        <small>1회 한도의 2배로 자동 산정</small>
      </div>
      <div className="ld-limit">
        <span>처음 보내는 계좌</span>
        <b>하루 뒤 집행</b>
        <small>제4조 · 그 사이 취소할 수 있음</small>
      </div>
    </div>
  );
}

/** CH2 에서 화면 가장자리 밖으로 떠오르는 빨간 알림. TR 에서 중앙으로 날아가 낙폭 차트가 된다. */
export function AlertCard() {
  return (
    <div className="ld-alert" data-alert role="status">
      <div className="ld-alert-top">
        <i />
        <span>제4조 보류</span>
        <span className="mono">23:47</span>
      </div>
      <b>처음 보는 계좌 · 4,800,000원</b>
      <small>1회 한도 초과 · 심야 · 신규 기기. 1차 관리자에게 판단을 요청했습니다.</small>
      <div className="ld-alert-actions">
        <span>승인</span>
        <span className="deny">거절</span>
      </div>
    </div>
  );
}
