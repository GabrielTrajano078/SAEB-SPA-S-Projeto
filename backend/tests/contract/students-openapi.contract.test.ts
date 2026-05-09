import { openApiDocument } from "../../src/docs/openapi";
import { createStudentSchema } from "../../src/modules/students/students.schemas";

function sortFieldNames(names: string[]): string[] {
  const copy = [...names];
  copy.sort((a, b) => a.localeCompare(b));
  return copy;
}

function readStudentRequestRequired(): string[] {
  const schema = openApiDocument.components?.schemas?.StudentRequest;
  if (!schema || typeof schema !== "object" || !("required" in schema)) {
    return [];
  }
  const req = (schema as { required?: unknown }).required;
  if (!Array.isArray(req)) {
    return [];
  }
  return req.filter((item): item is string => typeof item === "string");
}

describe("contrato OpenAPI — alunos", () => {
  it("expoe /api/students GET e POST com seguranca bearer", () => {
    const paths = openApiDocument.paths;
    const students = paths["/api/students"];
    expect(students?.get).toBeDefined();
    expect(students?.post).toBeDefined();

    const getOp = students?.get;
    const postOp = students?.post;
    expect(getOp && typeof getOp === "object" && "security" in getOp ? getOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
    expect(postOp && typeof postOp === "object" && "security" in postOp ? postOp.security : undefined).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it("StudentRequest required alinha com createStudentSchema", () => {
    const specRequired = sortFieldNames(readStudentRequestRequired());
    const zodKeys = sortFieldNames(Object.keys(createStudentSchema.shape));
    expect(specRequired).toEqual(zodKeys);
  });

  it("POST 201 referencia IdResponse", () => {
    const post = openApiDocument.paths["/api/students"]?.post;
    expect(post).toBeDefined();
    expect(post && typeof post === "object" && "responses" in post).toBe(true);
    const responses = (post as { responses?: Record<string, { content?: Record<string, { schema?: unknown }> }> })
      .responses;
    const ref = responses?.["201"]?.content?.["application/json"]?.schema;
    expect(ref).toEqual({ $ref: "#/components/schemas/IdResponse" });
  });
});
