// Helpers para as rotas de API.
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Dados inválidos", issues: err.issues }, { status: 422 });
  }
  console.error(err);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
