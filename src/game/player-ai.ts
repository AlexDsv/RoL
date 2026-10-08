// Joueur simulé, utilisé pour l'équilibrage. Contrairement à l'IA des
// adversaires (ai.ts), il anticipe le prochain tour, tient compte de ce que
// l'adversaire peut faire, achète selon son build et fait parfois des erreurs,
// comme un humain. Trois niveaux : débutant, moyen et expert.

import { bestDamage, scoreAction } from "./ai";
import { availableActions, effectiveStats, estimateAction, spellBlock, totalShield } from "./battle";
import { BUILDS, type Build } from "./data/builds";
import { getItem, ITEMS, MAX_ITEMS } from "./data/items";
import { nextRandom } from "./rng";
import { buyBlock, buyItem, canUsePotion, chapterOf, currentEnemy, goldReward, sellItem, type RunState } from "./run";
import type { Action, BattleState, DamageType, FighterDef } from "./types";

export type Skill = "beginner" | "average" | "expert";

export interface SkillProfile {
  label: string;
  /** Probabilité de jouer la 2e ou 3e meilleure action au lieu de la meilleure. */
  mistake: number;
  /** Anticipe le tour adverse : danger de mort, ultime adverse disponible, ténacité. */
  anticipation: boolean;
  /** Avance l'objet défensif adapté au prochain adversaire. */
  adaptiveShop: boolean;
  /** Probabilité d'acheter un objet au hasard au lieu de suivre son build. */
  shopMistake: number;
  potionStock: number;
  /** Probabilité d'oublier de boire une potion quand il le faudrait. */
  forgetPotion: number;
  elixirs: boolean;
}

export const SKILL_PROFILES: Record<Skill, SkillProfile> = {
  beginner: { label: "Débutant", mistake: 0.3, anticipation: false, adaptiveShop: false, shopMistake: 0.3, potionStock: 2, forgetPotion: 0.4, elixirs: false },
  average: { label: "Moyen", mistake: 0.15, anticipation: true, adaptiveShop: true, shopMistake: 0.1, potionStock: 3, forgetPotion: 0.1, elixirs: true },
  expert: { label: "Expert", mistake: 0.03, anticipation: true, adaptiveShop: true, shopMistake: 0, potionStock: 4, forgetPotion: 0, elixirs: true },
};

export type Rand = () => number;

/** Générateur indépendant de celui du combat, pour que les erreurs ne changent pas les jets de dés. */
export function makeRand(seed: number): Rand {
  let state = seed;
  return () => {
    const [value, next] = nextRandom(state);
    state = next;
    return value;
  };
}

// ---------------------------------------------------------------------------
// Combat

function playerScore(state: BattleState, action: Action, profile: SkillProfile): number {
  const score = scoreAction(state, "player", action);
  if (!profile.anticipation || score >= 10_000) return score;

  const me = state.player;
  const foe = state.enemy;
  const est = estimateAction(state, "player", action);
  const threat = bestDamage(state, "enemy");
  let bonus = 0;

  // En danger de mort au prochain tour : se protéger passe avant tout.
  if (me.hp + totalShield(me) <= threat * 1.2) {
    bonus += Math.min(est.heal + est.shield, threat * 1.5) + est.dodge * threat + est.stun * threat;
  }
  // L'ultime adverse est prêt : une esquive ou un étourdissement vaut plus.
  if (foe.cooldowns.R === 0 && spellBlock(state, "enemy", "R") === null) {
    bonus += (est.dodge + est.stun) * threat * 0.5;
  }
  // Inutile d'étourdir un adversaire protégé par la ténacité.
  if (foe.statuses.some((st) => st.id === "tenacity")) bonus -= est.stun * threat * 1.2;
  // Achever au tour suivant : privilégier les dégâts quand l'adversaire est bas.
  if (foe.hp <= est.damage * 2) bonus += est.damage * 0.3;

  return score + bonus;
}

export function choosePlayerAction(state: BattleState, profile: SkillProfile, rand: Rand): Action {
  const ranked = availableActions(state, "player")
    .map((action) => ({ action, score: playerScore(state, action, profile) }))
    .sort((a, b) => b.score - a.score);
  // Un coup fatal évident n'est raté que par les débutants, et rarement.
  const lethal = ranked[0].score >= 10_000;
  const mistakeChance = lethal ? profile.mistake / 3 : profile.mistake;
  if (ranked.length > 1 && rand() < mistakeChance) {
    return ranked[1 + Math.floor(rand() * Math.min(2, ranked.length - 1))].action;
  }
  return ranked[0].action;
}

