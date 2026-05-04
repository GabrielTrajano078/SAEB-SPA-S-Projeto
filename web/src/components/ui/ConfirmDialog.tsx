import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./Button";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type Pending = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

/* eslint-disable react-refresh/only-export-components -- hook acoplado ao provider do mesmo módulo */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const fn = useContext(ConfirmContext);
  if (!fn) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider.");
  }
  return fn;
}
/* eslint-enable react-refresh/only-export-components */

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const titleId = useId();
  const descId = useId();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next: Pending = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    p?.resolve(result);
  }, []);

  const opts = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts ? (
        <div className="confirm-dialog-backdrop" role="presentation" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={opts.description ? descId : undefined}
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="confirm-dialog__title">
              {opts.title}
            </h2>
            {opts.description ? (
              <p id={descId} className="confirm-dialog__desc muted small">
                {opts.description}
              </p>
            ) : null}
            <div className="confirm-dialog__actions">
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                {opts.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                type="button"
                variant={opts.variant === "danger" ? "dangerFilled" : "primary"}
                onClick={() => close(true)}
              >
                {opts.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
