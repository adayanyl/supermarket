// Atualiza (incluir/marcar/quantidade) ou remove um item da lista.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";

/** O item existe, é da lista `id` e a lista é da equipe? */
async function findItem(teamId: string, listId: string, itemId: string) {
  return prisma.shoppingListItem.findFirst({ where: { id: itemId, listId, list: { teamId } } });
}

const schema = z.object({
  included: z.boolean().optional(),
  checked: z.boolean().optional(),
  suggestedQuantity: z.number().min(0).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  return withAuth(async ({ team }) => {
    const { id, itemId } = await ctx.params;
    const data = schema.parse(await request.json());
    if (!(await findItem(team.id, id, itemId))) return bad("Item não encontrado.", 404);
    const item = await prisma.shoppingListItem.update({ where: { id: itemId }, data });
    return ok(item);
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  return withAuth(async ({ team }) => {
    const { id, itemId } = await ctx.params;
    if (!(await findItem(team.id, id, itemId))) return bad("Item não encontrado.", 404);
    await prisma.shoppingListItem.delete({ where: { id: itemId } });
    return ok({ deleted: true });
  });
}
