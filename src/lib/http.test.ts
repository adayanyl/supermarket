import { describe, expect, it } from "vitest";

import { isSchemaOutdated } from "./http";

describe("isSchemaOutdated", () => {
  it("reconhece tabela/coluna faltando (Prisma ou SQLite, inclusive em cause)", () => {
    expect(isSchemaOutdated(new Error("SQLITE_ERROR: no such table: main.User"))).toBe(true);
    expect(isSchemaOutdated({ code: "P2021" })).toBe(true);
    expect(isSchemaOutdated(new Error("x", { cause: new Error("no such column: teamId") }))).toBe(true);
  });
  it("ignora outros erros", () => {
    expect(isSchemaOutdated(new Error("UNIQUE constraint failed"))).toBe(false);
    expect(isSchemaOutdated(undefined)).toBe(false);
  });
});
