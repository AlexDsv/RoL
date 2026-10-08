// Simulation automatique de parties, pour les tests et l'équilibrage.
// Le joueur est piloté par la même IA que les adversaires, avec une stratégie
// d'achat simple : ce n'est pas un joueur parfait, mais un joueur correct.

import { aiTurn } from "./ai";
import { act, effectiveStats } from "./battle";
import { getFighter } from "./data/fighters";
import { ITEMS, type ItemDef } from "./data/items";
import { buyBlock, buyItem, canUsePotion, drinkPotion, finishBattle, newRun, startBattle, type RunState } from "./run";
import type { Archetype, BattleState, StatKey } from "./types";

const MAX_ACTIONS = 400;

export function playBattle(battle: BattleState): BattleState {
  let b = battle;
  for (let i = 0; i < MAX_ACTIONS && !b.winner; i++) b = act(b, aiTurn(b));
  return b;
}

const PREFERRED: Record<Archetype, StatKey[]> = {
  fighter: ["ad", "maxHp", "armor", "lifesteal"],
  tank: ["maxHp", "armor", "mr", "ap"],
  assassin: ["ad", "ap", "crit", "lifesteal"],
  mage: ["ap", "maxHp", "mr"],
  marksman: ["ad", "crit", "attackSpeed", "lifesteal", "onHitCurrentHp"],
  support: ["ap", "maxHp", "armor", "mr"],
  monster: [],
  dragon: [],
  baron: [],
};

function itemValue(item: ItemDef, wanted: StatKey[]): number {
  if (!item.stats) return 0;
  let fit = 0;
  for (const key of wanted) if (item.stats[key]) fit++;
  return fit === 0 ? 0 : item.cost * (1 + fit * 0.3);
}

/** Achats automatiques : potions d'abord, puis le meilleur objet adapté. */
export function autoShop(run: RunState): RunState {
  let r = run;
  const wanted = PREFERRED[getFighter(r.championId).archetype];
  while ((r.potions["health-potion"] ?? 0) < 3 && buyBlock(r, "health-potion") === null) r = buyItem(r, "health-potion");

  for (;;) {
    const candidates = ITEMS.filter((i) => (i.kind === "legendary" || i.kind === "component") && !r.items.includes(i.id))
      .filter((i) => buyBlock(r, i.id) === null)
      .map((i) => ({ item: i, value: itemValue(i, wanted) }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    // Inventaire plein : revendre le composant le moins cher pour un légendaire.
    if (r.items.length >= 6) break;
    const best = candidates[0];
    if (!best) break;
    // Garder de l'or pour un légendaire s'il est presque abordable.
    if (best.item.kind === "component" && r.items.length >= 4) break;
    r = buyItem(r, best.item.id);
  }
  return r;
}

export interface RunOutcome {
  won: boolean;
  stage: number;
  diedTo: string | null;
  /** Adversaires affrontés, avec les PV restants (en %) à la fin de chaque combat. */
  fights: { enemyId: string; hpLeft: number }[];
}

export function simulateRun(championId: string, seed: number): RunOutcome {
  let run = newRun(championId, seed);
  const fights: RunOutcome["fights"] = [];
  for (let guard = 0; guard < 100 && run.status !== "won" && run.status !== "lost"; guard++) {
    run = autoShop(run);
    run = startBattle(run);
    let b = run.battle!;
    for (let i = 0; i < MAX_ACTIONS && !b.winner; i++) {
      if (b.turn === "player") {
        const ratio = b.player.hp / effectiveStats(b.player).maxHp;
        if (ratio < 0.35 && canUsePotion({ ...run, battle: b }, "health-potion")) {
          run = drinkPotion({ ...run, battle: b }, "health-potion");
          b = run.battle!;
        }
      }
      b = act(b, aiTurn(b));
    }
    fights.push({ enemyId: b.enemy.defId, hpLeft: b.player.hp / effectiveStats(b.player).maxHp });
    run = finishBattle({ ...run, battle: b });
  }
  return {
    won: run.status === "won",
    stage: run.stage,
    diedTo: run.status === "lost" ? run.ladder[run.stage] : null,
    fights,
  };
}
