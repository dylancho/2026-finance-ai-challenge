import type { AnswerValue, Extraction, Question } from "../types";
import { won } from "../format";

/* ────────────────────────────────────────────────────
 * 1. 한국어 금액 파서
 *    "삼백만원" "300만" "3,000,000" "월 300" "1억 2천"
 * ──────────────────────────────────────────────────── */

const SINO: Record<string, number> = {
  영: 0, 공: 0,
  일: 1, 하나: 1, 한: 1,
  이: 2, 둘: 2, 두: 2,
  삼: 3, 셋: 3, 세: 3,
  사: 4, 넷: 4, 네: 4,
  오: 5, 다섯: 5,
  육: 6, 륙: 6, 여섯: 6,
  칠: 7, 일곱: 7,
  팔: 8, 여덟: 8,
  구: 9, 아홉: 9,
};

const UNITS: { token: string; mul: number }[] = [
  { token: "억", mul: 100_000_000 },
  { token: "천만", mul: 10_000_000 },
  { token: "백만", mul: 1_000_000 },
  { token: "십만", mul: 100_000 },
  { token: "만", mul: 10_000 },
  { token: "천", mul: 1_000 },
  { token: "백", mul: 100 },
];

/** 순수 한글 수사 덩어리를 숫자로. "삼백" → 300, "이천" → 2000 */
function hangulNumber(s: string): number | null {
  let total = 0;
  let current = 0;
  let matched = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (SINO[ch] !== undefined) {
      current = SINO[ch];
      matched = true;
      continue;
    }
    if (ch === "십") {
      total += (current || 1) * 10;
      current = 0;
      matched = true;
      continue;
    }
    if (ch === "백") {
      total += (current || 1) * 100;
      current = 0;
      matched = true;
      continue;
    }
    if (ch === "천") {
      total += (current || 1) * 1_000;
      current = 0;
      matched = true;
      continue;
    }
    return null;
  }
  if (!matched) return null;
  return total + current;
}

/**
 * 문장에서 금액을 뽑는다. 실패 시 null.
 * 반환 단위는 '원'.
 */
export function parseAmount(input: string): { value: number; evidence: string } | null {
  const text = input.replace(/\s+/g, " ");

  // (1) 숫자 + 단위 조합:  "1억 2천만", "300만원", "3,000,000원"
  const numUnit =
    /((?:\d[\d,]*\s*(?:억|천만|백만|십만|만|천)\s*)+(?:\d[\d,]*)?\s*원?)/;
  const m1 = text.match(numUnit);
  if (m1) {
    const chunk = m1[1];
    let total = 0;
    let rest = chunk.replace(/[원\s]/g, "");
    const re = /(\d[\d,]*)(억|천만|백만|십만|만|천)/g;
    let mm: RegExpExecArray | null;
    let consumed = 0;
    while ((mm = re.exec(rest))) {
      const n = Number(mm[1].replace(/,/g, ""));
      const unit = UNITS.find((u) => u.token === mm![2])!;
      total += n * unit.mul;
      consumed = mm.index + mm[0].length;
    }
    const trailing = rest.slice(consumed).replace(/,/g, "");
    if (trailing && /^\d+$/.test(trailing)) total += Number(trailing);
    if (total > 0) return { value: total, evidence: chunk.trim() };
  }

  // (1-b) 콤마 구분 금액: "5,000,000원"
  const comma = text.match(/(\d{1,3}(?:,\d{3})+)\s*원?/);
  if (comma) {
    const v = Number(comma[1].replace(/,/g, ""));
    if (v > 0) return { value: v, evidence: comma[0].trim() };
  }

  // (2) 한글 수사 + 단위:  "삼백만원", "이천만"
  // "한 번에 백만원" 처럼 앞에 다른 수사가 끼어 있을 수 있으므로 후보를 모두 훑는다.
  const hanUnit = /([일이삼사오육륙칠팔구십백천만억한두세네다섯여섯일곱여덟아홉]+)\s*원?/g;
  let m2: RegExpExecArray | null;
  while ((m2 = hanUnit.exec(text))) {
    const raw = m2[1];
    if (!/[만억]/.test(raw)) continue; // 단위가 없으면 금액이 아니다
    let total = 0;
    let remain = raw;
    for (const u of UNITS) {
      const idx = remain.indexOf(u.token);
      if (idx === -1) continue;
      const head = remain.slice(0, idx);
      const n = head ? hangulNumber(head) : 1;
      if (n === null) continue;
      total += (n || 1) * u.mul;
      remain = remain.slice(idx + u.token.length);
    }
    if (remain) {
      const tail = hangulNumber(remain);
      if (tail !== null) total += tail;
    }
    if (total >= 10_000) return { value: total, evidence: m2[0].trim() };
  }

  // (3) 맨숫자 + '만' 없는 경우: "월 300" → 300만원으로 해석
  const bare = text.match(/(?:월|매달|한\s*달에)\s*(\d[\d,]*)\b/);
  if (bare) {
    const n = Number(bare[1].replace(/,/g, ""));
    if (n > 0 && n < 10_000) return { value: n * 10_000, evidence: bare[0].trim() };
    if (n >= 10_000) return { value: n, evidence: bare[0].trim() };
  }

  // (4) 큰 숫자 단독: "3000000"
  const plain = text.match(/\b(\d{6,})\b/);
  if (plain) return { value: Number(plain[1]), evidence: plain[1] };

  return null;
}

