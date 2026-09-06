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

/**
 * 라벨 뒤에 붙는 조사를 받침에 맞춰 고른다. "자녀 (김도현)이(가)" 처럼 두 조사를 병기하면
 * 설계서가 서식처럼 읽혀서, 마지막 한글 글자(괄호·기호는 건너뜀)의 받침으로 하나만 붙인다.
 * 한글이 없는 라벨은 종전대로 병기한다.
 */
export function josa(label: string, pair: "이가" | "을를" | "은는" | "으로"): string {
  const m = label.match(/[가-힣](?=[^가-힣]*$)/);
  if (!m) {
    const both = { 이가: "이(가)", 을를: "을(를)", 은는: "은(는)", 으로: "(으)로" }[pair];
    return `${label}${both}`;
  }
  const code = (m[0].charCodeAt(0) - 0xac00) % 28;
  const batchim = code !== 0;
  switch (pair) {
    case "이가":
      return label + (batchim ? "이" : "가");
    case "을를":
      return label + (batchim ? "을" : "를");
    case "은는":
      return label + (batchim ? "은" : "는");
    case "으로":
      // ㄹ 받침(code 8)은 "로" 를 쓴다: 서울로, 이정숙으로.
      return label + (batchim && code !== 8 ? "으로" : "로");
  }
}
