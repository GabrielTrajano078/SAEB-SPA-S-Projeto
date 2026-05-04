import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listExams } from "@/api/exams";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { copy } from "@/lib/copy";
import { disciplineLabel } from "@/lib/discipline";
import { formatApiError } from "@/lib/format-api-error";

export function ExamsPage() {
  const { state } = useAuth();
  const q = useQuery({
    queryKey: ["exams"],
    queryFn: () => listExams(),
    enabled: state.status === "authenticated",
  });

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <section className="panel">
        <div className="section-header">
          <h2>Provas</h2>
          <Button asChild variant="primary">
            <Link to="/provas/nova">Nova prova</Link>
          </Button>
        </div>
      </section>
      <section className="panel">
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {formatApiError(q.error, copy.examListError)}
          </p>
        ) : null}
        {q.data && q.data.length === 0 ? (
          <EmptyState
            title="Nenhuma prova ainda"
            description="Crie uma prova diagnóstica ou simulado para acompanhar resultados por turma."
            action={
              <Button asChild variant="primary">
                <Link to="/provas/nova">Criar prova</Link>
              </Button>
            }
          />
        ) : null}
        {q.data && q.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Código</th>
                  <th>Disciplina / Ano</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Qtd</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((e) => (
                  <tr key={e._id}>
                    <td>{e.title}</td>
                    <td>
                      <span className="badge">{e.examCode ?? "—"}</span>
                    </td>
                    <td>
                      {disciplineLabel(e.discipline)} · {e.grade}º
                    </td>
                    <td>{e.examType ?? "—"}</td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td>{e.questionCount ?? "—"}</td>
                    <td>
                      <Link to={`/provas/${e._id}`}>Abrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
