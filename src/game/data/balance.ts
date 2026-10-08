// Fichier généré par `npm run calibrate` : ne pas modifier à la main.
// power : coefficient de duel ; pve : coefficient contre les monstres ; difficulty : 1 facile à 3 difficile.

import type { FighterDef } from "../types";

export const BALANCE: Record<string, Pick<FighterDef, "power" | "pve" | "difficulty">> = {
  garen: { power: 0.99, pve: 1, difficulty: 1 },
  darius: { power: 0.97, pve: 1, difficulty: 1 },
  yasuo: { power: 0.98, pve: 1, difficulty: 1 },
  malphite: { power: 1.07, pve: 1, difficulty: 1 },
  leona: { power: 1.38, pve: 1, difficulty: 3 },
  zed: { power: 0.83, pve: 1, difficulty: 3 },
  katarina: { power: 1.05, pve: 1, difficulty: 3 },
  ahri: { power: 0.99, pve: 1, difficulty: 1 },
  lux: { power: 1.16, pve: 1, difficulty: 3 },
  annie: { power: 1.13, pve: 1, difficulty: 3 },
  jinx: { power: 1.09, pve: 1, difficulty: 2 },
  ashe: { power: 1.38, pve: 1, difficulty: 2 },
  caitlyn: { power: 1.03, pve: 1, difficulty: 3 },
  soraka: { power: 1.29, pve: 1, difficulty: 2 },
  janna: { power: 1.27, pve: 1, difficulty: 2 },
};
