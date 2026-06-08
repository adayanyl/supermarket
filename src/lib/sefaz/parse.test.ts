import { describe, expect, it } from "vitest";

import { parseBrNumber, parseNfceHtml } from "./parse";

describe("parseBrNumber", () => {
  it("entende o formato brasileiro", () => {
    expect(parseBrNumber("1.234,56")).toBe(1234.56);
    expect(parseBrNumber("R$ 5,99")).toBe(5.99);
    expect(parseBrNumber("Qtde.:2,000")).toBe(2);
    expect(parseBrNumber("")).toBe(0);
  });
});

// Fixture com a estrutura do Portal NFC-e padrão (#tabResult).
const HTML = `
<html><body>
  <div class="txtTopo">SUPERMERCADO EXEMPLO LTDA</div>
  <div class="text">CNPJ: 12.345.678/0001-99</div>
  <table id="tabResult">
    <tr id="Item1">
      <td>
        <span class="txtTit">ARROZ TIO JOAO 5KG</span>
        <span class="Rqtd"><strong>Qtde.:</strong>2</span>
        <span class="RUN"><strong>UN: </strong>UN</span>
        <span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;25,90</span>
      </td>
      <td class="txtTit2"><span class="valor">51,80</span></td>
    </tr>
    <tr id="Item2">
      <td>
        <span class="txtTit">BANANA PRATA KG</span>
        <span class="Rqtd"><strong>Qtde.:</strong>1,250</span>
        <span class="RUN"><strong>UN: </strong>KG</span>
        <span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;4,00</span>
      </td>
      <td class="txtTit2"><span class="valor">5,00</span></td>
    </tr>
  </table>
  <div id="totalNota">
    <span>Valor a pagar R$</span><span class="totalNumb txtMax">56,80</span>
  </div>
  <div>Emissão: 15/05/2026 18:42:10</div>
</body></html>`;

describe("parseNfceHtml", () => {
  const result = parseNfceHtml(HTML);

  it("extrai os itens com quantidade, unidade e valores", () => {
    expect(result.status).toBe("auto");
    expect(result.items).toHaveLength(2);

    const [arroz, banana] = result.items;
    expect(arroz.rawDescription).toBe("ARROZ TIO JOAO 5KG");
    expect(arroz.quantity).toBe(2);
    expect(arroz.unit).toBe("UN");
    expect(arroz.unitPrice).toBe(25.9);
    expect(arroz.totalPrice).toBe(51.8);

    expect(banana.quantity).toBe(1.25);
    expect(banana.unit).toBe("KG");
    expect(banana.totalPrice).toBe(5);
  });

  it("extrai loja, CNPJ, total e data", () => {
    expect(result.store?.name).toBe("SUPERMERCADO EXEMPLO LTDA");
    expect(result.store?.cnpj).toBe("12345678000199");
    expect(result.totalValue).toBe(56.8);
    expect(result.purchasedAt?.getFullYear()).toBe(2026);
    expect(result.purchasedAt?.getMonth()).toBe(4); // maio
    expect(result.purchasedAt?.getDate()).toBe(15);
  });

  it("retorna status manual quando não há tabela de itens", () => {
    expect(parseNfceHtml("<html><body>nada aqui</body></html>").status).toBe("manual");
  });
});
