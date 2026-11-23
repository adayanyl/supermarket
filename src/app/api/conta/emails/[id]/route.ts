// Define como principal ou remove um email da conta.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { removeEmail, setPrimaryEmail } from "@/lib/services/auth";

const schema = z.object({ isPrimary: z.literal(true) });

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async ({ user }) => {
    const { id } = await ctx.params;
    schema.parse(await request.json());
    await setPrimaryEmail(user.id, id);
    return ok({ primary: id });
  });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async ({ user }) => {
    const { id } = await ctx.params;
    await removeEmail(user.id, id);
    return ok({ deleted: true });
  });
}
