import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  /** Texto opcional abaixo do valor (ex.: tendência). */
  hint?: string;
  /** Link “Ver detalhes”. */
  detailTo?: string;
  detailLabel?: string;
};

export function MetricCard({ label, value, hint, detailTo, detailLabel = "Ver detalhes" }: MetricCardProps) {
  return (
    <div className="metric-card">
      <span className="metric-card__label muted small">{label}</span>
      <span className="metric-card__value">{value}</span>
      {hint ? <span className="metric-card__hint muted small">{hint}</span> : null}
      {detailTo ? (
        <Link className="metric-card__link small" to={detailTo}>
          {detailLabel}
        </Link>
      ) : null}
    </div>
  );
}
