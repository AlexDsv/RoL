// Calibrage automatique de l'équilibrage, puis écriture de src/game/data/balance.ts.
//
//   npm run calibrate                 # duels, parties, difficulté
//   npm run calibrate -- --skip-duels # garde les coefficients de duel actuels
//
// 1. Duels : ajuste « power » pour que chaque champion gagne ~50 % de ses duels
//    (tous contre tous, aux niveaux 3, 9, 15 et 18, équipés selon leur build).
// 2. Parties (joueur simulé moyen), en même temps :
//    - « runPower » de chaque champion pour viser TARGET de victoires ;
//    - PV de chaque monstre pour viser une durée de combat, dégâts pour viser un
//      taux de défaite (MONSTER_TARGETS).
//    Toujours les mêmes graines de calibrage, et des pas de plus en plus petits.
// 3. Difficulté : classe les champions selon la progression d'un débutant.

import { writeFileSync } from "node:fs";
import { CHAMPIONS } from "../src/game/data/champions";
import { MONSTERS } from "../src/game/data/monsters";
import { chapterOf } from "../src/game/run";
import { runTasks } from "./lib/pool";
import { pct, seeds } from "./lib/stats";
import type { Overrides, Task, TaskResult } from "./lib/tasks";

const TARGET = 0.3;
/** Par chapitre : taux de défaite visé par combat et durée visée en rounds. */
const MONSTER_TARGETS = {
  jungle: { loss: 0.02, rounds: 7 },
  dragons: { loss: 0.03, rounds: 10 },
  baron: { loss: 0.3, rounds: 16 },
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
  const stats = new Map<string, { fights: number; losses: number; rounds: number }>();
  for (const r of results)
    for (const [enemyId, won, rounds] of r.fights) {
      const e = stats.get(enemyId) ?? { fights: 0, losses: 0, rounds: 0 };
      e.fights++;
      e.losses += won ? 0 : 1;
      e.rounds += rounds;
      stats.set(enemyId, e);
    }
  return stats;
}

async function calibrateRuns() {
  console.log(`\n== 2. Parties, joueur moyen (objectif ${pct(TARGET)}) ==`);
  // [parties par champion, exposant des pas] : des pas de plus en plus prudents.
  const schedule: [number, number][] = [[400, 0.35], [400, 0.3], [600, 0.25], [800, 0.2], [1000, 0.15], [1000, 0.12], [1500, 0]];
  for (const [i, [count, exp]] of schedule.entries()) {
    const results = (await runTasks(runTasksFor(count, "average"), overrides(), `parties ${i + 1}`)) as RunResult[];
    const rates = runWinRates(results);
    const values = Object.values(rates);
    const mstats = monsterStats(results);
    const baron = mstats.get("baron");
    console.log(
      `Itération ${i + 1} (${count} parties/champion) : champions de ${pct(Math.min(...values))} à ${pct(Math.max(...values))}` +
        (baron ? ` · Baron ${pct(baron.losses / baron.fights)} de défaites en ${(baron.rounds / baron.fights).toFixed(1)} rounds` : ""),
    );
    if (exp === 0) {
      for (const id of ids) console.log(`  ${id.padEnd(16)} ${pct(rates[id]).padStart(7)}  runPower ${runPower[id]}`);
      for (const m of MONSTERS) {
        const e = mstats.get(m.id);
        if (e) console.log(`  ${m.id.padEnd(16)} ${pct(e.losses / e.fights).padStart(7)}  ${(e.rounds / e.fights).toFixed(1)} rounds  PV ×${monsters[m.id].hpScale} dégâts ×${monsters[m.id].damageScale}`);
      }
      break;
    }
    for (const id of ids) runPower[id] = round3(clamp(runPower[id] * clamp(Math.pow(TARGET / clamp(rates[id], 0.02, 0.98), exp), 0.85, 1.18), 0.4, 3));
    for (const m of MONSTERS) {
      const e = mstats.get(m.id);
      if (!e || e.fights < 50) continue;
      const target = MONSTER_TARGETS[chapterOf(m) as keyof typeof MONSTER_TARGETS];
      const loss = e.losses / e.fights;
      const rounds = e.rounds / e.fights;
      const ms = monsters[m.id];
      ms.damageScale = round3(clamp(ms.damageScale * clamp(Math.pow(target.loss / Math.max(loss, 0.002), exp), 0.8, 1.25), 0.2, 5));
      ms.hpScale = round3(clamp(ms.hpScale * clamp(Math.pow(target.rounds / rounds, exp * 2), 0.85, 1.18), 0.2, 5));
    }
  }
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
  await calibrateRuns();
  const difficulty = await rateDifficulty();
  writeBalance(difficulty);
  console.log(`Terminé en ${Math.round((Date.now() - started) / 60000)} min.`);
}

if (require.main === module) main();
