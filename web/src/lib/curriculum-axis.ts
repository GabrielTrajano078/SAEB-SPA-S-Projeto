/** Códigos enviados à API (alinhados ao backend). */
export const CURRICULUM_AXIS_CODES = [
  "LEITURA",
  "INTERPRETACAO",
  "GENEROS_TEXTUAIS",
  "LINGUA_ESTUDO",
  "NUMEROS",
  "ALGEBRA",
  "GEOMETRIA",
  "ESTATISTICA",
  "GRANDEZAS_MEDIDAS",
] as const;

export type CurriculumAxisCode = (typeof CURRICULUM_AXIS_CODES)[number];

const LABELS: Record<CurriculumAxisCode, string> = {
  LEITURA: "Leitura",
  INTERPRETACAO: "Interpretação",
  GENEROS_TEXTUAIS: "Gêneros Textuais",
  LINGUA_ESTUDO: "Língua e Estudo",
  NUMEROS: "Números",
  ALGEBRA: "Álgebra",
  GEOMETRIA: "Geometria",
  ESTATISTICA: "Estatística",
  GRANDEZAS_MEDIDAS: "Grandezas e Medidas",
};

/** Rótulo para exibição (minúsculas, texto normal). */
export function axisLabel(code: string): string {
  if (code in LABELS) {
    return LABELS[code as CurriculumAxisCode];
  }
  return code;
}
