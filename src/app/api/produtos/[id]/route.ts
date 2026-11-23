// Edição de um produto (nome, unidade, EAN, categoria).
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalize } from "@/lib/domain/matching";
import { bad, ok } from "@/lib/http";

const schema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  ean: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async ({ team }) => {
    const { id } = await ctx.params;
    const data = schema.parse(await request.json());
    const owned = await prisma.product.findFirst({ where: { id, teamId: team.id } });
    if (!owned) return bad("Produto não encontrado.", 404);

    const update: {
      name?: string;
      normalizedName?: string;
      unit?: string;
      ean?: string | null;
      category?: string | null;
    } = {};
    if (data.name !== undefined) {
      update.name = data.name;
      update.normalizedName = normalize(data.name);
    }
    if (data.unit !== undefined) update.unit = data.unit;
    if (data.ean !== undefined) update.ean = data.ean?.trim() || null;
    if (data.category !== undefined) update.category = data.category?.trim() || null;

    const product = await prisma.product.update({ where: { id }, data: update });
    return ok(product);
  });
}
