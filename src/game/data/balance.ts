// Fichier généré par `npm run calibrate` : ne pas modifier à la main.
// Champions — power : coefficient de duel ; runPower : coefficient en partie (joueur) ; difficulty : 1 facile à 3 difficile.
// Monstres — hpScale et damageScale : multiplicateurs de PV et de dégâts.

import type { FighterDef } from "../types";

export const CHAMPION_BALANCE: Record<string, Pick<FighterDef, "power" | "runPower" | "difficulty">> = {
  garen: { power: 0.93, runPower: 0.992, difficulty: 2 },
  darius: { power: 0.86, runPower: 0.98, difficulty: 3 },
  yasuo: { power: 1.03, runPower: 0.968, difficulty: 1 },
  malphite: { power: 1.06, runPower: 0.968, difficulty: 1 },
  leona: { power: 1.41, runPower: 1.043, difficulty: 1 },
  zed: { power: 0.98, runPower: 0.92, difficulty: 2 },
  katarina: { power: 1.18, runPower: 1.139, difficulty: 1 },
  ahri: { power: 0.95, runPower: 0.992, difficulty: 3 },
  lux: { power: 1.19, runPower: 1.03, difficulty: 3 },
  annie: { power: 1.22, runPower: 1.017, difficulty: 2 },
  jinx: { power: 1.04, runPower: 0.98, difficulty: 2 },
  ashe: { power: 1.37, runPower: 0.932, difficulty: 3 },
  caitlyn: { power: 1.14, runPower: 0.968, difficulty: 1 },
  soraka: { power: 1.2, runPower: 1.043, difficulty: 2 },
  janna: { power: 1.21, runPower: 1.03, difficulty: 3 },
};

export const MONSTER_BALANCE: Record<string, Pick<FighterDef, "hpScale" | "damageScale">> = {
  "scuttler": { hpScale: 0.505, damageScale: 2.038 },
  "gromp": { hpScale: 0.644, damageScale: 1.026 },
  "krugs": { hpScale: 0.533, damageScale: 1.027 },
  "raptors": { hpScale: 0.825, damageScale: 1.091 },
  "wolves": { hpScale: 0.64, damageScale: 1.233 },
  "blue": { hpScale: 0.434, damageScale: 1.468 },
  "red": { hpScale: 0.615, damageScale: 1.186 },
  "dragon-infernal": { hpScale: 0.742, damageScale: 1.416 },
  "dragon-mountain": { hpScale: 0.448, damageScale: 2.087 },
  "dragon-ocean": { hpScale: 0.485, damageScale: 1.585 },
  "dragon-cloud": { hpScale: 0.515, damageScale: 1.45 },
  "dragon-hextech": { hpScale: 0.59, damageScale: 1.412 },
  "dragon-chemtech": { hpScale: 0.506, damageScale: 1.465 },
  "baron": { hpScale: 0.521, damageScale: 1.111 },
};
