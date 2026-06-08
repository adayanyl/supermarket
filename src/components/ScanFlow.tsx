"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/client";
import { formatBRL } from "@/lib/format";

type ScanResponse = {
  accessKey: string | null;
  uf: string | null;
  sefazUrl: string | null;
  importStatus: string;
  purchasedAt: string;
  totalValue: number | null;
  store: { cnpj: string | null; name: string | null; uf: string | null; city: string | null };
  items: Array<{
    rawDescription: string;
    ean: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
};

type EditItem = {
  rawDescription: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  ean: string | null;
};

const num = (s: string) => Math.max(0, parseFloat(s.replace(",", ".")) || 0);

export function ScanFlow() {
  const router = useRouter();
  const [step, setStep] = useState<"scan" | "review" | "done">("scan");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // estado da revisão
  const [draft, setDraft] = useState<ScanResponse | null>(null);
  const [storeName, setStoreName] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [duplicated, setDuplicated] = useState(false);

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  function enterReview(d: ScanResponse) {
    setDraft(d);
    setStoreName(d.store?.name ?? "");
    setDateStr((d.purchasedAt ?? new Date().toISOString()).slice(0, 10));
    setEditItems(
      d.items.map((it) => ({
        rawDescription: it.rawDescription,
        quantity: String(it.quantity).replace(".", ","),
        unit: it.unit,
        unitPrice: String(it.unitPrice).replace(".", ","),
        ean: it.ean,
      })),
    );
    setStep("review");
  }

  async function scanQr(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<ScanResponse>("/api/cupom/scan", "POST", { qr: text.trim() });
      enterReview(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, ctrl) => {
          if (result) {
            ctrl.stop();
            controlsRef.current = null;
            setCameraOn(false);
            scanQr(result.getText());
          }
        },
      );
      controlsRef.current = controls;
      setCameraOn(true);
    } catch {
      setError("Não foi possível acessar a câmera. Cole o link/chave abaixo.");
    }
  }

  function startManual() {
    stopCamera();
    enterReview({
      accessKey: null,
      uf: null,
      sefazUrl: null,
      importStatus: "manual",
      purchasedAt: new Date().toISOString(),
      totalValue: null,
      store: { cnpj: null, name: null, uf: null, city: null },
      items: [],
    });
  }

  function updateItem(idx: number, patch: Partial<EditItem>) {
    setEditItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItemRow() {
    setEditItems((prev) => [
      ...prev,
      { rawDescription: "", quantity: "1", unit: "UN", unitPrice: "0", ean: null },
    ]);
  }

  async function save() {
    if (!draft) return;
    const items = editItems
      .filter((i) => i.rawDescription.trim())
      .map((i) => {
        const quantity = num(i.quantity) || 1;
        const unitPrice = num(i.unitPrice);
        return {
          rawDescription: i.rawDescription.trim(),
          ean: i.ean,
          quantity,
          unit: i.unit.trim() || "UN",
          unitPrice,
          totalPrice: Math.round(quantity * unitPrice * 100) / 100,
        };
      });
    if (items.length === 0) {
      setError("Adicione ao menos um item.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ duplicated: boolean; purchaseId: string }>(
        "/api/cupom/confirm",
        "POST",
        {
          accessKey: draft.accessKey,
          uf: draft.uf,
          sefazUrl: draft.sefazUrl,
          importStatus: draft.importStatus,
          purchasedAt: new Date(`${dateStr}T12:00:00`).toISOString(),
          totalValue: draft.totalValue,
          store: { ...draft.store, name: storeName.trim() || null },
          items,
        },
      );
      setDuplicated(res.duplicated);
      setStep("done");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const editTotal = editItems.reduce((s, i) => s + num(i.quantity) * num(i.unitPrice), 0);

  if (step === "done") {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-4xl">{duplicated ? "⚠️" : "✅"}</p>
        <p className="font-medium">
          {duplicated ? "Este cupom já havia sido importado." : "Compra salva e adicionada à dispensa!"}
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/dispensa" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
            Ver dispensa
          </Link>
          <button
            onClick={() => {
              setDuplicated(false);
              setDraft(null);
              setStep("scan");
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600"
          >
            Escanear outro
          </button>
        </div>
      </div>
    );
  }

  if (step === "review" && draft) {
    return (
      <div className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div
          className={`rounded-lg p-2 text-sm ${
            draft.importStatus === "auto"
              ? "bg-teal-50 text-teal-800"
              : "bg-amber-50 text-amber-800"
          }`}
        >
          {draft.importStatus === "auto"
            ? "Itens importados da SEFAZ. Confira e ajuste se precisar."
            : "Não foi possível buscar os itens automaticamente. Preencha manualmente."}
        </div>

        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <label className="block text-xs text-gray-500">Estabelecimento</label>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Nome da loja"
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
          <label className="block text-xs text-gray-500">Data da compra</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          />
        </div>

        <div className="space-y-2">
          {editItems.map((item, idx) => (
            <div key={idx} className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  value={item.rawDescription}
                  onChange={(e) => updateItem(idx, { rawDescription: e.target.value })}
                  placeholder="Descrição do item"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Remover"
                  className="px-1 text-lg text-gray-400"
                >
                  ×
                </button>
              </div>
              <div className="flex gap-2">
                <Field label="Qtd">
                  <input
                    inputMode="decimal"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Un">
                  <input
                    value={item.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Vl. unit.">
                  <input
                    inputMode="decimal"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            onClick={addItemRow}
            className="w-full rounded-2xl border border-dashed border-gray-300 bg-white py-2 text-sm font-medium text-gray-500"
          >
            + Adicionar item
          </button>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <span className="font-semibold">Total dos itens</span>
          <span className="text-lg font-bold">{formatBRL(editTotal)}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Salvando..." : "Salvar compra"}
          </button>
          <button
            onClick={() => {
              setDraft(null);
              setStep("scan");
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // step === "scan"
  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      </div>

      {cameraOn ? (
        <button
          onClick={stopCamera}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600"
        >
          Parar câmera
        </button>
      ) : (
        <button
          onClick={startCamera}
          disabled={busy}
          className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Lendo..." : "Abrir câmera"}
        </button>
      )}

      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
        <label className="block text-xs text-gray-500">Colar link ou chave de acesso</label>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={2}
          placeholder="https://nfce.sefaz... ou os 44 dígitos da chave"
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        />
        <button
          onClick={() => scanQr(pasted)}
          disabled={busy || !pasted.trim()}
          className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Buscar itens
        </button>
      </div>

      <button onClick={startManual} className="w-full text-sm font-medium text-accent">
        Inserir compra manualmente →
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex-1">
      <span className="mb-0.5 block text-[10px] uppercase text-gray-400">{label}</span>
      {children}
    </label>
  );
}
