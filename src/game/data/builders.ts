import type { BaseStats, DamageType, Effect, Scaling, SpellDef, SpellKey, StatKey } from "../types";

// Petits constructeurs pour garder les fiches de champions lisibles.

export const dmg = (type: DamageType, amount: Scaling, hits?: number): Effect => ({ kind: "damage", type, amount, hits });
export const heal = (amount: Scaling): Effect => ({ kind: "heal", amount });
export const shield = (amount: Scaling, turns = 2): Effect => ({ kind: "shield", amount, turns });
export const stun = (turns = 1, chance?: number): Effect => ({ kind: "stun", turns, chance });
export const dot = (type: DamageType, amount: Scaling, turns: number, label: string): Effect => ({ kind: "dot", type, amount, turns, label });
export const buff = (stat: StatKey, amount: number, turns: number, label: string): Effect => ({ kind: "buff", stat, amount, turns, label });
export const debuff = (stat: StatKey, amount: number, turns: number, label: string): Effect => ({ kind: "debuff", stat, amount, turns, label });
export const dodge = (turns = 1): Effect => ({ kind: "dodge", turns });

export const spell = (
  key: SpellKey,
  name: string,
  description: string,
  cost: number,
  cooldown: number,
  effects: Effect[],
  extra: Partial<SpellDef> = {},
): SpellDef => ({ key, name, description, cost, cooldown, effects, ...extra });

export const noResource = { resource: "none", resourceMax: 0, resourceRegen: 0 } as const;
export const energy = { resource: "energy", resourceMax: 200, resourceRegen: 50 } as const;
export const mana = (max: number, regen: number, perLevel = 25) =>
  ({ resource: "mana", resourceMax: max, resourceMaxPerLevel: perLevel, resourceRegen: regen }) as const;

export const stats = (s: Omit<BaseStats, "resource" | "resourceMax" | "resourceRegen">, r: Pick<BaseStats, "resource" | "resourceMax" | "resourceRegen" | "resourceMaxPerLevel">): BaseStats => ({ ...s, ...r });


/** Stats fixes (sans progression par niveau) pour les monstres. */
export const monsterStats = (s: { hp: number; ad: number; armor: number; mr: number; crit?: number; attackSpeed?: number }): BaseStats => ({
  hp: s.hp,
  hpPerLevel: 0,
  ad: s.ad,
  adPerLevel: 0,
  armor: s.armor,
  armorPerLevel: 0,
  mr: s.mr,
  mrPerLevel: 0,
  crit: s.crit,
  attackSpeed: s.attackSpeed,
  resource: "none",
  resourceMax: 0,
  resourceRegen: 0,
});
