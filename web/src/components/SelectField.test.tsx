import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectField } from "./SelectField";

describe("SelectField", () => {
  it("renderiza o rótulo e as opções", () => {
    render(
      <SelectField
        label="Disciplina"
        value="LP"
        onValueChange={() => {}}
        options={[
          { value: "LP", label: "Língua Portuguesa" },
          { value: "MAT", label: "Matemática" },
        ]}
      />,
    );
    expect(screen.getByText("Disciplina")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Língua Portuguesa" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Matemática" })).toBeInTheDocument();
  });

  it("chama onValueChange com o valor selecionado", () => {
    const onValueChange = vi.fn();
    render(
      <SelectField
        label="Ano"
        value="5"
        onValueChange={onValueChange}
        options={[
          { value: "5", label: "5º" },
          { value: "9", label: "9º" },
        ]}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "9" } });
    expect(onValueChange).toHaveBeenCalledWith("9");
  });

  it("inclui opção vazia quando emptyOption é informado", () => {
    render(
      <SelectField
        label="Filtro"
        value=""
        onValueChange={() => {}}
        options={[{ value: "LP", label: "LP" }]}
        emptyOption={{ label: "Todas" }}
      />,
    );
    expect(screen.getByRole("option", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Todas" })).toHaveValue("");
  });

  it("usa value customizado na opção vazia quando informado", () => {
    render(
      <SelectField
        label="X"
        value="all"
        onValueChange={() => {}}
        options={[{ value: "a", label: "A" }]}
        emptyOption={{ label: "Todos", value: "all" }}
      />,
    );
    const opt = screen.getByRole("option", { name: "Todos" });
    expect(opt).toHaveValue("all");
  });

  it("repassa disabled ao select", () => {
    render(
      <SelectField label="Turma" value="" onValueChange={() => {}} options={[]} emptyOption={{ label: "—" }} disabled />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
