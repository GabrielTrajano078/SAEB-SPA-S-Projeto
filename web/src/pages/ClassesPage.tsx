import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { createClassroom, listClassrooms } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { useEffect, useMemo, useState } from "react";
import { ClassesSchoolFilter } from "./classes/ClassesSchoolFilter";
import {
  importClassroomsFromWorkbook,
  type ClassroomImportReport,
} from "./classes/classroom-import-workbook";
import { NewClassroomForm } from "./classes/NewClassroomForm";
import { RegisteredClassesTable } from "./classes/RegisteredClassesTable";

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
  const [importReport, setImportReport] = useState<ClassroomImportReport | null>(null);

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

  const schoolNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of schoolsQ.data ?? []) {
      m.set(s._id, s.name);
    }
    return m;
  }, [schoolsQ.data]);

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
      const report = await importClassroomsFromWorkbook(file, sid);
      setImportReport(report);
      if (report.ok > 0) {
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
  const schools = schoolsQ.data ?? [];
  const importChooseDisabled =
    importBusy || (isCoord && !u.schoolId) || Boolean(needsSchoolPicker && !schoolId.trim());

  return (
    <div>
      <section className="panel">
        <h2>Turmas</h2>
        {u.role === "admin" || u.role === "gestor" ? (
          <ClassesSchoolFilter schools={schools} value={schoolFilter} onValueChange={setSchoolFilter} />
        ) : null}

        {canCreate ? (
          <NewClassroomForm
            schools={schools}
            schoolId={schoolId}
            onSchoolIdChange={setSchoolId}
            name={name}
            onNameChange={setName}
            grade={grade}
            onGradeChange={setGrade}
            needsSchoolPicker={Boolean(needsSchoolPicker)}
            isCoord={Boolean(isCoord)}
            user={u}
            formError={formError}
            success={success}
            createM={createM}
            onSubmit={handleSubmit}
            importBusy={importBusy}
            importReport={importReport}
            importChooseDisabled={importChooseDisabled}
            onImportFile={(f) => void handleClassroomExcel(f)}
          />
        ) : (
          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            Apenas administrador, gestor ou coordenador podem cadastrar turmas.
          </p>
        )}
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>Turmas cadastradas</h3>
        <RegisteredClassesTable
          isLoading={classesQ.isLoading}
          isError={classesQ.isError}
          error={classesQ.error}
          classrooms={classesQ.data}
          schoolNameById={schoolNameById}
          user={u}
          canCreate={Boolean(canCreate)}
        />
      </section>
    </div>
  );
}
