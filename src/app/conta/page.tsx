import Link from "next/link";

import { AccountManager } from "@/components/AccountManager";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const { user, team } = await requireAuth();
  const emails = await prisma.userEmail.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: { id: true, email: true, isPrimary: true },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Minha conta</h1>
        <p className="text-sm text-gray-500">@{user.username}</p>
      </header>

      <Link href="/equipe" className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <span>
          <span className="block text-xs text-gray-500">Equipe em uso</span>
          <span className="block font-semibold">{team.name}</span>
        </span>
        <span className="text-sm font-medium text-accent">Gerenciar →</span>
      </Link>

      <AccountManager name={user.name} emails={emails} />
    </div>
  );
}
