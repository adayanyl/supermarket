// Atualiza (incluir/marcar/quantidade) ou remove um item da lista.
import { z } from "zod";

import { prisma } from "@/lib/db";
import { handleError, ok } from "@/lib/http";

const schema = z.object({
  included: z.boolean().optional(),
  checked: z.boolean().optional(),
  suggestedQuantity: z.number().min(0).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { itemId } = await ctx.params;
    const data = schema.parse(await request.json());
    const item = await prisma.shoppingListItem.update({ where: { id: itemId }, data });
    return ok(item);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { itemId } = await ctx.params;
    await prisma.shoppingListItem.delete({ where: { id: itemId } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
