// Formatação para a UI (pt-BR), com fuso de São Paulo nas datas.
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const MONTH = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export const formatBRL = (n: number | null | undefined) => BRL.format(n ?? 0);

export const formatDate = (d: Date | string | null | undefined) =>
  d ? DATE.format(new Date(d)) : "—";

export const formatMonth = (d: Date | string) => MONTH.format(new Date(d));

/** Quantidade com a unidade, usando vírgula decimal quando fracionária. */
export function formatQty(n: number | null | undefined, unit: string): string {
  const value = n ?? 0;
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  return `${text} ${unit}`;
}
