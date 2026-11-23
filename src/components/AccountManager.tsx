"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client";

type Email = { id: string; email: string; isPrimary: boolean };

const input = "min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm";
const card = "space-y-3 rounded-2xl bg-white p-4 shadow-sm";

export function AccountManager({ name, emails }: { name: string; emails: Email[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newName, setNewName] = useState(name);
  const [newEmail, setNewEmail] = useState("");
  const [pwd, setPwd] = useState({ current: "", next: "" });

  async function run(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice(success);
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await api("/api/auth/logout", "POST").catch(() => {});
    // limpa o cache offline para não mostrar dados desta conta depois
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    window.location.assign("/login");
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-teal-50 p-2 text-sm text-teal-800">{notice}</p>}

      <section className={card}>
        <h2 className="text-sm font-semibold text-gray-700">Nome</h2>
        <div className="flex gap-2">
          <input className={input} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button
            disabled={busy || !newName.trim() || newName.trim() === name}
            onClick={() => run(() => api("/api/conta", "PATCH", { name: newName }), "Nome atualizado.")}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      </section>

      <section className={card}>
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Emails</h2>
          <p className="text-xs text-gray-500">Você pode entrar com qualquer um deles.</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {emails.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm">{e.email}</span>
                {e.isPrimary && <span className="text-xs font-medium text-accent">Principal</span>}
              </span>
              <span className="flex shrink-0 gap-2 text-xs">
                {!e.isPrimary && (
                  <button
                    disabled={busy}
                    onClick={() => run(() => api(`/api/conta/emails/${e.id}`, "PATCH", { isPrimary: true }))}
                    className="font-medium text-accent"
                  >
                    Tornar principal
                  </button>
                )}
                {emails.length > 1 && (
                  <button
                    disabled={busy}
                    onClick={() => run(() => api(`/api/conta/emails/${e.id}`, "DELETE"))}
                    className="font-medium text-red-600"
                  >
                    Remover
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const okAdd = await run(() => api("/api/conta/emails", "POST", { email: newEmail }), "Email adicionado.");
            if (okAdd) setNewEmail("");
          }}
        >
          <input
            className={input}
            type="email"
            placeholder="outro@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button disabled={busy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            Adicionar
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold text-gray-700">Trocar senha</h2>
        <form
          className="space-y-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const changed = await run(
              () => api("/api/conta/senha", "PATCH", pwd),
              "Senha alterada. Os outros aparelhos precisarão entrar de novo.",
            );
            if (changed) setPwd({ current: "", next: "" });
          }}
        >
          <input
            className={`${input} w-full`}
            type="password"
            placeholder="Senha atual"
            autoComplete="current-password"
            value={pwd.current}
            onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
            required
          />
          <input
            className={`${input} w-full`}
            type="password"
            placeholder="Nova senha (mín. 8)"
            autoComplete="new-password"
            minLength={8}
            value={pwd.next}
            onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
            required
          />
          <button disabled={busy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            Alterar senha
          </button>
        </form>
      </section>

      <button
        onClick={logout}
        disabled={busy}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 font-semibold text-red-600"
      >
        Sair da conta
      </button>
    </div>
  );
}
