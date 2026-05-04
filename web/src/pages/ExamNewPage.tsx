import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createExam, fetchSimulatedBlueprint, type ExamTypeApi } from "@/api/exams";
import { fetchQuestionSuggestions } from "@/api/questions";
import { listSchools } from "@/api/schools";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { RadioCardGroup, type RadioCardOption } from "@/components/ui/RadioCardGroup";
import { Stepper } from "@/components/ui/Stepper";
import { ApiError } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { formatApiError } from "@/lib/format-api-error";

/** Fluxo de montagem: diagnósticos por descritor, simulados por eixo, ou reforço (mesmo tipo de API que diagnóstico inicial). */
type ExamFlow =
  | "DIAGNOSTICO_INICIAL"
  | "DIAGNOSTICO_FINAL"
  | "SIMULADO_1"
  | "SIMULADO_2"
  | "SIMULADO_3"
  | "SIMULADO_4"
  | "REFORCO";

type BlueprintRow = { descriptor: string; count: number };

const FW = "SAEB" as const;

const DISCIPLINE_OPTIONS: SelectFieldOption[] = [
  { value: "LP", label: "Língua Portuguesa" },
  { value: "MAT", label: "Matemática" },
];

const GRADE_OPTIONS: SelectFieldOption[] = [
  { value: "5", label: "5º" },
  { value: "9", label: "9º" },
];

const EXAM_FLOW_OPTIONS: SelectFieldOption[] = [
  { value: "DIAGNOSTICO_INICIAL", label: "Diagnóstico inicial (blocos por descritor)" },
  { value: "SIMULADO_1", label: "Simulado 1 (distribuição por eixo)" },
  { value: "SIMULADO_2", label: "Simulado 2 (distribuição por eixo)" },
  { value: "SIMULADO_3", label: "Simulado 3 (distribuição por eixo)" },
  { value: "SIMULADO_4", label: "Simulado 4 (distribuição por eixo)" },
  { value: "DIAGNOSTICO_FINAL", label: "Diagnóstico final (blocos por descritor)" },
  { value: "REFORCO", label: "Reforço (descritores fracos da turma)" },
];

const RADIO_FLOW_OPTIONS: RadioCardOption<ExamFlow>[] = EXAM_FLOW_OPTIONS.map((o) => {
  const label = o.label;
  const open = label.indexOf("(");
  const close = label.lastIndexOf(")");
  if (open > 0 && close > open) {
    return {
      value: o.value as ExamFlow,
      title: label.slice(0, open).trim(),
      description: label.slice(open + 1, close).trim(),
    };
  }
  return { value: o.value as ExamFlow, title: label };
});

