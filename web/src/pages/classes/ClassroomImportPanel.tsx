import { useRef } from "react";
import { downloadClassroomTemplate } from "@/lib/excel-import";
import { Button } from "@/components/ui/Button";
import type { ClassroomImportReport } from "./classroom-import-workbook";

export type ClassroomImportPanelProps = {
  importBusy: boolean;
  importReport: ClassroomImportReport | null;
  chooseFileDisabled: boolean;
  onFile: (file: File) => void;
};

export function ClassroomImportPanel({
  importBusy,
  importReport,
  chooseFileDisabled,
  onFile,
}: ClassroomImportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ gridColumn: "1 / -1", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
      <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Importar turmas (Excel)</h4>
      <p className="muted small" style={{ margin: "0 0 0.75rem" }}>
        Planilha com colunas <strong>nome</strong> e <strong>ano</strong> (5 ou 9). Linhas vazias são ignoradas. A escola é a mesma
        selecionada acima (ou a da sua conta, para coordenador).
      </p>
      <div className="import-toolbar">
        <button type="button" className="ghost" onClick={() => void downloadClassroomTemplate()}>
          Baixar modelo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) {
              onFile(f);
            }
          }}
        />
        <Button type="button" variant="primary" disabled={chooseFileDisabled || importBusy} onClick={() => fileRef.current?.click()}>
          {importBusy ? "Importando…" : "Escolher planilha…"}
        </Button>
      </div>
      {importReport ? <ImportReportView report={importReport} /> : null}
    </div>
  );
}

function ImportReportView({ report }: { report: ClassroomImportReport }) {
  return (
    <div className="import-report" role="status">
      <p style={{ margin: "0.75rem 0 0" }}>
        <span className="success">{report.ok} turma(s) criada(s).</span>
        {report.skipped > 0 ? <span className="muted"> {report.skipped} linha(s) em branco ignorada(s).</span> : null}
      </p>
      {report.errors.length === 0 ? null : (
        <>
          <p className="error" style={{ margin: "0.5rem 0 0" }}>
            {report.errors.length} linha(s) com problema:
          </p>
          <ul className="small muted" style={{ margin: "0.35rem 0 0" }}>
            {report.errors.slice(0, 25).map((e) => (
              <li key={`${e.line}-${e.message}`}>
                Linha {e.line}: {e.message}
              </li>
            ))}
            {report.errors.length > 25 ? <li>… e mais {report.errors.length - 25}.</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}
