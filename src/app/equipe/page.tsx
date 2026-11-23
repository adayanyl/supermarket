import { TeamManager } from "@/components/TeamManager";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const { user, team, role } = await requireAuth();

  const [members, invites, myTeams] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            emails: { where: { isPrimary: true }, select: { email: true } },
          },
        },
      },
    }),
    role === "owner"
      ? prisma.teamInvite.findMany({
          where: { teamId: team.id, acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, email: true, token: true, expiresAt: true },
        })
      : Promise.resolve([]),
    prisma.teamMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: { team: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Equipe</h1>
        <p className="text-sm text-gray-500">
          Quem está na equipe divide os mesmos produtos, compras, dispensa e lista.
        </p>
      </header>
      <TeamManager
        me={user.id}
        team={team}
        role={role}
        members={members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          username: m.user.username,
          email: m.user.emails[0]?.email ?? null,
          role: m.role,
        }))}
        invites={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
        teams={myTeams.map((m) => ({ id: m.team.id, name: m.team.name, role: m.role }))}
      />
    </div>
  );
}
