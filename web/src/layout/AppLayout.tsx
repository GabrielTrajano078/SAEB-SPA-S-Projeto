import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { User } from "@/schemas/auth";
import { NavIcon } from "./NavIcon";

function roleLabel(role: User["role"]): string {
  const map: Record<User["role"], string> = {
    admin: "Administrador",
    professor: "Professor",
    coordenador: "Coordenador",
    gestor: "Gestor municipal",
  };
  return map[role];
}

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
      <div className="app-canvas" aria-hidden="true" />
      <aside className="sidebar" aria-label="Navegação">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true">
            <span className="sidebar-logo-mark">S</span>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-title">Diagnóstico SAEB</span>
            <span className="sidebar-tagline">Matriz nacional · LP e MAT (5º e 9º)</span>
          </div>
        </div>
        <div className="sidebar-section-label">Menu</div>
        <nav className="sidebar-nav" aria-label="Principal">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? "nav-link nav-link-side active" : "nav-link nav-link-side")}
            >
              <NavIcon to={l.to} />
              <span className="nav-link-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user-card" aria-label="Sessão atual">
            <div className="sidebar-user-avatar" aria-hidden="true">
              {user.fullName.slice(0, 1).toUpperCase()}
            </div>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-name">{user.fullName}</span>
              <span className="sidebar-user-email" title={user.email}>
                {user.email}
              </span>
              <span className="badge badge-role">{roleLabel(user.role)}</span>
            </div>
          </div>
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
