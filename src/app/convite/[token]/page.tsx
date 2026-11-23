import Link from "next/link";

import { AcceptInviteButton } from "@/components/AcceptInviteButton";
import { getAuth } from "@/lib/auth";
import { findInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [auth, invite] = await Promise.all([getAuth(), findInvite(token)]);

  const problem = !invite
    ? "Convite não encontrado."
    : invite.state === "expired"
      ? "Esse convite expirou. Peça um novo para quem te convidou."
      : invite.state === "used"
        ? "Esse convite já foi usado."
        : null;

  return (
    <div className="space-y-5 pt-6">
      <header className="text-center">
        <p className="text-4xl">🧺</p>
        <h1 className="mt-1 text-2xl font-bold">Convite</h1>
      </header>
      <div className="space-y-3 rounded-2xl bg-white p-4 text-center shadow-sm">
        {problem || !invite ? (
          <>
            <p className="text-sm text-gray-600">{problem}</p>
            <Link href="/" className="inline-block font-medium text-accent">
              Ir para o início →
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Você foi convidado para dividir a dispensa da equipe <strong>{invite.teamName}</strong>.
            </p>
            {auth ? (
              <AcceptInviteButton token={token} />
            ) : (
              <div className="grid gap-2">
                <Link
                  href={`/cadastro?convite=${encodeURIComponent(token)}`}
                  className="rounded-xl bg-accent py-2.5 font-semibold text-white"
                >
                  Criar conta e entrar
                </Link>
                <Link
                  href={`/login?convite=${encodeURIComponent(token)}`}
                  className="rounded-xl border border-gray-200 py-2.5 font-semibold"
                >
                  Já tenho conta
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
