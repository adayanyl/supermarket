// Estratégia genérica (best-effort) para o "Portal NFC-e" padrão.
// O conteúdo do QR já é a própria URL de consulta; buscamos e fazemos o parse.
// Sem URL (só a chave), não há como consultar -> cai para entrada manual.
import * as cheerio from "cheerio";

import { describeFetchError, fetchHtml } from "../fetch";
import { parseNfceHtml } from "../parse";
import type { SefazInput, SefazResult, SefazStrategy } from "../types";

/** Alguns portais embrulham a nota num <iframe>/<frame>: devolve o src dele. */
export function findFrameUrl(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  const src = $("iframe[src], frame[src]").first().attr("src");
  if (!src) return null;
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return null;
  }
}

export function makeStandardStrategy(uf: string): SefazStrategy {
  return {
    uf,
    async fetchAndParse({ url }: SefazInput): Promise<SefazResult> {
      if (!url) {
        return {
          status: "manual",
          items: [],
          reason: "Só a chave não basta para a SEFAZ liberar os itens. Leia o QR Code do cupom.",
        };
      }
      try {
        const html = await fetchHtml(url);
        let result = parseNfceHtml(html);
        if (result.items.length === 0) {
          const frame = findFrameUrl(html, url);
          if (frame) result = parseNfceHtml(await fetchHtml(frame));
        }
        if (result.items.length === 0) {
          const title = cheerio.load(html)("title").first().text().trim();
          console.warn("[sefaz] página sem itens", { uf, url, title, length: html.length, head: html.slice(0, 500) });
          return { ...result, reason: "A SEFAZ respondeu, mas não encontrei os itens na página." };
        }
        return result;
      } catch (err) {
        const reason = describeFetchError(err);
        console.warn("[sefaz] falha ao consultar", { uf, url, reason, err: String(err), cause: String((err as Error)?.cause ?? "") });
        return { status: "manual", items: [], reason: `Não consegui consultar a SEFAZ (${reason}).` };
      }
    },
  };
}

export const genericStrategy: SefazStrategy = makeStandardStrategy("??");
