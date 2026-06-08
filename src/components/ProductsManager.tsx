"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client";

type Row = {
  id: string;
  name: string;
  unit: string;
  ean: string | null;
  category: string | null;
  aliasCount: number;
};

const UNITS = ["UN", "KG", "G", "L", "ML", "PCT", "CX"];

export function ProductsManager({ products }: { products: Row[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("UN");

  async function create() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/produtos", "POST", { name: newName.trim(), unit: newUnit });
      setNewName("");
      setNewUnit("UN");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Novo produto"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        />
        <select
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button
          onClick={create}
          disabled={busy || !newName.trim()}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Criar
        </button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
          Nenhum produto ainda.
        </p>
      ) : (
        products.map((p) =>
          editingId === p.id ? (
            <ProductEditor
              key={p.id}
              product={p}
              onClose={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.unit}
                  {p.ean ? ` · ${p.ean}` : ""}
                  {p.category ? ` · ${p.category}` : ""}
                  {p.aliasCount > 0 ? ` · ${p.aliasCount} apelido(s)` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditingId(p.id)}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600"
              >
                Editar
              </button>
            </div>
          ),
        )
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit);
  const [ean, setEan] = useState(product.ean ?? "");
  const [category, setCategory] = useState(product.category ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/produtos/${product.id}`, "PATCH", { name, unit, ean, category });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-2 ring-teal-500/30">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        placeholder="Nome"
      />
      <div className="flex gap-2">
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <input
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          inputMode="numeric"
          placeholder="EAN"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Categoria"
        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="flex-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
