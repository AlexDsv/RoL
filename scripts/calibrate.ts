// Calibrage automatique de l'équilibrage, puis écriture de src/game/data/balance.ts.
//
//   npm run calibrate                 # duels, parties, difficulté
//   npm run calibrate -- --skip-duels     # garde les coefficients de duel actuels
//   npm run calibrate -- --skip-monsters  # garde les réglages des monstres actuels
//
// 1. Duels : ajuste « power » pour que chaque champion gagne ~50 % de ses duels
//    (tous contre tous, aux niveaux 3, 9, 15 et 18, équipés selon leur build).
// 2a. Monstres, avec tous les champions au coefficient 1 : PV pour viser une durée
//     de combat, dégâts pour viser l'usure ou le taux de défaite (MONSTER_TARGETS).
// 2b. Monstres figés : « runPower » de chaque champion par dichotomie pour viser
//     TARGET de victoires. Toujours les mêmes graines de calibrage.
// 3. Difficulté : classe les champions selon la progression d'un débutant.

import { writeFileSync } from "node:fs";
import { CHAMPIONS } from "../src/game/data/champions";
import { MONSTERS } from "../src/game/data/monsters";
import { chapterOf } from "../src/game/run";
import { runTasks } from "./lib/pool";
import { pct, seeds } from "./lib/stats";
import type { Overrides, Task, TaskResult } from "./lib/tasks";

const TARGET = 0.3;
/**
 * Par chapitre : durée visée (rounds) et cible de dangerosité. Jungle et dragons
 * se règlent sur les PV perdus en moyenne (l'usure), le Baron sur son taux de
 * défaite : un taux de défaite de quelques % est trop bruité pour servir de cible.
 */
const MONSTER_TARGETS = {
  jungle: { rounds: 7, hpLost: 0.35 },
  dragons: { rounds: 10, hpLost: 0.45 },
  baron: { rounds: 16, loss: 0.35 },
} as const;
export const DUEL_LEVELS = [3, 9, 15, 18];
const ids = CHAMPIONS.map((c) => c.id);

const power: Record<string, number> = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c.power ?? 1]));
const runPower: Record<string, number> = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c.runPower ?? 1]));
const monsters: Record<string, { hpScale: number; damageScale: number }> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, { hpScale: m.hpScale ?? 1, damageScale: m.damageScale ?? 1 }]),
);
const overrides = (): Overrides => ({ power: { ...power }, runPower: { ...runPower }, monsters: structuredClone(monsters) });

export function duelTasks(seedCount: number, set: "calibration" | "validation"): Task[] {
  const tasks: Task[] = [];
  for (const level of DUEL_LEVELS)
    for (const a of ids)
      for (const b of ids)
        if (a !== b) for (const seed of seeds(seedCount, set)) tasks.push({ kind: "duel", a, b, level, seed: seed + level });
  return tasks;
}

function duelWinRates(results: TaskResult[]): Record<string, number> {
  const wins: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const games: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const r of results) {
    if (r.kind !== "duel") continue;
    wins[r.aWon ? r.a : r.b]++;
    games[r.a]++;
    games[r.b]++;
  }
  return Object.fromEntries(ids.map((id) => [id, wins[id] / games[id]]));
}

function runWinRates(results: TaskResult[]): Record<string, number> {
  const wins: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  const games: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const r of results) {
    if (r.kind !== "run") continue;
    games[r.champion]++;
    if (r.won) wins[r.champion]++;
  }
  return Object.fromEntries(ids.map((id) => [id, wins[id] / games[id]]));
}

type RunResult = Extract<TaskResult, { kind: "run" }>;

const runTasksFor = (count: number, skill: "beginner" | "average", offset = 0): Task[] =>
  ids.flatMap((champion) => seeds(count, "calibration", offset).map((seed) => ({ kind: "run" as const, champion, skill, seed })));

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round2 = (x: number) => Math.round(x * 100) / 100;
const round3 = (x: number) => Math.round(x * 1000) / 1000;

async function calibrateDuels() {
  console.log("\n== 1. Duels (objectif 50 %) ==");
  for (let it = 1; it <= 8; it++) {
    const rates = duelWinRates(await runTasks(duelTasks(6, "calibration"), overrides(), `duels ${it}`));
    const values = Object.values(rates);
    console.log(`Itération ${it} : de ${pct(Math.min(...values))} à ${pct(Math.max(...values))}`);
    for (const id of ids) power[id] = round2(clamp(power[id] * Math.pow(0.5 / clamp(rates[id], 0.03, 0.97), 0.3), 0.5, 2));
  }
}

function monsterStats(results: RunResult[]) {
  const stats = new Map<string, { fights: number; losses: number; rounds: number; hpLost: number }>();
  for (const r of results)
    for (const [enemyId, won, rounds, hpBefore, hpAfter] of r.fights) {
      const e = stats.get(enemyId) ?? { fights: 0, losses: 0, rounds: 0, hpLost: 0 };
      e.fights++;
      e.losses += won ? 0 : 1;
      e.rounds += rounds;
      e.hpLost += Math.max(0, hpBefore - hpAfter);
      stats.set(enemyId, e);
    }
  return stats;
}

