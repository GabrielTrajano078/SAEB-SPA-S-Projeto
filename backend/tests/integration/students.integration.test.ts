import request from "supertest";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { app } from "../../src/app";
import { env } from "../../src/config/env";
import * as access from "../../src/lib/access";
import { ClassroomModel } from "../../src/modules/classes/classroom.model";
import { AnswerSheetModel } from "../../src/modules/results/answer-sheet.model";
import { AnswerSheetScanModel } from "../../src/modules/results/answer-sheet-scan.model";
import { ResultModel } from "../../src/modules/results/result.model";
import { StudentModel } from "../../src/modules/students/student.model";

jest.mock("../../src/modules/students/student.model", () => ({
  StudentModel: {
    find: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock("../../src/modules/classes/classroom.model", () => ({
  ClassroomModel: {
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock("../../src/modules/results/result.model", () => ({
  ResultModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/modules/results/answer-sheet.model", () => ({
  AnswerSheetModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/modules/results/answer-sheet-scan.model", () => ({
  AnswerSheetScanModel: { deleteMany: jest.fn() },
}));

jest.mock("../../src/lib/access", () => ({
  canAccessSchool: jest.fn(),
  canAccessClassroom: jest.fn(),
  canAccessStudent: jest.fn(),
}));

const validOid = "507f1f77bcf86cd799439011";
const otherOid = "507f1f77bcf86cd799439012";

function bearerAdmin(): string {
  const token = jwt.sign({ id: validOid, role: "admin" }, env.JWT_SECRET, { expiresIn: "1h" });
  return `Bearer ${token}`;
}

function mockStudentFindReturns(rows: unknown[]): void {
  const lean = jest.fn().mockResolvedValue(rows);
  const sort = jest.fn().mockReturnValue({ lean });
  (StudentModel.find as jest.Mock).mockReturnValue({ sort });
}

function mockClassroomById(schoolId: string): void {
  const lean = jest.fn().mockResolvedValue({ schoolId: new Types.ObjectId(schoolId) });
  (ClassroomModel.findById as jest.Mock).mockReturnValue({
    select: jest.fn().mockReturnValue({ lean }),
  });
}

describe("POST /api/students", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    jest.mocked(access.canAccessClassroom).mockReset();
    (StudentModel.create as jest.Mock).mockReset();
    (ClassroomModel.findById as jest.Mock).mockReset();
  });

  it("401 sem Authorization", async () => {
    const res = await request(app).post("/api/students").send({
      schoolId: validOid,
      classroomId: validOid,
      fullName: "Nome",
      registrationCode: "REG-1",
    });
    expect(res.status).toBe(401);
  });

  it("400 quando corpo invalido (Zod)", async () => {
    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "x",
        registrationCode: "ab",
      });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: "Erro de validacao" });
  });

  it("403 quando canAccessSchool nega", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(false);

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("escola");
  });

  it("404 quando turma nao existe", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    const lean = jest.fn().mockResolvedValue(null);
    (ClassroomModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean }),
    });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(404);
  });

  it("400 quando turma nao pertence a escola informada", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(otherOid);

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-OK",
      });

    expect(res.status).toBe(400);
  });

  it("409 em violacao de unicidade (codigo 11000)", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(validOid);
    (StudentModel.create as jest.Mock).mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-DUP",
      });

    expect(res.status).toBe(409);
  });

  it("201 e retorna id quando criacao ok", async () => {
    jest.mocked(access.canAccessSchool).mockResolvedValue(true);
    mockClassroomById(validOid);
    const createdId = new Types.ObjectId();
    (StudentModel.create as jest.Mock).mockResolvedValue({ _id: createdId });

    const res = await request(app)
      .post("/api/students")
      .set("Authorization", bearerAdmin())
      .send({
        schoolId: validOid,
        classroomId: validOid,
        fullName: "Nome Valido",
        registrationCode: "REG-NEW",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: String(createdId) });
  });
});

describe("GET /api/students", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessSchool).mockReset();
    (ClassroomModel.find as jest.Mock).mockReset();
    (StudentModel.find as jest.Mock).mockReset();
  });

  it("200 com lista vazia para admin", async () => {
    mockStudentFindReturns([]);
    const res = await request(app).get("/api/students").set("Authorization", bearerAdmin());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("DELETE /api/students/:id", () => {
  beforeEach(() => {
    jest.mocked(access.canAccessStudent).mockReset();
    (StudentModel.findById as jest.Mock).mockReset();
    (StudentModel.deleteOne as jest.Mock).mockReset();
    (ResultModel.deleteMany as jest.Mock).mockReset();
    (AnswerSheetModel.deleteMany as jest.Mock).mockReset();
    (AnswerSheetScanModel.deleteMany as jest.Mock).mockReset();
  });

  it("400 com id invalido", async () => {
    const res = await request(app).delete("/api/students/nao-e-oid").set("Authorization", bearerAdmin());
    expect(res.status).toBe(400);
  });

  it("204 quando exclusao autorizada e aluno existe", async () => {
    jest.mocked(access.canAccessStudent).mockResolvedValue(true);
    const lean = jest.fn().mockResolvedValue({ _id: validOid });
    (StudentModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ lean }),
    });
    (ResultModel.deleteMany as jest.Mock).mockResolvedValue({});
    (AnswerSheetModel.deleteMany as jest.Mock).mockResolvedValue({});
    (AnswerSheetScanModel.deleteMany as jest.Mock).mockResolvedValue({});
    (StudentModel.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

    const res = await request(app).delete(`/api/students/${validOid}`).set("Authorization", bearerAdmin());
    expect(res.status).toBe(204);
  });
});
