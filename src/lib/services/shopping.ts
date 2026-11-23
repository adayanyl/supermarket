// Geração da lista de compras do mês: média de consumo de 6 meses (com
// fallback compra) por produto, descontando o estoque atual (opcional), e
// preço/data da última compra. Regenera só os itens automáticos.
import { prisma } from "@/lib/db";
import {
  buildSuggestion,
  lastNMonthKeys,
  type MonthKey,
  monthKeyOf,
  monthKeyToDate,
  monthStartUtc,
} from "@/lib/domain/shopping-list";

import { getStockMap } from "./stock";

export async function generateShoppingList(
  teamId: string,
  monthKey: MonthKey,
  subtractStock: boolean,
): Promise<string> {
  const periodMonth = monthKeyToDate(monthKey);
  const months = lastNMonthKeys(periodMonth, 6);
  const windowStart = monthStartUtc(months[0]);
  const periodStart = monthStartUtc(monthKey);

  const movements = await prisma.stockMovement.findMany({
    where: { occurredAt: { gte: windowStart, lt: periodStart }, product: { teamId } },
    select: { productId: true, type: true, quantity: true, occurredAt: true },
  });

  const byProduct = new Map<
    string,
    { out: Record<MonthKey, number>; in: Record<MonthKey, number> }
  >();
  for (const m of movements) {
    const key = monthKeyOf(m.occurredAt);
    const rec = byProduct.get(m.productId) ?? { out: {}, in: {} };
    if (m.type === "OUT") rec.out[key] = (rec.out[key] ?? 0) + m.quantity;
    else rec.in[key] = (rec.in[key] ?? 0) + m.quantity;
    byProduct.set(m.productId, rec);
  }

  const productIds = [...byProduct.keys()];

  const [products, stockMap, latestItems] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, teamId } }),
    getStockMap(teamId),
    prisma.purchaseItem.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true,
        unitPrice: true,
        purchase: { select: { purchasedAt: true } },
      },
      orderBy: { purchase: { purchasedAt: "desc" } },
    }),
  ]);

  const lastPrice = new Map<string, { price: number; date: Date }>();
  for (const it of latestItems) {
    if (it.productId && !lastPrice.has(it.productId)) {
      lastPrice.set(it.productId, { price: it.unitPrice, date: it.purchase.purchasedAt });
    }
  }

  const suggestions = products.map((p) => {
    const rec = byProduct.get(p.id) ?? { out: {}, in: {} };
    const last = lastPrice.get(p.id);
    return buildSuggestion(
      {
        productId: p.id,
        unit: p.unit,
        monthlyOut: rec.out,
        monthlyIn: rec.in,
        currentStock: stockMap.get(p.id) ?? 0,
        lastUnitPrice: last?.price ?? null,
        lastPurchaseDate: last?.date ?? null,
      },
      months,
      subtractStock,
    );
  });

  const list = await prisma.shoppingList.upsert({
    where: { teamId_periodMonth: { teamId, periodMonth } },
    update: {},
    create: { teamId, periodMonth, status: "draft" },
  });

  // regenera apenas os itens automáticos; preserva os adicionados manualmente
  await prisma.shoppingListItem.deleteMany({ where: { listId: list.id, origin: "auto" } });
  if (suggestions.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: suggestions.map((s) => ({
        listId: list.id,
        productId: s.productId,
        origin: "auto",
        included: s.included,
        suggestedQuantity: s.suggestedQuantity,
        unit: s.unit,
        lastUnitPrice: s.lastUnitPrice,
        lastPurchaseDate: s.lastPurchaseDate,
      })),
    });
  }

  return list.id;
}
