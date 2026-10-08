// Calibrage automatique de l'équilibrage, puis écriture de src/game/data/balance.ts.
//
//   npm run calibrate                 # duels, parties, difficulté
//   npm run calibrate -- --skip-duels # garde les coefficients de duel actuels
//
// 1. Duels : ajuste « power » pour que chaque champion gagne ~50 % de ses duels
//    (tous contre tous, aux niveaux 3, 9, 15 et 18, équipés selon leur build).
// 2. Parties : ajuste « pve » pour que le joueur simulé moyen gagne ~TARGET des
//    parties avec chaque champion. Toujours les mêmes graines de calibrage d'une
//    itération à l'autre, pour comparer à situations égales.
// 3. Difficulté : classe les champions selon le taux de victoire d'un débutant.

import { writeFileSync } from "node:fs";
import { CHAMPIONS } from "../src/game/data/champions";
import { runTasks } from "./lib/pool";
import { pct, seeds } from "./lib/stats";
import type { Overrides, Task, TaskResult } from "./lib/tasks";

const TARGET = 0.3;
export const DUEL_LEVELS = [3, 9, 15, 18];
const ids = CHAMPIONS.map((c) => c.id);

const power: Record<string, number> = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c.power ?? 1]));
const pve: Record<string, number> = Object.fromEntries(CHAMPIONS.map((c) => [c.id, c.pve ?? 1]));
const overrides = (): Overrides => ({ power: { ...power }, pve: { ...pve } });

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

const runTasksFor = (count: number, skill: "beginner" | "average", offset = 0): Task[] =>
  ids.flatMap((champion) => seeds(count, "calibration", offset).map((seed) => ({ kind: "run" as const, champion, skill, seed })));

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

function table(rates: Record<string, number>, extra: (id: string) => string) {
  for (const id of ids) console.log(`  ${id.padEnd(10)} ${pct(rates[id]).padStart(7)}  ${extra(id)}`);
}

async function calibrateDuels() {
  console.log("\n== 1. Duels (objectif 50 %) ==");
  for (let it = 1; it <= 8; it++) {
    const rates = duelWinRates(await runTasks(duelTasks(6, "calibration"), overrides(), `duels ${it}`));
    const values = Object.values(rates);
    console.log(`Itération ${it} : de ${pct(Math.min(...values))} à ${pct(Math.max(...values))}`);
    for (const id of ids) power[id] = round2(clamp(power[id] * Math.pow(0.5 / clamp(rates[id], 0.03, 0.97), 0.3), 0.5, 2));
  }
}

async function calibrateRuns() {
  console.log(`\n== 2. Parties, joueur moyen (objectif ${pct(TARGET)}) ==`);
  const schedule = [300, 300, 600, 1000, 1000];
  for (const [i, count] of schedule.entries()) {
    const rates = runWinRates(await runTasks(runTasksFor(count, "average"), overrides(), `parties ${i + 1}`));
    const values = Object.values(rates);
    console.log(`Itération ${i + 1} (${count} parties/champion) : de ${pct(Math.min(...values))} à ${pct(Math.max(...values))}`);
    if (i === schedule.length - 1) {
      table(rates, (id) => `pve ${pve[id]}`);
      break;
    }
    for (const id of ids) {
      const step = clamp(Math.pow(TARGET / clamp(rates[id], 0.02, 0.98), 0.35), 0.8, 1.25);
      pve[id] = round2(clamp(pve[id] * step, 0.5, 2.5));
    }
  }
}

async function rateDifficulty(): Promise<Record<string, 1 | 2 | 3>> {
  console.log("\n== 3. Difficulté (taux de victoire d'un débutant) ==");
  const rates = runWinRates(await runTasks(runTasksFor(400, "beginner", 5000), overrides(), "débutant"));
  const sorted = [...ids].sort((a, b) => rates[b] - rates[a]);
  const difficulty = Object.fromEntries(sorted.map((id, i) => [id, i < 5 ? 1 : i < 10 ? 2 : 3])) as Record<string, 1 | 2 | 3>;
  table(rates, (id) => ["", "Facile", "Moyenne", "Difficile"][difficulty[id]]);
  return difficulty;
}

function writeBalance(difficulty: Record<string, number>) {
  const lines = [
    "// Fichier généré par `npm run calibrate` : ne pas modifier à la main.",
    "// power : coefficient de duel ; pve : coefficient contre les monstres ; difficulty : 1 facile à 3 difficile.",
    "",
    'import type { FighterDef } from "../types";',
    "",
    'export const BALANCE: Record<string, Pick<FighterDef, "power" | "pve" | "difficulty">> = {',
    ...ids.map((id) => `  ${id}: { power: ${power[id]}, pve: ${pve[id]}, difficulty: ${difficulty[id]} },`),
    "};",
    "",
  ];
  writeFileSync("src/game/data/balance.ts", lines.join("\n"));
  console.log("\nÉcrit : src/game/data/balance.ts");
}

async function main() {
  const started = Date.now();
  if (!process.argv.includes("--skip-duels")) await calibrateDuels();
  await calibrateRuns();
  const difficulty = await rateDifficulty();
  writeBalance(difficulty);
  console.log(`Terminé en ${Math.round((Date.now() - started) / 60000)} min.`);
}

if (require.main === module) main();
