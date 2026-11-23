// Leitura de convite para as telas públicas (login/cadastro/convite).
import { prisma } from "@/lib/db";
import { inviteState, type InviteState } from "@/lib/domain/auth";

export async function findInvite(
  token: string | null | undefined,
): Promise<{ token: string; teamName: string; state: InviteState } | null> {
  if (!token) return null;
  const invite = await prisma.teamInvite.findUnique({ where: { token }, include: { team: true } });
  if (!invite) return null;
  return { token, teamName: invite.team.name, state: inviteState(invite) };
}
