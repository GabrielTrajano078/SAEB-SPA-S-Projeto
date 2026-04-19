import { apiFetch } from "@/lib/api-client";
import { schoolSchema, type School } from "@/schemas/school";
import { z } from "zod";

export async function listSchools(): Promise<School[]> {
  const data = await apiFetch<unknown>("/api/schools");
  return z.array(schoolSchema).parse(data);
}

export type CreateSchoolBody = {
  name: string;
  city?: string;
  municipalityCode?: string;
};

export async function createSchool(body: CreateSchoolBody): Promise<{ id: string }> {
  return apiFetch("/api/schools", { method: "POST", body });
}
