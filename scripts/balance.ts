// Rapport d'équilibrage : npx tsx scripts/balance.ts [parties par champion]
import { createBattle, createCombatant } from "../src/game/battle";
import { CHAMPIONS } from "../src/game/data/champions";
import { playBattle, simulateRun } from "../src/game/sim";

const runsPerChampion = Number(process.argv[2] ?? 40);
const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(5);

for (const level of [1, 9, 18]) {
  console.log(`\n== Duels 1v1 au niveau ${level} (victoires, rounds moyens) ==`);
  for (const a of CHAMPIONS) {
    let wins = 0, games = 0, rounds = 0;
    for (const b of CHAMPIONS) {
      if (a === b) continue;
      for (let seed = 1; seed <= 20; seed++) {
        // Alterner qui joue en premier pour neutraliser l'avantage du premier coup.
        const first = seed % 2 === 0;
        const p = createCombatant(first ? a : b, level);
        const e = createCombatant(first ? b : a, level);
        const res = playBattle(createBattle(p, e, seed * 7919));
        const aWon = (res.winner === "player") === first;
        wins += aWon ? 1 : 0;
        games++;
        rounds += res.round;
      }
    }
    console.log(`${a.name.padEnd(10)} ${pct(wins / games)}  ${(rounds / games).toFixed(1)}`);
  }
}

if (process.argv[3] === "duels") process.exit(0);
console.log(`\n== Parties complètes simulées (${runsPerChampion} par champion) ==`);
const deaths = new Map<string, number>();
const seen = new Map<string, { n: number; hp: number }>();
let totalWins = 0;
for (const c of CHAMPIONS) {
  let wins = 0, stages = 0;
  for (let seed = 1; seed <= runsPerChampion; seed++) {
    const r = simulateRun(c.id, seed * 104729);
    wins += r.won ? 1 : 0;
    stages += r.stage;
    if (r.diedTo) deaths.set(r.diedTo, (deaths.get(r.diedTo) ?? 0) + 1);
    for (const f of r.fights) {
      const e = seen.get(f.enemyId) ?? { n: 0, hp: 0 };
      seen.set(f.enemyId, { n: e.n + 1, hp: e.hp + f.hpLeft });
    }
  }
  totalWins += wins;
  console.log(`${c.name.padEnd(10)} victoires ${pct(wins / runsPerChampion)}  étape moyenne ${(stages / runsPerChampion).toFixed(1)}`);
}
console.log(`Total : ${pct(totalWins / (runsPerChampion * CHAMPIONS.length))}`);
console.log("\nPar adversaire : combats, défaites, PV restants moyens");
for (const [id, e] of seen) {
  const d = deaths.get(id) ?? 0;
  console.log(`  ${id.padEnd(18)} ${String(e.n).padStart(4)}  ${pct(d / e.n)}  ${pct(e.hp / e.n)}`);
}
