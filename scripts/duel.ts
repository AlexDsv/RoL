// Journal d'un duel : npx tsx scripts/duel.ts ashe garen 9
import { aiTurn } from "../src/game/ai";
import { act, createBattle, createCombatant } from "../src/game/battle";
import { getFighter } from "../src/game/data/fighters";
const [a, b, lvl = "9", seed = "1"] = process.argv.slice(2);
let s = createBattle(createCombatant(getFighter(a), +lvl), createCombatant(getFighter(b), +lvl), +seed);
while (!s.winner && s.round < 60) s = act(s, aiTurn(s));
for (const l of s.log) console.log(`[${l.side}] ${l.text}`);
console.log(s.winner, s.round, s.player.hp, s.enemy.hp);
