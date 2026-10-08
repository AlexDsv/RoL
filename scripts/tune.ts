// Calcule le coefficient « power » de chaque champion pour viser ~50 % de
// victoires en duel. npx tsx scripts/tune.ts [itérations]
import { createBattle, createCombatant } from "../src/game/battle";
import { CHAMPIONS } from "../src/game/data/champions";
import { playBattle } from "../src/game/sim";

const iterations = Number(process.argv[2] ?? 8);
const LEVELS = [2, 9, 16];
const SEEDS = 8;

function winRates(): Map<string, number> {
  const wins = new Map(CHAMPIONS.map((c) => [c.id, 0]));
  const games = new Map(CHAMPIONS.map((c) => [c.id, 0]));
  for (const level of LEVELS)
    for (let i = 0; i < CHAMPIONS.length; i++)
      for (let j = i + 1; j < CHAMPIONS.length; j++)
        for (let seed = 1; seed <= SEEDS; seed++) {
          const [a, b] = seed % 2 ? [CHAMPIONS[i], CHAMPIONS[j]] : [CHAMPIONS[j], CHAMPIONS[i]];
          const res = playBattle(createBattle(createCombatant(a, level), createCombatant(b, level), seed * 7919 + level));
          const winner = res.winner === "player" ? a : b;
          wins.set(winner.id, wins.get(winner.id)! + 1);
          games.set(a.id, games.get(a.id)! + 1);
          games.set(b.id, games.get(b.id)! + 1);
        }
  return new Map(CHAMPIONS.map((c) => [c.id, wins.get(c.id)! / games.get(c.id)!]));
}

for (let it = 1; it <= iterations; it++) {
  const rates = winRates();
  const spread = Math.max(...rates.values()) - Math.min(...rates.values());
  console.log(`Itération ${it} : écart ${Math.round(spread * 100)} pts`);
  for (const c of CHAMPIONS) {
    const wr = Math.min(Math.max(rates.get(c.id)!, 0.03), 0.97);
    const step = Math.pow(0.5 / wr, 0.3);
    c.power = Math.min(1.6, Math.max(0.6, (c.power ?? 1) * step));
  }
}
const final = winRates();
for (const c of CHAMPIONS) console.log(`${c.id.padEnd(10)} power ${c.power!.toFixed(2)}  ${Math.round(final.get(c.id)! * 100)}%`);
