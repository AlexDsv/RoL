// Simulation automatique de combats et de parties, pour les tests et l'équilibrage.
// Les adversaires jouent avec l'IA du jeu (ai.ts) ; le joueur est piloté par le
// joueur simulé (player-ai.ts), au niveau choisi.

import { aiTurn } from "./ai";
import { act, createBattle, createCombatant, effectiveStats } from "./battle";
import { BUILDS } from "./data/builds";
import { getFighter } from "./data/fighters";
import { getItem, MAX_ITEMS } from "./data/items";
import { choosePlayerAction, makeRand, potionToDrink, shopFor, SKILL_PROFILES, type Skill } from "./player-ai";
import { chapterOf, drinkPotion, finishBattle, newRun, startBattle, STARTING_GOLD, type Chapter } from "./run";
import type { BattleState, Stats } from "./types";

const MAX_ACTIONS = 400;

/** Combat où les deux camps sont joués par l'IA des adversaires. */
export function playBattle(battle: BattleState): BattleState {
  let b: BattleState = { ...battle, quiet: true };
  for (let i = 0; i < MAX_ACTIONS && !b.winner; i++) b = act(b, aiTurn(b));
  return b;
}

/** Objets du build qu'on peut s'offrir avec ce budget (légendaires, puis composants avec le reste). */
export function itemsForBudget(championId: string, gold: number): string[] {
  const build = BUILDS[championId];
  const items: string[] = [];
  let left = gold;
  for (const id of build.core) {
    if (items.length >= MAX_ITEMS || getItem(id).cost > left) break;
    items.push(id);
    left -= getItem(id).cost;
  }
  for (const id of build.early) {
    if (items.length >= MAX_ITEMS) break;
    if (getItem(id).cost <= left) {
      items.push(id);
      left -= getItem(id).cost;
    }
  }
  return items;
}

/** Or gagné en moyenne avant d'atteindre ce niveau pendant la phase des champions. */
export function budgetAtLevel(level: number): number {
  let gold = STARTING_GOLD - 120; // deux potions
  for (let stage = 0; stage < level - 1; stage++) gold += 250 + 60 * stage;
  return gold;
}

function itemStats(championId: string, level: number): Partial<Stats>[] {
  return itemsForBudget(championId, budgetAtLevel(level)).map((id) => getItem(id).stats ?? {});
}

/** Duel entre deux champions de même niveau, équipés selon leur build et le budget de ce niveau. */
export function playDuel(aId: string, bId: string, level: number, seed: number): BattleState {
  const a = createCombatant(getFighter(aId), level, itemStats(aId, level));
  const b = createCombatant(getFighter(bId), level, itemStats(bId, level));
  return playBattle(createBattle(a, b, seed));
}

export interface FightRecord {
  enemyId: string;
  chapter: Chapter;
  won: boolean;
  rounds: number;
  hpBefore: number;
  hpAfter: number;
  potionsUsed: number;
}

export interface RunOutcome {
  championId: string;
  skill: Skill;
  won: boolean;
  stage: number;
  diedTo: string | null;
  fights: FightRecord[];
}

export function simulateRun(championId: string, seed: number, skill: Skill = "average"): RunOutcome {
  const profile = SKILL_PROFILES[skill];
  const rand = makeRand(seed ^ 0x5bd1e995);
  let run = newRun(championId, seed);
  const fights: FightRecord[] = [];

  for (let guard = 0; guard < 100 && run.status === "map"; guard++) {
    run = shopFor(run, profile, rand);
    run = startBattle(run);
    let b: BattleState = { ...run.battle!, quiet: true };
    const maxHp = effectiveStats(b.player).maxHp;
    const hpBefore = b.player.hp / maxHp;
    let potionsUsed = 0;

    for (let i = 0; i < MAX_ACTIONS && !b.winner; i++) {
      if (b.turn === "player") {
        const potion = potionToDrink(run, b, profile, rand);
        if (potion) {
          run = drinkPotion({ ...run, battle: b }, potion);
          b = run.battle!;
          potionsUsed++;
        }
        b = act(b, choosePlayerAction(b, profile, rand));
      } else {
        b = act(b, aiTurn(b));
      }
    }

    const enemy = getFighter(b.enemy.defId);
    fights.push({
      enemyId: enemy.id,
      chapter: chapterOf(enemy),
      won: b.winner === "player",
      rounds: b.round,
      hpBefore,
      hpAfter: Math.max(0, b.player.hp) / effectiveStats(b.player).maxHp,
      potionsUsed,
    });
    run = finishBattle({ ...run, battle: b });
  }

  return {
    championId,
    skill,
    won: run.status === "won",
    stage: run.stage,
    diedTo: run.status === "lost" ? run.ladder[run.stage] : null,
    fights,
  };
}
