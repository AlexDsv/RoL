import type { FighterDef, Stats } from "./types";

export const EMPTY_STATS: Stats = {
  maxHp: 0,
  ad: 0,
  ap: 0,
  armor: 0,
  mr: 0,
  crit: 0,
  attackSpeed: 0,
  lifesteal: 0,
  thorns: 0,
  onHitCurrentHp: 0,
  maxResource: 0,
  resourceRegen: 0,
  hpRegenPct: 0,
};

export function statsAtLevel(def: FighterDef, level: number): Stats {
  const s = def.stats;
  const l = level - 1;
  return {
    ...EMPTY_STATS,
    maxHp: Math.round(s.hp + s.hpPerLevel * l),
    ad: Math.round(s.ad + s.adPerLevel * l),
    ap: Math.round((s.ap ?? 0) + (s.apPerLevel ?? 0) * l),
    armor: Math.round(s.armor + s.armorPerLevel * l),
    mr: Math.round(s.mr + s.mrPerLevel * l),
    crit: s.crit ?? 0,
    attackSpeed: s.attackSpeed ?? 0,
    maxResource: s.resource === "none" ? 0 : Math.round(s.resourceMax + (s.resourceMaxPerLevel ?? 0) * l),
    resourceRegen: s.resourceRegen,
  };
}

/** Additionne des bonus partiels ; les ressources ne s'ajoutent pas aux champions sans ressource. */
export function addStats(base: Stats, ...bonuses: Partial<Stats>[]): Stats {
  const out = { ...base };
  for (const bonus of bonuses) {
    for (const [key, value] of Object.entries(bonus) as [keyof Stats, number][]) {
      if ((key === "maxResource" || key === "resourceRegen") && base.maxResource === 0) continue;
      out[key] += value;
    }
  }
  out.crit = Math.min(out.crit, 1);
  out.attackSpeed = Math.min(out.attackSpeed, 1);
  return out;
}
