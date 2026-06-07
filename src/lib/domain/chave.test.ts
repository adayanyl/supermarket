import { describe, expect, it } from "vitest";

import { chaveEmissionDate, parseChave, parseQr } from "./chave";

// Chave sintética de Goiás (UF 52), emissão 2024-06, modelo 65 (NFC-e).
const CHAVE_GO = "52240612345678000199650010000123451123456781";

describe("parseChave", () => {
  it("quebra a chave de GO nos campos corretos", () => {
    const info = parseChave(CHAVE_GO);
    expect(info.ufCode).toBe("52");
    expect(info.uf).toBe("GO");
    expect(info.aamm).toBe("2406");
    expect(info.emissionYear).toBe(2024);
    expect(info.emissionMonth).toBe(6);
    expect(info.cnpj).toBe("12345678000199");
    expect(info.modelo).toBe("65");
    expect(info.serie).toBe("001");
    expect(info.numero).toBe("000012345");
    expect(info.dv).toBe("1");
  });

  it("aceita chave com separadores e remove não-dígitos", () => {
    const espacada = CHAVE_GO.replace(/(.{4})/g, "$1 ");
    expect(parseChave(espacada).uf).toBe("GO");
  });

  it("lança erro quando não tem 44 dígitos", () => {
    expect(() => parseChave("123")).toThrow();
  });
});

describe("chaveEmissionDate", () => {
  it("retorna o 1º dia do mês de emissão", () => {
    const d = chaveEmissionDate(parseChave(CHAVE_GO));
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(5); // junho (0-index)
    expect(d.getUTCDate()).toBe(1);
  });
});

describe("parseQr", () => {
  it("extrai chave e params de uma URL com parâmetro p", () => {
    const qr = `https://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe.jsp?p=${CHAVE_GO}|2|1|1|A1B2C3D4`;
    const info = parseQr(qr);
    expect(info.chave).toBe(CHAVE_GO);
    expect(info.url).toContain("sefaz.go.gov.br");
    expect(info.params).toHaveLength(5);
    expect(info.params[1]).toBe("2");
  });

  it("encontra a chave como 44 dígitos avulsos", () => {
    expect(parseQr(CHAVE_GO).chave).toBe(CHAVE_GO);
  });

  it("retorna chave nula quando não há 44 dígitos", () => {
    expect(parseQr("https://exemplo.com/abc").chave).toBeNull();
  });
});
