// Fichier généré par `npm run calibrate` : ne pas modifier à la main.
// Champions — power : coefficient de duel ; runPower : coefficient en partie (joueur) ; difficulty : 1 facile à 3 difficile.
// Monstres — hpScale et damageScale : multiplicateurs de PV et de dégâts.

import type { FighterDef } from "../types";

export const CHAMPION_BALANCE: Record<string, Pick<FighterDef, "power" | "runPower" | "difficulty">> = {
  garen: { power: 0.97, runPower: 0.932, difficulty: 1 },
  darius: { power: 0.9, runPower: 0.92, difficulty: 2 },
  yasuo: { power: 1.02, runPower: 0.909, difficulty: 2 },
  malphite: { power: 1.04, runPower: 0.932, difficulty: 2 },
  leona: { power: 1.46, runPower: 1.005, difficulty: 1 },
  zed: { power: 0.98, runPower: 0.909, difficulty: 1 },
  katarina: { power: 1.18, runPower: 1.139, difficulty: 1 },
  ahri: { power: 0.92, runPower: 0.98, difficulty: 3 },
  lux: { power: 1.17, runPower: 1.005, difficulty: 3 },
  annie: { power: 1.17, runPower: 1.017, difficulty: 2 },
  jinx: { power: 1.02, runPower: 0.943, difficulty: 2 },
  ashe: { power: 1.34, runPower: 0.897, difficulty: 3 },
  caitlyn: { power: 1.13, runPower: 0.932, difficulty: 1 },
  soraka: { power: 1.24, runPower: 0.992, difficulty: 3 },
  janna: { power: 1.25, runPower: 0.98, difficulty: 3 },
};

export const MONSTER_BALANCE: Record<string, Pick<FighterDef, "hpScale" | "damageScale">> = {
  "scuttler": { hpScale: 0.512, damageScale: 2.172 },
  "gromp": { hpScale: 0.654, damageScale: 1.117 },
  "krugs": { hpScale: 0.547, damageScale: 1.145 },
  "raptors": { hpScale: 0.849, damageScale: 1.223 },
  "wolves": { hpScale: 0.661, damageScale: 1.358 },
  "blue": { hpScale: 0.433, damageScale: 1.545 },
  "red": { hpScale: 0.609, damageScale: 1.272 },
  "dragon-infernal": { hpScale: 0.731, damageScale: 1.512 },
  "dragon-mountain": { hpScale: 0.451, damageScale: 2.254 },
  "dragon-ocean": { hpScale: 0.484, damageScale: 1.702 },
  "dragon-cloud": { hpScale: 0.52, damageScale: 1.609 },
  "dragon-hextech": { hpScale: 0.581, damageScale: 1.496 },
  "dragon-chemtech": { hpScale: 0.503, damageScale: 1.582 },
  "baron": { hpScale: 0.508, damageScale: 1.176 },
};
