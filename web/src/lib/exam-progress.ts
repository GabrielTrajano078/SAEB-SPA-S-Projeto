import type { StepperStepState } from "@/components/ui/Stepper";

export type ExamProgressStep = {
  id: string;
  label: string;
  state: StepperStepState;
};

/**
 * Monta os passos do fluxo da prova (gabarito → cartões → leitura → encerramento)
 * com base no status da prova e nos cartões-resposta.
 */
export function buildExamProgressSteps(params: {
  examStatus: string | undefined;
  sheets: { processingStatus: string }[];
}): ExamProgressStep[] {
  const st = (params.examStatus ?? "DRAFT").toUpperCase();
  const sheetCount = params.sheets.length;
  const anyProcessed = params.sheets.some((s) => s.processingStatus === "DONE" || s.processingStatus === "NEEDS_REVIEW");
  const examClosed = st === "CLOSED";

  const keyPublished = st === "READY" || st === "APPLIED" || st === "CLOSED";
  const cardsGenerated = sheetCount > 0;

  const doneProva = true;
  const doneGabarito = keyPublished;
  const doneCartoes = cardsGenerated;
  const doneLeitura = anyProcessed;
  /** Resultados consolidados quando a prova foi encerrada na API. */
  const doneResultados = examClosed;

  const flags = [doneProva, doneGabarito, doneCartoes, doneLeitura, doneResultados];

  let currentIdx = flags.findIndex((f) => !f);
  if (currentIdx === -1) {
    currentIdx = flags.length;
  }

  const labels = [
    "Prova configurada",
    "Gabarito publicado",
    "Cartões gerados",
    "Leitura dos cartões",
    "Resultados",
  ];

  const ids = ["exam-flow-root", "exam-flow-key", "exam-flow-sheets", "exam-flow-upload", "exam-flow-results"];

  return ids.map((id, i) => {
    let state: StepperStepState;
    if (flags[i]) {
      state = "complete";
    } else if (i === currentIdx) {
      state = "current";
    } else {
      state = "upcoming";
    }
    return { id, label: labels[i]!, state };
  });
}
