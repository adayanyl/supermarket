// Parsing da chave de acesso (44 dígitos) da NFC-e e do conteúdo do QR Code.
// O QR da NFC-e NÃO traz os produtos — apenas um link da SEFAZ + a chave.

/** Código IBGE da UF (2 primeiros dígitos da chave) -> sigla. */
export const IBGE_UF: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};

export interface ChaveInfo {
  chave: string;
  ufCode: string;
  uf: string;
  aamm: string;
  emissionYear: number;
  emissionMonth: number; // 1-12
  cnpj: string;
  modelo: string; // "65" = NFC-e
  serie: string;
  numero: string;
  tpEmis: string;
  codigoNumerico: string;
  dv: string;
}

/** Quebra a chave de acesso (44 dígitos) nos seus campos. Lança se inválida. */
export function parseChave(input: string): ChaveInfo {
  const chave = input.replace(/\D/g, "");
  if (chave.length !== 44) {
    throw new Error("Chave de acesso deve ter 44 dígitos");
  }
  const ufCode = chave.slice(0, 2);
  const aamm = chave.slice(2, 6);
  return {
    chave,
    ufCode,
    uf: IBGE_UF[ufCode] ?? "??",
    aamm,
    emissionYear: 2000 + Number(aamm.slice(0, 2)),
    emissionMonth: Number(aamm.slice(2, 4)),
    cnpj: chave.slice(6, 20),
    modelo: chave.slice(20, 22),
    serie: chave.slice(22, 25),
    numero: chave.slice(25, 34),
    tpEmis: chave.slice(34, 35),
    codigoNumerico: chave.slice(35, 43),
    dv: chave.slice(43, 44),
  };
}

/** Data aproximada (1º dia do mês de emissão) — usada como fallback de purchasedAt. */
export function chaveEmissionDate(info: ChaveInfo): Date {
  return new Date(Date.UTC(info.emissionYear, info.emissionMonth - 1, 1, 12));
}

export interface QrInfo {
  chave: string | null;
  url: string | null;
  /** Segmentos do parâmetro `p` (chave|versao|tpAmb|cIdToken|hash). */
  params: string[];
}

/**
 * Extrai a chave de acesso e a URL de consulta do conteúdo lido no QR Code.
 * Formato nacional: <URL>?p=<chave>|<versao>|<tpAmb>|<cIdToken>|<hash>
 */
export function parseQr(qr: string): QrInfo {
  const raw = qr.trim();
  let url: string | null = null;
  let params: string[] = [];
  let chave: string | null = null;

  try {
    const u = new URL(raw);
    url = u.toString();
    const p = u.searchParams.get("p");
    if (p) {
      params = p.split("|");
      const first = (params[0] ?? "").replace(/\D/g, "");
      if (first.length === 44) chave = first;
    }
  } catch {
    // não é uma URL — segue para o fallback
  }

  if (!chave) {
    const match = raw.match(/\d{44}/);
    if (match) chave = match[0];
  }

  return { chave, url, params };
}