/** Potion à boire avant d'agir, ou null. */
export function potionToDrink(run: RunState, state: BattleState, profile: SkillProfile, rand: Rand): string | null {
  const me = state.player;
  const stats = effectiveStats(me);
  const missing = stats.maxHp - me.hp;
  const danger = profile.anticipation
    ? me.hp + totalShield(me) <= bestDamage(state, "enemy") * 1.4 || me.hp < stats.maxHp * 0.3
    : me.hp < stats.maxHp * 0.35;
  if (!danger || missing < stats.maxHp * 0.2) return null;
  if (rand() < profile.forgetPotion) return null;
  const lowResource = stats.maxResource > 0 && me.resource < stats.maxResource * 0.3;
  const order = lowResource ? ["corrupting-potion", "health-potion"] : ["health-potion", "corrupting-potion"];
  return order.find((id) => canUsePotion({ ...run, battle: state }, id)) ?? null;
}

// ---------------------------------------------------------------------------
// Boutique

/** Part de chaque type de dégâts dans le kit d'un combattant (attaques comprises). */
export function damageProfile(def: FighterDef): Record<DamageType, number> {
  const weights: Record<DamageType, number> = { physical: 100, magic: 0, true: 0 };
  for (const spell of def.spells) {
    for (const e of spell.effects) {
      if (e.kind === "damage") weights[e.type] += (e.amount.base + (e.amount.perLevel ?? 0) * 10) * (e.hits ?? 1);
      if (e.kind === "dot") weights[e.type] += (e.amount.base + (e.amount.perLevel ?? 0) * 10) * e.turns * 0.5;
    }
  }
  const total = weights.physical + weights.magic + weights.true;
  return { physical: weights.physical / total, magic: weights.magic / total, true: weights.true / total };
}

function nextCoreItem(run: RunState, build: Build, profile: SkillProfile): string | null {
  if (profile.adaptiveShop) {
    const enemy = currentEnemy(run);
    if (enemy) {
      const dmg = damageProfile(enemy);
      const situational = dmg.magic >= 0.6 ? build.versusMagic : dmg.physical >= 0.75 ? build.versusPhysical : null;
      if (situational && !run.items.includes(situational)) return situational;
    }
  }
  return build.core.find((id) => !run.items.includes(id)) ?? null;
}

function elixirFor(build: Build): string {
  if (build.core.includes("rabadons")) return "elixir-sorcery";
  if (build.core.includes("infinity-edge") || build.core.includes("bloodthirster")) return "elixir-wrath";
  return "elixir-iron";
}

/** Fait de la place en revendant le composant le moins cher. */
function freeSlot(run: RunState): RunState {
  if (run.items.length < MAX_ITEMS) return run;
  let cheapest = -1;
  run.items.forEach((id, i) => {
    const item = getItem(id);
    if (item.kind === "component" && (cheapest === -1 || item.cost < getItem(run.items[cheapest]).cost)) cheapest = i;
  });
  return cheapest === -1 ? run : sellItem(run, cheapest);
}

export function shopFor(run: RunState, profile: SkillProfile, rand: Rand): RunState {
  let r = run;
  const build = BUILDS[r.championId];

  while ((r.potions["health-potion"] ?? 0) < profile.potionStock && buyBlock(r, "health-potion") === null) {
    r = buyItem(r, "health-potion");
  }

  // Erreur d'achat : un objet au hasard parmi ceux qu'on peut s'offrir.
  if (rand() < profile.shopMistake) {
    const affordable = ITEMS.filter((i) => (i.kind === "component" || i.kind === "legendary") && buyBlock(r, i.id) === null);
    if (affordable.length) r = buyItem(r, affordable[Math.floor(rand() * affordable.length)].id);
  }

  // Légendaires du build, tant qu'on peut se les offrir.
  for (let guard = 0; guard < 6; guard++) {
    const next = nextCoreItem(r, build, profile);
    if (!next || r.gold < getItem(next).cost) break;
    const freed = freeSlot(r);
    if (buyBlock(freed, next) !== null) break;
    r = buyItem(freed, next);
  }

  // En attendant le prochain légendaire : les composants de départ.
  for (const id of build.early) {
    if (r.items.length >= MAX_ITEMS - 2 || r.items.includes(id)) continue;
    if (buyBlock(r, id) === null) r = buyItem(r, id);
  }

  // Élixir avant les grands combats, s'il ne retarde pas le prochain légendaire.
  const enemy = currentEnemy(r);
  if (profile.elixirs && enemy && !r.elixir && (chapterOf(enemy) === "dragons" || chapterOf(enemy) === "baron")) {
    const elixir = elixirFor(build);
    const cost = getItem(elixir).cost;
    const next = nextCoreItem(r, build, profile);
    const stillOnTrack = !next || r.gold - cost + goldReward(r, enemy) >= getItem(next).cost || r.gold < getItem(next).cost / 2;
    if (stillOnTrack && buyBlock(r, elixir) === null) r = buyItem(r, elixir);
  }
  return r;
}
