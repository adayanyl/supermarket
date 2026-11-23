import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBRL, formatDate, formatQty } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  auto: "Importado da SEFAZ",
  partial: "Importação parcial",
  manual: "Inserido manualmente",
};

export default async function CupomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { team } = await requireAuth();
  const purchase = await prisma.purchase.findFirst({
    where: { id, teamId: team.id },
    include: { store: true, items: { include: { product: true } } },
  });
  if (!purchase) notFound();

  return (
    <div className="space-y-4">
      <header>
        <Link href="/cupom" className="text-sm text-accent">
          ← Compras
        </Link>
        <h1 className="mt-1 text-xl font-bold">{purchase.store?.name ?? "Compra"}</h1>
        <p className="text-sm text-gray-500">
          {formatDate(purchase.purchasedAt)} · {STATUS_LABEL[purchase.importStatus] ?? purchase.importStatus}
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {purchase.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 border-b border-gray-100 p-3 last:border-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.product?.name ?? item.rawDescription}</p>
              <p className="text-xs text-gray-500">
                {formatQty(item.quantity, item.unit)} × {formatBRL(item.unitPrice)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold">{formatBRL(item.totalPrice)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">{formatBRL(purchase.totalValue)}</span>
      </div>
    </div>
  );
}
