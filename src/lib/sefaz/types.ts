// Tipos compartilhados da camada de leitura do cupom (NFC-e) na SEFAZ.

export type ImportStatus = "auto" | "partial" | "manual";

export interface ParsedItem {
  rawDescription: string;
  ean?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface ParsedStore {
  cnpj?: string | null;
  name?: string | null;
  uf?: string | null;
  city?: string | null;
}

export interface SefazResult {
  status: ImportStatus;
  store?: ParsedStore;
  purchasedAt?: Date;
  totalValue?: number;
  items: ParsedItem[];
  /** Por que não veio item nenhum (para log e para mostrar na tela). */
  reason?: string;
}

export interface SefazInput {
  chave: string;
  params: string[];
  url?: string | null;
}

export interface SefazStrategy {
  uf: string;
  fetchAndParse(input: SefazInput): Promise<SefazResult>;
}
