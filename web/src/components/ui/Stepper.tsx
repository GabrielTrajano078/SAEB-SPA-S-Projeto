export type StepperStepState = "complete" | "current" | "upcoming";

export type StepperItem = {
  id: string;
  label: string;
  state: StepperStepState;
};

export type StepperProps = {
  steps: StepperItem[];
  onStepClick?: (id: string) => void;
};

/** Indicador horizontal de etapas (fluxo da prova, wizard, etc.). */
export function Stepper({ steps, onStepClick }: StepperProps) {
  return (
    <ol className="stepper" aria-label="Etapas do fluxo">
      {steps.map((s, i) => (
        <li key={s.id} className={`stepper__step stepper__step--${s.state}`}>
          <button
            type="button"
            className="stepper__btn"
            disabled={!onStepClick}
            onClick={() => onStepClick?.(s.id)}
            aria-current={s.state === "current" ? "step" : undefined}
          >
            <span className="stepper__dot" aria-hidden />
            <span className="stepper__label">{s.label}</span>
          </button>
          {i < steps.length - 1 ? <span className="stepper__sep" aria-hidden /> : null}
        </li>
      ))}
    </ol>
  );
}
