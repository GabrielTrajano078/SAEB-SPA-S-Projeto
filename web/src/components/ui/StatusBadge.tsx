export type ExamStatusUi = "DRAFT" | "READY" | "APPLIED" | "CLOSED" | (string & {});

const STATUS_MAP: Record<
  string,
  {
    label: string;
    tone: "neutral" | "info" | "warning" | "success";
  }
> = {
  DRAFT: { label: "Rascunho", tone: "neutral" },
  READY: { label: "Gabarito publicado", tone: "info" },
  APPLIED: { label: "Em correção", tone: "warning" },
  CLOSED: { label: "Concluída", tone: "success" },
};

export type StatusBadgeProps = {
  status: ExamStatusUi | undefined | null;
};

/** Chip de status de prova alinhado às regras de negócio da API. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const key = (status ?? "DRAFT").toUpperCase();
  const meta = STATUS_MAP[key] ?? { label: status ?? "—", tone: "neutral" as const };
  return <span className={`status-badge status-badge--${meta.tone}`}>{meta.label}</span>;
}
