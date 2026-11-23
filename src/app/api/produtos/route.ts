// Busca de produtos (para vincular itens na revisão/lista) e criação manual.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { normalize } from "@/lib/domain/matching";
import { ok } from "@/lib/http";

export async function GET(request: Request) {
  return withAuth(async ({ team }) => {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    const where = q
      ? { teamId: team.id, normalizedName: { contains: normalize(q) } }
      : { teamId: team.id };
    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: 30,
      select: { id: true, name: true, unit: true, ean: true, category: true },
    });
    return ok(products);
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1).optional(),
  ean: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  return withAuth(async ({ team }) => {
    const data = createSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: {
        teamId: team.id,
        name: data.name,
        normalizedName: normalize(data.name),
        unit: data.unit ?? "UN",
        ean: data.ean?.trim() || null,
        category: data.category?.trim() || null,
      },
    });
    return ok(product, { status: 201 });
  });
}
