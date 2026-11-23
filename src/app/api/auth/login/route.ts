// Login com usuário (ou qualquer email da conta) + senha.
import { z } from "zod";

import { startSession } from "@/lib/auth";
import { bad, handleError, ok } from "@/lib/http";
import { authenticate } from "@/lib/services/auth";

const schema = z.object({
  login: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const { login, password } = schema.parse(await request.json());
    const user = await authenticate(login, password);
    if (!user) return bad("Usuário, email ou senha incorretos.", 401);
    await startSession(user.id, null);
    return ok({ userId: user.id });
  } catch (err) {
    return handleError(err);
  }
}
