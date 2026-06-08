import Link from "next/link";

import { prisma } from "@/lib/db";
import { formatBRL, formatDate, formatMonth } from "@/lib/format";
import { getStockMap } from "@/lib/services/stock";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [productCount, purchaseCount, lastPurchase, stockMap] = await Promise.all([
    prisma.product.count(),
    prisma.purchase.count(),
    prisma.purchase.findFirst({ orderBy: { purchasedAt: "desc" }, include: { store: true } }),
    getStockMap(),
  ]);
  const inStock = [...stockMap.values()].filter((v) => v > 0.0001).length;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm capitalize text-gray-500">{formatMonth(new Date())}</p>
        <h1 className="text-2xl font-bold">Dispensa</h1>
        <p className="text-sm text-gray-500">Cupom fiscal → dispensa → lista do mês.</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Produtos" value={productCount} />
        <Stat label="Na dispensa" value={inStock} />
        <Stat label="Compras" value={purchaseCount} />
      </div>

      <div className="grid gap-3">
        <Action href="/scan" icon="📷" title="Escanear cupom" subtitle="Leia o QR Code da NFC-e" primary />
        <Action href="/lista" icon="📝" title="Lista do mês" subtitle="Gerada pela média de 6 meses" />
        <Action href="/dispensa" icon="🧺" title="Dispensa" subtitle="Saldo e baixas de consumo" />
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Última compra</h2>
        {lastPurchase ? (
          <div className="text-sm">
            <p className="font-medium">{lastPurchase.store?.name ?? "Compra"}</p>
            <p className="text-gray-500">
              {formatDate(lastPurchase.purchasedAt)} · {formatBRL(lastPurchase.totalValue)}
            </p>
            <Link
              href={`/cupom/${lastPurchase.id}`}
              className="mt-1 inline-block font-medium text-accent"
            >
              Ver detalhes →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Nenhuma compra ainda. Escaneie um cupom para começar.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function Action({
  href,
  icon,
  title,
  subtitle,
  primary,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl p-4 shadow-sm ${
        primary ? "bg-accent text-white" : "bg-white"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className={`block text-sm ${primary ? "text-white/80" : "text-gray-500"}`}>
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
