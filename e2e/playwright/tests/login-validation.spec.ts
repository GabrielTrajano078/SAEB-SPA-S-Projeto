import { expect, test } from "@playwright/test";

test.describe("Login — validação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("e-mail inválido exibe mensagem do schema (alerta inline)", async ({ page }) => {
    await page.getByRole("textbox", { name: /E-mail/ }).fill("nao-e-um-email");
    await page.getByRole("textbox", { name: /Senha/ }).fill("qualquer");
    await page.getByRole("button", { name: "Entrar" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("E-mail inválido.");
  });

  test("senha vazia exibe mensagem do schema (alerta inline)", async ({ page }) => {
    await page.getByRole("textbox", { name: /E-mail/ }).fill("usuario@exemplo.com");
    await page.getByRole("textbox", { name: /Senha/ }).fill("");
    await page.getByRole("button", { name: "Entrar" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("Informe a senha.");
  });

  test("senha incorreta (API 401) exibe mensagem da API", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Credenciais invalidas." }),
      });
    });

    await page.getByRole("textbox", { name: /E-mail/ }).fill("usuario@exemplo.com");
    await page.getByRole("textbox", { name: /Senha/ }).fill("SenhaErrada123");
    await page.getByRole("button", { name: "Entrar" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toHaveText("Credenciais invalidas.");
  });
});
