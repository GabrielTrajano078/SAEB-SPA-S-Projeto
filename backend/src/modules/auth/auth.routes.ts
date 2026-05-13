import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { requireAuth } from "../../middlewares/auth";
import { UserModel } from "./user.model";
import { bootstrapAdminSchema, loginSchema } from "./auth.schemas";

export const authRouter = Router();

authRouter.post("/bootstrap-admin", async (req, res, next) => {
  try {
    const data = bootstrapAdminSchema.parse(req.body);
    const hasAnyUser = await UserModel.exists({});

    if (hasAnyUser) {
      res.status(409).json({ message: "Bootstrap indisponivel: usuarios ja existem." });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: "admin",
      schoolId: null,
      municipalityCode: null,
    });

    res.status(201).json({ id: String(user._id) });
  } catch (error) {
    next(error);
  }
});

function invalidLoginResponse(res: Response): void {
  res.status(401).json({ message: "Credenciais invalidas." });
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email: data.email }).lean();
    if (!user) {
      invalidLoginResponse(res);
      return;
    }

    const hash = user.passwordHash;
    if (typeof hash !== "string" || hash.length === 0) {
      invalidLoginResponse(res);
      return;
    }

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(data.password, hash);
    } catch {
      invalidLoginResponse(res);
      return;
    }

    if (!passwordOk) {
      invalidLoginResponse(res);
      return;
    }

    const classroomIds = (user.classroomIds ?? []).map(String);

    const token = jwt.sign(
      {
        id: String(user._id),
        role: user.role,
        schoolId: user.schoolId ?? null,
        municipalityCode: user.municipalityCode ?? null,
        classroomIds,
      },
      env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({
      token,
      user: {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId ?? null,
        municipalityCode: user.municipalityCode ?? null,
        classroomIds,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user!.id)
      .select("fullName email role schoolId municipalityCode classroomIds")
      .lean();

    if (!user) {
      res.status(404).json({ message: "Usuario nao encontrado." });
      return;
    }

    const classroomIds = (user.classroomIds ?? []).map(String);

    res.json({
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ?? null,
      municipalityCode: user.municipalityCode ?? null,
      classroomIds,
    });
  } catch (error) {
    next(error);
  }
});
