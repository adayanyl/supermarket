// Adiciona mais um email à conta (qualquer email da conta serve para login).
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { addEmail } from "@/lib/services/auth";

const schema = z.object({ email: z.string().max(254) });

export async function POST(request: Request) {
  return withAuth(async ({ user }) => {
    const { email } = schema.parse(await request.json());
    const created = await addEmail(user.id, email);
    return ok(created, { status: 201 });
  });
}
