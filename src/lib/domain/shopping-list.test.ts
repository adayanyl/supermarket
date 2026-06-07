import { describe, expect, it } from "vitest";

import {
  averageConsumption,
  buildSuggestion,
  lastNMonthKeys,
  monthKeyOf,
  roundForUnit,
} from "./shopping-list";

describe("monthKeyOf (fuso America/Sao_Paulo, UTC-3)", () => {
  it("respeita a borda do mês no fuso local", () => {
    // 01/06 02:00Z = 31/05 23:00 em São Paulo -> mês 2026-05
    expect(monthKeyOf(new Date("2026-06-01T02:00:00Z"))).toBe("2026-05");
    // 01/06 05:00Z = 01/06 02:00 em São Paulo -> mês 2026-06
    expect(monthKeyOf(new Date("2026-06-01T05:00:00Z"))).toBe("2026-06");
  });
});

describe("lastNMonthKeys", () => {
  it("retorna os 6 meses completos antes do mês de referência", () => {
    expect(lastNMonthKeys(new Date("2026-06-15T12:00:00Z"), 6)).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
    ]);
  });
});

describe("averageConsumption (os dois: OUT -> IN)", () => {
  const months = ["a", "b", "c", "d", "e", "f"];

  it("usa saída quando há, e cai para compra quando saída = 0", () => {
    const out = { a: 4 }; // só 'a' tem consumo real
    const inn = { a: 99, b: 6 }; // 'a' ignora compra (já tem saída); 'b' usa compra
    // a:4 + b:6 + (c..f) 0 = 10 ; /6
    expect(averageConsumption(out, inn, months)).toBeCloseTo(10 / 6, 5);
  });

  it("retorna 0 quando não há dados", () => {
    expect(averageConsumption({}, {}, months)).toBe(0);
    expect(averageConsumption({}, {}, [])).toBe(0);
  });
});

describe("roundForUnit", () => {
  it("arredonda inteiros para UN e 1 casa para KG", () => {
    expect(roundForUnit(1.6667, "UN")).toBe(2);
    expect(roundForUnit(1.6667, "KG")).toBe(1.7);
    expect(roundForUnit(2.04, "KG")).toBe(2);
  });
});

describe("buildSuggestion", () => {
  const months = ["a", "b", "c", "d", "e", "f"];
  const base = {
    productId: "p1",
    unit: "UN",
    monthlyOut: { a: 4 },
    monthlyIn: { a: 99, b: 6 },
    lastUnitPrice: 7.5,
    lastPurchaseDate: new Date("2026-05-10T12:00:00Z"),
  };

  it("desconta o estoque atual quando subtractStock = true", () => {
    const s = buildSuggestion({ ...base, currentStock: 1 }, months, true);
    expect(s.suggestedQuantity).toBe(1); // round(10/6)=2 ; 2-1=1
    expect(s.included).toBe(true);
    expect(s.lastUnitPrice).toBe(7.5);
  });

  it("ignora o estoque quando subtractStock = false", () => {
    const s = buildSuggestion({ ...base, currentStock: 1 }, months, false);
    expect(s.suggestedQuantity).toBe(2);
  });

  it("zera e desmarca quando o estoque cobre a necessidade", () => {
    const s = buildSuggestion({ ...base, currentStock: 5 }, months, true);
    expect(s.suggestedQuantity).toBe(0);
    expect(s.included).toBe(false);
  });
});
