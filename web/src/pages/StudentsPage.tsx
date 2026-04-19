import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createStudent, deleteStudent, listStudents } from "@/api/students";
import { ApiError } from "@/lib/api-client";
import { downloadStudentTemplate, parseStudentRow, readExcelFirstSheet } from "@/lib/excel-import";

export function StudentsPage() {
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const classroomId = sp.get("classroomId") ?? "";
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<{
    ok: number;
    skipped: number;
    errors: { line: number; message: string }[];
  } | null>(null);
  const studentImportRef = useRef<HTMLInputElement>(null);

  const user = state.status === "authenticated" ? state.user : null;

  const classesQ = useQuery({
    queryKey: ["classes", "students-page"],
    queryFn: () => listClassrooms(),
    enabled: !!user,
  });

  const selectedClass = useMemo(
    () => classesQ.data?.find((c) => c._id === classroomId),
    [classesQ.data, classroomId],
  );

  const studentsQ = useQuery({
    queryKey: ["students", classroomId],
    queryFn: () => listStudents({ classroomId }),
    enabled: Boolean(classroomId),
  });

  const createM = useMutation({
    mutationFn: () => {
      if (!selectedClass) {
        throw new Error("Selecione turma.");
      }
      return createStudent({
        schoolId: selectedClass.schoolId,
        classroomId: selectedClass._id,
        fullName: fullName.trim(),
        registrationCode: registrationCode.trim(),
      });
    },
    onSuccess: () => {
      setFullName("");
      setRegistrationCode("");
      setFormErr(null);
      void qc.invalidateQueries({ queryKey: ["students", classroomId] });
    },
    onError: (e: unknown) => {
      setFormErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro.");
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      setDeleteErr(null);
      void qc.invalidateQueries({ queryKey: ["students", classroomId] });
    },
    onError: (e: unknown) => {
      setDeleteErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Não foi possível excluir.");
    },
  });

  async function handleStudentExcel(file: File) {
    if (!selectedClass) {
      setFormErr("Selecione uma turma antes de importar.");
      return;
    }
    setImportBusy(true);
    setImportReport(null);
    setFormErr(null);
    try {
      const rows = await readExcelFirstSheet(file);
      let ok = 0;
      let skipped = 0;
      const errors: { line: number; message: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const line = i + 2;
        const parsed = parseStudentRow(rows[i]!);
        if (parsed.kind === "empty") {
          skipped++;
          continue;
        }
        if (parsed.kind === "invalid") {
          errors.push({ line, message: parsed.reason });
          continue;
        }
        try {
          await createStudent({
            schoolId: selectedClass.schoolId,
            classroomId: selectedClass._id,
            fullName: parsed.fullName,
            registrationCode: parsed.registrationCode,
          });
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
        void qc.invalidateQueries({ queryKey: ["students", classroomId] });
      }
    } catch {
      setFormErr(
        "Não foi possível ler a planilha. Use .xlsx ou .xls e a primeira aba com colunas nome e matricula.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  if (state.status !== "authenticated") {
    return null;
  }

  const authUser = state.user;
  const canCreate =
    authUser.role === "admin" ||
    authUser.role === "gestor" ||
    authUser.role === "coordenador" ||
    authUser.role === "professor";

  return (
    <div>
      <section className="panel">
        <h2>Alunos</h2>
        <label className="field" style={{ maxWidth: 400 }}>
          Turma
          <select
            value={classroomId}
            onChange={(e) => {
              setSp(e.target.value ? { classroomId: e.target.value } : {});
            }}
          >
            <option value="">Selecione…</option>
            {classesQ.data?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.grade}º)
              </option>
            ))}
          </select>
        </label>
      </section>

      {canCreate && classroomId ? (
        <section className="panel">
          <h3>Cadastrar aluno</h3>
          {formErr ? (
            <p className="error" role="alert">
              {formErr}
            </p>
          ) : null}
          <div className="form-grid" style={{ maxWidth: 480 }}>
            <label className="field">
              Nome completo
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="field">
              Código de matrícula
              <input value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} required />
            </label>
            <button type="button" className="primary" disabled={createM.isPending} onClick={() => createM.mutate()}>
              {createM.isPending ? "Salvando…" : "Adicionar"}
            </button>
          </div>

          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Importar alunos (Excel)</h4>
            <p className="muted small" style={{ margin: "0 0 0.75rem" }}>
              Colunas <strong>nome</strong> e <strong>matricula</strong> (ou matrícula). Os alunos serão cadastrados na turma selecionada acima.
            </p>
            <div className="import-toolbar">
              <button type="button" className="ghost" onClick={() => void downloadStudentTemplate()}>
                Baixar modelo
              </button>
              <input
                ref={studentImportRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleStudentExcel(f);
                }}
              />
              <button
                type="button"
                className="primary"
                disabled={importBusy || !classroomId}
                onClick={() => studentImportRef.current?.click()}
              >
                {importBusy ? "Importando…" : "Escolher planilha…"}
              </button>
            </div>
            {importReport ? (
              <div className="import-report" role="status">
                <p style={{ margin: "0.75rem 0 0" }}>
                  <span className="success">{importReport.ok} aluno(s) cadastrado(s).</span>
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
        </section>
      ) : null}

      <section className="panel">
        {!classroomId ? <p className="muted">Escolha uma turma.</p> : null}
        {studentsQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {studentsQ.isError ? (
          <p className="error" role="alert">
            {studentsQ.error instanceof ApiError ? studentsQ.error.message : "Erro."}
          </p>
        ) : null}
        {studentsQ.data && studentsQ.data.length === 0 && classroomId ? <p className="muted">Nenhum aluno nesta turma.</p> : null}
        {deleteErr ? (
          <p className="error" role="alert">
            {deleteErr}
          </p>
        ) : null}
        {studentsQ.data && studentsQ.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                  {canCreate ? <th className="col-actions">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {studentsQ.data.map((s) => (
                  <tr key={s._id}>
                    <td>{s.fullName}</td>
                    <td>{s.registrationCode}</td>
                    {canCreate ? (
                      <td className="col-actions">
                        <button
                          type="button"
                          className="btn-danger-text"
                          disabled={deleteM.isPending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Excluir o aluno "${s.fullName}"? Esta ação não pode ser desfeita (inclui cartões e resultados vinculados).`,
                              )
                            ) {
                              return;
                            }
                            deleteM.mutate(s._id);
                          }}
                        >
                          {deleteM.isPending && deleteM.variables === s._id ? "…" : "Excluir"}
                        </button>
                      </td>
                    ) : null}
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
