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

type NavItem = { to: string; label: string; roles?: User["role"][] };
type NavGroup = { label: string; roles?: User["role"][]; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { label: "Início", items: [{ to: "/", label: "Painel" }] },
  { label: "Operação", items: [{ to: "/provas", label: "Provas" }] },
  {
    label: "Pedagógico",
    items: [
      { to: "/questoes", label: "Banco de questões" },
      { to: "/turmas", label: "Turmas" },
      { to: "/alunos", label: "Alunos" },
    ],
  },
  {
    label: "Análise",
    items: [{ to: "/escola/resumo", label: "Resumo da escola" }],
  },
  {
    label: "Cadastros",
    roles: ["admin", "gestor"],
    items: [{ to: "/escolas", label: "Escolas" }],
  },
];

function navGroupsForRole(role: User["role"]): NavGroup[] {
  return NAV_GROUPS.filter((g) => !g.roles || g.roles.includes(role))
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.roles || it.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);
}

export function AppLayout() {
  const { state, logout } = useAuth();
  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;
  const groups = navGroupsForRole(user.role);

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
        {groups.map((group) => (
          <div key={group.label} className="sidebar-nav-group">
            <div className="sidebar-section-label">{group.label}</div>
            <nav className="sidebar-nav" aria-label={group.label}>
              {group.items.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) => (isActive ? "nav-link nav-link-side active" : "nav-link nav-link-side")}
                >
                  <NavIcon to={l.to} />
                  <span className="nav-link-label">{l.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
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
