// Registro de estratégias por UF. Estados sem estratégia própria usam a
// genérica; tudo degrada para entrada manual quando a consulta não funciona.
import { genericStrategy } from "./strategies/generic";
import { goStrategy } from "./strategies/go";
import type { SefazStrategy } from "./types";

const STRATEGIES: Record<string, SefazStrategy> = {
  GO: goStrategy,
  // Adicionar novas UFs aqui conforme forem implementadas/testadas.
};

export function getStrategy(uf: string): SefazStrategy {
  return STRATEGIES[uf] ?? genericStrategy;
}
