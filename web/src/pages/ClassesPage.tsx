import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { createClassroom, listClassrooms } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import {
  downloadClassroomTemplate,
  parseClassroomRow,
  readExcelFirstSheet,
} from "@/lib/excel-import";
import { useEffect, useRef, useState } from "react";

export function ClassesPage() {
  const qc = useQueryClient();
  const { state } = useAuth();
  const [schoolFilter, setSchoolFilter] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<{
    ok: number;
    skipped: number;
    errors: { line: number; message: string }[];
  } | null>(null);
  const classImportRef = useRef<HTMLInputElement>(null);

  const user = state.status === "authenticated" ? state.user : null;
  const canCreate = user && (user.role === "admin" || user.role === "gestor" || user.role === "coordenador");
  const isCoord = user?.role === "coordenador";
  const needsSchoolPicker = user && (user.role === "admin" || user.role === "gestor");

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: state.status === "authenticated" && Boolean(needsSchoolPicker),
  });

  useEffect(() => {
    if (isCoord && user?.schoolId) {
      setSchoolId(user.schoolId);
    }
  }, [isCoord, user?.schoolId]);

  const classesQ = useQuery({
    queryKey: ["classes", "page", schoolFilter],
    queryFn: () => listClassrooms(schoolFilter ? { schoolId: schoolFilter } : undefined),
    enabled: state.status === "authenticated",
  });

  const createM = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      setSuccess("Turma cadastrada.");
      setFormError(null);
      setName("");
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setFormError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    },
  });

  function resolveSchoolIdForCreate(): string | null {
    if (needsSchoolPicker) {
      return schoolId.trim() || null;
    }
    if (isCoord) {
      return user?.schoolId ?? null;
    }
    return null;
  }

  async function handleClassroomExcel(file: File) {
    const sid = resolveSchoolIdForCreate();
    if (!sid) {
      setFormError("Selecione a escola antes de importar.");
      return;
    }
    setImportBusy(true);
    setImportReport(null);
    setFormError(null);
    setSuccess(null);
    try {
      const rows = await readExcelFirstSheet(file);
      let ok = 0;
      let skipped = 0;
      const errors: { line: number; message: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const line = i + 2;
        const parsed = parseClassroomRow(rows[i]!);
        if (parsed.kind === "empty") {
          skipped++;
          continue;
        }
        if (parsed.kind === "invalid") {
          errors.push({ line, message: parsed.reason });
          continue;
        }
        try {
          await createClassroom({ schoolId: sid, name: parsed.name, grade: parsed.grade });
          ok++;
        } catch (err) {
          errors.push({
            line,
            message: err instanceof ApiError ? err.message : "Não foi possível salvar esta linha.",
          });
        }
      }
      setImportReport({ ok, skipped, errors });
      if (ok > 0) {
        void qc.invalidateQueries({ queryKey: ["classes"] });
      }
    } catch {
      setFormError("Não foi possível ler a planilha. Use .xlsx ou .xls e a primeira aba com colunas nome e ano.");
    } finally {
      setImportBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    const sid = schoolId.trim();
    if (!sid) {
      setFormError("Selecione a escola.");
      return;
    }
    const n = name.trim();
    if (!n) {
      setFormError("Informe o nome da turma.");
      return;
    }
    createM.mutate({ schoolId: sid, name: n, grade });
  }

  if (state.status !== "authenticated") {
    return null;
  }

  const { user: u } = state;

  return (
    <div>
      <section className="panel">
        <h2>Turmas</h2>
        {u.role === "admin" || u.role === "gestor" ? (
          <label className="field" style={{ maxWidth: 360, marginTop: "0.75rem" }}>
            <span className="field-label">Filtrar listagem por escola</span>
            <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
              <option value="">Todas (gestor: município)</option>
              {schoolsQ.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {canCreate ? (
          <form className="form-grid" style={{ maxWidth: 480, marginTop: "1.25rem" }} onSubmit={handleSubmit}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", gridColumn: "1 / -1" }}>Nova turma</h3>
            {needsSchoolPicker ? (
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Escola</span>
                <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
                  <option value="">Selecione…</option>
                  {schoolsQ.data?.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : isCoord ? (
              <p className="muted small" style={{ margin: 0, gridColumn: "1 / -1" }}>
                {u.schoolId ? (
                  <>
                    Turma será criada na sua escola (vínculo do perfil).{" "}
                    <span className="muted">ID: …{u.schoolId.slice(-8)}</span>
                  </>
                ) : (
                  <strong className="error">Seu usuário não tem escola vinculada — peça um administrador para vincular a escola ao seu perfil.</strong>
                )}
              </p>
            ) : null}

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">Nome da turma</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex.: 5º A Manhã"
                disabled={isCoord && !u.schoolId}
              />
            </label>
            <label className="field">
              <span className="field-label">Ano</span>
              <select value={grade} onChange={(e) => setGrade(e.target.value as "5" | "9")} disabled={isCoord && !u.schoolId}>
                <option value="5">5º ano</option>
                <option value="9">9º ano</option>
              </select>
            </label>
            {formError ? (
              <p className="error" role="alert" style={{ gridColumn: "1 / -1" }}>
                {formError}
              </p>
            ) : null}
            {success ? (
              <p className="success" role="status" style={{ gridColumn: "1 / -1" }}>
                {success}
              </p>
            ) : null}
            <div className="row-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="primary" disabled={createM.isPending || (isCoord && !u.schoolId)}>
                {createM.isPending ? "Salvando…" : "Cadastrar turma"}
              </button>
            </div>

            <div style={{ gridColumn: "1 / -1", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Importar turmas (Excel)</h4>
              <p className="muted small" style={{ margin: "0 0 0.75rem" }}>
                Planilha com colunas <strong>nome</strong> e <strong>ano</strong> (5 ou 9). Linhas vazias são ignoradas. A escola é a mesma
                selecionada acima (ou a da sua conta, para coordenador).
              </p>
              <div className="import-toolbar">
                <button type="button" className="ghost" onClick={() => void downloadClassroomTemplate()}>
                  Baixar modelo
                </button>
                <input
                  ref={classImportRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void handleClassroomExcel(f);
                  }}
                />
                <button
                  type="button"
                  className="primary"
                  disabled={
                    importBusy ||
                    (isCoord && !u.schoolId) ||
                    Boolean(needsSchoolPicker && !schoolId.trim())
                  }
                  onClick={() => classImportRef.current?.click()}
                >
                  {importBusy ? "Importando…" : "Escolher planilha…"}
                </button>
              </div>
              {importReport ? (
                <div className="import-report" role="status">
                  <p style={{ margin: "0.75rem 0 0" }}>
                    <span className="success">{importReport.ok} turma(s) criada(s).</span>
                    {importReport.skipped > 0 ? (
                      <span className="muted"> {importReport.skipped} linha(s) em branco ignorada(s).</span>
                    ) : null}
                  </p>
                  {importReport.errors.length > 0 ? (
                    <>
                      <p className="error" style={{ margin: "0.5rem 0 0" }}>
                        {importReport.errors.length} linha(s) com problema:
                      </p>
                      <ul className="small muted" style={{ margin: "0.35rem 0 0" }}>
                        {importReport.errors.slice(0, 25).map((e) => (
                          <li key={`${e.line}-${e.message}`}>
                            Linha {e.line}: {e.message}
                          </li>
                        ))}
                        {importReport.errors.length > 25 ? (
                          <li>… e mais {importReport.errors.length - 25}.</li>
                        ) : null}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </form>
        ) : (
          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            Apenas administrador, gestor ou coordenador podem cadastrar turmas.
          </p>
        )}
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>Turmas cadastradas</h3>
        {classesQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {classesQ.isError ? (
          <p className="error" role="alert">
            {classesQ.error instanceof ApiError ? classesQ.error.message : "Erro."}
          </p>
        ) : null}
        {classesQ.data && classesQ.data.length === 0 ? <p className="muted">Nenhuma turma.</p> : null}
        {classesQ.data && classesQ.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ano</th>
                  <th>Escola (id)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classesQ.data.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.grade}º</td>
                    <td className="small muted">{c.schoolId.slice(-8)}</td>
                    <td>
                      <Link to={`/turma/${c._id}`}>Painel</Link>
                      {" · "}
                      <Link to={`/alunos?classroomId=${c._id}`}>Alunos</Link>
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
