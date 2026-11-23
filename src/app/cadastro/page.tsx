import { redirect } from "next/navigation";

import { AuthForm } from "@/components/AuthForm";
import { getAuth } from "@/lib/auth";
import { findInvite } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; convite?: string }>;
}) {
  const { next, convite } = await searchParams;
  if (await getAuth()) redirect(convite ? `/convite/${convite}` : "/");
  const invite = await findInvite(convite);
  const validInvite = invite?.state === "valid" ? invite : null;

  return (
    <div className="space-y-5 pt-6">
      <header className="text-center">
        <p className="text-4xl">🧺</p>
        <h1 className="mt-1 text-2xl font-bold">Criar conta</h1>
        <p className="text-sm text-gray-500">
          {validInvite
            ? "Ao criar a conta você entra direto na equipe."
            : "Você ganha uma equipe para dividir a dispensa com quem mora com você."}
        </p>
      </header>
      <AuthForm mode="register" next={next} inviteToken={validInvite?.token} teamName={validInvite?.teamName} />
    </div>
  );
}
