// Cancela um convite ainda não usado.
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { revokeInvite } from "@/lib/services/auth";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async ({ user, team }) => {
    const { id } = await ctx.params;
    await revokeInvite(team.id, user.id, id);
    return ok({ deleted: true });
  });
}
