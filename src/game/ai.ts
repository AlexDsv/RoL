import { availableActions, cloneBattle, effectiveStats, estimateAction, findSpell, opponent, totalShield } from "./battle";
import { getFighter } from "./data/fighters";
import { nextRandom } from "./rng";
import type { Action, Archetype, BattleState, Effect, Side, StatKey } from "./types";

/**
 * Personnalité de chaque type d'adversaire : multiplicateurs appliqués à la
 * valeur estimée de chaque action. La valeur elle-même vient du moteur
 * (dégâts attendus, dégâts évités…), ce qui garde l'IA cohérente quand on
 * ajoute des sorts.
 */
interface Personality {
  offense: number;
  defense: number;
  control: number;
  /** Garde l'ultime (R) pour achever : la cible doit être sous ce % de PV. */
  holdUltimateUntil: number;
}

const PERSONALITIES: Record<Archetype, Personality> = {
  tank: { offense: 0.9, defense: 1.3, control: 1.3, holdUltimateUntil: 1 },
  fighter: { offense: 1, defense: 1.1, control: 1, holdUltimateUntil: 0.5 },
  assassin: { offense: 1.3, defense: 0.8, control: 0.9, holdUltimateUntil: 0.6 },
  mage: { offense: 1.15, defense: 0.9, control: 1.1, holdUltimateUntil: 1 },
  marksman: { offense: 1.15, defense: 0.9, control: 1, holdUltimateUntil: 0.55 },
  support: { offense: 0.85, defense: 1.35, control: 1.2, holdUltimateUntil: 1 },
  monster: { offense: 1, defense: 1, control: 1, holdUltimateUntil: 1 },
  dragon: { offense: 1.05, defense: 1, control: 1.1, holdUltimateUntil: 1 },
  baron: { offense: 1.1, defense: 1, control: 1.2, holdUltimateUntil: 1 },
};

const OFFENSIVE_STATS: StatKey[] = ["ad", "ap", "crit", "attackSpeed", "onHitCurrentHp"];

/** Meilleurs dégâts qu'un camp peut infliger ce tour-ci (hors sorts de pur soutien). */
export function bestDamage(state: BattleState, side: Side): number {
  let best = 0;
  for (const action of availableActions(state, side)) {
    const est = estimateAction(state, side, action);
    best = Math.max(best, est.damage + est.dot / 2);
  }
  return best;
}

/** Valeur d'un bonus ou malus temporaire : dégâts gagnés ou évités sur sa durée. */
function statusValue(state: BattleState, side: Side, effect: Extract<Effect, { kind: "buff" | "debuff" }>): number {
  const foeSide = opponent(side);
  const holder = effect.kind === "buff" ? side : foeSide;
  const sign = effect.kind === "buff" ? 1 : -1;
  const tweaked = cloneBattle(state);
  tweaked[holder].statuses.push({ id: "ai-probe", label: "", kind: effect.kind, stat: effect.stat, amount: sign * effect.amount, turns: effect.turns });

  const myGain = bestDamage(tweaked, side) - bestDamage(state, side);
  const foeLoss = bestDamage(state, foeSide) - bestDamage(tweaked, foeSide);
  // Le tour de lancement est « perdu » pour un bonus offensif personnel.
  const turns = effect.kind === "buff" && OFFENSIVE_STATS.includes(effect.stat) ? effect.turns - 1 : effect.turns;
  return Math.max(0, myGain) * Math.max(turns, 0) + Math.max(0, foeLoss) * effect.turns;
}

export function scoreAction(state: BattleState, side: Side, action: Action): number {
  const me = state[side];
  const foeSide = opponent(side);
  const foe = state[foeSide];
  const myStats = effectiveStats(me);
  const p = PERSONALITIES[getFighter(me.defId).archetype];
  const est = estimateAction(state, side, action);

  // Achever l'adversaire passe avant tout.
  if (est.damage >= foe.hp + totalShield(foe)) return 10_000 + est.damage;

  const hpRatio = me.hp / myStats.maxHp;
  const threat = bestDamage(state, foeSide);
  const foeStunned = foe.statuses.some((st) => st.kind === "stun");
  const dodging = me.statuses.some((st) => st.kind === "dodge");

  let offense = est.damage + est.dot * 0.85;
  let defense = Math.min(est.heal, myStats.maxHp - me.hp) * (1.6 - hpRatio);
  defense += Math.min(est.shield, threat * 2) * (totalShield(me) > 0 ? 0.4 : 1) * (1.3 - hpRatio);
  defense += dodging ? 0 : est.dodge * threat * 0.8;
  const control = foeStunned ? 0 : est.stun * (threat + bestDamage(state, side) * 0.3);

  if (action.kind === "spell") {
    for (const effect of findSpell(me, action.key)?.effects ?? []) {
      if (effect.kind !== "buff" && effect.kind !== "debuff") continue;
      const value = statusValue(state, side, effect);
      if (OFFENSIVE_STATS.includes(effect.stat) === (effect.kind === "buff")) offense += value;
      else defense += value;
    }
  }

  let score = offense * p.offense + defense * p.defense + control * p.control;
  if (action.kind === "spell" && action.key === "R") {
    const foeRatio = foe.hp / effectiveStats(foe).maxHp;
    if (foeRatio > p.holdUltimateUntil) score *= 0.3;
  }
  return score;
}

/** Choisit l'action de l'IA. Un léger bruit (±10 %) évite un jeu trop prévisible. */
export function aiTurn(state: BattleState): Action {
  const side = state.turn;
  let rng = state.rng;
  let best: Action = { kind: "attack" };
  let bestScore = -Infinity;
  for (const action of availableActions(state, side)) {
    const [r, next] = nextRandom(rng);
    rng = next;
    const score = scoreAction(state, side, action) * (0.9 + r * 0.2);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}
