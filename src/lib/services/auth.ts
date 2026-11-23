// Contas, emails e equipes: cadastro, login, convites e gestão de membros.
// As regras puras ficam em domain/auth.ts; aqui só persistência.
import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import {
  addDays,
  canChangeRole,
  canManageTeam,
  canRemoveEmail,
  canRemoveMember,
  INVITE_TTL_DAYS,
  inviteState,
  isValidEmail,
  normalizeEmail,
  normalizeUsername,
  parseLogin,
  type TeamRole,
  validatePassword,
  validateUsername,
} from "@/lib/domain/auth";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/domain/password";
import { UserError } from "@/lib/errors";

/** Equipe criada pela migration com os dados que já existiam antes do login. */
export const INITIAL_TEAM_ID = "equipe-inicial";

// ---- Cadastro e login ------------------------------------------------------

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  inviteToken?: string | null;
}

export async function registerUser(input: RegisterInput): Promise<{ userId: string; teamId: string }> {
  const name = input.name.trim();
  if (!name) throw new UserError("Informe seu nome.");
  const usernameError = validateUsername(input.username);
  if (usernameError) throw new UserError(usernameError);
  if (!isValidEmail(input.email)) throw new UserError("Email inválido.");
  const passwordError = validatePassword(input.password);
  if (passwordError) throw new UserError(passwordError);

  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  if (await prisma.user.findUnique({ where: { username } })) {
    throw new UserError("Esse usuário já existe. Escolha outro.", 409);
  }
  if (await prisma.userEmail.findUnique({ where: { email } })) {
    throw new UserError("Esse email já está em uma conta.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, username, passwordHash, emails: { create: { email, isPrimary: true } } },
    });

    // 1) veio por convite válido: entra na equipe do convite
    if (input.inviteToken) {
      const invite = await tx.teamInvite.findUnique({ where: { token: input.inviteToken } });
      if (invite && inviteState(invite) === "valid") {
        await tx.teamMember.create({ data: { teamId: invite.teamId, userId: user.id, role: "member" } });
        await tx.teamInvite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date(), acceptedBy: user.id },
        });
        return { userId: user.id, teamId: invite.teamId };
      }
    }

    // 2) primeiro usuário do sistema: assume a equipe com os dados antigos
    const initial = await tx.team.findUnique({
      where: { id: INITIAL_TEAM_ID },
      include: { _count: { select: { members: true } } },
    });
    if (initial && initial._count.members === 0) {
      await tx.teamMember.create({ data: { teamId: initial.id, userId: user.id, role: "owner" } });
      return { userId: user.id, teamId: initial.id };
    }

    // 3) caso geral: equipe nova, com o usuário como dono
    const team = await tx.team.create({
      data: { name: `Casa de ${name}`, members: { create: { userId: user.id, role: "owner" } } },
    });
    return { userId: user.id, teamId: team.id };
  });
}

/** Confere usuário (ou qualquer email da conta) + senha. */
export async function authenticate(login: string, password: string): Promise<{ id: string } | null> {
  const parsed = parseLogin(login);
  const user =
    parsed.kind === "email"
      ? (await prisma.userEmail.findUnique({ where: { email: parsed.value }, include: { user: true } }))?.user
      : await prisma.user.findUnique({ where: { username: parsed.value } });

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  return user && valid ? { id: user.id } : null;
}

export async function changePassword(
  userId: string,
  currentSessionId: string,
  current: string,
  next: string,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) {
    throw new UserError("Senha atual incorreta.", 403);
  }
  const err = validatePassword(next);
  if (err) throw new UserError(err);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } }),
    // encerra as outras sessões (outros aparelhos)
    prisma.session.deleteMany({ where: { userId, id: { not: currentSessionId } } }),
  ]);
}

// ---- Emails ----------------------------------------------------------------

export async function addEmail(userId: string, rawEmail: string) {
  if (!isValidEmail(rawEmail)) throw new UserError("Email inválido.");
  const email = normalizeEmail(rawEmail);
  const existing = await prisma.userEmail.findUnique({ where: { email } });
  if (existing) {
    throw new UserError(
      existing.userId === userId ? "Esse email já está na sua conta." : "Esse email já está em outra conta.",
      409,
    );
  }
  const count = await prisma.userEmail.count({ where: { userId } });
  return prisma.userEmail.create({ data: { userId, email, isPrimary: count === 0 } });
}

