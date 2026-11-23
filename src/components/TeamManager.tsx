"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client";

type Member = { userId: string; name: string; username: string; email: string | null; role: string };
type Invite = { id: string; email: string | null; token: string; expiresAt: string };
type TeamRow = { id: string; name: string; role: string };

const input = "min-w-0 flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm";
const card = "space-y-3 rounded-2xl bg-white p-4 shadow-sm";
const btn = "rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50";

function inviteLink(token: string) {
  return `${window.location.origin}/convite/${token}`;
}

export function TeamManager({
  me,
  team,
  role,
  members,
  invites,
  teams,
}: {
  me: string;
  team: { id: string; name: string };
  role: "owner" | "member";
  members: Member[];
  invites: Invite[];
  teams: TeamRow[];
}) {
  const router = useRouter();
  const isOwner = role === "owner";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [teamName, setTeamName] = useState(team.name);
  const [emails, setEmails] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, success?: string, hardReload = false) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (hardReload) {
        window.location.assign("/equipe");
        return true;
      }
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

  async function copy(token: string) {
    const link = inviteLink(token);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Convite para ${team.name}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
      }
      setCopied(token);
    } catch {
      // usuário cancelou o compartilhamento
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-teal-50 p-2 text-sm text-teal-800">{notice}</p>}

      <section className={card}>
        <h2 className="text-sm font-semibold text-gray-700">Nome da equipe</h2>
        {isOwner ? (
          <div className="flex gap-2">
            <input className={input} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <button
              disabled={busy || !teamName.trim() || teamName.trim() === team.name}
              onClick={() => run(() => api("/api/equipe", "PATCH", { name: teamName }), "Equipe renomeada.")}
              className={btn}
            >
              Salvar
            </button>
          </div>
        ) : (
          <p className="font-semibold">{team.name}</p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-sm font-semibold text-gray-700">Membros ({members.length})</h2>
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {m.name} {m.userId === me && <span className="text-gray-400">(você)</span>}
                </span>
                <span className="block truncate text-xs text-gray-500">
                  @{m.username}
                  {m.email ? ` · ${m.email}` : ""} · {m.role === "owner" ? "Dono" : "Membro"}
                </span>
              </span>
              {isOwner && m.userId !== me && (
                <span className="flex shrink-0 gap-2 text-xs">
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api(`/api/equipe/membros/${m.userId}`, "PATCH", {
                          role: m.role === "owner" ? "member" : "owner",
                        }),
                      )
                    }
                    className="font-medium text-accent"
                  >
                    {m.role === "owner" ? "Tornar membro" : "Tornar dono"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => api(`/api/equipe/membros/${m.userId}`, "DELETE"))}
                    className="font-medium text-red-600"
                  >
                    Remover
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className={card}>
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Convidar pessoas</h2>
            <p className="text-xs text-gray-500">
              Digite um ou mais emails (separados por vírgula ou linha). Cada um ganha um link de
              convite para você mandar (WhatsApp, email...). Deixe vazio para um link avulso.
            </p>
          </div>
          <form
            className="space-y-2"
            onSubmit={async (ev) => {
              ev.preventDefault();
              let skipped: string[] = [];
              const done = await run(async () => {
                const r = await api<{ skipped: string[] }>("/api/equipe/convites", "POST", { emails });
                skipped = r.skipped;
              });
              if (done) {
                setEmails("");
                setNotice(
                  skipped.length
                    ? `Convites criados. Já são membros: ${skipped.join(", ")}.`
                    : "Convites criados. Copie os links abaixo.",
                );
              }
            }}
          >
            <textarea
              className={`${input} w-full`}
              rows={3}
              placeholder={"ana@email.com, beto@email.com"}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <button disabled={busy} className={btn}>
              Gerar convites
            </button>
          </form>

          {invites.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{i.email ?? "Link avulso"}</span>
                    <span className="block text-xs text-gray-500">
                      Vale até {new Date(i.expiresAt).toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2 text-xs">
                    <button onClick={() => copy(i.token)} className="font-medium text-accent">
                      {copied === i.token ? "Copiado ✓" : "Copiar link"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => run(() => api(`/api/equipe/convites/${i.id}`, "DELETE"))}
                      className="font-medium text-red-600"
                    >
                      Cancelar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className="text-sm font-semibold text-gray-700">Minhas equipes</h2>
        <ul className="divide-y divide-gray-100">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate text-sm">
                {t.name} <span className="text-xs text-gray-500">· {t.role === "owner" ? "Dono" : "Membro"}</span>
              </span>
              {t.id === team.id ? (
                <span className="shrink-0 text-xs font-medium text-gray-400">Em uso</span>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => run(() => api("/api/equipe/ativa", "PATCH", { teamId: t.id }), undefined, true)}
                  className="shrink-0 text-xs font-medium text-accent"
                >
                  Usar esta
                </button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            run(() => api("/api/equipes", "POST", { name: newTeam }), undefined, true);
          }}
        >
          <input
            className={input}
            placeholder="Nova equipe (ex.: Casa da praia)"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            required
          />
          <button disabled={busy} className={btn}>
            Criar
          </button>
        </form>
      </section>

      <button
        disabled={busy}
        onClick={() => {
          if (!window.confirm(`Sair da equipe ${team.name}?`)) return;
          run(() => api(`/api/equipe/membros/${me}`, "DELETE"), undefined, true);
        }}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 font-semibold text-red-600"
      >
        Sair desta equipe
      </button>
    </div>
  );
}
