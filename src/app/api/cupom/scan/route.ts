// Lê o conteúdo do QR Code, identifica a chave/UF e tenta buscar os itens na
// SEFAZ. Sempre responde algo: quando a consulta não traz itens (estado sem
// suporte, rede bloqueada, layout diferente), volta status "manual".
import { z } from "zod";

import { chaveEmissionDate, parseChave, parseQr } from "@/lib/domain/chave";
import { withAuth } from "@/lib/auth";
import { bad, ok } from "@/lib/http";
import { getStrategy } from "@/lib/sefaz/registry";

const schema = z.object({ qr: z.string().min(1) });

// Raspagem da SEFAZ roda no servidor (Node) e pode demorar alguns segundos.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return withAuth(async () => {
    const { qr } = schema.parse(await request.json());
    const { chave, url, params } = parseQr(qr);
    if (!chave) {
      // Ajuda a diagnosticar leituras de câmera/colagens fora do padrão.
      console.warn("[cupom/scan] chave não encontrada", { length: qr.length, sample: qr.slice(0, 120) });
      const digits = qr.replace(/\D/g, "").length;
      return bad(
        digits > 0 && digits < 44
          ? `A chave de acesso tem 44 dígitos e encontrei só ${digits}. Confira se digitou a chave inteira (fica embaixo do QR Code, em grupos de 4 números).`
          : "Não consegui identificar a chave de acesso (44 dígitos) no QR Code. Tente de novo ou digite a chave impressa no cupom.",
      );
    }

    let info;
    try {
      info = parseChave(chave);
    } catch {
      return bad("Chave de acesso inválida.");
    }

    const result = await getStrategy(info.uf).fetchAndParse({ chave, params, url });

    return ok({
      accessKey: chave,
      uf: info.uf,
      sefazUrl: url,
      importStatus: result.status,
      purchasedAt: (result.purchasedAt ?? chaveEmissionDate(info)).toISOString(),
      totalValue: result.totalValue ?? null,
      store: {
        cnpj: result.store?.cnpj ?? info.cnpj,
        name: result.store?.name ?? null,
        uf: result.store?.uf ?? info.uf,
        city: result.store?.city ?? null,
      },
      items: result.items,
    });
  });
}
