import { describe, expect, it } from "vitest";
import { availableActions } from "./battle";
import { BUILDS } from "./data/builds";
import { CHAMPIONS } from "./data/champions";
import { ITEMS } from "./data/items";
import { choosePlayerAction, makeRand, shopFor, SKILL_PROFILES } from "./player-ai";
import { newRun, startBattle } from "./run";
import { playDuel, simulateRun } from "./sim";

// Garde-fous rapides. Le contrôle complet est `npm run report -- --check`.

describe("équilibrage (échantillon rapide)", () => {
  it("aucun champion ne domine ni ne s'effondre en duel au niveau 9", () => {
    const wins = new Map(CHAMPIONS.map((c) => [c.id, 0]));
    const games = new Map(CHAMPIONS.map((c) => [c.id, 0]));
    for (const a of CHAMPIONS)
      for (const b of CHAMPIONS) {
        if (a === b) continue;
        for (const seed of [11, 23, 37]) {
          const res = playDuel(a.id, b.id, 9, seed);
          const winner = res.winner === "player" ? a.id : b.id;
          wins.set(winner, wins.get(winner)! + 1);
          games.set(a.id, games.get(a.id)! + 1);
          games.set(b.id, games.get(b.id)! + 1);
        }
      }
    for (const c of CHAMPIONS) {
      const rate = wins.get(c.id)! / games.get(c.id)!;
      expect(rate, c.id).toBeGreaterThan(0.25);
      expect(rate, c.id).toBeLessThan(0.75);
    }
  });
});

describe("joueur simulé", () => {
  it("chaque champion a un build composé d'objets existants", () => {
    const ids = new Set(ITEMS.map((i) => i.id));
    for (const c of CHAMPIONS) {
      const build = BUILDS[c.id];
      expect(build, c.id).toBeDefined();
      for (const id of [...build.core, build.versusMagic, build.versusPhysical]) expect(ids.has(id), id).toBe(true);
    }
  });

  it("joue toujours une action disponible, quel que soit son niveau", () => {
    for (const skill of ["beginner", "average", "expert"] as const) {
      const rand = makeRand(3);
      const battle = startBattle(newRun("lux", 9)).battle!;
      const action = choosePlayerAction(battle, SKILL_PROFILES[skill], rand);
      expect(availableActions(battle, "player")).toContainEqual(action);
    }
  });

  it("achète le premier légendaire de son build dès qu'il en a les moyens", () => {
    const run = { ...newRun("garen", 1), gold: 4000 };
    const after = shopFor(run, { ...SKILL_PROFILES.expert, adaptiveShop: false }, makeRand(1));
    expect(after.items).toContain(BUILDS.garen.core[0]);
  });

  it("avance l'objet défensif adapté au prochain adversaire", () => {
    const run = { ...newRun("garen", 1), gold: 4000 };
    const enemy = run.ladder[run.stage];
    const after = shopFor(run, SKILL_PROFILES.expert, makeRand(1));
    const build = BUILDS.garen;
    expect([build.versusMagic, build.versusPhysical, build.core[0]], enemy).toContain(after.items.find((id) => build.core.includes(id)));
  });

  it("une partie simulée se termine, à chaque niveau de joueur", () => {
    for (const skill of ["beginner", "average", "expert"] as const) {
      const r = simulateRun("jinx", 4, skill);
      expect(r.won || r.diedTo !== null).toBe(true);
      expect(r.fights.length).toBe(r.won ? 28 : r.stage + 1);
    }
  });
});
