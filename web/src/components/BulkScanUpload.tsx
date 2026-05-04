import { useCallback, useRef, useState } from "react";
import type { AnswerSheetRow } from "@/api/exams";
import { processAnswerSheetScan, uploadAnswerSheetScan } from "@/api/results";
import { Button } from "@/components/ui/Button";
import { formatApiError } from "@/lib/format-api-error";

type QueueItem = {
  key: string;
  file: File;
  sheetId: string;
  studentLabel: string;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
};

export type BulkScanUploadProps = {
  sheets: AnswerSheetRow[];
  onDone: () => void;
};

let bulkKey = 0;
function nextKey() {
  bulkKey += 1;
  return `bulk-${bulkKey}`;
}

/**
 * Envio em lote de imagens: associa cada arquivo à linha correspondente da tabela (mesma ordem).
 */
export function BulkScanUpload({ sheets, onDone }: BulkScanUploadProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      setQueue((prev) => {
        const out = [...prev];
        const start = out.length;
        for (let i = 0; i < files.length; i++) {
          const file = files.item(i);
          if (!file) continue;
          const sheet = sheets[start + i];
          if (!sheet) {
            out.push({
              key: nextKey(),
              file,
              sheetId: "",
              studentLabel: "",
              status: "error",
              message: `Sem cartão na posição ${start + i + 1} (há ${sheets.length} cartão(ões)).`,
            });
            continue;
          }
          out.push({
            key: nextKey(),
            file,
            sheetId: sheet.id,
            studentLabel: sheet.studentSnapshot.fullName,
            status: "pending",
          });
        }
        return out;
      });
    },
    [sheets],
  );

  const runQueue = useCallback(async () => {
    const pending = queueRef.current.filter((q) => q.status === "pending" && q.sheetId);
    if (!pending.length) return;
    setRunning(true);
    for (const item of pending) {
      setQueue((prev) =>
        prev.map((x) => (x.key === item.key ? { ...x, status: "uploading" as const } : x)),
      );
      try {
        const up = await uploadAnswerSheetScan(item.sheetId, item.file);
        await processAnswerSheetScan(item.sheetId, up.id, true);
        setQueue((prev) => prev.map((x) => (x.key === item.key ? { ...x, status: "done" as const } : x)));
      } catch (e) {
        setQueue((prev) =>
          prev.map((x) =>
            x.key === item.key
              ? { ...x, status: "error" as const, message: formatApiError(e, "Falha no envio.") }
              : x,
          ),
        );
      }
    }
    setRunning(false);
    onDone();
  }, [onDone]);

  const clearDone = () => {
    setQueue((q) => q.filter((x) => x.status !== "done"));
  };

  if (!sheets.length) {
    return null;
  }

  return (
    <div className="bulk-scan-upload">
      <p className="muted small">
        Selecione várias imagens de uma vez. Elas serão associadas <strong>na ordem</strong> aos cartões da tabela (1ª
        imagem → 1º aluno, e assim por diante).
      </p>
      <div className="bulk-scan-upload__toolbar">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={running}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="primary"
          disabled={running || !queue.some((q) => q.status === "pending")}
          onClick={() => void runQueue()}
        >
          {running ? "Enviando…" : "Processar fila"}
        </Button>
        <Button type="button" variant="ghost" disabled={running || !queue.some((q) => q.status === "done")} onClick={clearDone}>
          Limpar concluídos
        </Button>
      </div>
      {queue.length > 0 ? (
        <ul className="bulk-scan-upload__list">
          {queue.map((item) => (
            <li key={item.key} className="bulk-scan-upload__item">
              <span className="bulk-scan-upload__name">{item.file.name}</span>
              {item.studentLabel ? (
                <span className="muted small">
                  {" → "}
                  {item.studentLabel}
                </span>
              ) : null}
              <span className={`bulk-scan-upload__status bulk-scan-upload__status--${item.status}`}>
                {item.status === "pending" ? "Na fila" : null}
                {item.status === "uploading" ? "Enviando…" : null}
                {item.status === "done" ? "Concluído" : null}
                {item.status === "error" ? `Erro: ${item.message ?? ""}` : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
