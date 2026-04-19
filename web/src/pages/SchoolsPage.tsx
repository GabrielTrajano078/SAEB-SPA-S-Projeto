import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { createSchool, listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { useState } from "react";

export function SchoolsPage() {
  const qc = useQueryClient();
  const { state } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;
  const isAdmin = user?.role === "admin";
  const isGestor = user?.role === "gestor";

  const q = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
  });

  const createM = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      setSuccess(`Escola cadastrada.`);
      setFormError(null);
      setName("");
      setCity("");
      setMunicipalityCode("");
      void qc.invalidateQueries({ queryKey: ["schools"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (err: unknown) => {
      setSuccess(null);
      setFormError(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setFormError("Informe o nome da escola (mínimo 2 caracteres).");
      return;
    }
    const body: Parameters<typeof createSchool>[0] = { name: trimmed };
    const c = city.trim();
    if (c.length >= 2) body.city = c;
    if (isAdmin) {
      const mc = municipalityCode.trim();
      if (mc.length >= 2) body.municipalityCode = mc;
    }
    createM.mutate(body);
  }

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <section className="panel">
        <h2>Escolas</h2>
        <p className="muted small">
          Cadastre unidades escolares. {isGestor ? "Novas escolas ficam no seu município." : "Administradores podem informar o código IBGE do município."}
        </p>

        <form className="form-grid" style={{ maxWidth: 480, marginTop: "1rem" }} onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Nome da escola</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Ex.: EMEF José de Alencar"
              autoComplete="organization"
            />
          </label>
          <label className="field">
            <span className="field-label">Cidade (opcional)</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Fortaleza" autoComplete="address-level2" />
          </label>
          {isAdmin ? (
            <label className="field">
              <span className="field-label">Código IBGE do município (opcional)</span>
              <input
                value={municipalityCode}
                onChange={(e) => setMunicipalityCode(e.target.value.replace(/\D/g, "").slice(0, 7))}
                placeholder="Ex.: 2304400"
                inputMode="numeric"
              />
              <span className="muted small">Sete dígitos, ex.: Fortaleza — 2304400</span>
            </label>
          ) : isGestor && user.municipalityCode ? (
            <p className="muted small" style={{ margin: 0 }}>
              Município do cadastro: <strong>{user.municipalityCode}</strong>
            </p>
          ) : null}
          {formError ? (
            <p className="error" role="alert">
              {formError}
            </p>
          ) : null}
          {success ? (
            <p className="success" role="status">
              {success}
            </p>
          ) : null}
          <div className="row-actions">
            <button type="submit" className="primary" disabled={createM.isPending}>
              {createM.isPending ? "Salvando…" : "Cadastrar escola"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>Escolas cadastradas</h3>
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {q.error instanceof ApiError ? q.error.message : "Erro."}
          </p>
        ) : null}
        {q.data && q.data.length > 0 ? (
          <ul className="list">
            {q.data.map((s) => (
              <li key={s._id}>
                <strong>{s.name}</strong>
                {s.city ? <span className="muted"> — {s.city}</span> : null}
                {s.municipalityCode ? <span className="muted small"> · IBGE {s.municipalityCode}</span> : null}
                {" · "}
                <Link to={`/escola/resumo?schoolId=${s._id}`}>Resumo</Link>
              </li>
            ))}
          </ul>
        ) : (
          !q.isLoading && <p className="muted">Nenhuma escola ainda.</p>
        )}
      </section>
    </div>
  );
}
