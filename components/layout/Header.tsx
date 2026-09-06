"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import {
  History,
  Menu,
  Play,
  ScrollText,
  ShieldCheck,
  Shuffle,
  X,
  type LucideProps,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { endTour, startTour, TOUR_PERSONA, useTour } from "../../lib/demo/tour";

/**
 * 2026-09-06 헤더 개편.
 *
 * 브랜드 왼쪽 · 주요 기능 다섯 개 가운데 · 둘러보기/로그인(로그아웃) 오른쪽의 세 구역.
 * (2026-09-07 미리보기(/simulation)를 심사 동선에서 빼면서 여섯에서 다섯이 됐다. 라우트는 남아 있다.)
 * 가운데 메뉴에 마우스를 올리거나(키보드는 포커스) 하면 헤더 아래로 흰 패널이 내려와
 * 다섯 기능의 한 줄 설명을 한꺼번에 보여 준다 — 어느 항목에서 열어도 같은 패널이고,
 * 올려 둔 항목의 카드만 강조된다. 패널은 absolute 라 본문을 밀지 않는다.
 *
 * 닫히는 조건: 포인터가 헤더·패널을 떠난 뒤 잠깐(항목→패널로 건너가는 사이 닫히지
 * 않게), Escape, 포커스가 헤더 밖으로 나감, 경로 변경. 좁은 화면(≤640px)에서는 hover
 * 패널 대신 ☰ 버튼이 같은 목록을 아래로 펼친다.
 */

interface Feature {
  href: string;
  label: string;
  desc: string;
  Icon: ComponentType<LucideProps>;
}

const FEATURES: readonly Feature[] = [
  { href: "/start", label: "시작하기", desc: "지금 상태를 알리고 인터뷰로 설계를 시작합니다", Icon: Play },
  { href: "/ledger", label: "이력 연동", desc: "10년 금융 이력을 불러와 답변과 대조합니다", Icon: History },
  { href: "/plan", label: "내 설계서", desc: "지출·신탁·후견 설계서를 조항 단위로 봅니다", Icon: ScrollText },
  { href: "/events", label: "상황 변화", desc: "진단·목돈·급락 같은 상황을 적으면 후보를 늘어놓습니다", Icon: Shuffle },
  { href: "/fraud-shield", label: "금융 보호", desc: "이상 거래를 원칙에 비춰 보류하고 알립니다", Icon: ShieldCheck },
];

/** 항목에서 패널로 포인터를 옮기는 사이 닫히지 않게 두는 유예 */
const CLOSE_DELAY = 120;
/** 이 너비 이하에서는 hover 패널을 열지 않는다 — CSS 의 모바일 분기와 같은 값 */
const MOBILE_MAX = 640;

