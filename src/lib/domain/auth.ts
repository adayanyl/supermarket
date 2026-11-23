// Regras puras de contas e equipes: validação de usuário/email/senha,
// papéis na equipe e convites. Sem Next/Prisma — testado em auth.test.ts.

export type TeamRole = "owner" | "member";

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const PASSWORD_MIN = 8;
export const INVITE_TTL_DAYS = 7;
export const SESSION_TTL_DAYS = 30;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Mensagem de erro, ou null se o nome de usuário é válido. */
export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u)) {
    return "Usuário deve ter de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _.";
  }
  return null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Mensagem de erro, ou null se a senha atende ao mínimo. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > 200) return "Senha longa demais.";
  return null;
}

/** "usuário ou email" digitado no login: decide como procurar. */
export function parseLogin(raw: string): { kind: "email" | "username"; value: string } {
  const v = raw.trim();
  return v.includes("@")
    ? { kind: "email", value: normalizeEmail(v) }
    : { kind: "username", value: normalizeUsername(v) };
}

/**
 * Separa uma lista de emails digitada (vírgula, ponto e vírgula, espaço ou
 * quebra de linha). Remove duplicados e devolve os inválidos à parte.
 */
export function parseEmailList(raw: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    if (!piece) continue;
    const e = normalizeEmail(piece);
    if (isValidEmail(e)) {
      if (!valid.includes(e)) valid.push(e);
    } else if (!invalid.includes(piece)) {
      invalid.push(piece);
    }
  }
  return { valid, invalid };
}

export function canManageTeam(role: string | null | undefined): boolean {
  return role === "owner";
}

/**
 * Pode `actor` remover `target` da equipe? O dono remove qualquer um; qualquer
 * membro pode sair (remover a si mesmo). A equipe nunca fica sem dono.
 */
export function canRemoveMember(params: {
  actorId: string;
  actorRole: string;
  targetId: string;
  targetRole: string;
  ownerCount: number;
}): { ok: true } | { ok: false; reason: string } {
  const { actorId, actorRole, targetId, targetRole, ownerCount } = params;
  const self = actorId === targetId;
  if (!self && !canManageTeam(actorRole)) {
    return { ok: false, reason: "Só o dono da equipe pode remover membros." };
  }
  if (targetRole === "owner" && ownerCount <= 1) {
    return { ok: false, reason: "A equipe precisa de pelo menos um dono." };
  }
  return { ok: true };
}

/** Pode mudar o papel de alguém? Só dono, e sem deixar a equipe sem dono. */
export function canChangeRole(params: {
  actorRole: string;
  targetRole: string;
  newRole: TeamRole;
  ownerCount: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!canManageTeam(params.actorRole)) {
    return { ok: false, reason: "Só o dono da equipe pode mudar papéis." };
  }
  if (params.targetRole === "owner" && params.newRole !== "owner" && params.ownerCount <= 1) {
    return { ok: false, reason: "A equipe precisa de pelo menos um dono." };
  }
  return { ok: true };
}

export type InviteState = "valid" | "expired" | "used";

export function inviteState(
  invite: { expiresAt: Date; acceptedAt: Date | null },
  now: Date = new Date(),
): InviteState {
  if (invite.acceptedAt) return "used";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Pode remover este email da conta? A conta precisa manter ao menos um email.
 */
export function canRemoveEmail(emailCount: number): boolean {
  return emailCount > 1;
}
