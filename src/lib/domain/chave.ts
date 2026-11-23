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

/** Confere o dígito verificador (módulo 11, pesos 2..9 da direita p/ esquerda). */
export function isChaveDvValid(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += Number(chave[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return dv === Number(chave[43]);
}

/** Parece uma chave de NF-e/NFC-e? (UF conhecida, mês válido, modelo 55/65). */
function looksLikeChave(chave: string): boolean {
  const month = Number(chave.slice(4, 6));
  const modelo = chave.slice(20, 22);
  return chave.slice(0, 2) in IBGE_UF && month >= 1 && month <= 12 && (modelo === "65" || modelo === "55");
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Procura a chave (44 dígitos) num texto qualquer. Aceita a chave impressa no
 * cupom, que vem em grupos de 4 separados por espaço ("5224 0612 ..."), com
 * pontos, traços ou quebras de linha. Entre várias candidatas, prefere a que
 * tem dígito verificador válido.
 */
export function findChave(text: string): string | null {
  // 1) 44 dígitos seguidos.
  const contiguous = [...text.matchAll(/(?<!\d)\d{44}(?!\d)/g)].map((m) => m[0]);
  // 2) dígitos separados por espaço, ponto, traço, barra ou quebra de linha.
  const spaced = [...text.matchAll(/\d[\d\s.\-/]*\d/g)]
    .map((m) => m[0].replace(/\D/g, ""))
    .filter((d) => d.length === 44);
  const candidates = [...contiguous, ...spaced];
  if (candidates.length === 0) {
    // 3) qualquer janela de 44 dígitos dentro de uma sequência mais longa.
    for (const m of text.matchAll(/\d[\d\s.\-/]*\d/g)) {
      const digits = m[0].replace(/\D/g, "");
      for (let i = 0; i + 44 <= digits.length; i++) {
        const c = digits.slice(i, i + 44);
        if (isChaveDvValid(c) && looksLikeChave(c)) candidates.push(c);
      }
    }
  }
  return (
    candidates.find((c) => isChaveDvValid(c) && looksLikeChave(c)) ??
    candidates.find((c) => looksLikeChave(c)) ??
    candidates[0] ??
    null
  );
}

/**
 * Extrai a chave de acesso e a URL de consulta do conteúdo lido no QR Code.
 * Formato nacional: <URL>?p=<chave>|<versao>|<tpAmb>|<cIdToken>|<hash>
 * Também aceita só a chave (digitada/colada, com ou sem espaços), URLs com
 * `chNFe=`/`chave=` e links embrulhados (ex.: redirecionamento do Google).
 */
export function parseQr(qr: string): QrInfo {
  // Remove caracteres invisíveis que câmeras/teclados do iOS às vezes inserem.
  const raw = qr.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim();
  let url: string | null = null;
  let params: string[] = [];
  let chave: string | null = null;

  const urlMatch = raw.match(/https?:\/\/\S+/i);
  if (urlMatch) {
    try {
      let u = new URL(urlMatch[0]);
      // Link embrulhado (google.com/url?q=..., etc.): usa o link de dentro.
      for (const key of ["q", "url", "u", "link"]) {
        const inner = u.searchParams.get(key);
        if (inner && /^https?:\/\//i.test(inner) && !u.searchParams.get("p")) {
          u = new URL(inner);
          break;
        }
      }
      url = u.toString();
      const p = u.searchParams.get("p");
      if (p) {
        params = p.split("|");
        const first = (params[0] ?? "").replace(/\D/g, "");
        if (first.length === 44) chave = first;
      }
      if (!chave) {
        for (const key of ["chNFe", "chnfe", "chave", "chaveAcesso"]) {
          const v = (u.searchParams.get(key) ?? "").replace(/\D/g, "");
          if (v.length === 44) {
            chave = v;
            break;
          }
        }
      }
    } catch {
      // URL malformada — segue para o fallback
    }
  }

  if (!chave) chave = findChave(safeDecode(raw));

  return { chave, url, params };
}
