import { describe, expect, it } from "vitest";

import { chaveEmissionDate, findChave, isChaveDvValid, parseChave, parseQr } from "./chave";

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

  it("aceita a chave digitada em grupos de 4 (como vem impressa no cupom)", () => {
    const espacada = CHAVE_GO.replace(/(.{4})/g, "$1 ").trim();
    expect(parseQr(espacada).chave).toBe(CHAVE_GO);
  });

  it("aceita chave com pontos, traços e quebras de linha", () => {
    const sujo = `${CHAVE_GO.slice(0, 20)}.${CHAVE_GO.slice(20, 30)}-\n${CHAVE_GO.slice(30)}`;
    expect(parseQr(sujo).chave).toBe(CHAVE_GO);
  });

  it("ignora caracteres invisíveis e texto em volta", () => {
    expect(parseQr(`\uFEFFChave de acesso: ${CHAVE_GO}\u200B`).chave).toBe(CHAVE_GO);
  });

  it("lê URL com pipes codificados (%7C)", () => {
    const qr = `https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p=${CHAVE_GO}%7C2%7C1%7C1%7CABC`;
    const info = parseQr(qr);
    expect(info.chave).toBe(CHAVE_GO);
    expect(info.params).toHaveLength(5);
  });

  it("desembrulha link de redirecionamento (ex.: Google)", () => {
    const inner = `https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p=${CHAVE_GO}|2|1|1|ABC`;
    const info = parseQr(`https://www.google.com/url?q=${encodeURIComponent(inner)}&sa=D`);
    expect(info.chave).toBe(CHAVE_GO);
    expect(info.url).toContain("sefaz.go.gov.br");
    expect(info.params[0]).toBe(CHAVE_GO);
  });

  it("lê chave no parâmetro chNFe", () => {
    expect(parseQr(`https://www.sefaz.xx.gov.br/consulta?chNFe=${CHAVE_GO}`).chave).toBe(CHAVE_GO);
  });
});

describe("findChave / isChaveDvValid", () => {
  // Chave com DV válido: calcula o DV para os 43 primeiros dígitos de CHAVE_GO.
  const base = CHAVE_GO.slice(0, 43);
  const valid = Array.from({ length: 10 }, (_, d) => base + d).find(isChaveDvValid)!;

  it("calcula o dígito verificador (módulo 11)", () => {
    expect(valid).toBeDefined();
    expect(isChaveDvValid(valid)).toBe(true);
    const wrong = base + ((Number(valid[43]) + 1) % 10);
    expect(isChaveDvValid(wrong)).toBe(false);
  });

  it("acha a chave válida dentro de uma sequência mais longa de dígitos", () => {
    expect(findChave(`99${valid}12`)).toBe(valid);
  });

  it("retorna null quando faltam dígitos", () => {
    expect(findChave("5224 0612 3456")).toBeNull();
  });
});
