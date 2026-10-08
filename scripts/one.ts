import { simulateRun } from "../src/game/sim";
const id = process.argv[2]; const n = Number(process.argv[3] ?? 20);
const deaths: Record<string, number> = {};
for (let seed = 1; seed <= n; seed++) { const r = simulateRun(id, seed * 104729); const k = r.diedTo ?? "VICTOIRE"; deaths[k] = (deaths[k] ?? 0) + 1; }
console.log(id, deaths);
