import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("dispara onClick", () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Salvar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fica desabilitado quando loading", () => {
    render(<Button loading>Aguarde</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
