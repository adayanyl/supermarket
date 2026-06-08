// Estratégia de Goiás (GO). A SEFAZ-GO usa o Portal NFC-e padrão, então
// reaproveitamos o parser compartilhado. Mantida como ponto de extensão para
// ajustes específicos do estado (ex.: URL de consulta própria) no futuro.
import { makeStandardStrategy } from "./generic";
import type { SefazStrategy } from "../types";

export const goStrategy: SefazStrategy = makeStandardStrategy("GO");
