"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client";
import { formatBRL, formatQty } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  unit: string;
  category: string | null;
  stock: number;
  lastPrice: number | null;
};

export function PantryList({ products }: { products: Row[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-500">Sua dispensa está vazia.</p>
        <Link href="/scan" className="mt-2 inline-block font-medium text-accent">
          Escanear um cupom →
        </Link>
      </div>
    );
  }

  async function move(id: string, type: "IN" | "OUT") {
    const quantity = Math.max(0, parseFloat((qty[id] ?? "1").replace(",", ".")) || 0);
    if (!quantity) return;
    setBusy(id + type);
    setError(null);
    try {
      await api("/api/movements", "POST", { productId: id, type, quantity });
      setQty((q) => ({ ...q, [id]: "" }));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {products.map((p) => (
        <div key={p.id} className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium leading-tight">{p.name}</p>
              <p className="text-xs text-gray-500">
                {p.lastPrice != null ? `Últ. ${formatBRL(p.lastPrice)}` : "Sem preço"}
                {p.category ? ` · ${p.category}` : ""}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                p.stock > 0 ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {formatQty(p.stock, p.unit)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              inputMode="decimal"
              value={qty[p.id] ?? ""}
              onChange={(e) => setQty((q) => ({ ...q, [p.id]: e.target.value }))}
              placeholder="1"
              className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
            />
            <button
              onClick={() => move(p.id, "OUT")}
              disabled={busy === p.id + "OUT"}
              className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Consumir
            </button>
            <button
              onClick={() => move(p.id, "IN")}
              disabled={busy === p.id + "IN"}
              className="flex-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Repor
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