/* ────────────────────────────────────────────────────
 * 2. 사람(관계) 파서
 * ──────────────────────────────────────────────────── */

const RELATIONS: { relation: string; words: string[] }[] = [
  { relation: "배우자", words: ["배우자", "아내", "와이프", "남편", "집사람", "안사람", "처"] },
  { relation: "자녀", words: ["자녀", "아들", "딸", "장남", "장녀", "큰아들", "큰딸", "막내", "차남", "차녀", "아이"] },
  { relation: "부모", words: ["부모", "아버지", "어머니", "아빠", "엄마", "아버님", "어머님"] },
  { relation: "형제자매", words: ["형제", "자매", "형", "누나", "언니", "오빠", "동생", "남매"] },
  { relation: "전문가", words: ["변호사", "법무사", "세무사", "전문가", "후견법인"] },
  { relation: "금융기관", words: ["은행", "금융기관", "신탁회사", "증권사"] },
];

export function parseRelation(input: string): { relation: string; evidence: string } | null {
  for (const r of RELATIONS) {
    for (const w of r.words) {
      if (input.includes(w)) return { relation: r.relation, evidence: w };
    }
  }
  return null;
}

/* ────────────────────────────────────────────────────
 * 3. 부정 스코프
 *    "팔지 마" "안 팔았으면" "증여는 빼고"
 * ──────────────────────────────────────────────────── */

/**
 * 한국어 부정은 대체로 용언 뒤에 붙는다 ("팔지 마", "하지 않").
 * 문장 어딘가에 부정어가 있다고 전체를 뒤집으면
 * "부동산이랑 대출은 절대 안 됩니다" 에서 '부동산'까지 사라진다.
 * 그래서 키워드 바로 뒤(6자) 또는 바로 앞("안/못")만 본다.
 */
const NEG_AFTER = /^\s*(?:마|말|않|못|아니|안)/;
const NEG_BEFORE = /(?:안|못)\s*$/;

export function isNegated(input: string, near: string): boolean {
  const idx = input.indexOf(near);
  if (idx === -1) return false;
  // 트리거 자체가 부정을 포함하면 ("팔지 마") 이미 의도가 반영된 것이다.
  if (/[마말않안못]/.test(near)) return false;
  const after = input.slice(idx + near.length, idx + near.length + 6);
  const before = input.slice(Math.max(0, idx - 3), idx);
  return NEG_AFTER.test(after) || NEG_BEFORE.test(before);
}

/* ────────────────────────────────────────────────────
 * 4. 질문별 의도 사전
 *    질문 id → [옵션 value, 트리거 단어들]
 * ──────────────────────────────────────────────────── */

type IntentMap = Record<string, string[]>;

