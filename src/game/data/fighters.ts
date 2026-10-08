import type { FighterDef } from "../types";
import { CHAMPIONS } from "./champions";
import { MONSTERS } from "./monsters";

const byId = new Map([...CHAMPIONS, ...MONSTERS].map((def) => [def.id, def]));

export function getFighter(id: string): FighterDef {
  const def = byId.get(id);
  if (!def) throw new Error(`Combattant inconnu : ${id}`);
  return def;
}

export const ARCHETYPE_LABELS: Record<FighterDef["archetype"], string> = {
  tank: "Tank",
  fighter: "Combattant",
  assassin: "Assassin",
  mage: "Mage",
  marksman: "Tireur",
  support: "Support",
  monster: "Monstre",
  dragon: "Dragon",
  baron: "Boss",
};
