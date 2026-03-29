import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { User } from "@/schemas/auth";

function navForRole(role: User["role"]) {
  const base = [
    { to: "/provas", label: "Avaliação" },
    { to: "/questoes", label: "Banco de questões" },
    { to: "/turmas", label: "Turmas" },
    { to: "/alunos", label: "Alunos" },
  ];
  const extra: { to: string; label: string }[] = [];
  if (role === "admin") {
    extra.push({ to: "/escolas", label: "Escolas" });
  }
  if (role === "gestor") {
    extra.push({ to: "/escolas", label: "Escolas" });
    extra.push({ to: "/municipio", label: "Painel município" });
  }
  if (role === "coordenador" || role === "professor" || role === "admin" || role === "gestor") {
    extra.push({ to: "/escola/resumo", label: "Resumo da escola" });
  }
  return [...base, ...extra];
}

export function AppLayout() {
  const { state, logout } = useAuth();
  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;
  const links = navForRole(user.role);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegação">
        <div className="sidebar-brand">
          <span className="sidebar-title">SAEB / SPA-S</span>
        </div>
        <nav className="sidebar-nav" aria-label="Principal">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? "nav-link nav-link-side active" : "nav-link nav-link-side")}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="ghost sidebar-logout" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
      <div className="app-main">
        <main className="content content-wide">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
