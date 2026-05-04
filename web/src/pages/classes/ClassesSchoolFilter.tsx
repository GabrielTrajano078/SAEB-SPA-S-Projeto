import { SelectField } from "@/components/SelectField";
import type { School } from "@/schemas/school";

export type ClassesSchoolFilterProps = Readonly<{
  schools: readonly School[];
  value: string;
  onValueChange: (v: string) => void;
}>;

export function ClassesSchoolFilter({ schools, value, onValueChange }: ClassesSchoolFilterProps) {
  return (
    <div className="form-grid" style={{ maxWidth: 360, marginTop: "0.75rem" }}>
      <SelectField
        label={<span className="field-label">Filtrar listagem por escola</span>}
        style={{ gridColumn: "1 / -1" }}
        value={value}
        onValueChange={onValueChange}
        options={schools.map((s) => ({ value: s._id, label: s.name }))}
        emptyOption={{ label: "Todas (gestor: município)" }}
      />
    </div>
  );
}
