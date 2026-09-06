import type { Chapter, DesignSet, DocKey, Gap, Profile } from "../types";
import {
  activeQuestions,
  chapterCompleted,
  CHAPTER_META,
  isAnswered,
  isUnified,
  OPTIONAL_CHAPTERS,
} from "../questions";

/*
 * 공백 문구는 화면(설계서의 "비어 있는 항목" 탭, 의뢰서의 "아직 정하지 않은 사항")에 그대로
 * 실린다. 2026-09-07 문체 가이드에 따라 해요체로 쓰고, "선언·룰셋·트리거" 같은 내부 용어는
 * 사람 말로 바꿨다. qid·clause 같은 식별자는 그대로다.
 */

/**
 * 영역 단위 공백. 건너뛴 영역은 질문 하나하나가 아니라 "아직 답하지 않은 판단 영역"
 * 이다. 이 카드가 이어서 답하기 경로가 된다 (/interview?chapter=<id>).
 */
const CHAPTER_GAP: Record<
  Exclude<Chapter, "core">,
  { doc: DocKey; clause: string; what: string; consequence: string; severity: Gap["severity"] }
> = {
  invest: {
    doc: "expense",
    clause: "제7조 투자 원칙",
    what: "투자 원칙을 아직 정하지 않았어요",
    consequence: "목돈이 생기거나 시장이 급락했을 때 판단할 근거가 없어요.",
    severity: "high",
  },
  estate: {
    doc: "trust",
    clause: "제11조 남은 재산의 귀속",
    what: "상속 의사를 아직 정하지 않았어요",
    consequence: "세상을 떠났을 때 법정상속 순위로만 처리돼요.",
    severity: "medium",
  },
  medical: {
    doc: "trust",
    clause: "제6조 치료비와 요양비",
    what: "의료·요양 기준을 아직 정하지 않았어요",
    consequence: "요양시설에 들어갈 때 비용 상한과 돈을 꺼낼 순서를 정할 수 없어요.",
    severity: "high",
  },
  safe: {
    doc: "expense",
    clause: "제4조 보호 규칙",
    what: "상황을 보는 보호 원칙을 아직 정하지 않았어요",
    consequence: "보이스피싱 정황이 겹쳐도 금액 기준만 안 넘으면 그대로 나가요.",
    severity: "high",
  },
};

export const chapterGapId = (ch: Chapter) => `chapter:${ch}`;

export function chapterGaps(p: Profile): Gap[] {
  if (!isUnified(p)) return [];
  return OPTIONAL_CHAPTERS.filter((ch) => !chapterCompleted(p, ch)).map((ch) => {
    const meta = CHAPTER_GAP[ch as Exclude<Chapter, "core">];
    return {
      qid: chapterGapId(ch),
      chapter: ch,
      doc: meta.doc,
      clause: meta.clause,
      what: meta.what,
      consequence: `${meta.consequence} (${CHAPTER_META[ch].label} · 약 ${CHAPTER_META[ch].count}문항)`,
      severity: meta.severity,
    };
  });
}

/**
 * 미응답 질문을 "미래에 무슨 일이 생기는가"로 번역한다.
 * 이 문장이 대시보드의 실질적 CTA다.
 */
