/** Escapa string para uso seguro literal em `RegExp` / `$regex` do MongoDB. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
