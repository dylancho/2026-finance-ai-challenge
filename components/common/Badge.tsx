type Tone = "neutral" | "ok" | "warn" | "danger" | "info";

export default function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

const STATUS_MAP = {
  set: { tone: "ok" as const, label: "설정됨" },
  partial: { tone: "warn" as const, label: "일부 설정" },
  missing: { tone: "danger" as const, label: "미설정" },
};

export function StatusBadge({ status }: { status: "set" | "partial" | "missing" }) {
  const s = STATUS_MAP[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