export async function removeEmail(userId: string, emailId: string): Promise<void> {
  const emails = await prisma.userEmail.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const target = emails.find((e) => e.id === emailId);
  if (!target) throw new UserError("Email não encontrado.", 404);
  if (!canRemoveEmail(emails.length)) throw new UserError("A conta precisa ter pelo menos um email.");

  await prisma.$transaction(async (tx) => {
    await tx.userEmail.delete({ where: { id: target.id } });
    if (target.isPrimary) {
      const next = emails.find((e) => e.id !== target.id)!;
      await tx.userEmail.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  });
}

export async function setPrimaryEmail(userId: string, emailId: string): Promise<void> {
  const target = await prisma.userEmail.findFirst({ where: { id: emailId, userId } });
  if (!target) throw new UserError("Email não encontrado.", 404);
  await prisma.$transaction([
    prisma.userEmail.updateMany({ where: { userId }, data: { isPrimary: false } }),
    prisma.userEmail.update({ where: { id: emailId }, data: { isPrimary: true } }),
  ]);
}

// ---- Equipes ---------------------------------------------------------------

async function membershipOf(teamId: string, userId: string) {
  return prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
}

async function requireOwner(teamId: string, userId: string) {
  const m = await membershipOf(teamId, userId);
  if (!m || !canManageTeam(m.role)) throw new UserError("Só o dono da equipe pode fazer isso.", 403);
  return m;
}

export async function createTeam(userId: string, rawName: string) {
  const name = rawName.trim();
  if (!name) throw new UserError("Dê um nome para a equipe.");
  return prisma.team.create({ data: { name, members: { create: { userId, role: "owner" } } } });
}

export async function renameTeam(teamId: string, userId: string, rawName: string) {
  await requireOwner(teamId, userId);
  const name = rawName.trim();
  if (!name) throw new UserError("Dê um nome para a equipe.");
  return prisma.team.update({ where: { id: teamId }, data: { name } });
}

/** Troca a equipe ativa da sessão (precisa ser membro). */
export async function switchTeam(sessionId: string, userId: string, teamId: string): Promise<void> {
  if (!(await membershipOf(teamId, userId))) throw new UserError("Você não faz parte dessa equipe.", 403);
  await prisma.session.update({ where: { id: sessionId }, data: { activeTeamId: teamId } });
}

export async function removeMember(teamId: string, actorId: string, targetUserId: string): Promise<void> {
  const [actor, target, ownerCount] = await Promise.all([
    membershipOf(teamId, actorId),
    membershipOf(teamId, targetUserId),
    prisma.teamMember.count({ where: { teamId, role: "owner" } }),
  ]);
  if (!actor) throw new UserError("Você não faz parte dessa equipe.", 403);
  if (!target) throw new UserError("Membro não encontrado.", 404);
  const check = canRemoveMember({
    actorId,
    actorRole: actor.role,
    targetId: targetUserId,
    targetRole: target.role,
    ownerCount,
  });
  if (!check.ok) throw new UserError(check.reason, 403);
  await prisma.teamMember.delete({ where: { id: target.id } });
}

export async function changeRole(
  teamId: string,
  actorId: string,
  targetUserId: string,
  role: TeamRole,
): Promise<void> {
  const [actor, target, ownerCount] = await Promise.all([
    membershipOf(teamId, actorId),
    membershipOf(teamId, targetUserId),
    prisma.teamMember.count({ where: { teamId, role: "owner" } }),
  ]);
  if (!actor) throw new UserError("Você não faz parte dessa equipe.", 403);
  if (!target) throw new UserError("Membro não encontrado.", 404);
  const check = canChangeRole({ actorRole: actor.role, targetRole: target.role, newRole: role, ownerCount });
  if (!check.ok) throw new UserError(check.reason, 403);
  await prisma.teamMember.update({ where: { id: target.id }, data: { role } });
}

// ---- Convites --------------------------------------------------------------

/**
 * Cria um convite por email (ou um convite avulso, se a lista vier vazia).
 * Emails que já são membros da equipe são pulados.
 */
export async function createInvites(teamId: string, actorId: string, emails: string[]) {
  await requireOwner(teamId, actorId);

  const members = await prisma.userEmail.findMany({
    where: { email: { in: emails }, user: { memberships: { some: { teamId } } } },
    select: { email: true },
  });
  const alreadyIn = new Set(members.map((m) => m.email));
  const targets: (string | null)[] = emails.length ? emails.filter((e) => !alreadyIn.has(e)) : [null];

  const expiresAt = addDays(new Date(), INVITE_TTL_DAYS);
  const created = [];
  for (const email of targets) {
    created.push(
      await prisma.teamInvite.create({
        data: { teamId, email, token: randomBytes(24).toString("base64url"), createdById: actorId, expiresAt },
      }),
    );
  }
  return { invites: created, skipped: [...alreadyIn] };
}

export async function revokeInvite(teamId: string, actorId: string, inviteId: string): Promise<void> {
  await requireOwner(teamId, actorId);
  const { count } = await prisma.teamInvite.deleteMany({ where: { id: inviteId, teamId, acceptedAt: null } });
  if (count === 0) throw new UserError("Convite não encontrado.", 404);
}

/** Entra na equipe do convite e devolve o id dela. */
export async function acceptInvite(token: string, userId: string): Promise<string> {
  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite) throw new UserError("Convite não encontrado.", 404);
  const state = inviteState(invite);
  if (state === "expired") throw new UserError("Esse convite expirou. Peça um novo.", 410);

  const already = await membershipOf(invite.teamId, userId);
  if (already) return invite.teamId;
  if (state === "used") throw new UserError("Esse convite já foi usado.", 410);

  await prisma.$transaction([
    prisma.teamMember.create({ data: { teamId: invite.teamId, userId, role: "member" } }),
    prisma.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date(), acceptedBy: userId } }),
  ]);
  return invite.teamId;
}
