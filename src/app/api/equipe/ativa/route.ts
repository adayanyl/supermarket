// Troca a equipe em uso nesta sessão.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { switchTeam } from "@/lib/services/auth";

const schema = z.object({ teamId: z.string().min(1) });

export async function PATCH(request: Request) {
  return withAuth(async ({ user, sessionId }) => {
    const { teamId } = schema.parse(await request.json());
    await switchTeam(sessionId, user.id, teamId);
    return ok({ teamId });
  });
}
