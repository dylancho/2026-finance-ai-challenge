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
        <nav className="nav toss-nav">
          <Link href="/fraud-shield">금융 보호</Link>
          <Link href="/monthly-review">월간 점검</Link>
          <Link href="/start" className="hide-sm">결정 원칙 만들기</Link>
          <Link href="/plan" className="hide-sm">내 설계서</Link>
        </nav>
      </div>
    </header>
  );
}
