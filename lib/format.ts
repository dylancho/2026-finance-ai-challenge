/** 금액·라벨 포맷 유틸 */

const 만 = 10_000;
const 억 = 100_000_000;

/** 3000000 → "300만원" / 250000000 → "2억 5,000만원" */
export function won(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "미설정";
  if (n === 0) return "0원";
  if (n < 만) return `${n.toLocaleString("ko-KR")}원`;

  const eok = Math.floor(n / 억);
  const man = Math.floor((n % 억) / 만);
  const rest = n % 만;

  const parts: string[] = [];
  if (eok) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man) parts.push(`${man.toLocaleString("ko-KR")}만`);
  if (rest) parts.push(`${rest.toLocaleString("ko-KR")}`);
  return parts.join(" ") + "원";
}

/** 슬라이더 라벨용 짧은 표기 */
export function wonShort(n: number): string {
  if (n >= 억) {
    const v = n / 억;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}억`;
  }
  if (n >= 만) return `${Math.round(n / 만).toLocaleString("ko-KR")}만`;
  return n.toLocaleString("ko-KR");
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

export function personLabel(p?: { relation: string; name?: string }): string {
  if (!p) return "미지정";
  return p.name ? `${p.relation} (${p.name})` : p.relation;
}
