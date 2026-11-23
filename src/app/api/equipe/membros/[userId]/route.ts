// Muda o papel (dono/membro) ou remove alguém da equipe ativa. Remover a si
// mesmo = sair da equipe.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { changeRole, removeMember } from "@/lib/services/auth";

const schema = z.object({ role: z.enum(["owner", "member"]) });

export async function PATCH(request: Request, ctx: { params: Promise<{ userId: string }> }) {
  return withAuth(async ({ user, team }) => {
    const { userId } = await ctx.params;
    const { role } = schema.parse(await request.json());
    await changeRole(team.id, user.id, userId, role);
    return ok({ userId, role });
  });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ userId: string }> }) {
  return withAuth(async ({ user, team }) => {
    const { userId } = await ctx.params;
    await removeMember(team.id, user.id, userId);
    return ok({ removed: userId });
  });
}
