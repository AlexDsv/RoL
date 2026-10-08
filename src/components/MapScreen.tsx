"use client";

import { useState } from "react";
import { createCombatant } from "@/game/battle";
import { getFighter } from "@/game/data/fighters";
import { getItem, ITEMS, MAX_ITEMS, type ItemKind } from "@/game/data/items";
import {
  buyBlock,
  buyItem,
  chapterOf,
  currentEnemy,
  currentHp,
  enemyBonus,
  enemyLevel,
  playerLevel,
  playerStats,
  sellItem,
  sellPrice,
  startBattle,
  type BuyBlock,
  type Chapter,
  type RunState,
} from "@/game/run";
import { Kit } from "./Kit";
import {
  ArchetypeChip,
  Bar,
  FighterCard,
  fmt,
  Gold,
  ItemIcon,
  Portrait,
  StatGrid,
} from "./ui";

const CHAPTER_LABELS: Record<Chapter, string> = {
  champions: "Champions",
  jungle: "Jungle",
  dragons: "Dragons",
  baron: "Baron Nashor",
};

interface Props {
  run: RunState;
  setRun: (run: RunState) => void;
  onAbandon: () => void;
}

export function MapScreen({ run, setRun, onAbandon }: Props) {
  const champion = getFighter(run.championId);
  const enemy = currentEnemy(run)!;
  const stats = playerStats(run);
  const hp = currentHp(run);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  return (
    <div className="animate-fade-in space-y-4">
      {run.lastResult && <LastResult run={run} />}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Joueur */}
        <section
          className="panel grid gap-4 p-4 sm:grid-cols-[11rem_minmax(0,1fr)]"
          aria-label="Ton champion"
        >
          <FighterCard
            def={champion}
            subtitle={`Niveau ${playerLevel(run)}`}
            className="mx-auto w-40 sm:w-full"
          />
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="title truncate text-xl">{champion.name}</h2>
                  <span className="text-sm font-bold text-gold">
                    Niveau {playerLevel(run)}
                  </span>
                </div>
                <Bar
                  value={hp}
                  max={stats.maxHp}
                  color="linear-gradient(90deg,#1f9d55,#34c27a)"
                  label="Points de vie"
                />
                <p className="mt-0.5 text-xs text-muted">
                  {fmt(hp)} / {fmt(stats.maxHp)} PV
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <Gold amount={run.gold} className="text-base" />
              {Object.entries(run.potions)
                .filter(([, n]) => n > 0)
                .map(([id, n]) => (
                  <span key={id} className="inline-flex items-center gap-1">
                    <ItemIcon item={getItem(id)} className="h-6 w-6" />×{n}
                  </span>
                ))}
              {run.elixir && (
                <span className="inline-flex items-center gap-1 text-leaf">
                  <ItemIcon item={getItem(run.elixir)} className="h-6 w-6" />{" "}
                  actif au prochain combat
                </span>
              )}
            </div>
            <StatGrid stats={stats} />
            <Inventory run={run} setRun={setRun} />
            {run.rewards.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">
                  Bénédictions
                </h3>
                <ul className="space-y-0.5 text-xs text-leaf">
                  {run.rewards.map((r, i) => (
                    <li key={i}>✦ {r.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Prochain adversaire */}
        <section
          className="panel grid gap-4 p-4 sm:grid-cols-[11rem_minmax(0,1fr)]"
          aria-label="Prochain adversaire"
        >
          <FighterCard
            def={enemy}
            tone="blood"
            subtitle={
              enemy.art.kind === "champion"
                ? `Niveau ${enemyLevel(run)}`
                : enemy.title
            }
            className="mx-auto w-40 sm:w-full"
          />
          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gold">
                Étape {run.stage + 1} / {run.ladder.length} ·{" "}
                {CHAPTER_LABELS[chapterOf(enemy)]}
              </h2>
              {confirmAbandon ? (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-xs text-blood"
                    onClick={onAbandon}
                  >
                    Confirmer l&apos;abandon
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !px-2 !py-1 text-xs"
                    onClick={() => setConfirmAbandon(false)}
                  >
                    Annuler
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="text-xs text-dim underline hover:text-muted"
                  onClick={() => setConfirmAbandon(true)}
                >
                  Abandonner
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="min-w-0">
                <ArchetypeChip def={enemy} />
                <p className="title mt-1 text-2xl">{enemy.name}</p>
                <p className="text-sm text-muted first-letter:uppercase">
                  {enemy.title}
                  {enemy.art.kind === "champion" &&
                    ` · niveau ${enemyLevel(run)}`}
                </p>
              </div>
            </div>
            <StatGrid
              stats={
                createCombatant(enemy, enemyLevel(run), [
                  enemyBonus(enemy, run.stage),
                ]).base
              }
            />
            {enemy.reward && (
              <p className="text-xs text-leaf">
                Récompense : {enemy.reward.label}
              </p>
            )}
            <details className="group">
              <summary className="cursor-pointer text-sm font-bold text-gold">
                Compétences de l&apos;adversaire
              </summary>
              <div className="mt-2">
                <Kit def={enemy} compact />
              </div>
            </details>
            <button
              type="button"
              className="btn btn-primary w-full py-3 text-base"
              onClick={() => setRun(startBattle(run))}
            >
              Affronter {enemy.name}
            </button>
          </div>
        </section>
      </div>

      <Ladder run={run} />
      <Shop run={run} setRun={setRun} />
    </div>
  );
}

function LastResult({ run }: { run: RunState }) {
  const r = run.lastResult!;
  const enemy = getFighter(r.enemyId);
  return (
    <div
      className="panel animate-fade-in flex flex-wrap items-center gap-x-4 gap-y-1 border-leaf/40 px-4 py-3 text-sm"
      role="status"
    >
      <span className="title text-leaf">Victoire contre {enemy.name} !</span>
      <span>
        +<Gold amount={r.gold} />
      </span>
      {r.levelUp && (
        <span className="font-bold text-gold">
          Niveau {playerLevel(run)} atteint
        </span>
      )}
      {r.reward && <span className="text-leaf">✦ {r.reward.label}</span>}
    </div>
  );
}

function Ladder({ run }: { run: RunState }) {
  const groups: { chapter: Chapter; ids: { id: string; index: number }[] }[] =
    [];
  run.ladder.forEach((id, index) => {
    const chapter = chapterOf(getFighter(id));
    const last = groups.at(-1);
    if (last?.chapter === chapter) last.ids.push({ id, index });
    else groups.push({ chapter, ids: [{ id, index }] });
  });
  return (
    <section className="panel p-4" aria-label="Progression">
      <h2 className="title mb-3 text-lg">L&apos;ascension</h2>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {groups.map((g) => (
          <div key={g.chapter}>
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              {CHAPTER_LABELS[g.chapter]}
            </h3>
            <ol className="flex flex-wrap gap-1">
              {g.ids.map(({ id, index }) => {
                const def = getFighter(id);
                const done = index < run.stage;
                const current = index === run.stage;
                return (
                  <li key={id} title={def.name} className="relative">
                    <Portrait
                      def={def}
                      className={`h-9 w-9 ${current ? "animate-glow" : ""} ${done ? "opacity-35 grayscale" : ""} ${
                        !done && !current ? "opacity-70" : ""
                      }`}
                    />
                    {done && (
                      <span className="absolute inset-0 grid place-items-center text-lg font-black text-leaf">
                        ✓
                      </span>
                    )}
                    <span className="sr-only">
                      {def.name}{" "}
                      {done ? "(vaincu)" : current ? "(prochain)" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function Inventory({
  run,
  setRun,
}: {
  run: RunState;
  setRun: (run: RunState) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">
        Objets ({run.items.length}/{MAX_ITEMS})
      </h3>
      <ul className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: MAX_ITEMS }, (_, i) => {
          const id = run.items[i];
          if (!id)
            return (
              <li
                key={i}
                className="aspect-square rounded-md border border-dashed border-line"
                aria-hidden="true"
              />
            );
          const item = getItem(id);
          return (
            <li key={i}>
              <button
                type="button"
                className="group relative block w-full"
                title={`${item.name} : ${item.description}. Cliquer pour revendre ${sellPrice(id)} or.`}
                onClick={() => setRun(sellItem(run, i))}
              >
                <ItemIcon item={item} className="aspect-square h-auto w-full" />
                <span className="absolute inset-0 hidden place-items-center rounded-md bg-black/75 text-[10px] font-bold text-gold group-hover:grid group-focus-visible:grid">
                  Vendre
                  <br />
                  {sellPrice(id)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SHOP_TABS: { label: string; kinds: ItemKind[] }[] = [
  { label: "Consommables", kinds: ["potion", "elixir"] },
  { label: "Composants", kinds: ["component"] },
  { label: "Légendaires", kinds: ["legendary"] },
];

const BLOCK_LABELS: Record<Exclude<BuyBlock, null>, string> = {
  gold: "Pas assez d'or",
  full: "Inventaire plein",
  elixir: "Un élixir est déjà actif",
  potions: "Maximum atteint",
};

function Shop({
  run,
  setRun,
}: {
  run: RunState;
  setRun: (run: RunState) => void;
}) {
  const [tab, setTab] = useState(0);
  const items = ITEMS.filter((i) => SHOP_TABS[tab].kinds.includes(i.kind));
  return (
    <section className="panel p-4" aria-label="Boutique">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="title text-lg">Boutique</h2>
        <Gold amount={run.gold} />
      </div>
      <div className="mb-3 flex gap-1.5" role="tablist">
        {SHOP_TABS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`btn !px-3 !py-1 text-xs ${tab === i ? "btn-primary" : "btn-ghost"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
        {items.map((item) => {
          const block = buyBlock(run, item.id);
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-black/20 p-2"
            >
              <ItemIcon item={item} className="h-11 w-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="text-xs leading-snug text-muted">
                  {item.description}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost shrink-0 !px-2 !py-1 text-xs"
                disabled={block !== null}
                title={block ? BLOCK_LABELS[block] : `Acheter ${item.name}`}
                onClick={() => setRun(buyItem(run, item.id))}
              >
                <Gold amount={item.cost} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
