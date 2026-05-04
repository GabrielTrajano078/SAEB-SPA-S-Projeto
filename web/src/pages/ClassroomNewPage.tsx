import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { createClassroom } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { NewClassroomForm } from "./classes/NewClassroomForm";

export function ClassroomNewPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [formError, setFormError] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;
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

  const createM = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      navigate("/turmas");
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
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

  if (state.status !== "authenticated" || !user) {
    return null;
  }

  const schools = schoolsQ.data ?? [];

  return (
    <div>
      <section className="panel">
        <h2>Nova turma</h2>
        <p className="muted small">
          <Link to="/turmas">← Voltar</Link>
        </p>
        <p className="muted small">Escola, nome e ano. A importação por Excel fica na listagem de turmas.</p>

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
          user={user}
          formError={formError}
          createM={createM}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}
