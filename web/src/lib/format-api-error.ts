import { ApiError } from "@/lib/api-client";

/** Mensagem amigável a partir de erro desconhecido, com fallback. */
export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
