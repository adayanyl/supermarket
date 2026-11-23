// Gera (ou regenera) a lista de compras de um mês. Preserva itens manuais.
import { z } from "zod";

import { monthKeyOf } from "@/lib/domain/shopping-list";
import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { generateShoppingList } from "@/lib/services/shopping";

const schema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Use o formato AAAA-MM.")
    .optional(),
  subtractStock: z.boolean().optional(),
});

export async function POST(request: Request) {
  return withAuth(async ({ team }) => {
    const body = await request.json().catch(() => ({}));
    const { month, subtractStock } = schema.parse(body ?? {});
    const monthKey = month ?? monthKeyOf(new Date());
    const listId = await generateShoppingList(team.id, monthKey, subtractStock ?? true);
    return ok({ listId, month: monthKey });
  });
}
