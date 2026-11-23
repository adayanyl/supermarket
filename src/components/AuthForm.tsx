"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/client";

const input = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";

/** Só aceita caminho interno ("/x"), nunca outro domínio. */
function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function AuthForm({
  mode,
  next,
  inviteToken,
  teamName,
}: {
  mode: "login" | "register";
  next?: string | null;
  inviteToken?: string | null;
  teamName?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ login: "", name: "", username: "", email: "", password: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await api("/api/auth/login", "POST", { login: form.login, password: form.password });
        if (inviteToken) await api(`/api/convites/${inviteToken}`, "POST");
      } else {
        await api("/api/auth/register", "POST", {
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
          inviteToken: inviteToken ?? null,
        });
      }
      // navegação completa: o servidor relê o cookie de sessão
      window.location.assign(inviteToken ? "/equipe" : safeNext(next));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const suffix = inviteToken ? `?convite=${encodeURIComponent(inviteToken)}` : next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      {teamName && (
        <p className="rounded-lg bg-teal-50 p-2 text-sm text-teal-800">
          Você foi convidado para a equipe <strong>{teamName}</strong>.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {mode === "login" ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Usuário ou email</span>
          <input className={input} value={form.login} onChange={set("login")} autoComplete="username" autoCapitalize="none" required />
        </label>
      ) : (
        <>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Nome</span>
            <input className={input} value={form.name} onChange={set("name")} autoComplete="name" required />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Usuário</span>
            <input
              className={input}
              value={form.username}
              onChange={set("username")}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="ex.: aline"
              required
            />
            <span className="block text-xs text-gray-500">Letras minúsculas, números, ponto, hífen ou _.</span>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <input className={input} type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
            <span className="block text-xs text-gray-500">Depois você pode adicionar outros emails na sua conta.</span>
          </label>
        </>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Senha</span>
        <input
          className={input}
          type="password"
          value={form.password}
          onChange={set("password")}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "register" ? 8 : undefined}
          required
        />
        {mode === "register" && <span className="block text-xs text-gray-500">Mínimo de 8 caracteres.</span>}
      </label>

      <button disabled={busy} className="w-full rounded-xl bg-accent py-2.5 font-semibold text-white disabled:opacity-60">
        {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <Link href={`/cadastro${suffix}`} className="font-medium text-accent">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href={`/login${suffix}`} className="font-medium text-accent">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
