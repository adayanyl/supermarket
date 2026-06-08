// Movimentação manual de estoque: baixa de consumo (OUT) ou entrada/ajuste (IN).
import { z } from "zod";

import { prisma } from "@/lib/db";
import { bad, handleError, ok } from "@/lib/http";

const schema = z.object({
  productId: z.string().min(1),
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().positive(),
  unit: z.string().min(1).optional(),
  occurredAt: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());
    const product = await prisma.product.findUnique({ where: { id: data.productId } });
    if (!product) return bad("Produto não encontrado.", 404);

    const movement = await prisma.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        unit: data.unit ?? product.unit,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
        reason: data.reason ?? (data.type === "OUT" ? "consumption" : "adjustment"),
      },
    });
    return ok(movement, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
