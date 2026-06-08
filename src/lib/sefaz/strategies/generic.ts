// Estratégia genérica (best-effort) para o "Portal NFC-e" padrão.
// O conteúdo do QR já é a própria URL de consulta; buscamos e fazemos o parse.
// Sem URL (só a chave), não há como consultar -> cai para entrada manual.
import { fetchHtml } from "../fetch";
import { parseNfceHtml } from "../parse";
import type { SefazInput, SefazResult, SefazStrategy } from "../types";

export function makeStandardStrategy(uf: string): SefazStrategy {
  return {
    uf,
    async fetchAndParse({ url }: SefazInput): Promise<SefazResult> {
      if (!url) return { status: "manual", items: [] };
      try {
        const html = await fetchHtml(url);
        return parseNfceHtml(html);
      } catch {
        // rede bloqueada, timeout ou layout incompatível -> entrada manual
        return { status: "manual", items: [] };
      }
    },
  };
}

export const genericStrategy: SefazStrategy = makeStandardStrategy("??");
