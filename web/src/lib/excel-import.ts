function normalizeHeaderKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function rowToMap(row: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    m.set(normalizeHeaderKey(k), v);
  }
  return m;
}

function pickFromMap(m: Map<string, unknown>, aliases: string[]): unknown {
  for (const a of aliases) {
    const key = normalizeHeaderKey(a);
    const v = m.get(key);
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return v;
    }
  }
  for (const [k, v] of m) {
    if (v === undefined || v === null || String(v).trim() === "") continue;
    for (const a of aliases) {
      const na = normalizeHeaderKey(a);
      if (k === na || k.includes(na)) {
        return v;
      }
    }
  }
  return undefined;
}

const CLASS_NAME_KEYS = ["nome", "name", "turma", "classe", "sala"];
const GRADE_KEYS = ["ano", "grade", "serie", "série", "nivel", "nível"];
const STUDENT_NAME_KEYS = ["nome", "name", "aluno", "nome completo", "nome_completo"];
const REG_KEYS = ["matricula", "matrícula", "codigo", "código", "codigo de matricula", "registro", "registration"];

export function parseGradeValue(v: unknown): "5" | "9" | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v === 5) return "5";
    if (v === 9) return "9";
  }
  const s = String(v)
    .trim()
    .replace(/º/gi, "")
    .replace(/\s/g, "");
  if (s === "5") return "5";
  if (s === "9") return "9";
  return null;
}

export async function readExcelFirstSheet(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
}

export type ClassroomRowParse =
  | { kind: "empty" }
  | { kind: "invalid"; reason: string }
  | { kind: "ok"; name: string; grade: "5" | "9" };

export function parseClassroomRow(row: Record<string, unknown>): ClassroomRowParse {
  const m = rowToMap(row);
  const nameRaw = pickFromMap(m, CLASS_NAME_KEYS);
  const gradeRaw = pickFromMap(m, GRADE_KEYS);
  const name = nameRaw !== undefined && nameRaw !== null ? String(nameRaw).trim() : "";
  if (!name && (gradeRaw === undefined || gradeRaw === null || String(gradeRaw).trim() === "")) {
    return { kind: "empty" };
  }
  if (!name) return { kind: "invalid", reason: "nome da turma ausente" };
  const grade = parseGradeValue(gradeRaw);
  if (!grade) return { kind: "invalid", reason: 'ano inválido (use 5 ou 9, ex.: "5" ou "9")' };
  return { kind: "ok", name, grade };
}

export type StudentRowParse =
  | { kind: "empty" }
  | { kind: "invalid"; reason: string }
  | { kind: "ok"; fullName: string; registrationCode: string };

export function parseStudentRow(row: Record<string, unknown>): StudentRowParse {
  const m = rowToMap(row);
  const nameRaw = pickFromMap(m, STUDENT_NAME_KEYS);
  const regRaw = pickFromMap(m, REG_KEYS);
  const fullName = nameRaw !== undefined && nameRaw !== null ? String(nameRaw).trim() : "";
  const registrationCode = regRaw !== undefined && regRaw !== null ? String(regRaw).trim() : "";
  if (!fullName && !registrationCode) return { kind: "empty" };
  if (!fullName) return { kind: "invalid", reason: "nome ausente" };
  if (!registrationCode) return { kind: "invalid", reason: "matrícula ausente" };
  if (fullName.length < 2) return { kind: "invalid", reason: "nome muito curto (mín. 2 caracteres)" };
  if (registrationCode.length < 2) return { kind: "invalid", reason: "matrícula muito curta (mín. 2 caracteres)" };
  return { kind: "ok", fullName, registrationCode };
}

export async function downloadClassroomTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["nome", "ano"],
    ["5º A Manhã", 5],
    ["9º B Tarde", 9],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Turmas");
  XLSX.writeFile(wb, "modelo-importacao-turmas.xlsx");
}

export async function downloadStudentTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["nome", "matricula"],
    ["Maria Silva", "2024001"],
    ["João Santos", "2024002"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Alunos");
  XLSX.writeFile(wb, "modelo-importacao-alunos.xlsx");
}
