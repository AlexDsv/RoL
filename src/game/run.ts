import { act, createBattle, createCombatant, effectiveStats } from "./battle";
import { CHAMPIONS } from "./data/champions";
import { getFighter } from "./data/fighters";
import { consumedComponents, effectiveCost, getItem, MAX_ITEMS, MAX_POTIONS, SELL_RATIO } from "./data/items";
import { BARON, DRAGONS, JUNGLE } from "./data/monsters";
import { nextRandom, shuffle } from "./rng";
import type { Archetype, BattleState, FighterDef, Stats } from "./types";

export const MAX_LEVEL = 18;
export const STARTING_GOLD = 500;
/** Part des PV max récupérée après chaque victoire. */
export const POST_FIGHT_HEAL = 0.4;

export type RunStatus = "map" | "battle" | "won" | "lost";
export type Chapter = "champions" | "jungle" | "dragons" | "baron";

export interface Reward {
  label: string;
  stats: Partial<Stats>;
}

export interface RunState {
  version: 1;
  rng: number;
  championId: string;
  ladder: string[];
  stage: number;
  gold: number;
  items: string[];
  potions: Record<string, number>;
  elixir: string | null;
  rewards: Reward[];
  hpRatio: number;
  battle: BattleState | null;
  status: RunStatus;
  /** Résumé du dernier combat, pour l'écran de victoire. */
  lastResult: { enemyId: string; gold: number; reward: Reward | null; levelUp: boolean } | null;
}

export function newRun(championId: string, seed: number): RunState {
  const others = CHAMPIONS.filter((c) => c.id !== championId).map((c) => c.id);
  const [champions, rng1] = shuffle(others, seed);
  const [dragons, rng2] = shuffle(
    DRAGONS.map((d) => d.id),
    rng1,
  );
  return {
    version: 1,
    rng: rng2,
    championId,
    ladder: [...champions, ...JUNGLE.map((m) => m.id), ...dragons, BARON.id],
    stage: 0,
    gold: STARTING_GOLD,
    items: [],
    potions: { "health-potion": 2 },
    elixir: null,
    rewards: [],
    hpRatio: 1,
    battle: null,
    status: "map",
    lastResult: null,
  };
}

export function chapterOf(def: FighterDef): Chapter {
  if (def.archetype === "baron") return "baron";
  if (def.archetype === "dragon") return "dragons";
  if (def.archetype === "monster") return "jungle";
  return "champions";
}

export function playerLevel(run: RunState): number {
  return Math.min(MAX_LEVEL, 1 + run.stage);
}

/** Niveaux de retard des champions adverses sur le joueur. */
export const ENEMY_LEVEL_LAG = 2;
/** Part du bonus d'étape réellement accordée aux champions adverses. */
export const ENEMY_BONUS_SCALE = 0.65;

export function enemyLevel(run: RunState): number {
  return Math.max(1, playerLevel(run) - ENEMY_LEVEL_LAG);
}

export function currentEnemy(run: RunState): FighterDef | null {
  const id = run.ladder[run.stage];
  return id ? getFighter(id) : null;
}

/**
 * Les champions adverses n'achètent pas d'objets : ils reçoivent à la place un
 * bonus qui grandit à chaque étape, réparti selon leur type.
 */
const ENEMY_BONUS_PER_STAGE: Partial<Record<Archetype, Partial<Stats>>> = {
  fighter: { ad: 5, maxHp: 55, armor: 2.5, mr: 1.5 },
  tank: { maxHp: 85, armor: 4, mr: 3, ap: 5 },
  assassin: { ad: 7, ap: 7, maxHp: 30 },
  mage: { ap: 13, maxHp: 35, mr: 1 },
  marksman: { ad: 7, crit: 0.02, attackSpeed: 0.012, maxHp: 25 },
  support: { ap: 9, maxHp: 50, armor: 2, mr: 2 },
};

export function enemyBonus(def: FighterDef, stage: number): Partial<Stats> {
  const perStage = ENEMY_BONUS_PER_STAGE[def.archetype];
  if (!perStage) return {};
  return Object.fromEntries(Object.entries(perStage).map(([k, v]) => [k, v * stage * ENEMY_BONUS_SCALE]));
}

export function playerBonuses(run: RunState): Partial<Stats>[] {
  const bonuses: Partial<Stats>[] = run.items.map((id) => getItem(id).stats ?? {});
  bonuses.push(...run.rewards.map((r) => r.stats));
  if (run.elixir) bonuses.push(getItem(run.elixir).stats ?? {});
  return bonuses;
}

/** Stats du joueur hors combat (pour l'écran de carte et la boutique). */
export function playerStats(run: RunState): Stats {
  const c = createCombatant(getFighter(run.championId), playerLevel(run), playerBonuses(run));
  return effectiveStats(c);
}