const INTENTS: Record<string, IntentMap> = {
  A03: {
    monthly: ["매달", "매월", "한달에", "월초", "월 한번", "1일"],
    biweekly: ["격주", "2주", "이주"],
    weekly: ["매주", "주마다", "주 단위", "일주일"],
    ondemand: ["필요할", "필요할때", "청구", "그때그때"],
  },
  A04: {
    auto_cover: ["자동", "채워", "충당", "예비계좌", "알아서"],
    notify_only: ["알림만", "알려만", "문자만"],
    notify_guardian: ["가족", "자녀", "아들", "딸", "같이 알려"],
    hold: ["보류", "멈춰", "승인"],
  },
  A08: {
    auto_within: ["한도", "한도내", "자동으로"],
    approve: ["승인", "허락", "물어보고", "동의"],
    notify_after: ["먼저", "일단", "쓰고 나서", "사후"],
    reserve: ["예비", "따로", "별도 계좌", "의료계좌"],
  },
  B04: {
    living: ["생활비", "생활", "먹고", "용돈"],
    medical: ["치료", "병원", "의료", "요양", "간병"],
    conflict: ["다툼", "싸움", "분쟁", "갈등", "형제"],
    fraud: ["사기", "보이스피싱", "피싱", "속아", "잃지"],
    spouse: ["배우자", "아내", "남편", "와이프", "떠난 뒤", "사후"],
  },
  B05: {
    doctor1: ["진단서", "의사 한", "전문의 한", "1명", "한명"],
    doctor2: ["두 명", "2명", "두명", "소견 일치", "두 의사", "이인"],
    court: ["법원", "심판", "판결", "재판"],
    designee: ["지정", "가족이 판단", "믿는 사람"],
    self: ["내가 요청", "본인이", "스스로"],
  },
  B09: {
    unlimited: ["제한 없", "무제한", "얼마든", "다 써", "필요하면"],
    total_cap: ["누적", "총액", "전체 상한", "합쳐서"],
    yearly_cap: ["연간", "일년", "해마다", "매년"],
    family: ["가족", "상의", "합의", "의논"],
  },
  B11: {
    preserve: ["팔지 마", "팔지 말", "안 팔", "유지", "보존", "그대로", "장기", "묻어"],
    phased: ["단계", "조금씩", "나눠서", "필요한 만큼"],
    partial: ["일부", "급할", "큰돈", "필요할 때만"],
    delegate: ["전문가", "맡기", "위임", "알아서 운용"],
  },
  B16: {
    family: ["다른 가족", "가족이", "형제", "자녀가", "동생이"],
    expert: ["변호사", "법무사", "전문가", "세무사"],
    institution: ["은행", "금융기관", "기관이", "신탁회사"],
    none: ["두지 않", "따로 두지", "필요 없", "없어도", "안 둘", "안 두"],
  },
  B17: {
    home: ["집에서", "집", "재가", "우리집"],
    facility: ["요양원", "시설", "요양시설", "전문"],
    family_decide: ["가족이", "그때", "알아서"],
    undecided: ["모르", "생각 안", "아직"],
  },
  B19: {
    auto: ["자동", "바로 끝", "저절로"],
    request: ["요청", "내가 말하면", "본인이"],
    supervisor: ["감독", "확인 후", "검토"],
    court: ["법원", "심판"],
  },
  B20: {
    self_only: ["나 혼자", "혼자", "언제든", "내 마음"],
    self_supervisor: ["감독", "같이", "함께 동의"],
    all: ["전원", "모두", "다 동의"],
    court: ["법원", "허가"],
  },
  C03: {
    yes: ["가능", "할 수 있", "이해하", "멀쩡", "또렷"],
    partial: ["쉬운", "일부", "때때로", "왔다갔다"],
    no: ["어렵", "못 하", "불가능", "안 되"],
    unknown: ["모르", "잘 모르"],
  },
  C06: {
    agreed: ["동의", "합의", "모두 찬성"],
    partial: ["일부", "대체로", "약간"],
    notyet: ["아직", "말 안", "꺼내지"],
    conflict: ["갈등", "싸움", "다툼", "반대"],
  },
  D04: {
    yes: ["배우자 먼저", "아내 먼저", "남편 먼저", "그다음", "순차"],
    direct: ["자녀에게", "바로 자식", "처음부터 자녀"],
    split: ["나눠", "각각", "동시에"],
    undecided: ["모르", "아직"],
  },
  D05: {
    after: ["사후", "죽은 뒤", "떠난 뒤", "나중에"],
    partial: ["일부", "조금씩", "반은"],
    now: ["지금", "미리", "생전", "빨리"],
  },
  D14: {
    likely: ["그럴", "예상", "싸울", "다툴"],
    maybe: ["가능성", "모르지만", "약간"],
    unlikely: ["아니", "없을", "사이 좋"],
  },
};

