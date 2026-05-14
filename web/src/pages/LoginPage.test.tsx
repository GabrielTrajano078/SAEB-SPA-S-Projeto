import type { AuthContextValue } from "@/auth/context";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { renderPage } from "@/test/render-page";
import { LoginPage } from "./LoginPage";

vi.mock("@/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function mockAnonymousAuth(login: AuthContextValue["login"]) {
  mockedUseAuth.mockReturnValue({
    state: { status: "anonymous" },
    login,
    logout: vi.fn(),
    refreshUser: vi.fn(),
  });
}

describe("LoginPage", () => {
  it("formulario usa noValidate e campos sem atributo required", () => {
    mockAnonymousAuth(vi.fn() as AuthContextValue["login"]);
    const { container } = renderPage(<LoginPage />);

    const form = container.querySelector("form.login-form");
    expect(form).toBeTruthy();
    expect((form as HTMLFormElement).noValidate).toBe(true);

    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("required");
    expect(screen.getByLabelText("Senha")).not.toHaveAttribute("required");
  });

  it("exibe mensagem do Zod no role=alert para e-mail invalido", async () => {
    mockAnonymousAuth(vi.fn() as AuthContextValue["login"]);
    renderPage(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "invalido" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("E-mail inválido.");
  });

  it("exibe mensagem do Zod no role=alert para senha vazia", async () => {
    mockAnonymousAuth(vi.fn() as AuthContextValue["login"]);
    renderPage(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Informe a senha.");
  });

  it("exibe mensagem da API no role=alert quando login falha com ApiError", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, "Credenciais invalidas.", {}));
    mockAnonymousAuth(login as AuthContextValue["login"]);
    renderPage(<LoginPage />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Secret12" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: "user@example.com", password: "Secret12" });
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Credenciais invalidas.");
  });
});
