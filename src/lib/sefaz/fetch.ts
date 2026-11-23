// Busca server-side da página da SEFAZ (evita CORS e permite UA realista).
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 Dispensa/1.0";

export async function fetchHtml(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Traduz o erro do fetch para algo legível (timeout, certificado, HTTP...). */
export function describeFetchError(err: unknown): string {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === "AbortError") return "a SEFAZ demorou demais para responder";
  const code = e?.cause?.code ?? "";
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|SSL|TLS/i.test(code + (e?.cause?.message ?? ""))) {
    return `certificado da SEFAZ não aceito: ${code || e?.cause?.message}`;
  }
  if (/ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|UND_ERR/i.test(code)) {
    return `conexão recusada: ${code}`;
  }
  if (/^HTTP \d+/.test(e?.message ?? "")) return `a SEFAZ respondeu ${e!.message}`;
  return e?.message || "erro desconhecido";
}
