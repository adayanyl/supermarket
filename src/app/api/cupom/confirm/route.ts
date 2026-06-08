// Salva a compra revisada: cria compra + itens, resolve produtos e gera as
// entradas (IN) na dispensa. Idempotente pela chave de acesso.
import { z } from "zod";

import { handleError, ok } from "@/lib/http";
import { confirmPurchase } from "@/lib/services/import";

const itemSchema = z.object({
  rawDescription: z.string().min(1),
  ean: z.string().nullable().optional(),
  quantity: z.number().positive(),
  unit: z.string().min(1).default("UN"),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  productId: z.string().nullable().optional(),
});

const schema = z.object({
  accessKey: z.string().nullable().optional(),
  uf: z.string().nullable().optional(),
  sefazUrl: z.string().nullable().optional(),
  importStatus: z.string().optional(),
  purchasedAt: z.string(),
  totalValue: z.number().nullable().optional(),
  store: z
    .object({
      cnpj: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      uf: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  items: z.array(itemSchema).min(1, "Inclua ao menos um item."),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const result = await confirmPurchase(input);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
