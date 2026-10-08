import { describe, expect, it } from "vitest";
import { aiTurn } from "./ai";
import { act, createBattle, createCombatant, effectiveStats, mitigate, spellBlock } from "./battle";
import { CHAMPIONS } from "./data/champions";
import { getFighter } from "./data/fighters";
import { ITEMS } from "./data/items";
import { BARON, DRAGONS, JUNGLE } from "./data/monsters";
import { buyItem, finishBattle, newRun, sellItem, startBattle } from "./run";
import { playBattle, simulateRun } from "./sim";
import type { BattleState } from "./types";

function duel(a: string, b: string, level = 5, seed = 42): BattleState {
  return createBattle(createCombatant(getFighter(a), level), createCombatant(getFighter(b), level), seed);
}

describe("données", () => {
  it("chaque champion a un passif et quatre sorts Q, W, E, R", () => {
    for (const c of CHAMPIONS) {
      expect(c.spells.map((s) => s.key)).toEqual(["Q", "W", "E", "R"]);
      expect(c.art.kind).toBe("champion");
    }
  });

  it("les identifiants sont uniques", () => {
    const ids = [...CHAMPIONS, ...JUNGLE, ...DRAGONS, BARON].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });
});

describe("combat", () => {
  it("les résistances réduisent les dégâts, les dégâts bruts les ignorent", () => {
    const stats = effectiveStats(createCombatant(getFighter("garen"), 1));
    expect(mitigate(100, "physical", { ...stats, armor: 100 })).toBe(50);
    expect(mitigate(100, "magic", { ...stats, mr: 0 })).toBe(100);
    expect(mitigate(100, "true", { ...stats, armor: 300 })).toBe(100);
  });

  it("une attaque passe la main à l'adversaire", () => {
    const after = act(duel("garen", "lux"), { kind: "attack" });
    expect(after.turn).toBe("enemy");
    expect(after.enemy.hp).toBeLessThan(after.enemy.base.maxHp);
  });

  it("une potion ne termine pas le tour", () => {
    const b = duel("garen", "lux");
    b.player.hp = 100;
    const after = act(b, { kind: "potion", itemId: "health-potion" });
    expect(after.turn).toBe("player");
    expect(after.player.hp).toBeGreaterThan(100);
  });

  it("un sort lancé passe en recharge et consomme la ressource", () => {
    const after = act(duel("lux", "garen"), { kind: "spell", key: "R" });
    expect(after.player.cooldowns.R).toBe(5);
    expect(after.player.resource).toBeLessThan(after.player.base.maxResource);
    // Le tour adverse a commencé : les recharges du joueur ne bougent qu'à son prochain tour.
    expect(spellBlock(after, "player", "R")).not.toBeNull();
  });

  it("un étourdissement fait sauter le tour, puis protège un tour", () => {
    let b = duel("leona", "garen");
    b = act(b, { kind: "spell", key: "Q" });
    // Garen étourdi : la main revient directement au joueur.
    expect(b.turn).toBe("player");
    expect(b.enemy.statuses.some((s) => s.id === "tenacity")).toBe(true);
  });

  it("le même combat avec la même graine donne le même résultat", () => {
    const a = playBattle(duel("ahri", "zed", 9, 7));
    const b = playBattle(duel("ahri", "zed", 9, 7));
    expect(a.winner).not.toBeNull();
    expect(a.log).toEqual(b.log);
  });

  it("l'IA choisit toujours une action jouable", () => {
    let b = duel("annie", "darius", 12, 3);
    for (let i = 0; i < 40 && !b.winner; i++) b = act(b, aiTurn(b));
    expect(b.winner).not.toBeNull();
  });

  it("le Baron change de phase sous 60 % de PV", () => {
    const b = createBattle(createCombatant(getFighter("garen"), 18), createCombatant(BARON, 18), 1);
    const adBefore = b.enemy.base.ad;
    b.enemy.hp = Math.round(b.enemy.base.maxHp * 0.6) + 10;
    const after = act(b, { kind: "attack" });
    expect(after.enemy.base.ad).toBeGreaterThan(adBefore);
  });
});

describe("partie", () => {
  it("l'ascension enchaîne champions, jungle, dragons puis Baron", () => {
    const run = newRun("garen", 1);
    expect(run.ladder).toHaveLength(CHAMPIONS.length - 1 + JUNGLE.length + DRAGONS.length + 1);
    expect(run.ladder).not.toContain("garen");
    expect(run.ladder.at(-1)).toBe("baron");
  });

  it("acheter puis revendre rend 70 % du prix", () => {
    let run = { ...newRun("garen", 1), gold: 1000 };
    run = buyItem(run, "long-sword");
    expect(run.gold).toBe(650);
    expect(run.items).toEqual(["long-sword"]);
    run = sellItem(run, 0);
    expect(run.gold).toBe(650 + 245);
    expect(run.items).toEqual([]);
  });

  it("une victoire fait avancer, une défaite termine la partie", () => {
    let run = startBattle(newRun("garen", 1));
    run.battle!.winner = "player";
    const won = finishBattle(run);
    expect(won.stage).toBe(1);
    expect(won.gold).toBeGreaterThan(run.gold);
    expect(won.status).toBe("map");

    run = startBattle(newRun("garen", 1));
    run.battle!.winner = "enemy";
    expect(finishBattle(run).status).toBe("lost");
  });

  it("une partie simulée se termine toujours", () => {
    for (const id of ["garen", "lux", "jinx"]) {
      const result = simulateRun(id, 5);
      expect(result.won || result.diedTo !== null).toBe(true);
    }
  });
});
