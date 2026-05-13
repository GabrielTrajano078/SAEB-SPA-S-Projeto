import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalido."),
  password: z.string().min(1, "Informe a senha."),
});

export const bootstrapAdminSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email("Email invalido."),
  password: z.string().min(6),
});
