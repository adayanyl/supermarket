"use client";

import { useState } from "react";

import { api } from "@/lib/client";

export function AcceptInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/convites/${token}`, "POST");
      window.location.assign("/equipe");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <button
        onClick={accept}
        disabled={busy}
        className="w-full rounded-xl bg-accent py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Entrando..." : "Entrar na equipe"}
      </button>
    </div>
  );
}