export default function Header() {
  const { session, ready, signOut } = useAuth();
  const pathname = usePathname();
  const touring = useTour();

  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);
  /** 열려 있으면 강조할 항목의 href, 닫혀 있으면 null */
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback(
    (href: string) => {
      if (window.innerWidth <= MOBILE_MAX) return;
      cancelClose();
      setActive(href);
    },
    [cancelClose],
  );

  const closeNow = useCallback(() => {
    cancelClose();
    setActive(null);
  }, [cancelClose]);

  const closeSoon = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setActive(null);
    }, CLOSE_DELAY);
  }, [cancelClose]);

  // 경로가 바뀌면 패널·모바일 메뉴 모두 닫는다.
  useEffect(() => {
    setActive(null);
    setMenuOpen(false);
  }, [pathname]);

  // Escape 로 닫는다. 열려 있을 때만 듣는다.
  useEffect(() => {
    if (active === null && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActive(null);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, menuOpen]);

  useEffect(() => cancelClose, [cancelClose]);

  /** 포커스가 헤더 밖으로 나가면 패널을 닫는다 (Tab 으로 지나쳐 갈 때). */
  const onHeaderBlur = (e: React.FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && headerRef.current?.contains(next)) return;
    closeNow();
  };

  /**
   * 둘러보기. 저장소를 갈아끼운 뒤 전체 내비게이션으로 넘어간다 — 세션
   * 컨텍스트와 각 화면의 셸이 마운트 시점에 저장소를 읽으므로, 클라이언트 라우팅으로는
   * 같은 화면에 서 있을 때 갱신되지 않는다.
   */
  const start = () => {
    startTour();
    window.location.assign("/plan");
  };
  const end = () => {
    endTour();
    window.location.assign("/");
  };

  const loginHref = `/login?next=${encodeURIComponent(pathname === "/login" ? "/start" : pathname)}`;

  const tourButton = (
    <button type="button" className="btn outline sm" onClick={start}>
      둘러보기
    </button>
  );

  /* 오른쪽 구역. 로그인 상태에 따라 둘러보기·로그인 / 둘러보기·로그아웃.
     둘러보는 중에는 안내 바가 나가는 길을 맡으므로 어느 쪽이든 둘러보기 버튼을 뺀다. */
  const actions = session.signedIn ? (
    <>
      {!touring && tourButton}
      <button className="nav-signout" onClick={signOut}>
        로그아웃
      </button>
    </>
  ) : (
    <>
      {!touring && tourButton}
      <Link href={loginHref} className="btn sm">
        로그인
      </Link>
    </>
  );

  const panelOpen = active !== null;

  return (
    <>
      <header
        className={`header${panelOpen ? " is-panel-open" : ""}`}
        ref={headerRef}
        onBlur={onHeaderBlur}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") closeSoon();
        }}
      >
        <div className="shell-wide header-inner">
          <Link href="/" aria-label="NEXT 홈" className="header-brand">
            <div className="brand">NEXT</div>
          </Link>

          {/* ready 전에는 아무것도 렌더하지 않는다. 서버 렌더에는 세션이 없으므로
              바로 그리면 로그인 상태가 한 번 깜빡이며 뒤집힌다. 다섯 기능은 로그인
              여부와 무관하게 같은 곳으로 간다 — 각 화면이 세션을 요구하지 않는다. */}
          <nav className="nav nav-primary" aria-label="주요 기능" aria-busy={!ready}>
            {ready &&
              FEATURES.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  aria-current={pathname === f.href ? "page" : undefined}
                  aria-expanded={active === f.href}
                  aria-controls="header-nav-panel"
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") open(f.href);
                  }}
                  onFocus={() => open(f.href)}
                >
                  {f.label}
                </Link>
              ))}
          </nav>

          <div className="header-actions" aria-busy={!ready}>
            {ready && <div className="header-act">{actions}</div>}
            {/* 좁은 화면에서만 보이는 메뉴 버튼 */}
            <button
              type="button"
              className="header-menu"
              aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={menuOpen}
              aria-controls="header-nav-sheet"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        {/* hover 패널. 어느 항목에서 열어도 다섯 카드를 다 보여 주고 올려 둔 것만 강조한다.
            페이지 위에 얹히는 면이라 body.ld-dark 에서도 흰 바탕을 유지한다. */}
        <div
          id="header-nav-panel"
          className={`nav-panel${panelOpen ? " is-open" : ""}`}
          aria-hidden={!panelOpen}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") cancelClose();
          }}
        >
          <div className="shell-wide nav-panel-grid">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className={`nav-card${active === f.href ? " is-active" : ""}`}
                tabIndex={panelOpen ? 0 : -1}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActive(f.href);
                }}
                onFocus={() => open(f.href)}
              >
                <span className="nav-card-icon" aria-hidden>
                  <f.Icon size={18} strokeWidth={1.7} />
                </span>
                <b>{f.label}</b>
                <span className="nav-card-desc">{f.desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 모바일 메뉴. 같은 다섯 항목 + 둘러보기·로그인(로그아웃). */}
        {ready && (
          <div id="header-nav-sheet" className="nav-sheet" hidden={!menuOpen}>
            <nav className="shell-wide nav-sheet-list" aria-label="주요 기능">
              {FEATURES.map((f) => (
                <Link
                  key={f.href}
                  href={f.href}
                  className="nav-sheet-item"
                  aria-current={pathname === f.href ? "page" : undefined}
                >
                  <span className="nav-card-icon" aria-hidden>
                    <f.Icon size={18} strokeWidth={1.7} />
                  </span>
                  <span>
                    <b>{f.label}</b>
                    <span className="nav-card-desc">{f.desc}</span>
                  </span>
                </Link>
              ))}
            </nav>
            <div className="shell-wide nav-sheet-actions">{actions}</div>
          </div>
        )}
      </header>

      {ready && touring && (
        <div className="tour-bar" role="status">
          <div className="shell-wide tour-bar-inner">
            <p>
              <b>둘러보기 중</b> · {TOUR_PERSONA} 예시 데이터로 모든 기능을 볼 수 있습니다. 답변은
              가상이며 인터뷰를 거치지 않았습니다.
            </p>
            <button type="button" className="tour-exit" onClick={end}>
              내 데이터로 돌아가기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