export function ExamNewPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);

  const [title, setTitle] = useState("Prova diagnóstica");
  const [schoolPick, setSchoolPick] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [discipline, setDiscipline] = useState<"LP" | "MAT">("LP");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [examFlow, setExamFlow] = useState<ExamFlow>("DIAGNOSTICO_INICIAL");
  const [rows, setRows] = useState<BlueprintRow[]>([{ descriptor: "D1", count: 5 }]);

  const user = state.status === "authenticated" ? state.user : null;

  const schoolsQuery = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: !!user && (user.role === "admin" || user.role === "gestor"),
  });

  const effectiveSchoolId = useMemo(() => {
    if (user?.role === "professor" || user?.role === "coordenador") {
      return user.schoolId ?? "";
    }
    const list = schoolsQuery.data;
    if (schoolPick) {
      return schoolPick;
    }
    if (list?.length === 1) {
      return list[0]._id;
    }
    return "";
  }, [user, schoolPick, schoolsQuery.data]);

  const classesQuery = useQuery({
    queryKey: ["classes", effectiveSchoolId],
    queryFn: () => listClassrooms({ schoolId: effectiveSchoolId }),
    enabled: Boolean(effectiveSchoolId),
  });

  const isSimulado = examFlow.startsWith("SIMULADO_");

  const simQuery = useQuery({
    queryKey: ["sim-blueprint", discipline, grade],
    queryFn: () => fetchSimulatedBlueprint({ discipline, grade }),
    enabled: isSimulado,
  });

  const axisBlocks = useMemo(() => {
    if (!isSimulado) {
      return [];
    }
    return simQuery.data?.blueprintByAxis ?? [];
  }, [isSimulado, simQuery.data]);

  const suggestionsQuery = useQuery({
    queryKey: ["suggestions", classroomId, discipline, grade],
    queryFn: () =>
      fetchQuestionSuggestions({
        classroomId,
        discipline,
        grade,
        framework: FW,
      }),
    enabled: false,
  });

  useEffect(() => {
    if (wizardStep !== 1 || examFlow !== "REFORCO" || !classroomId) {
      return;
    }
    if (suggestionsQuery.isFetching || suggestionsQuery.data) {
      return;
    }
    void suggestionsQuery.refetch();
  }, [wizardStep, examFlow, classroomId, suggestionsQuery]);

  const m = useMutation({
    mutationFn: async () => {
      if (!effectiveSchoolId || !classroomId) {
        throw new Error("Selecione escola e turma.");
      }

      const examTypeForApi = (): ExamTypeApi => {
        if (examFlow === "REFORCO") return "DIAGNOSTICO_INICIAL";
        if (examFlow === "DIAGNOSTICO_INICIAL") return "DIAGNOSTICO_INICIAL";
        if (examFlow === "DIAGNOSTICO_FINAL") return "DIAGNOSTICO_FINAL";
        return examFlow;
      };

      if (examFlow === "DIAGNOSTICO_INICIAL" || examFlow === "DIAGNOSTICO_FINAL") {
        if (!rows.length || rows.some((r) => !r.descriptor.trim() || r.count < 1)) {
          throw new Error("Preencha descritores e quantidades válidas.");
        }
        return createExam({
          schoolId: effectiveSchoolId,
          classroomId,
          title,
          discipline,
          grade,
          framework: FW,
          examType: examTypeForApi(),
          blueprint: rows.map((r) => ({ descriptor: r.descriptor.trim(), count: r.count })),
        });
      }

      if (isSimulado) {
        if (!axisBlocks.length) {
          throw new Error("Carregue a distribuição do simulado.");
        }
        return createExam({
          schoolId: effectiveSchoolId,
          classroomId,
          title,
          discipline,
          grade,
          framework: FW,
          examType: examTypeForApi(),
          blueprintByAxis: axisBlocks,
        });
      }

      const weak = suggestionsQuery.data?.weakDescriptors ?? [];
      if (!weak.length) {
        throw new Error("Carregue sugestões de reforço (descritores fracos).");
      }
      const blueprint = weak.slice(0, 8).map((w) => ({ descriptor: w.descriptor, count: 2 }));
      return createExam({
        schoolId: effectiveSchoolId,
        classroomId,
        title,
        discipline,
        grade,
        framework: FW,
        examType: "DIAGNOSTICO_INICIAL",
        blueprint,
      });
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["exams"] });
      navigate(`/provas/${data.id}`);
    },
    onError: (e: unknown) => {
      setErr(formatApiError(e, copy.examCreateError));
    },
  });

  const wizardSteps = useMemo(() => {
    const labels = ["Identificação", "Estrutura", "Revisão"];
    return labels.map((label, i) => ({
      id: `exam-new-wizard-${i}`,
      label,
      state: (i < wizardStep ? "complete" : i === wizardStep ? "current" : "upcoming") as
        | "complete"
        | "current"
        | "upcoming",
    }));
  }, [wizardStep]);

  const scrollWizard = (anchorId: string) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validateStep0 = (): string | null => {
    if (!title.trim() || title.trim().length < 3) {
      return "Informe um título com pelo menos 3 caracteres.";
    }
    if ((user?.role === "admin" || user?.role === "gestor") && !effectiveSchoolId) {
      return "Selecione a escola.";
    }
    if (!classroomId) {
      return "Selecione a turma.";
    }
    return null;
  };

  const validateStep1 = (): string | null => {
    if (examFlow === "DIAGNOSTICO_INICIAL" || examFlow === "DIAGNOSTICO_FINAL") {
      if (!rows.length || rows.some((r) => !r.descriptor.trim() || r.count < 1)) {
        return "Preencha descritores e quantidades válidas.";
      }
    }
    if (isSimulado) {
      if (!axisBlocks.length) {
        return "Aguarde o blueprint do simulado ou verifique disciplina e ano.";
      }
    }
    if (examFlow === "REFORCO") {
      const weak = suggestionsQuery.data?.weakDescriptors ?? [];
      if (!weak.length) {
        return "Carregue os descritores fracos da turma (use o botão abaixo).";
      }
    }
    return null;
  };

  const goNext = () => {
    setErr(null);
    if (wizardStep === 0) {
      const e = validateStep0();
      if (e) {
        setErr(e);
        return;
      }
      setWizardStep(1);
      return;
    }
    if (wizardStep === 1) {
      const e = validateStep1();
      if (e) {
        setErr(e);
        return;
      }
      setWizardStep(2);
    }
  };

  const goBack = () => {
    setErr(null);
    setWizardStep((s) => Math.max(0, s - 1));
  };

  if (state.status !== "authenticated") {
    return null;
  }

  const authUser = state.user;

  const flowLabel = EXAM_FLOW_OPTIONS.find((o) => o.value === examFlow)?.label ?? examFlow;
  const classroomLabel =
    (classesQuery.data ?? []).find((c) => c._id === classroomId)?.name ?? (classroomId ? "Turma selecionada" : "—");
  const schoolLabel =
    authUser.role === "admin" || authUser.role === "gestor"
      ? (schoolsQuery.data ?? []).find((s) => s._id === effectiveSchoolId)?.name ?? "—"
      : "Vinculada ao perfil";

  return (
    <div>
      <section className="panel">
        <h2>Nova prova</h2>
        <p className="muted small">
          <Link to="/provas">← Voltar</Link>
        </p>
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}

        <Stepper steps={wizardSteps} onStepClick={(aid) => scrollWizard(aid)} />

        <div className="exam-new-wizard">
          <div id="exam-new-wizard-0" hidden={wizardStep !== 0}>
            <div className="form-grid exam-new-wizard__grid">
              <label className="field field--span-full">
                Título
                <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
              </label>

              {authUser.role === "admin" || authUser.role === "gestor" ? (
                <SelectField
                  label="Escola"
                  className="field--span-full"
                  value={schoolPick || (schoolsQuery.data?.length === 1 ? schoolsQuery.data[0]._id : "")}
                  onValueChange={setSchoolPick}
                  options={(schoolsQuery.data ?? []).map((s) => ({ value: s._id, label: s.name }))}
                  emptyOption={{ label: "Selecione…" }}
                  required
                />
              ) : (
                <p className="muted small field--span-full">Escola vinculada ao seu perfil.</p>
              )}

              <SelectField
                label="Turma"
                className="field--span-full"
                value={classroomId}
                onValueChange={setClassroomId}
                options={(classesQuery.data ?? []).map((c) => ({ value: c._id, label: `${c.name} (${c.grade}º)` }))}
                emptyOption={{ label: "Selecione…" }}
                required
                disabled={!effectiveSchoolId}
              />

              <SelectField
                label="Disciplina"
                value={discipline}
                onValueChange={(v) => setDiscipline(v as typeof discipline)}
                options={DISCIPLINE_OPTIONS}
              />
              <SelectField
                label="Ano"
                value={grade}
                onValueChange={(v) => setGrade(v as typeof grade)}
                options={GRADE_OPTIONS}
              />
              <p className="muted small field--span-full">
                Matriz avaliativa: <strong>SAEB</strong>
              </p>
            </div>
          </div>

          <div id="exam-new-wizard-1" hidden={wizardStep !== 1}>
            <p className="muted small">Tipo de prova</p>
            <RadioCardGroup name="exam-flow" value={examFlow} onChange={setExamFlow} options={RADIO_FLOW_OPTIONS} />

            {examFlow === "DIAGNOSTICO_INICIAL" || examFlow === "DIAGNOSTICO_FINAL" ? (
              <div className="exam-new-wizard__block">
                <p className="muted small">Blocos: cada descritor com quantidade de questões sorteadas do banco.</p>
                {rows.map((row, i) => (
                  <div key={i} className="exam-new-wizard__row">
                    <input
                      placeholder="Descritor"
                      value={row.descriptor}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], descriptor: e.target.value };
                        setRows(next);
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="exam-new-wizard__count"
                      value={row.count}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...next[i], count: Number(e.target.value) || 1 };
                        setRows(next);
                      }}
                    />
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      disabled={rows.length <= 1}
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button type="button" className="ghost" onClick={() => setRows([...rows, { descriptor: "", count: 3 }])}>
                  + Bloco
                </button>
              </div>
            ) : null}

            {isSimulado ? (
              <div className="exam-new-wizard__block">
                {simQuery.isLoading ? <p className="muted">{copy.blueprintLoading}</p> : null}
                {simQuery.isError ? (
                  <p className="error" role="alert">
                    {simQuery.error instanceof ApiError ? simQuery.error.message : "Erro ao carregar blueprint."}
                  </p>
                ) : null}
                {axisBlocks.length > 0 ? (
                  <ul className="list">
                    {axisBlocks.map((b) => (
                      <li key={b.axis}>
                        {b.axis}: {b.count} questão(ões) — total {simQuery.data?.totalQuestions ?? "—"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">A distribuição é carregada automaticamente ao escolher disciplina e ano.</p>
                )}
              </div>
            ) : null}

            {examFlow === "REFORCO" ? (
              <div className="exam-new-wizard__block">
                <button
                  type="button"
                  className="ghost"
                  disabled={!classroomId || suggestionsQuery.isFetching}
                  onClick={() => {
                    setErr(null);
                    void suggestionsQuery.refetch();
                  }}
                >
                  {suggestionsQuery.isFetching ? "Carregando…" : "Carregar descritores fracos"}
                </button>
                {suggestionsQuery.data ? (
                  <div className="table-wrap">
                    <p className="small muted">
                      Serão usados até 8 descritores mais fracos, 2 questões cada. A prova é registrada como diagnóstico
                      inicial.
                    </p>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Descritor</th>
                          <th>Eixo</th>
                          <th>% acerto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suggestionsQuery.data.weakDescriptors.map((w) => (
                          <tr key={w.descriptor}>
                            <td>{w.descriptor}</td>
                            <td>{w.axis ?? "—"}</td>
                            <td>{w.accuracy}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {suggestionsQuery.data.weakDescriptors.length === 0 ? (
                      <p className="muted">Sem histórico suficiente — aplique provas e correções antes.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div id="exam-new-wizard-2" hidden={wizardStep !== 2}>
            <div className="exam-new-wizard__summary">
              <p>
                <strong>Título:</strong> {title}
              </p>
              <p>
                <strong>Escola:</strong> {schoolLabel}
              </p>
              <p>
                <strong>Turma:</strong> {classroomLabel}
              </p>
              <p>
                <strong>Disciplina / ano:</strong> {discipline === "LP" ? "Língua Portuguesa" : "Matemática"} · {grade}º
              </p>
              <p>
                <strong>Tipo:</strong> {flowLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="row-actions exam-new-wizard__actions">
          {wizardStep > 0 ? (
            <Button type="button" variant="ghost" onClick={goBack}>
              Voltar
            </Button>
          ) : null}
          {wizardStep < 2 ? (
            <Button type="button" variant="primary" onClick={goNext}>
              Continuar
            </Button>
          ) : (
            <Button type="button" variant="primary" disabled={m.isPending} onClick={() => m.mutate()}>
              {m.isPending ? "Criando…" : "Criar prova"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
