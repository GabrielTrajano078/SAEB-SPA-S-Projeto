import { createStudentSchema, listStudentsSchema } from "../../src/modules/students/students.schemas";

const validOid = "507f1f77bcf86cd799439011";

describe("createStudentSchema", () => {
  it("aceita corpo valido", () => {
    const parsed = createStudentSchema.parse({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "  Ana Silva  ",
      registrationCode: "  MAT-001  ",
    });
    expect(parsed).toEqual({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "Ana Silva",
      registrationCode: "MAT-001",
    });
  });

  it.each([
    ["schoolId invalido", { schoolId: "x", classroomId: validOid, fullName: "ab", registrationCode: "cd" }],
    ["nome curto", { schoolId: validOid, classroomId: validOid, fullName: "a", registrationCode: "cd" }],
    ["matricula curta", { schoolId: validOid, classroomId: validOid, fullName: "ab", registrationCode: "c" }],
  ])("rejeita: %s", (_label, body) => {
    expect(() => createStudentSchema.parse(body)).toThrow();
  });
});

describe("listStudentsSchema", () => {
  it("aceita query vazia", () => {
    expect(listStudentsSchema.parse({})).toEqual({});
  });

  it("aceita filtros opcionais validos", () => {
    expect(
      listStudentsSchema.parse({
        schoolId: validOid,
        classroomId: validOid,
        grade: "5",
        fullNameContains: "  maria  ",
      }),
    ).toEqual({
      schoolId: validOid,
      classroomId: validOid,
      grade: "5",
      fullNameContains: "maria",
    });
  });

  it("rejeita fullNameContains acima do limite", () => {
    expect(() =>
      listStudentsSchema.parse({
        fullNameContains: "x".repeat(201),
      }),
    ).toThrow();
  });
});
