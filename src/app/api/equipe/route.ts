// Renomeia a equipe ativa (só dono).
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { renameTeam } from "@/lib/services/auth";

const schema = z.object({ name: z.string().max(80) });

export async function PATCH(request: Request) {
  return withAuth(async ({ user, team }) => {
    const { name } = schema.parse(await request.json());
    const updated = await renameTeam(team.id, user.id, name);
    return ok({ id: updated.id, name: updated.name });
  });
}
