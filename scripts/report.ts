// Rapport d'équilibrage complet, sur les graines de validation (jamais utilisées
// pour le calibrage). Écrit reports/balance.json.
//
//   npm run report               # rapport complet (~800 000 combats)
//   npm run report -- --quick    # version rapide pour vérifier une modification
//   npm run report -- --check    # échoue si un champion sort des fourchettes

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { CHAMPIONS } from "../src/game/data/champions";
import { getFighter } from "../src/game/data/fighters";
import { SKILL_PROFILES, type Skill } from "../src/game/player-ai";
import { chapterOf } from "../src/game/run";
import { DUEL_LEVELS, duelTasks } from "./calibrate";
import { runTasks } from "./lib/pool";
import { pct, seeds, wilson } from "./lib/stats";
import type { Task, TaskResult } from "./lib/tasks";

const quick = process.argv.includes("--quick");
const check = process.argv.includes("--check");
const RUNS: Record<Skill, number> = quick ? { beginner: 100, average: 300, expert: 100 } : { beginner: 500, average: 2000, expert: 500 };
const DUEL_SEEDS = quick ? 6 : 20;
const TARGET = 0.3;
/** Fourchettes du mode --check. */
const RUN_TOLERANCE = 0.06;
const DUEL_RANGE: [number, number] = [0.4, 0.6];

const ids = CHAMPIONS.map((c) => c.id);
const round3 = (x: number) => Math.round(x * 1000) / 1000;

function duelReport(results: TaskResult[]) {
  const duels = results.filter((r) => r.kind === "duel");
  const perChampion = ids.map((id) => {
    const mine = duels.filter((d) => d.a === id || d.b === id);
    const wins = mine.filter((d) => (d.aWon ? d.a : d.b) === id).length;
    const byLevel = DUEL_LEVELS.map((level) => {
      const lv = mine.filter((d) => d.level === level);
      return round3(lv.filter((d) => (d.aWon ? d.a : d.b) === id).length / lv.length);
    });
    const [lo, hi] = wilson(wins, mine.length);
    return { id, winRate: round3(wins / mine.length), ci: [round3(lo), round3(hi)], byLevel };
  });
  const matrix = ids.map((a) =>
    ids.map((b) => {
      if (a === b) return null;
      const games = duels.filter((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a));
      return round3(games.filter((d) => (d.aWon ? d.a : d.b) === a).length / games.length);
    }),
  );
  const rounds = DUEL_LEVELS.map((level) => {
    const lv = duels.filter((d) => d.level === level);
    return round3(lv.reduce((s, d) => s + d.rounds, 0) / lv.length);
  });
  return { levels: DUEL_LEVELS, perChampion, matrix, rounds, total: duels.length };
}

type RunResult = Extract<TaskResult, { kind: "run" }>;

function runReport(runs: RunResult[]) {
  const perChampion = ids.map((id) => {
    const mine = runs.filter((r) => r.champion === id);
    const wins = mine.filter((r) => r.won).length;
    const [lo, hi] = wilson(wins, mine.length);
    const deaths = { champions: 0, jungle: 0, dragons: 0, baron: 0 };
    for (const r of mine) if (r.diedTo) deaths[chapterOf(getFighter(r.diedTo))]++;
    return {
      id,
      runs: mine.length,
      winRate: round3(wins / mine.length),
      ci: [round3(lo), round3(hi)],
      avgStage: round3(mine.reduce((s, r) => s + r.stage, 0) / mine.length),
      deaths: Object.fromEntries(Object.entries(deaths).map(([k, v]) => [k, round3(v / mine.length)])),
    };
  });
  const wins = runs.filter((r) => r.won).length;
  return { runs: runs.length, winRate: round3(wins / runs.length), ci: wilson(wins, runs.length).map(round3), perChampion };
}

function enemyReport(runs: RunResult[]) {
  const stats = new Map<string, { fights: number; losses: number; hpLost: number; rounds: number; potions: number }>();
  for (const r of runs) {
    for (const [enemyId, won, rounds, hpBefore, hpAfter, potions] of r.fights) {
      const e = stats.get(enemyId) ?? { fights: 0, losses: 0, hpLost: 0, rounds: 0, potions: 0 };
      e.fights++;
      e.losses += won ? 0 : 1;
      e.hpLost += Math.max(0, hpBefore - hpAfter);
      e.rounds += rounds;
      e.potions += potions;
      stats.set(enemyId, e);
    }
  }
  return [...stats.entries()].map(([id, e]) => ({
    id,
    name: getFighter(id).name,
    chapter: chapterOf(getFighter(id)),
    fights: e.fights,
    lossRate: round3(e.losses / e.fights),
    hpLost: round3(e.hpLost / e.fights),
    rounds: round3(e.rounds / e.fights),
    potions: round3(e.potions / e.fights),
  }));
}

async function main() {
  const started = Date.now();
  console.log(`Rapport ${quick ? "rapide" : "complet"} sur les graines de validation…`);
  const duelResults = await runTasks(duelTasks(DUEL_SEEDS, "validation"), {}, "duels");

  const runsBySkill = {} as Record<Skill, RunResult[]>;
  for (const skill of ["average", "beginner", "expert"] as Skill[]) {
    const tasks: Task[] = ids.flatMap((champion) => seeds(RUNS[skill], "validation").map((seed) => ({ kind: "run" as const, champion, skill, seed })));
    runsBySkill[skill] = (await runTasks(tasks, {}, `parties (${SKILL_PROFILES[skill].label})`)) as RunResult[];
  }

  const fights = Object.values(runsBySkill).flat().reduce((s, r) => s + r.fights.length, 0) + duelResults.length;
  const report = {
    generatedAt: new Date().toISOString(),
    commit: execSync("git rev-parse --short HEAD").toString().trim(),
    quick,
    target: TARGET,
    fights,
    minutes: Math.round((Date.now() - started) / 6000) / 10,
    champions: CHAMPIONS.map((c) => ({ id: c.id, name: c.name, archetype: c.archetype, power: c.power, pve: c.pve, difficulty: c.difficulty })),
    duels: duelReport(duelResults),
    runs: Object.fromEntries((["beginner", "average", "expert"] as Skill[]).map((s) => [s, runReport(runsBySkill[s])])),
    enemies: enemyReport(runsBySkill.average),
  };
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/balance.json", JSON.stringify(report, null, 1));

  console.log(`\n${fights.toLocaleString("fr-FR")} combats en ${report.minutes} min → reports/balance.json\n`);
  console.log("Champion    duels    débutant  moyen (IC 95 %)          expert");
  const failures: string[] = [];
  for (const id of ids) {
    const d = report.duels.perChampion.find((x) => x.id === id)!;
    const [b, a, e] = (["beginner", "average", "expert"] as Skill[]).map((s) => report.runs[s].perChampion.find((x) => x.id === id)!);
    console.log(
      `${id.padEnd(10)} ${pct(d.winRate).padStart(7)}  ${pct(b.winRate).padStart(7)}  ${pct(a.winRate).padStart(7)} [${pct(a.ci[0])}–${pct(a.ci[1])}]  ${pct(e.winRate).padStart(7)}`,
    );
    if (d.winRate < DUEL_RANGE[0] || d.winRate > DUEL_RANGE[1]) failures.push(`${id} : duels ${pct(d.winRate)}`);
    if (Math.abs(a.winRate - TARGET) > RUN_TOLERANCE) failures.push(`${id} : parties ${pct(a.winRate)}`);
  }
  if (check && failures.length) {
    console.error(`\nHors fourchette :\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
}

if (require.main === module) main();
