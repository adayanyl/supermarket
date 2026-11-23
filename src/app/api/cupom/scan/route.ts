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
      return bad("Não consegui identificar a chave de acesso (44 dígitos) no QR Code.");
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
