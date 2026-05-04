import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import { formatApiError } from "./format-api-error";

describe("formatApiError", () => {
  it("usa mensagem do ApiError", () => {
    expect(formatApiError(new ApiError(400, "Dados inválidos", undefined), "Falha.")).toBe("Dados inválidos");
  });

  it("usa fallback para valor desconhecido", () => {
    expect(formatApiError(null, "Não foi possível salvar.")).toBe("Não foi possível salvar.");
  });
});
