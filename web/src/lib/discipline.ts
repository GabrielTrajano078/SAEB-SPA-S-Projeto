/** Rótulos para códigos de disciplina enviados/recebidos pela API. */
const LABELS: Record<"LP" | "MAT", string> = {
  LP: "Língua Portuguesa",
  MAT: "Matemática",
};

export function disciplineLabel(code: string): string {
  if (code === "LP" || code === "MAT") {
    return LABELS[code];
  }
  return code;
}
