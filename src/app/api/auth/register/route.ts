// Cadastro: cria usuário + email principal, entra numa equipe e já loga.
import { z } from "zod";

import { startSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";
import { registerUser } from "@/lib/services/auth";

const schema = z.object({
  name: z.string().max(100),
  username: z.string().max(60),
  email: z.string().max(254),
  password: z.string().max(200),
  inviteToken: z.string().max(100).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const { userId, teamId } = await registerUser(input);
    await startSession(userId, teamId);
    return ok({ userId, teamId }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
