// Confirmação de uma compra: dedup por chave, upsert da loja, criação da
// compra + itens, resolução do produto (EAN -> alias -> nome -> criar) e
// geração das movimentações de entrada (IN) na dispensa. Tudo em transação.
import { prisma } from "@/lib/db";
import { normalize } from "@/lib/domain/matching";

export interface ConfirmItemInput {
  rawDescription: string;
  ean?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  /** produto escolhido na revisão; se ausente, o servidor resolve/cria. */
  productId?: string | null;
}

export interface ConfirmPurchaseInput {
  accessKey?: string | null;
  uf?: string | null;
  sefazUrl?: string | null;
  importStatus?: string;
  purchasedAt: string | Date;
  totalValue?: number | null;
  store?: {
    cnpj?: string | null;
    name?: string | null;
    uf?: string | null;
    city?: string | null;
  } | null;
  items: ConfirmItemInput[];
}

export interface ConfirmResult {
  duplicated: boolean;
  purchaseId: string;
}

export async function confirmPurchase(input: ConfirmPurchaseInput): Promise<ConfirmResult> {
  const purchasedAt = new Date(input.purchasedAt);

  return prisma.$transaction(async (tx) => {
    if (input.accessKey) {
      const existing = await tx.purchase.findUnique({ where: { accessKey: input.accessKey } });
      if (existing) return { duplicated: true, purchaseId: existing.id };
    }

    let storeId: string | undefined;
    const cnpj = input.store?.cnpj?.replace(/\D/g, "");
    if (cnpj && cnpj.length === 14) {
      const store = await tx.store.upsert({
        where: { cnpj },
        update: {
          name: input.store?.name ?? undefined,
          uf: input.store?.uf ?? undefined,
          city: input.store?.city ?? undefined,
        },
        create: {
          cnpj,
          name: input.store?.name ?? null,
          uf: input.store?.uf ?? null,
          city: input.store?.city ?? null,
        },
      });
      storeId = store.id;
    }

    const purchase = await tx.purchase.create({
      data: {
        accessKey: input.accessKey ?? null,
        purchasedAt,
        totalValue: input.totalValue ?? null,
        importStatus: input.importStatus ?? "manual",
        sefazUrl: input.sefazUrl ?? null,
        uf: input.uf ?? null,
        storeId,
      },
    });

    const resolveProductId = async (item: ConfirmItemInput): Promise<string> => {
      if (item.productId) return item.productId;
      const ean = item.ean?.trim() || null;
      const normalized = normalize(item.rawDescription);

      if (ean) {
        const byEan = await tx.product.findUnique({ where: { ean } });
        if (byEan) return byEan.id;
        const aliasEan = await tx.productAlias.findFirst({ where: { ean } });
        if (aliasEan) return aliasEan.productId;
      }
      const alias = await tx.productAlias.findFirst({ where: { normalizedText: normalized } });
      if (alias) return alias.productId;
      const byName = await tx.product.findFirst({ where: { normalizedName: normalized } });
      if (byName) return byName.id;

      const created = await tx.product.create({
        data: { name: item.rawDescription, normalizedName: normalized, ean, unit: item.unit },
      });
      return created.id;
    };

    const ensureAlias = async (productId: string, rawDescription: string, ean: string | null) => {
      const normalizedText = normalize(rawDescription);
      const exists = await tx.productAlias.findFirst({ where: { productId, normalizedText } });
      if (!exists) {
        await tx.productAlias.create({
          data: { productId, rawDescription, normalizedText, ean, source: "import" },
        });
      }
    };

    for (const item of input.items) {
      const productId = await resolveProductId(item);
      const ean = item.ean?.trim() || null;
      await ensureAlias(productId, item.rawDescription, ean);

      const purchaseItem = await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          rawDescription: item.rawDescription,
          ean,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          productId,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type: "IN",
          quantity: item.quantity,
          unit: item.unit,
          occurredAt: purchasedAt,
          reason: "purchase",
          purchaseItemId: purchaseItem.id,
        },
      });
    }

    return { duplicated: false, purchaseId: purchase.id };
  });
}
