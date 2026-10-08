// Fichier généré par `npm run calibrate` : ne pas modifier à la main.
// Champions — power : coefficient de duel ; runPower : coefficient en partie (joueur) ; difficulty : 1 facile à 3 difficile.
// Monstres — hpScale et damageScale : multiplicateurs de PV et de dégâts.

import type { FighterDef } from "../types";

export const CHAMPION_BALANCE: Record<string, Pick<FighterDef, "power" | "runPower" | "difficulty">> = {
  garen: { power: 0.93, runPower: 1, difficulty: 2 },
  darius: { power: 0.86, runPower: 1, difficulty: 2 },
  yasuo: { power: 1.03, runPower: 1, difficulty: 1 },
  malphite: { power: 1.06, runPower: 1, difficulty: 1 },
  leona: { power: 1.41, runPower: 1, difficulty: 2 },
  zed: { power: 0.98, runPower: 1, difficulty: 1 },
  katarina: { power: 1.18, runPower: 1, difficulty: 1 },
  ahri: { power: 0.95, runPower: 1, difficulty: 3 },
  lux: { power: 1.19, runPower: 1, difficulty: 3 },
  annie: { power: 1.22, runPower: 1, difficulty: 3 },
  jinx: { power: 1.04, runPower: 1, difficulty: 2 },
  ashe: { power: 1.37, runPower: 1, difficulty: 2 },
  caitlyn: { power: 1.14, runPower: 1, difficulty: 1 },
  soraka: { power: 1.2, runPower: 1, difficulty: 3 },
  janna: { power: 1.21, runPower: 1, difficulty: 3 },
};

export const MONSTER_BALANCE: Record<string, Pick<FighterDef, "hpScale" | "damageScale">> = {
  "scuttler": { hpScale: 1, damageScale: 1 },
  "gromp": { hpScale: 1, damageScale: 1 },
  "krugs": { hpScale: 1, damageScale: 1 },
  "raptors": { hpScale: 1, damageScale: 1 },
  "wolves": { hpScale: 1, damageScale: 1 },
  "blue": { hpScale: 1, damageScale: 1 },
  "red": { hpScale: 1, damageScale: 1 },
  "dragon-infernal": { hpScale: 1, damageScale: 1 },
  "dragon-mountain": { hpScale: 1, damageScale: 1 },
  "dragon-ocean": { hpScale: 1, damageScale: 1 },
  "dragon-cloud": { hpScale: 1, damageScale: 1 },
  "dragon-hextech": { hpScale: 1, damageScale: 1 },
  "dragon-chemtech": { hpScale: 1, damageScale: 1 },
  "baron": { hpScale: 1, damageScale: 1 },
};
