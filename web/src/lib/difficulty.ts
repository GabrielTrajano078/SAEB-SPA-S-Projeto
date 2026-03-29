const LABELS: Record<"MUITO_FACIL" | "FACIL" | "MEDIO" | "DIFICIL" | "MUITO_DIFICIL", string> = {
  MUITO_FACIL: "Muito fácil",
  FACIL: "Fácil",
  MEDIO: "Médio",
  DIFICIL: "Difícil",
  MUITO_DIFICIL: "Muito difícil",
};

export type ApiDifficulty = keyof typeof LABELS;

export function difficultyLabel(code: string): string {
  if (code in LABELS) {
    return LABELS[code as ApiDifficulty];
  }
  return code;
}
