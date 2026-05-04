/** Retorna `n singular` ou `n plural` conforme o idioma PT (1 vs demais). */
export function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
