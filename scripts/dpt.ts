// Dégâts moyens par tour de chaque champion contre une cible neutre.
import { aiTurn } from "../src/game/ai";
import { act, createBattle, createCombatant } from "../src/game/battle";
import { CHAMPIONS } from "../src/game/data/champions";
import { getFighter } from "../src/game/data/fighters";

for (const level of [1, 9, 18]) {
  console.log(`\n== Niveau ${level} : dégâts/tour sur 12 tours, PV, armure/RM ==`);
  const dummyDef = getFighter("gromp");
  for (const c of CHAMPIONS) {
    let total = 0;
    const N = 30;
    for (let seed = 1; seed <= N; seed++) {
      const p = createCombatant(c, level);
      const dummy = createCombatant(dummyDef, level, [{ maxHp: 100000, armor: -60 + 30 + 4.5 * (level - 1), mr: -60 + 30 + 1.6 * (level - 1) }]);
      dummy.hp = dummy.base.maxHp;
      let b = createBattle(p, dummy, seed);
      b.enemy.statuses = [];
      let turns = 0;
      while (turns < 12) {
        if (b.turn === "player") { b = act(b, aiTurn(b)); turns++; }
        else b = act(b, { kind: "attack" });
        b.player.hp = b.player.base.maxHp;
      }
      total += b.enemy.base.maxHp - b.enemy.hp;
    }
    const p = createCombatant(c, level);
    console.log(`${c.name.padEnd(10)} ${String(Math.round(total / N / 12)).padStart(5)}   PV ${p.base.maxHp}  ${p.base.armor}/${p.base.mr}`);
  }
}
