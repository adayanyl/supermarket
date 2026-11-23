// Cria uma equipe nova (o criador vira dono) e já passa a usá-la.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { createTeam, switchTeam } from "@/lib/services/auth";

const schema = z.object({ name: z.string().max(80) });

export async function POST(request: Request) {
  return withAuth(async ({ user, sessionId }) => {
    const { name } = schema.parse(await request.json());
    const team = await createTeam(user.id, name);
    await switchTeam(sessionId, user.id, team.id);
    return ok({ id: team.id, name: team.name }, { status: 201 });
  });
}
