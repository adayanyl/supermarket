// Atualiza o nome de exibição.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bad, ok } from "@/lib/http";

const schema = z.object({ name: z.string().max(100) });

export async function PATCH(request: Request) {
  return withAuth(async ({ user }) => {
    const name = schema.parse(await request.json()).name.trim();
    if (!name) return bad("Informe seu nome.");
    const updated = await prisma.user.update({ where: { id: user.id }, data: { name } });
    return ok({ name: updated.name });
  });
}
