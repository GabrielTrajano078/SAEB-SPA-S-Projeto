import { describe, expect, it } from "vitest";
import { buildExamProgressSteps } from "./exam-progress";

describe("buildExamProgressSteps", () => {
  it("DRAFT sem cartões: corrente em gabarito", () => {
    const steps = buildExamProgressSteps({ examStatus: "DRAFT", sheets: [] });
    expect(steps[0]?.state).toBe("complete");
    expect(steps[1]?.state).toBe("current");
    expect(steps[2]?.state).toBe("upcoming");
  });

  it("READY com cartões pendentes: corrente em leitura", () => {
    const steps = buildExamProgressSteps({
      examStatus: "READY",
      sheets: [{ processingStatus: "PENDING" }, { processingStatus: "PENDING" }],
    });
    expect(steps[1]?.state).toBe("complete");
    expect(steps[2]?.state).toBe("complete");
    expect(steps[3]?.state).toBe("current");
  });

  it("marca leitura completa quando há cartão processado", () => {
    const steps = buildExamProgressSteps({
      examStatus: "READY",
      sheets: [{ processingStatus: "DONE" }],
    });
    expect(steps[3]?.state).toBe("complete");
    expect(steps[4]?.state).toBe("current");
  });

  it("CLOSED marca etapa de resultados como completa", () => {
    const steps = buildExamProgressSteps({
      examStatus: "CLOSED",
      sheets: [{ processingStatus: "DONE" }],
    });
    expect(steps[4]?.state).toBe("complete");
  });
});