/** Étape 2a : les monstres seuls, tous les champions au coefficient 1. */
async function calibrateMonsters() {
  console.log("\n== 2a. Monstres (joueur moyen, champions au coefficient 1) ==");
  for (const id of ids) runPower[id] = 1;
  for (const m of MONSTERS) monsters[m.id] = { hpScale: 1, damageScale: 1 };
  const schedule: [number, number][] = [[300, 0.6], [300, 0.5], [400, 0.4], [600, 0.3], [600, 0]];
  for (const [i, [count, exp]] of schedule.entries()) {
    const stats = monsterStats((await runTasks(runTasksFor(count, "average"), overrides(), `monstres ${i + 1}`)) as RunResult[]);
    const line: string[] = [];
    for (const m of MONSTERS) {
      const e = stats.get(m.id);
      if (!e || e.fights < 30) continue;
      const rounds = e.rounds / e.fights;
      const hpLost = e.hpLost / e.fights;
      const loss = e.losses / e.fights;
      const ms = monsters[m.id];
      if (exp === 0) {
        line.push(`  ${m.id.padEnd(16)} ${rounds.toFixed(1)} rounds · ${pct(hpLost)} PV perdus · ${pct(loss)} défaites · PV ×${ms.hpScale} dégâts ×${ms.damageScale}`);
        continue;
      }
      const t = MONSTER_TARGETS[chapterOf(m) as keyof typeof MONSTER_TARGETS];
      ms.hpScale = round3(clamp(ms.hpScale * clamp(Math.pow(t.rounds / rounds, exp), 0.8, 1.25), 0.3, 3));
      const danger = "loss" in t ? Math.pow(t.loss / Math.max(loss, 0.01), exp * 0.6) : Math.pow(t.hpLost / Math.max(hpLost, 0.02), exp);
      ms.damageScale = round3(clamp(ms.damageScale * clamp(danger, 0.8, 1.25), 0.3, 3));
    }
    console.log(`Itération ${i + 1} (${count} parties/champion)${exp === 0 ? " : résultat" : ""}`);
    if (line.length) console.log(line.join("\n"));
  }
}

/** Étape 2b : monstres figés, coefficient de chaque champion par dichotomie (échelle logarithmique). */
async function calibrateRunPower() {
  console.log(`\n== 2b. Coefficient en partie (objectif ${pct(TARGET)}) ==`);
  const lo: Record<string, number> = Object.fromEntries(ids.map((id) => [id, Math.log(0.5)]));
  const hi: Record<string, number> = Object.fromEntries(ids.map((id) => [id, Math.log(2.5)]));
  const steps = [400, 400, 500, 600, 800, 1000, 1200, 1500];
  let rates: Record<string, number> = {};
  for (const [i, count] of steps.entries()) {
    for (const id of ids) runPower[id] = round3(Math.exp((lo[id] + hi[id]) / 2));
    rates = runWinRates(await runTasks(runTasksFor(count, "average"), overrides(), `dichotomie ${i + 1}`));
    const values = Object.values(rates);
    console.log(`Itération ${i + 1} (${count} parties/champion) : de ${pct(Math.min(...values))} à ${pct(Math.max(...values))}`);
    for (const id of ids) {
      const mid = (lo[id] + hi[id]) / 2;
      if (rates[id] < TARGET) lo[id] = mid;
      else hi[id] = mid;
    }
  }
  for (const id of ids) console.log(`  ${id.padEnd(10)} ${pct(rates[id]).padStart(7)}  coefficient ${runPower[id]}`);
}

async function rateDifficulty(): Promise<Record<string, 1 | 2 | 3>> {
  console.log("\n== 3. Difficulté (progression moyenne d'un débutant) ==");
  const results = (await runTasks(runTasksFor(400, "beginner", 5000), overrides(), "débutant")) as RunResult[];
  const stage = Object.fromEntries(ids.map((id) => {
    const mine = results.filter((r) => r.champion === id);
    return [id, mine.reduce((s, r) => s + r.stage, 0) / mine.length];
  }));
  const sorted = [...ids].sort((a, b) => stage[b] - stage[a]);
  const difficulty = Object.fromEntries(sorted.map((id, i) => [id, i < 5 ? 1 : i < 10 ? 2 : 3])) as Record<string, 1 | 2 | 3>;
  for (const id of sorted) console.log(`  ${id.padEnd(10)} étape ${stage[id].toFixed(1)}  ${["", "Facile", "Moyenne", "Difficile"][difficulty[id]]}`);
  return difficulty;
}

function writeBalance(difficulty: Record<string, number>) {
  const lines = [
    "// Fichier généré par `npm run calibrate` : ne pas modifier à la main.",
    "// Champions — power : coefficient de duel ; runPower : coefficient en partie (joueur) ; difficulty : 1 facile à 3 difficile.",
    "// Monstres — hpScale et damageScale : multiplicateurs de PV et de dégâts.",
    "",
    'import type { FighterDef } from "../types";',
    "",
    'export const CHAMPION_BALANCE: Record<string, Pick<FighterDef, "power" | "runPower" | "difficulty">> = {',
    ...ids.map((id) => `  ${id}: { power: ${power[id]}, runPower: ${runPower[id]}, difficulty: ${difficulty[id]} },`),
    "};",
    "",
    'export const MONSTER_BALANCE: Record<string, Pick<FighterDef, "hpScale" | "damageScale">> = {',
    ...MONSTERS.map((m) => `  "${m.id}": { hpScale: ${monsters[m.id].hpScale}, damageScale: ${monsters[m.id].damageScale} },`),
    "};",
    "",
  ];
  writeFileSync("src/game/data/balance.ts", lines.join("\n"));
  console.log("\nÉcrit : src/game/data/balance.ts");
}

async function main() {
  const started = Date.now();
  if (!process.argv.includes("--skip-duels")) await calibrateDuels();
  if (!process.argv.includes("--skip-monsters")) await calibrateMonsters();
  await calibrateRunPower();
  const difficulty = await rateDifficulty();
  writeBalance(difficulty);
  console.log(`Terminé en ${Math.round((Date.now() - started) / 60000)} min.`);
}

if (require.main === module) main();
