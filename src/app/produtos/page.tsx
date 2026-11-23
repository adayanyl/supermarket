import { ProductsManager } from "@/components/ProductsManager";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const { team } = await requireAuth();
  const products = await prisma.product.findMany({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { aliases: true } } },
  });

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    ean: p.ean,
    category: p.category,
    aliasCount: p._count.aliases,
  }));

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Produtos</h1>
        <p className="text-sm text-gray-500">
          Catálogo. Descrições iguais em cupons diferentes se unem automaticamente.
        </p>
      </header>
      <ProductsManager products={rows} />
    </div>
  );
}
