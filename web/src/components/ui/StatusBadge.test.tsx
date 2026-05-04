import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("mostra rótulo em português para DRAFT", () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
  });

  it("mostra READY como gabarito publicado", () => {
    render(<StatusBadge status="READY" />);
    expect(screen.getByText("Gabarito publicado")).toBeInTheDocument();
  });
});
