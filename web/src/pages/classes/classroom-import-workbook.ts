import { createClassroom } from "@/api/classes";
import { ApiError } from "@/lib/api-client";
import { parseClassroomRow, readExcelFirstSheet } from "@/lib/excel-import";

export type ClassroomImportReport = {
  ok: number;
  skipped: number;
  errors: { line: number; message: string }[];
};

/**
 * Processa a primeira aba do Excel e cria turmas linha a linha para a escola informada.
 */
export async function importClassroomsFromWorkbook(file: File, schoolId: string): Promise<ClassroomImportReport> {
  const rows = await readExcelFirstSheet(file);
  let ok = 0;
  let skipped = 0;
  const errors: { line: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const line = i + 2;
    const parsed = parseClassroomRow(rows[i]);
    if (parsed.kind === "empty") {
      skipped++;
      continue;
    }
    if (parsed.kind === "invalid") {
      errors.push({ line, message: parsed.reason });
      continue;
    }
    try {
      await createClassroom({ schoolId, name: parsed.name, grade: parsed.grade });
      ok++;
    } catch (err) {
      errors.push({
        line,
        message: err instanceof ApiError ? err.message : "Não foi possível salvar esta linha.",
      });
    }
  }
  return { ok, skipped, errors };
}