/** multi 질문의 옵션 라벨/키워드 매칭 사전 */
const MULTI_HINTS: Record<string, Record<string, string[]>> = {
  A01: {
    utility: ["전기", "가스", "수도", "공과금"],
    maintenance: ["관리비", "아파트"],
    telecom: ["통신", "핸드폰", "휴대폰", "인터넷", "전화"],
    insurance: ["보험"],
    rent: ["월세", "대출", "이자", "임대료"],
    subscription: ["구독", "넷플릭스", "멤버십"],
    care: ["요양", "간병"],
    support: ["용돈", "지원", "생활비 보내"],
  },
  A06: {
    new_payee: ["처음", "새 계좌", "모르는 계좌", "낯선"],
    night: ["밤", "새벽", "심야"],
    loan: ["대출", "현금서비스", "카드론"],
    remote: ["원격", "팀뷰어", "화면 공유"],
    overseas: ["해외", "외국", "송금"],
    deposit_break: ["예금 해지", "적금 해지", "중도해지"],
  },
  B01: {
    deposit: ["예금", "적금", "통장", "현금"],
    invest: ["주식", "펀드", "채권", "증권", "투자"],
    realestate: ["부동산", "아파트", "집", "토지", "땅", "상가"],
    pension: ["연금"],
    insurance: ["보험"],
    business: ["사업", "지분", "회사"],
  },
  B03: {
    deposit: ["예금", "적금", "통장", "현금"],
    invest: ["주식", "펀드", "채권", "증권"],
    realestate: ["부동산", "아파트", "집", "토지", "땅"],
    insurance: ["보험"],
    none: ["모르", "아직"],
  },
  C08: {
    deposit: ["예금", "적금", "통장"],
    invest: ["주식", "펀드"],
    realestate: ["부동산", "아파트", "집", "땅"],
    pension: ["연금"],
    insurance: ["보험"],
    unknown: ["모르", "파악"],
  },
  D02: {
    deposit: ["예금", "적금", "통장"],
    invest: ["주식", "펀드", "채권"],
    realestate: ["부동산", "아파트", "집", "땅", "상가"],
    business: ["사업", "지분", "회사"],
    insurance: ["보험"],
  },
  B10: {
    utility: ["전기", "가스", "수도", "공과금", "관리비"],
    telecom: ["통신", "휴대폰", "핸드폰", "인터넷"],
    insurance: ["보험"],
    rent: ["월세", "대출", "이자"],
    care: ["요양", "간병"],
    hospital: ["병원", "치료", "통원"],
    support: ["용돈", "지원"],
  },
  C09: {
    utility: ["전기", "가스", "수도", "공과금", "관리비"],
    telecom: ["통신", "휴대폰", "핸드폰"],
    insurance: ["보험"],
    care: ["요양", "간병"],
    hospital: ["병원", "치료"],
    rent: ["월세", "대출", "이자"],
  },
  D13: {
    home: ["집", "주택", "아파트", "살고 있"],
    land: ["선산", "토지", "땅"],
    business: ["사업", "지분", "회사"],
    memento: ["의미", "물려받은", "유품"],
    none: ["없"],
  },
  B15: {
    sell_estate: ["부동산", "집", "아파트", "땅", "매각", "처분"],
    loan: ["대출", "보증", "빚"],
    gift: ["증여", "물려", "줘버리"],
    business: ["사업", "투자", "창업"],
    break_deposit: ["예금 해지", "적금", "중도해지"],
    cancel_insurance: ["보험 해지", "보험"],
  },
  B18: {
    residence: ["거주", "어디서 살", "집"],
    medical: ["의료", "수술", "치료 동의"],
    facility: ["요양시설", "요양원", "입소"],
    visit: ["면접", "면회", "만나"],
    mail: ["우편", "우편물", "통신"],
    eol: ["연명", "존엄", "임종"],
  },
};

