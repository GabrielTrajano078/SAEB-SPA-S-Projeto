import type { ReactNode } from "react";

export type RadioCardOption<T extends string> = {
  value: T;
  title: string;
  description?: ReactNode;
};

type RadioCardGroupProps<T extends string> = {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: RadioCardOption<T>[];
};

/** Tipo de prova (ou opção exclusiva) em cartões visuais em vez de `<select>`. */
export function RadioCardGroup<T extends string>({ name, value, onChange, options }: RadioCardGroupProps<T>) {
  return (
    <div className="radio-card-group" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label key={opt.value} className={`radio-card${selected ? " radio-card--selected" : ""}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => {
                onChange(opt.value);
              }}
            />
            <span className="radio-card__title">{opt.title}</span>
            {opt.description ? <span className="radio-card__desc muted small">{opt.description}</span> : null}
          </label>
        );
      })}
    </div>
  );
}
