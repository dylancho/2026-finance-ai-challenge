/**
 * CSS 노트북 프레임. 화면 3종은 겹쳐 놓고 Stage 타임라인이 크로스페이드한다.
 * 내용은 지출설계서 §1(3층 계좌)·§2(자동이체)·§3(한도)·제4조(보류) 와 같은 말이다 —
 * 스크린샷이 아니라 컴포넌트라서 설계서가 바뀌면 여기도 같이 바뀐다.
 * 화면 문구는 docs/writing-style.md 를 따른다. § 표기는 설계서 조항 번호라서 남긴다.
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
          <span className="ld-app-title">NEXT · 오늘의 실행</span>
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
        오늘 실행한 것 <small>2026-09-25</small>
      </div>
      <ul>
        <li className="ld-log-line" data-line="0800">
          <span className="mono t">[08:00]</span>
          <span className="body">
            {/* 조각이 도착하기 전: 수신 대기. 도착하면 조각 자리(target)와 나머지 글(rest)이 채워진다. */}
            <span className="ld-log-wait" data-log-wait>
              고지서 받는 중<i>…</i>
            </span>
            <b data-target="co">한국전력</b>
            <span data-log-rest> 전기요금 </span>
            <b data-target="amt">38,500원</b>
            <span data-log-rest> · 납기 </span>
            <b data-target="due">9/25</b>
            <span data-log-rest> · §2 자동이체 완료</span>
          </span>
          <span className="ok" data-log-rest>
            완료
          </span>
        </li>
        <li className="ld-log-line" data-line="1000">
          <span className="mono t">[10:00]</span>
          <span className="body">
            생활비 1,800,000원 · 생활계좌로 <b>지급 완료</b> (1/2회차)
          </span>
          <span className="ok">완료</span>
        </li>
        <li className="ld-log-line warn" data-line="2347">
          <span className="mono t">[23:47]</span>
          <span className="body">
            처음 보는 계좌로 <b>4,800,000원</b> 이체 시도 · <b>제4조 보류</b> · 1차 관리자 확인 요청
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
        <b>원금을 지키는 계좌 · 자동이체 연결 없음</b>
      </div>
      <div className="ld-tier-arrow" aria-hidden>
        ↓ 한 달에 한 번, 정해 둔 금액만
      </div>
      <div className="ld-tier ld-tier--2">
        <span className="k">② 지급계좌</span>
        <b>매달 생활비가 들어오고 자동이체가 나가는 유일한 계좌</b>
      </div>
      <div className="ld-tier-arrow" aria-hidden>
        ↓ 생활비를 나눠서 지급
      </div>
      <div className="ld-tier ld-tier--1">
        <span className="k">① 생활계좌</span>
        <b>내가 자유롭게 쓰는 돈</b>
      </div>
    </div>
  );
}

function LimitsScreen() {
  return (
    <div className="ld-screen ld-limits" data-screen="limits">
      <div className="ld-screen-h">
        §3 한도 <small>내가 정한 만큼만</small>
      </div>
      <div className="ld-limit">
        <span>1회 이체 한도</span>
        <b>1,000,000원</b>
        <small>넘으면 보류하고 먼저 확인</small>
      </div>
      <div className="ld-limit derived">
        <span>1일 누적 한도</span>
        <b>2,000,000원</b>
        <small>1회 한도의 2배로 자동 계산</small>
      </div>
      <div className="ld-limit">
        <span>처음 보내는 계좌</span>
        <b>하루 뒤 지급</b>
        <small>제4조 · 그 사이 취소 가능</small>
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
      {/* 이 카드의 small 은 keep-all 이 없어 긴 문장이 낱말 중간에서 끊긴다 — 한 줄에 들어가는 길이로 */}
      <small>한도 넘음 · 늦은 밤 · 새 기기 · 1차 관리자 확인 중</small>
      <div className="ld-alert-actions">
        <span>승인</span>
        <span className="deny">거절</span>
      </div>
    </div>
  );
}
