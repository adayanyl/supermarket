"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client";
import { formatBRL, formatMonth } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  origin: string;
  included: boolean;
  checked: boolean;
  suggestedQuantity: number | null;
  unit: string;
  lastUnitPrice: number | null;
};

type ListData = { id: string; periodMonth: string; items: Item[] } | null;

export function ShoppingListView({
  list,
  currentMonth,
}: {
  list: ListData;
  currentMonth: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(list?.items ?? []);
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [subtractStock, setSubtractStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");

  // Ressincroniza com o servidor quando a lista muda (após refresh/geração).
  // Padrão recomendado pelo React: ajustar estado no render com guarda.
  const [prevList, setPrevList] = useState(list);
  if (list !== prevList) {
    setPrevList(list);
    setItems(list?.items ?? []);
    setQtyDraft({});
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/shopping-list/generate", "POST", { month: currentMonth, subtractStock });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patchItem(id: string, data: Partial<Pick<Item, "included" | "checked" | "suggestedQuantity">>) {
    if (!list) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    try {
      await api(`/api/shopping-list/${list.id}/items/${id}`, "PATCH", data);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function removeItem(item: Item) {
    if (!list) return;
    if (item.origin === "manual") {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      try {
        await api(`/api/shopping-list/${list.id}/items/${item.id}`, "DELETE");
      } catch (e) {
        setError((e as Error).message);
      }
    } else {
      await patchItem(item.id, { included: false });
    }
  }

  function commitQty(item: Item) {
    const raw = qtyDraft[item.id];
    if (raw === undefined) return;
    const q = Math.max(0, parseFloat(raw.replace(",", ".")) || 0);
    setQtyDraft((d) => {
      const next = { ...d };
      delete next[item.id];
      return next;
    });
    patchItem(item.id, { suggestedQuantity: q });
  }

  async function addManual() {
    const name = newName.trim();
    if (!name || !list) return;
    const quantity = Math.max(0, parseFloat(newQty.replace(",", ".")) || 1);
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: string; unit: string }>(
        `/api/shopping-list/${list.id}/items`,
        "POST",
        { customName: name, quantity },
      );
      setItems((prev) => [
        ...prev,
        {
          id: created.id,
          name,
          origin: "manual",
          included: true,
          checked: false,
          suggestedQuantity: quantity,
          unit: created.unit ?? "UN",
          lastUnitPrice: null,
        },
      ]);
      setNewName("");
      setNewQty("1");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const included = items.filter((i) => i.included);
  const excluded = items.filter((i) => !i.included);
  const estimated = included.reduce(
    (s, i) => s + (i.suggestedQuantity ?? 0) * (i.lastUnitPrice ?? 0),
    0,
  );
  const monthLabel = list ? formatMonth(list.periodMonth) : formatMonth(new Date());

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Lista de compras</h1>
        <p className="text-sm capitalize text-gray-500">{monthLabel}</p>
      </header>

      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={subtractStock}
            onChange={(e) => setSubtractStock(e.target.checked)}
            className="h-4 w-4 accent-teal-600"
          />
          Descontar o estoque atual da dispensa
        </label>
        <button
          onClick={generate}
          disabled={busy}
          className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {list ? "Atualizar lista do mês" : "Gerar lista do mês"}
        </button>
        <p className="text-xs text-gray-400">
          Sugestão pela média de consumo dos últimos 6 meses (com fallback nas compras).
        </p>
      </div>

      {!list ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Gere a lista para ver as sugestões do mês.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {included.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">Nenhum item na lista.</p>
            ) : (
              included.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 border-b border-gray-100 p-3 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => patchItem(item.id, { checked: e.target.checked })}
                    className="h-5 w-5 shrink-0 accent-teal-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        item.checked ? "text-gray-400 line-through" : ""
                      }`}
                    >
                      {item.name}
                      {item.origin === "manual" && (
                        <span className="ml-1 text-xs font-normal text-teal-600">(manual)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.lastUnitPrice != null ? `Últ. ${formatBRL(item.lastUnitPrice)}` : "Sem preço"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <input
                      inputMode="decimal"
                      value={qtyDraft[item.id] ?? String(item.suggestedQuantity ?? "").replace(".", ",")}
                      onChange={(e) => setQtyDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                      onBlur={() => commitQty(item)}
                      className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm"
                    />
                    <span className="w-8 text-xs text-gray-500">{item.unit}</span>
                    <button
                      onClick={() => removeItem(item)}
                      aria-label="Remover"
                      className="px-1 text-lg text-gray-400"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
            <span className="font-semibold">Estimativa</span>
            <span className="text-lg font-bold">{formatBRL(estimated)}</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Adicionar item"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <input
              inputMode="decimal"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="w-14 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm"
            />
            <button
              onClick={addManual}
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              +
            </button>
          </div>

          {excluded.length > 0 && (
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Fora da lista</p>
              <div className="space-y-1">
                {excluded.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-gray-500">{item.name}</span>
                    <button
                      onClick={() => patchItem(item.id, { included: true })}
                      className="shrink-0 font-medium text-accent"
                    >
                      Incluir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