const CONSEQUENCE: Record<string, { what: string; consequence: string; severity: Gap["severity"] }> = {
  /* Track A */
  A01: {
    what: "고정지출 목록이 비어 있어요",
    consequence: "자동이체 목록에 아무것도 없어요. 어떤 돈이 매달 나가야 하는지 아무도 몰라요.",
    severity: "high",
  },
  A02: {
    what: "월 생활비를 정하지 않았어요",
    consequence: "생활계좌에 얼마를 넣어야 할지 계산할 수 없어요.",
    severity: "high",
  },
  A05: {
    what: "1회 이체 한도가 없어요",
    consequence: "보이스피싱 한 번에 계좌 잔액 전부가 빠져나갈 수 있어요. 피해 규모에 상한이 없어요.",
    severity: "high",
  },
  A06: {
    what: "막을 거래를 확인하지 않았어요",
    consequence:
      "기본 보호 규칙이 그대로 적용돼요. 빼야 할 항목이 있는지 한 번은 확인하는 편이 좋아요.",
    severity: "medium",
  },
  A07: {
    what: "알림 받을 사람이 없어요",
    consequence: "이상한 거래가 잡혀도 알릴 곳이 본인뿐이에요. 판단이 어려운 순간에는 그걸로 부족해요.",
    severity: "medium",
  },
  A08: {
    what: "갑작스러운 큰 지출을 어떻게 할지 정하지 않았어요",
    consequence: "병원비가 생겼을 때 한도에 막혀 결제가 안 되거나, 반대로 아무 제한 없이 나가요.",
    severity: "medium",
  },
  A09: {
    what: "월 수입이 없어요",
    consequence:
      "나가는 돈과 비교할 기준이 없어 자산이 몇 년 가는지 계산할 수 없어요.",
    severity: "high",
  },

  /* Track B */
  B03: {
    what: "신탁에 넣을 재산을 정하지 않았어요",
    consequence: "무엇을 지킬지 정하지 않아 신탁 제2조를 쓸 수 없어요.",
    severity: "high",
  },
  B04: {
    what: "신탁의 목적이 없어요",
    consequence: "수탁자가 어떤 지급을 승인하고 어떤 요청을 거절할지 판단할 기준이 없어요.",
    severity: "high",
  },
  B05: {
    what: "지급 시작 조건이 없어요",
    consequence:
      "판단이 어려워졌을 때 이 계획이 언제 움직이기 시작할지 아무도 몰라요. 가족이 그 시점을 두고 다투게 돼요.",
    severity: "high",
  },
  B06: {
    what: "시작 조건을 확인할 사람이 없어요",
    consequence: "조건이 채워졌는지 누가 판단할지 정하지 않았어요.",
    severity: "medium",
  },
  B07: {
    what: "월 지급액이 없어요",
    consequence: "생활비를 얼마씩 지급할지 정하지 않아 정기지급 조항이 비어 있어요.",
    severity: "high",
  },
  B08: {
    what: "요양시설에 들어갈 때 늘릴 금액이 없어요",
    consequence:
      "요양원 본인 부담이 시작되면 지금 지급액으로는 모자라요. 그때 가족이 늘릴지 말지 협의해야 해요.",
    severity: "medium",
  },
  B09: {
    what: "의료비 지급 한도가 없어요",
    consequence:
      "큰 치료비가 생겼을 때 지급할지 말지 정할 기준이 없어요. 수탁자는 판단을 미루고, 결정은 멈춰요.",
    severity: "high",
  },
  B11: {
    what: "투자자산을 어떻게 다룰지 정하지 않았어요",
    consequence: "판단이 어려워진 뒤 관리자가 급하게 팔아도 막을 근거가 없어요.",
    severity: "medium",
  },
  B12: {
    what: "1차 관리자가 없어요",
    consequence: "신탁의 지급을 요청하고 후견을 맡을 사람을 정하지 않았어요.",
    severity: "high",
  },
  B13: {
    what: "예비 관리자가 없어요",
    consequence: "1차 관리자가 먼저 세상을 떠나거나 관리를 못 하게 되면 그때 다시 법원 절차를 밟아야 해요.",
    severity: "medium",
  },
  B14: {
    what: "혼자 정할 수 있는 금액의 상한이 없어요",
    consequence: "관리자가 얼마까지 혼자 정할 수 있는지 분명하지 않아 견제가 되지 않아요.",
    severity: "medium",
  },
  B15: {
    what: "금지행위를 정하지 않았어요",
    consequence: "부동산 처분이나 대출 실행을 막을 조항이 없어요. 상황이 바뀌었을 때 이 거래는 그대로 통과해요.",
    severity: "high",
  },
  B16: {
    what: "감독하는 사람이 없어요",
    consequence: "관리자가 목적과 다르게 자산을 써도 확인하고 제동을 걸 사람이 없어요.",
    severity: "high",
  },
  B18: {
    what: "대신 결정할 신상 사무의 범위가 없어요",
    consequence: "요양시설 계약이나 의료행위 동의를 누가 할 수 있는지 정하지 않았어요.",
    severity: "medium",
  },
  B19: {
    what: "종료 조건이 없어요",
    consequence: "회복해도 관리자의 권한이 저절로 사라지지 않아요.",
    severity: "low",
  },
  B21: {
    what: "남은 재산을 누구에게 줄지 정하지 않았어요",
    consequence: "신탁이 끝날 때 남은 재산은 법정상속분대로 나뉘어요. 본인의 뜻이 반영되지 않아요.",
    severity: "medium",
  },

  /* Track C */
  C03: {
    what: "그분이 스스로 결정할 수 있는 상태인지 확인하지 않았어요",
    consequence: "어떤 후견 제도가 가능한지 판단할 수 없어요. 이 답이 모든 길을 정해요.",
    severity: "high",
  },
  C07: {
    what: "후견인 후보가 없어요",
    consequence: "심판을 청구하려면 누가 후견인이 될지 정해야 해요.",
    severity: "high",
  },
  C11: {
    what: "서류가 준비되지 않았어요",
    consequence: "진단서와 가족관계증명서가 없으면 심판 청구를 접수할 수 없어요.",
    severity: "medium",
  },
  C13: {
    what: "대신 해야 할 일의 범위가 없어요",
    consequence: "법원에 무엇을 대신하게 해 달라고 청구할지 정하지 않았어요.",
    severity: "high",
  },

  /* Track D */
  D03: {
    what: "재산 배분을 정하지 않았어요",
    consequence: "누구에게 무엇을 남길지 정하지 않으면 법정상속분대로 나뉘어요.",
    severity: "high",
  },
  D04: {
    what: "배우자 다음 순서를 정하지 않았어요",
    consequence: "배우자가 세상을 떠난 뒤 재산 흐름이 없어 신탁 유형을 확정할 수 없어요.",
    severity: "medium",
  },
  D12: {
    what: "집행을 확인할 사람이 없어요",
    consequence: "내 뜻대로 되고 있는지 확인할 사람이 없어요.",
    severity: "medium",
  },
};

export function findGaps(p: Profile, _design: DesignSet): Gap[] {
  const qs = activeQuestions(p);
  const gaps: Gap[] = [...chapterGaps(p)];

  for (const q of qs) {
    if (q.optional) continue;
    if (isAnswered(p, q.id)) continue;
    const meta = CONSEQUENCE[q.id];
    const ref = q.mapsTo[0];
    gaps.push({
      qid: q.id,
      doc: ref?.doc ?? "expense",
      clause: ref ? `${ref.clause} ${ref.label}` : "—",
      what: meta?.what ?? `${q.prompt} (아직 답하지 않았어요)`,
      consequence:
        meta?.consequence ??
        "이 항목이 비어 있으면 그 조항을 쓸 수 없어요.",
      severity: meta?.severity ?? "medium",
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
