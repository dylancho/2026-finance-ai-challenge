import Link from "next/link";

export default function Header() {
  return (
    <header className="header">
      <div className="shell-wide header-inner">
        <Link href="/" aria-label="NEXT 홈">
          <div className="brand">
            NEXT
            <small>당신의 다음 결정을 이어가다</small>
          </div>
        </Link>
        <nav className="nav">
          <Link href="/start" className="hide-sm">
            설계 시작
          </Link>
          <Link href="/plan">내 설계서</Link>
          <Link href="/simulation">시뮬레이션</Link>
          <Link href="/fraud-shield">금융 보호</Link>
        </nav>
      </div>
    </header>
  );
}
