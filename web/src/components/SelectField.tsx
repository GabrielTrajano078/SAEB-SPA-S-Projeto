import type { CSSProperties, ReactNode, SelectHTMLAttributes } from "react";

export type SelectFieldOption = { value: string; label: string };

type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "children">;

export type SelectFieldProps = NativeSelectProps & {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  /** Primeira opção (ex.: “Selecione…”, “Todas”); valor padrão da opção vazia é string vazia. */
  emptyOption?: { label: string; value?: string };
  className?: string;
  style?: CSSProperties;
};

function mergeFieldClass(className?: string): string {
  return ["field", className].filter(Boolean).join(" ");
}

/**
 * Select nativo com rótulo no padrão visual `.field` do app (alinha com `.form-grid .field select`).
 */
export function SelectField({
  label,
  value,
  onValueChange,
  options,
  emptyOption,
  className,
  style,
  ...selectProps
}: SelectFieldProps) {
  return (
    <label className={mergeFieldClass(className)} style={style}>
      {label}
      <select
        {...selectProps}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
        }}
      >
        {emptyOption ? (
          <option key="__empty" value={emptyOption.value ?? ""}>
            {emptyOption.label}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
