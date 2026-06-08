// Adiciona um item manual à lista (produto existente ou nome livre).
import { z } from "zod";

import { prisma } from "@/lib/db";
import { bad, handleError, ok } from "@/lib/http";

const schema = z
  .object({
    productId: z.string().nullable().optional(),
    customName: z.string().nullable().optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.productId) || Boolean(d.customName?.trim()), {
    message: "Informe um produto ou um nome.",
  });

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const data = schema.parse(await request.json());

    let unit = data.unit ?? "UN";
    let lastUnitPrice: number | null = null;
    let lastPurchaseDate: Date | null = null;

    if (data.productId) {
      const product = await prisma.product.findUnique({ where: { id: data.productId } });
      if (!product) return bad("Produto não encontrado.", 404);
      unit = data.unit ?? product.unit;
      const lastItem = await prisma.purchaseItem.findFirst({
        where: { productId: data.productId },
        orderBy: { purchase: { purchasedAt: "desc" } },
        select: { unitPrice: true, purchase: { select: { purchasedAt: true } } },
      });
      if (lastItem) {
        lastUnitPrice = lastItem.unitPrice;
        lastPurchaseDate = lastItem.purchase.purchasedAt;
      }
    }

    const item = await prisma.shoppingListItem.create({
      data: {
        listId: id,
        productId: data.productId ?? null,
        customName: data.customName?.trim() || null,
        origin: "manual",
        included: true,
        suggestedQuantity: data.quantity ?? 1,
        unit,
        lastUnitPrice,
        lastPurchaseDate,
      },
    });
    return ok(item, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
