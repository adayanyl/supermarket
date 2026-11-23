// Saldo de estoque derivado das movimentações: Σ(IN) − Σ(OUT) por produto.
import { prisma } from "@/lib/db";

/** Mapa productId -> saldo atual em estoque, só dos produtos da equipe. */
export async function getStockMap(teamId: string): Promise<Map<string, number>> {
  const grouped = await prisma.stockMovement.groupBy({
    by: ["productId", "type"],
    where: { product: { teamId } },
    _sum: { quantity: true },
  });
  const map = new Map<string, number>();
  for (const g of grouped) {
    const qty = g._sum.quantity ?? 0;
    const delta = g.type === "OUT" ? -qty : qty;
    map.set(g.productId, (map.get(g.productId) ?? 0) + delta);
  }
  return map;
}

/** Saldo atual de um produto específico. */
export async function getProductStock(productId: string): Promise<number> {
  const grouped = await prisma.stockMovement.groupBy({
    by: ["type"],
    where: { productId },
    _sum: { quantity: true },
  });
  let stock = 0;
  for (const g of grouped) {
    const qty = g._sum.quantity ?? 0;
    stock += g.type === "OUT" ? -qty : qty;
  }
  return stock;
}
