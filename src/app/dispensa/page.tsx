import { PantryList } from "@/components/PantryList";
import { prisma } from "@/lib/db";
import { getStockMap } from "@/lib/services/stock";

export const dynamic = "force-dynamic";

export default async function DispensaPage() {
  const [products, stockMap, lastItems] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    getStockMap(),
    prisma.purchaseItem.findMany({
      orderBy: { purchase: { purchasedAt: "desc" } },
      select: { productId: true, unitPrice: true },
    }),
  ]);

  const lastPrice = new Map<string, number>();
  for (const it of lastItems) {
    if (it.productId && !lastPrice.has(it.productId)) lastPrice.set(it.productId, it.unitPrice);
  }

  const rows = products
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      category: p.category,
      stock: Math.round((stockMap.get(p.id) ?? 0) * 100) / 100,
      lastPrice: lastPrice.get(p.id) ?? null,
    }))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Dispensa</h1>
        <p className="text-sm text-gray-500">Saldo derivado das entradas e saídas.</p>
      </header>
      <PantryList products={rows} />
    </div>
  );
}
