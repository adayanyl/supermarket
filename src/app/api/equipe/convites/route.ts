// Gera convites para a equipe ativa: um link por email informado (aceita
// vários de uma vez) ou um link avulso se nenhum email for passado.
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { parseEmailList } from "@/lib/domain/auth";
import { bad, ok } from "@/lib/http";
import { createInvites } from "@/lib/services/auth";

const schema = z.object({ emails: z.string().max(5000).optional() });

export async function POST(request: Request) {
  return withAuth(async ({ user, team }) => {
    const { emails } = schema.parse(await request.json());
    const { valid, invalid } = parseEmailList(emails ?? "");
    if (invalid.length) return bad(`Emails inválidos: ${invalid.join(", ")}`);
    if (valid.length > 50) return bad("Convide no máximo 50 emails por vez.");
    const result = await createInvites(team.id, user.id, valid);
    return ok(
      {
        invites: result.invites.map((i) => ({ id: i.id, email: i.email, token: i.token })),
        skipped: result.skipped,
      },
      { status: 201 },
    );
  });
}