/* ────────────────────────────────────────────────────
 * 5. 추출 진입점
 * ──────────────────────────────────────────────────── */

export interface RuleOutcome {
  extractions: Extraction[];
  confidence: number;
}

export function ruleExtract(input: string, q: Question): RuleOutcome {
  const text = input.trim();
  if (!text) return { extractions: [], confidence: 0 };

  switch (q.type) {
    case "amount": {
      const hit = parseAmount(text);
      if (!hit) return { extractions: [], confidence: 0 };
      const clamped = clamp(hit.value, q);
      return {
        confidence: 0.9,
        extractions: [
          {
            qid: q.id,
            label: `${shorten(q.prompt)}: ${q.unit === "명" ? `${clamped}명` : won(clamped)}`,
            value: { kind: "amount", value: clamped },
            confidence: 0.9,
            evidence: hit.evidence,
          },
        ],
      };
    }

    case "person": {
      const hit = parseRelation(text);
      if (!hit) return { extractions: [], confidence: 0 };
      const name = extractName(text, hit.evidence);
      return {
        confidence: 0.85,
        extractions: [
          {
            qid: q.id,
            label: `${shorten(q.prompt)}: ${hit.relation}${name ? ` (${name})` : ""}`,
            value: { kind: "person", people: [{ relation: hit.relation, name }] },
            confidence: 0.85,
            evidence: hit.evidence,
          },
        ],
      };
    }

    case "choice": {
      const map = INTENTS[q.id];
      if (!map) return fallbackByOptionLabel(text, q);
      let best: { value: string; word: string; score: number } | null = null;
      for (const [value, words] of Object.entries(map)) {
        for (const w of words) {
          if (!text.includes(w)) continue;
          if (isNegated(text, w)) continue;
          const score = w.length;
          if (!best || score > best.score) best = { value, word: w, score };
        }
      }
      if (!best) return fallbackByOptionLabel(text, q);
      const opt = q.options?.find((o) => o.value === best!.value);
      const conf = Math.min(0.92, 0.55 + best.score * 0.08);
      return {
        confidence: conf,
        extractions: [
          {
            qid: q.id,
            label: `${shorten(q.prompt)}: ${opt?.label ?? best.value}`,
            value: { kind: "choice", value: best.value },
            confidence: conf,
            evidence: best.word,
          },
        ],
      };
    }

    case "multi": {
      const hints = MULTI_HINTS[q.id];
      const values: string[] = [];
      const evidence: string[] = [];
      for (const opt of q.options ?? []) {
        const words = hints?.[opt.value] ?? [opt.label];
        for (const w of words) {
          if (text.includes(w) && !isNegated(text, w)) {
            if (!values.includes(opt.value)) {
              values.push(opt.value);
              evidence.push(w);
            }
            break;
          }
        }
      }
      if (!values.length) return { extractions: [], confidence: 0 };
      const labels = values
        .map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
        .join(", ");
      const conf = Math.min(0.88, 0.5 + values.length * 0.12);
      return {
        confidence: conf,
        extractions: [
          {
            qid: q.id,
            label: `${shorten(q.prompt)}: ${labels}`,
            value: { kind: "multi", values },
            confidence: conf,
            evidence: evidence.join(", "),
          },
        ],
      };
    }

    case "open":
      return {
        confidence: 1,
        extractions: [
          {
            qid: q.id,
            label: `${shorten(q.prompt)}: 기록됨`,
            value: { kind: "open", text },
            confidence: 1,
          },
        ],
      };

    case "allocation": {
      // "집은 아내에게, 예금은 아이들에게" 패턴
      const rows = text
        .split(/[,·\n]|그리고/)
        .map((seg) => seg.trim())
        .filter(Boolean)
        .map((seg) => {
          const m = seg.match(/(.+?)\s*(?:은|는|를|을)?\s*(.+?)\s*(?:에게|한테|으로|에)/);
          if (!m) return null;
          return { asset: m[1].trim(), to: m[2].trim() };
        })
        .filter(Boolean) as { asset: string; to: string }[];
      if (!rows.length) return { extractions: [], confidence: 0 };
      return {
        confidence: 0.6,
        extractions: [
          {
            qid: q.id,
            label: `배분 ${rows.length}건: ${rows.map((r) => `${r.asset}→${r.to}`).join(", ")}`,
            value: { kind: "allocation", rows },
            confidence: 0.6,
          },
        ],
      };
    }
  }
}