export function goldReward(run: RunState, def: FighterDef): number {
  switch (chapterOf(def)) {
    case "champions":
      return 250 + 60 * run.stage;
    case "jungle":
      return 450;
    case "dragons":
      return 650;
    case "baron":
      return 0;
  }
}

export function startBattle(run: RunState): RunState {
  const enemyDef = currentEnemy(run);
  if (!enemyDef || run.status !== "map") return run;
  const level = playerLevel(run);
  const player = createCombatant(getFighter(run.championId), level, playerBonuses(run), run.hpRatio);
  const enemy = createCombatant(enemyDef, enemyLevel(run), [enemyBonus(enemyDef, run.stage)]);
  const [, rng] = nextRandom(run.rng);
  return { ...run, rng, status: "battle", battle: { ...createBattle(player, enemy, run.rng), run: true }, lastResult: null };
}

export function canUsePotion(run: RunState, itemId: string): boolean {
  const b = run.battle;
  if (!b || b.winner || b.turn !== "player") return false;
  if ((run.potions[itemId] ?? 0) <= 0) return false;
  return b.player.hp < effectiveStats(b.player).maxHp;
}

export function drinkPotion(run: RunState, itemId: string): RunState {
  if (!canUsePotion(run, itemId)) return run;
  return {
    ...run,
    potions: { ...run.potions, [itemId]: run.potions[itemId] - 1 },
    battle: act(run.battle!, { kind: "potion", itemId }),
  };
}

/** À appeler une fois le combat terminé : distribue les gains ou termine la partie. */
export function finishBattle(run: RunState): RunState {
  const b = run.battle;
  if (!b?.winner) return run;
  if (b.winner === "enemy") return { ...run, status: "lost", hpRatio: 0 };

  const enemyDef = getFighter(b.enemy.defId);
  const gold = goldReward(run, enemyDef);
  const reward = enemyDef.reward ?? null;
  const maxHp = effectiveStats(b.player).maxHp;
  const before = playerLevel(run);
  const next: RunState = {
    ...run,
    stage: run.stage + 1,
    gold: run.gold + gold,
    elixir: null,
    rewards: reward ? [...run.rewards, reward] : run.rewards,
    hpRatio: Math.min(1, b.player.hp / maxHp + POST_FIGHT_HEAL),
    battle: null,
    lastResult: { enemyId: enemyDef.id, gold, reward, levelUp: false },
  };
  next.lastResult!.levelUp = playerLevel(next) > before;
  next.status = next.stage >= next.ladder.length ? "won" : "map";
  return next;
}

export type BuyBlock = "gold" | "full" | "elixir" | "potions" | null;

export function buyBlock(run: RunState, itemId: string): BuyBlock {
  const item = getItem(itemId);
  if (run.gold < effectiveCost(run.items, itemId)) return "gold";
  if (item.kind === "potion" && (run.potions[itemId] ?? 0) >= MAX_POTIONS) return "potions";
  if (item.kind === "elixir" && run.elixir) return "elixir";
  const freed = consumedComponents(run.items, itemId).length;
  if ((item.kind === "component" || item.kind === "legendary") && run.items.length - freed >= MAX_ITEMS) return "full";
  return null;
}

/** Achète un objet ; un légendaire absorbe les composants de sa recette déjà possédés. */
export function buyItem(run: RunState, itemId: string): RunState {
  if (run.status !== "map" || buyBlock(run, itemId) !== null) return run;
  const item = getItem(itemId);
  const consumed = consumedComponents(run.items, itemId);
  const next = { ...run, gold: run.gold - effectiveCost(run.items, itemId) };
  if (item.kind === "potion") next.potions = { ...run.potions, [itemId]: (run.potions[itemId] ?? 0) + 1 };
  else if (item.kind === "elixir") next.elixir = itemId;
  else next.items = [...run.items.filter((_, i) => !consumed.includes(i)), itemId];
  return keepHpRatio(run, next);
}

export function sellPrice(itemId: string): number {
  return Math.round(getItem(itemId).cost * SELL_RATIO);
}

export function sellItem(run: RunState, index: number): RunState {
  const itemId = run.items[index];
  if (run.status !== "map" || !itemId) return run;
  const next = { ...run, gold: run.gold + sellPrice(itemId), items: run.items.filter((_, i) => i !== index) };
  return keepHpRatio(run, next);
}

/** Acheter des PV max ne doit pas soigner gratuitement : on conserve les PV actuels. */
function keepHpRatio(before: RunState, after: RunState): RunState {
  const oldMax = playerStats(before).maxHp;
  const newMax = playerStats(after).maxHp;
  const hp = before.hpRatio * oldMax;
  return { ...after, hpRatio: Math.min(1, hp / newMax) };
}

export function currentHp(run: RunState): number {
  return Math.round(run.hpRatio * playerStats(run).maxHp);
}
