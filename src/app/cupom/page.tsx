import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatBRL, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CupomPage() {
  const { team } = await requireAuth();
  const purchases = await prisma.purchase.findMany({
    where: { teamId: team.id },
    orderBy: { purchasedAt: "desc" },
    include: { store: true, _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Compras</h1>
        <p className="text-sm text-gray-500">Histórico de cupons importados.</p>
      </header>

      {purchases.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500">Nenhuma compra ainda.</p>
          <Link href="/scan" className="mt-2 inline-block font-medium text-accent">
            Escanear um cupom →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <Link
              key={p.id}
              href={`/cupom/${p.id}`}
              className="block rounded-2xl bg-white p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.store?.name ?? "Compra"}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(p.purchasedAt)} · {p._count.items} itens
                  </p>
                </div>
                <span className="shrink-0 font-semibold">{formatBRL(p.totalValue)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
