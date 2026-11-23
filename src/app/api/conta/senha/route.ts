// Troca a senha (exige a atual) e encerra as sessões dos outros aparelhos.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { ok } from "@/lib/http";
import { changePassword } from "@/lib/services/auth";

const schema = z.object({ current: z.string().max(200), next: z.string().max(200) });

export async function PATCH(request: Request) {
  return withAuth(async ({ user, sessionId }) => {
    const { current, next } = schema.parse(await request.json());
    await changePassword(user.id, sessionId, current, next);
    return ok({ changed: true });
  });
}
