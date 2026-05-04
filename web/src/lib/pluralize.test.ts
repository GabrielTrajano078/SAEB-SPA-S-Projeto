import { describe, expect, it } from "vitest";
import { pluralize } from "./pluralize";

describe("pluralize", () => {
  it("usa singular quando n é 1", () => {
    expect(pluralize(1, "cartão gerado", "cartões gerados")).toBe("1 cartão gerado");
  });

  it("usa plural quando n não é 1", () => {
    expect(pluralize(30, "cartão gerado", "cartões gerados")).toBe("30 cartões gerados");
    expect(pluralize(0, "item", "itens")).toBe("0 itens");
  });
});