function fallbackByOptionLabel(text: string, q: Question): RuleOutcome {
  for (const opt of q.options ?? []) {
    const key = opt.label.replace(/[^가-힣a-zA-Z]/g, "").slice(0, 4);
    if (key.length >= 2 && text.includes(key)) {
      return {
        confidence: 0.62,
        extractions: [
          {
            qid: q.id,
            label: `${shorten(q.prompt)}: ${opt.label}`,
            value: { kind: "choice", value: opt.value },
            confidence: 0.62,
            evidence: key,
          },
        ],
      };
    }
  }
  return { extractions: [], confidence: 0 };
}

function clamp(v: number, q: Question): number {
  let out = v;
  if (q.unit === "명" && v > 10_000) out = Math.round(v / 10_000);
  if (q.min !== undefined) out = Math.max(q.min, out);
  if (q.max !== undefined) out = Math.min(q.max, out);
  return out;
}

const PARTICLES = [
  "한테서", "에게서", "께서는", "한테", "에게", "께서", "이랑", "하고", "보고",
  "이가", "님이", "씨가", "님", "씨", "이", "가", "은", "는", "을", "를",
  "께", "랑", "와", "과", "도", "만",
];

const NAME_STOP = new Set([
  "그리고", "정도", "라고", "생각", "우리", "저희", "지금", "아직", "모두",
  "관리", "결정", "부탁", "맡기", "같이", "함께",
]);

function extractName(text: string, relationWord: string): string | undefined {
  // "배우자 이수정한테", "아내(이수정)" 같은 패턴에서 이름만 뽑는다.
  const after = (text.split(relationWord)[1] ?? "").replace(/[(（)）]/g, " ").trim();
  if (!after) return undefined;
  const token = after.split(/\s+/)[0];
  const m = token.match(/^([가-힣]{2,6})/);
  if (!m) return undefined;

  let cand = m[1];
  for (const par of PARTICLES) {
    if (cand.length - par.length >= 2 && cand.endsWith(par)) {
      cand = cand.slice(0, -par.length);
      break;
    }
  }
  if (cand.length < 2 || cand.length > 4) return undefined;
  if (NAME_STOP.has(cand)) return undefined;
  return cand;
}

function shorten(prompt: string): string {
  const cleaned = prompt.replace(/[?？]/g, "");
  return cleaned.length > 18 ? cleaned.slice(0, 18) + "…" : cleaned;
}

/* ────────────────────────────────────────────────────
 * 6. AI 응답 문장 생성 (단정 금지)
 * ──────────────────────────────────────────────────── */

export function acknowledge(extracted: Extraction[], q: Question): string {
  if (!extracted.length) {
    return "말씀 주신 내용을 그대로 기록해 두겠습니다. 아래 보기 중에서 골라 주시면 설계서 조항으로 바로 반영할 수 있어요.";
  }
  const first = extracted[0];
  const clause = q.mapsTo[0];
  const where = clause ? `${docName(clause.doc)} ${clause.clause} ${clause.label}` : "설계서";
  return `${first.label.replace(/^[^:]+:\s*/, "")} — 이렇게 이해했습니다. ${where}에 반영해 둘게요.`;
}

export function docName(doc: string): string {
  if (doc === "trust") return "신탁설계서";
  if (doc === "guardianship") return "후견설계서";
  return "지출설계서";
}

export function answerToLabel(value: AnswerValue, q: Question): string {
  switch (value.kind) {
    case "choice":
      return q.options?.find((o) => o.value === value.value)?.label ?? value.value;
    case "multi":
      return value.values
        .map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
        .join(", ");
    case "amount":
      return q.unit === "명" ? `${value.value}명` : won(value.value);
    case "person":
      return value.people
        .map((p) => (p.name ? `${p.relation} ${p.name}` : p.relation))
        .join(", ");
    case "allocation":
      return value.rows.map((r) => `${r.asset} → ${r.to}`).join(" · ");
    case "open":
      return value.text;
  }
}
