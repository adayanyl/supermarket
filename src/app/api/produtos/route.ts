// Busca de produtos (para vincular itens na revisão/lista) e criação manual.
import { z } from "zod";

import { prisma } from "@/lib/db";
import { normalize } from "@/lib/domain/matching";
import { handleError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const where = q ? { normalizedName: { contains: normalize(q) } } : {};
    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: 30,
      select: { id: true, name: true, unit: true, ean: true, category: true },
    });
    return ok(products);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).optional(),
  ean: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const data = createSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: {
        name: data.name,
        normalizedName: normalize(data.name),
        unit: data.unit ?? "UN",
        ean: data.ean?.trim() || null,
        category: data.category?.trim() || null,
      },
    });
    return ok(product, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
