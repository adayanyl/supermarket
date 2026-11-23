// Aceita um convite: entra na equipe e passa a usá-la nesta sessão.
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { acceptInvite, switchTeam } from "@/lib/services/auth";

export async function POST(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  return withAuth(async ({ user, sessionId }) => {
    const { token } = await ctx.params;
    const teamId = await acceptInvite(token, user.id);
    await switchTeam(sessionId, user.id, teamId);
    return ok({ teamId });
  });
}
