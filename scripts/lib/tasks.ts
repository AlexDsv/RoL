// Tâches de simulation exécutables dans un processus séparé.
import { CHAMPIONS } from "../../src/game/data/champions";
import { MONSTERS } from "../../src/game/data/monsters";
import type { Skill } from "../../src/game/player-ai";
import { playDuel, simulateRun } from "../../src/game/sim";

/** Valeurs d'équilibrage à appliquer avant de simuler (sans modifier les fichiers). */
export interface Overrides {
  power?: Record<string, number>;
  runPower?: Record<string, number>;
  monsters?: Record<string, { hpScale: number; damageScale: number }>;
}

export type Task =
  | { kind: "duel"; a: string; b: string; level: number; seed: number }
  | { kind: "run"; champion: string; skill: Skill; seed: number };

/** Combat d'une partie : [adversaire, victoire 0/1, rounds, PV avant, PV après, potions]. */
export type FightRow = [string, 0 | 1, number, number, number, number];

export type TaskResult =
  | { kind: "duel"; a: string; b: string; level: number; aWon: boolean; rounds: number }
  | { kind: "run"; champion: string; skill: Skill; seed: number; won: boolean; stage: number; diedTo: string | null; fights: FightRow[] };

export function applyOverrides(o: Overrides) {
  for (const c of CHAMPIONS) {
    if (o.power?.[c.id] !== undefined) c.power = o.power[c.id];
    if (o.runPower?.[c.id] !== undefined) c.runPower = o.runPower[c.id];
  }
  for (const m of MONSTERS) if (o.monsters?.[m.id]) Object.assign(m, o.monsters[m.id]);
}

export function runTask(t: Task): TaskResult {
  if (t.kind === "duel") {
    const res = playDuel(t.a, t.b, t.level, t.seed);
    return { kind: "duel", a: t.a, b: t.b, level: t.level, aWon: res.winner === "player", rounds: res.round };
  }
  const r = simulateRun(t.champion, t.seed, t.skill);
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return {
    kind: "run",
    champion: t.champion,
    skill: t.skill,
    seed: t.seed,
    won: r.won,
    stage: r.stage,
    diedTo: r.diedTo,
    fights: r.fights.map((f) => [f.enemyId, f.won ? 1 : 0, f.rounds, round(f.hpBefore), round(f.hpAfter), f.potionsUsed]),
  };
}
