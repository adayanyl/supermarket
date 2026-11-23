// Sai da conta neste aparelho.
import { endSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/http";

export async function POST() {
  try {
    await endSession();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}
