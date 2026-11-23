// Helpers para as rotas de API.
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { UserError } from "./errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * O banco não tem uma tabela/coluna que o código espera: a migration não foi
 * aplicada (no Turso ela é manual, ver DEPLOY.md). Prisma devolve P2021/P2022;
 * pelo driver adapter libSQL pode vir só a mensagem do SQLite.
 */
export function isSchemaOutdated(err: unknown): boolean {
  for (let e = err as { code?: unknown; message?: unknown; cause?: unknown } | undefined, i = 0; e && i < 5; e = e.cause as typeof e, i++) {
    if (e.code === "P2021" || e.code === "P2022") return true;
    if (typeof e.message === "string" && /no such (table|column)/i.test(e.message)) return true;
  }
  return false;
}

export function handleError(err: unknown) {
  if (err instanceof UserError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Dados inválidos", issues: err.issues }, { status: 422 });
  }
  console.error(err);
  if (isSchemaOutdated(err)) {
    return NextResponse.json(
      { error: "O banco de dados está desatualizado: falta aplicar as migrations (veja DEPLOY.md)." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
