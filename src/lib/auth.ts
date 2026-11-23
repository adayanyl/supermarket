// Sessão do usuário (cookie httpOnly + tabela Session) e equipe ativa.
// Páginas usam requireAuth(); rotas de API usam withAuth().
import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { addDays, SESSION_TTL_DAYS, type TeamRole } from "@/lib/domain/auth";
import { bad, handleError } from "@/lib/http";

export const SESSION_COOKIE = "dispensa_session";

export interface Auth {
  sessionId: string;
  user: { id: string; username: string; name: string };
  team: { id: string; name: string };
  role: TeamRole;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Cria a sessão e grava o cookie. Só em Route Handlers / Server Functions. */
export async function startSession(userId: string, activeTeamId: string | null): Promise<void> {
  const token = newToken();
  const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, activeTeamId, expiresAt },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

/** Usuário logado + equipe ativa, ou null. Memoizado por requisição. */
export const getAuth = cache(async (): Promise<Auth | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, username: true, name: true } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  const memberships = await prisma.teamMember.findMany({
    where: { userId: session.userId },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  let membership =
    memberships.find((m) => m.teamId === session.activeTeamId) ?? memberships[0] ?? null;

  // Quem ficou sem equipe (saiu ou foi removido) ganha uma equipe pessoal.
  if (!membership) {
    const team = await prisma.team.create({
      data: {
        name: `Casa de ${session.user.name}`,
        members: { create: { userId: session.userId, role: "owner" } },
      },
      include: { members: true },
    });
    membership = { ...team.members[0], team: { id: team.id, name: team.name } };
  }

  return {
    sessionId: session.id,
    user: session.user,
    team: membership.team,
    role: membership.role === "owner" ? "owner" : "member",
  };
});

/** Para páginas: exige login, senão manda para /login. */
export async function requireAuth(): Promise<Auth> {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  return auth;
}

/**
 * Para rotas de API: roda o handler só com usuário logado (401 caso
 * contrário) e trata erros como as demais rotas.
 */
export async function withAuth(fn: (auth: Auth) => Promise<Response>): Promise<Response> {
  try {
    const auth = await getAuth();
    if (!auth) return bad("Faça login para continuar.", 401);
    return await fn(auth);
  } catch (err) {
    return handleError(err);
  }
}
