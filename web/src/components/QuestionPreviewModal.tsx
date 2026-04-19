import { useEffect, useId, useRef } from "react";
import type { QuestionListItem } from "@/api/questions";
import { disciplineLabel } from "@/lib/discipline";
import { axisLabel } from "@/lib/curriculum-axis";

type Props = {
  question: QuestionListItem | null;
  onClose: () => void;
};

export function QuestionPreviewModal({ question, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!question) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [question, onClose]);

  if (!question) return null;

  const opts = [
    { key: "A" as const, text: question.optionA },
    { key: "B" as const, text: question.optionB },
    { key: "C" as const, text: question.optionC },
    { key: "D" as const, text: question.optionD },
  ];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id={titleId} className="modal-title">
            Questão
          </h2>
          <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-body">
          <div className="question-meta">
            <span className="question-chip">{disciplineLabel(question.discipline)}</span>
            <span className="question-chip">{question.grade}º ano</span>
            <span className="question-chip">{question.framework}</span>
            <span className="question-chip">Desc. {question.descriptor}</span>
            {question.axis ? <span className="question-chip">{axisLabel(question.axis)}</span> : null}
          </div>
          <div className="question-prompt">{question.prompt}</div>
          <ul className="question-options">
            {opts.map(({ key, text }) => (
              <li key={key} className="question-option">
                <span className="question-option-key">{key}</span>
                <span className="question-option-text">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
