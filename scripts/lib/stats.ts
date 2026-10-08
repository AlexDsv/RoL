// Petits outils statistiques pour les rapports d'équilibrage.

/** Intervalle de confiance à 95 % (Wilson) d'une proportion. */
export function wilson(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export const pct = (x: number) => `${(x * 100).toFixed(1)} %`;

/** Graines déterministes : lot de calibrage (impair) et lot de validation (pair), jamais mélangés. */
export function seeds(count: number, set: "calibration" | "validation", offset = 0): number[] {
  const base = set === "calibration" ? 1 : 2;
  return Array.from({ length: count }, (_, i) => (base + 2 * (i + offset)) * 2654435761 % 2147483647);
}
