import { describe, expect, it } from "vitest";

import { Candidate, fuzzyBestMatch, normalize } from "./matching";

describe("normalize", () => {
  it("remove acentos, caixa e pontuação", () => {
    expect(normalize("Refrig. Coca-Cola 2L  ")).toBe("refrig coca cola 2l");
    expect(normalize("AÇÚCAR UNIÃO 1KG")).toBe("acucar uniao 1kg");
    expect(normalize("  Pão   de   Forma ")).toBe("pao de forma");
  });
});

describe("fuzzyBestMatch", () => {
  const candidates: Candidate[] = [
    { id: "coca", text: normalize("Refrigerante Coca-Cola 2L") },
    { id: "arroz", text: normalize("Arroz Tio João 5kg") },
    { id: "feijao", text: normalize("Feijão Carioca 1kg") },
  ];

  it("casa uma descrição abreviada com o produto certo", () => {
    const match = fuzzyBestMatch("REFRIG COCA COLA 2L", candidates);
    expect(match?.id).toBe("coca");
  });

  it("retorna null quando nada é parecido o bastante", () => {
    expect(fuzzyBestMatch("Detergente Líquido Ypê", candidates)).toBeNull();
  });

  it("retorna null para entrada vazia ou sem candidatos", () => {
    expect(fuzzyBestMatch("", candidates)).toBeNull();
    expect(fuzzyBestMatch("arroz", [])).toBeNull();
  });
});
