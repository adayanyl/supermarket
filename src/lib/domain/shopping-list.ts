// Lógica pura da lista de compras: buckets de mês (fuso de São Paulo),
// média de consumo de 6 meses com fallback "os dois" (consumo real -> compras)
// e construção da sugestão (descontando o estoque atual, opcional).
import { formatInTimeZone } from "date-fns-tz";

export const DEFAULT_TZ = "America/Sao_Paulo";

/** "YYYY-MM" */
export type MonthKey = string;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Mês (no fuso informado) ao qual a data pertence, como "YYYY-MM". */
export function monthKeyOf(date: Date, timeZone: string = DEFAULT_TZ): MonthKey {
  return formatInTimeZone(date, timeZone, "yyyy-MM");
}

/** Os `n` meses completos imediatamente ANTES do mês de `reference`, do mais antigo ao mais recente. */
export function lastNMonthKeys(
  reference: Date,
  n: number,
  timeZone: string = DEFAULT_TZ,
): MonthKey[] {
  const [yStr, mStr] = monthKeyOf(reference, timeZone).split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1-12
  const keys: MonthKey[] = [];
  for (let i = 1; i <= n; i++) {
    let mm = m - i;
    let yy = y;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    keys.push(`${yy}-${pad2(mm)}`);
  }
  return keys.reverse();
}

/**
 * Média mensal "os dois": para cada mês usa o consumo real (saídas) quando houver;
 * caso contrário, cai para a quantidade comprada (entradas). Denominador fixo = nº de meses.
 */
export function averageConsumption(
  monthlyOut: Record<MonthKey, number>,
  monthlyIn: Record<MonthKey, number>,
  months: MonthKey[],
): number {
  if (months.length === 0) return 0;
  let sum = 0;
  for (const month of months) {
    const out = monthlyOut[month] ?? 0;
    const inn = monthlyIn[month] ?? 0;
    sum += out > 0 ? out : inn;
  }
  return sum / months.length;
}

const FRACTIONAL_UNITS = new Set(["KG", "G", "L", "ML", "M", "CM"]);

/** Arredonda conforme a unidade: inteiros para UN/PCT, 1 casa para peso/volume. */
export function roundForUnit(value: number, unit: string): number {
  const u = (unit ?? "UN").toUpperCase();
  if (FRACTIONAL_UNITS.has(u)) return Math.round(value * 10) / 10;
  return Math.round(value);
}

export interface SuggestionInput {
  productId: string;
  unit: string;
  monthlyOut: Record<MonthKey, number>;
  monthlyIn: Record<MonthKey, number>;
  currentStock: number;
  lastUnitPrice?: number | null;
  lastPurchaseDate?: Date | null;
}

export interface Suggestion {
  productId: string;
  unit: string;
  averageMonthly: number;
  suggestedQuantity: number;
  included: boolean;
  lastUnitPrice: number | null;
  lastPurchaseDate: Date | null;
}

/** Constrói a sugestão de compra de um produto a partir da média e do estoque. */
export function buildSuggestion(
  input: SuggestionInput,
  months: MonthKey[],
  subtractStock: boolean,
): Suggestion {
  const avg = averageConsumption(input.monthlyOut, input.monthlyIn, months);
  const rounded = roundForUnit(avg, input.unit);
  const suggested = subtractStock
    ? Math.max(0, roundForUnit(rounded - input.currentStock, input.unit))
    : rounded;
  return {
    productId: input.productId,
    unit: input.unit,
    averageMonthly: avg,
    suggestedQuantity: suggested,
    included: suggested > 0,
    lastUnitPrice: input.lastUnitPrice ?? null,
    lastPurchaseDate: input.lastPurchaseDate ?? null,
  };
}
