// Normalização de texto e match fuzzy de produtos (parte pura).
// A resolução completa (EAN -> alias -> fuzzy -> criar) que toca o banco
// fica no serviço de importação; aqui ficam só as funções testáveis.
import Fuse from "fuse.js";

/** minúsculas, sem acentos, sem pontuação, espaços colapsados. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove marcas de acento combinantes
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Candidate {
  id: string;
  /** texto JÁ normalizado do candidato (use normalize() ao montar a lista). */
  text: string;
}

export interface FuzzyMatch {
  id: string;
  score: number; // 0 = perfeito; quanto menor, melhor (Fuse.js)
}

/**
 * Melhor candidato fuzzy para a descrição informada.
 * `threshold` segue o Fuse.js (0 exige match perfeito; 1 casa qualquer coisa).
 * Retorna null se nada ficar dentro do threshold.
 */
export function fuzzyBestMatch(
  query: string,
  candidates: Candidate[],
  threshold = 0.4,
): FuzzyMatch | null {
  const q = normalize(query);
  if (!q || candidates.length === 0) return null;
  const fuse = new Fuse(candidates, {
    keys: ["text"],
    includeScore: true,
    ignoreLocation: true,
    threshold,
  });
  const [best] = fuse.search(q);
  if (!best || best.score === undefined) return null;
  return { id: best.item.id, score: best.score };
}
