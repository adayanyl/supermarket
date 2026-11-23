import { describe, expect, it } from "vitest";

import {
  addDays,
  canChangeRole,
  canRemoveEmail,
  canRemoveMember,
  inviteState,
  isValidEmail,
  parseEmailList,
  parseLogin,
  validatePassword,
  validateUsername,
} from "./auth";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";

describe("validateUsername", () => {
  it("aceita nomes simples e normaliza caixa", () => {
    expect(validateUsername("aline")).toBeNull();
    expect(validateUsername("  Aline.S  ")).toBeNull();
    expect(validateUsername("joao_2")).toBeNull();
  });
  it("rejeita curtos, com espaço ou acento", () => {
    expect(validateUsername("ab")).not.toBeNull();
    expect(validateUsername("ana maria")).not.toBeNull();
    expect(validateUsername("joão")).not.toBeNull();
    expect(validateUsername(".ana")).not.toBeNull();
  });
});

describe("emails", () => {
  it("valida formato básico", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail(" A@B.COM ")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("sem-arroba")).toBe(false);
  });

  it("separa lista com vírgula, ; e quebra de linha, sem duplicar", () => {
    const r = parseEmailList("ana@x.com, BETO@x.com;\nana@x.com  carla@y.com.br nada");
    expect(r.valid).toEqual(["ana@x.com", "beto@x.com", "carla@y.com.br"]);
    expect(r.invalid).toEqual(["nada"]);
  });

  it("não deixa a conta sem email", () => {
    expect(canRemoveEmail(1)).toBe(false);
    expect(canRemoveEmail(2)).toBe(true);
  });
});

describe("parseLogin", () => {
  it("decide entre email e usuário", () => {
    expect(parseLogin(" Ana@X.com ")).toEqual({ kind: "email", value: "ana@x.com" });
    expect(parseLogin("Ana")).toEqual({ kind: "username", value: "ana" });
  });
});

describe("validatePassword", () => {
  it("exige 8 caracteres", () => {
    expect(validatePassword("1234567")).not.toBeNull();
    expect(validatePassword("12345678")).toBeNull();
  });
});

describe("papéis na equipe", () => {
  it("membro pode sair, mas não remover outros", () => {
    expect(
      canRemoveMember({ actorId: "a", actorRole: "member", targetId: "a", targetRole: "member", ownerCount: 1 }).ok,
    ).toBe(true);
    expect(
      canRemoveMember({ actorId: "a", actorRole: "member", targetId: "b", targetRole: "member", ownerCount: 1 }).ok,
    ).toBe(false);
  });

  it("dono remove membros, mas a equipe não fica sem dono", () => {
    expect(
      canRemoveMember({ actorId: "o", actorRole: "owner", targetId: "b", targetRole: "member", ownerCount: 1 }).ok,
    ).toBe(true);
    expect(
      canRemoveMember({ actorId: "o", actorRole: "owner", targetId: "o", targetRole: "owner", ownerCount: 1 }).ok,
    ).toBe(false);
    expect(
      canRemoveMember({ actorId: "o", actorRole: "owner", targetId: "o", targetRole: "owner", ownerCount: 2 }).ok,
    ).toBe(true);
  });

  it("só dono muda papel e não rebaixa o último dono", () => {
    expect(canChangeRole({ actorRole: "member", targetRole: "member", newRole: "owner", ownerCount: 1 }).ok).toBe(false);
    expect(canChangeRole({ actorRole: "owner", targetRole: "member", newRole: "owner", ownerCount: 1 }).ok).toBe(true);
    expect(canChangeRole({ actorRole: "owner", targetRole: "owner", newRole: "member", ownerCount: 1 }).ok).toBe(false);
    expect(canChangeRole({ actorRole: "owner", targetRole: "owner", newRole: "member", ownerCount: 2 }).ok).toBe(true);
  });
});

describe("inviteState", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  it("válido, expirado e usado", () => {
    expect(inviteState({ expiresAt: addDays(now, 1), acceptedAt: null }, now)).toBe("valid");
    expect(inviteState({ expiresAt: addDays(now, -1), acceptedAt: null }, now)).toBe("expired");
    expect(inviteState({ expiresAt: addDays(now, 1), acceptedAt: now }, now)).toBe("used");
  });
});

describe("password", () => {
  it("gera hash verificável e diferente a cada vez", async () => {
    const h1 = await hashPassword("senha-forte-123");
    const h2 = await hashPassword("senha-forte-123");
    expect(h1).not.toEqual(h2);
    expect(await verifyPassword("senha-forte-123", h1)).toBe(true);
    expect(await verifyPassword("outra-senha", h1)).toBe(false);
  });

  it("não aceita nada contra o hash fictício nem formato inválido", async () => {
    expect(await verifyPassword("qualquer", DUMMY_HASH)).toBe(false);
    expect(await verifyPassword("qualquer", "lixo")).toBe(false);
  });
});
