"use client";

import { useState } from "react";
import { BUILDS } from "@/game/data/builds";
import { buildsInto, consumedComponents, effectiveCost, getItem, ITEMS, type ItemDef, type ItemKind } from "@/game/data/items";
import { buyBlock, buyItem, type BuyBlock, type RunState } from "@/game/run";
import { fmt, Gold, ItemIcon } from "./ui";

const SHOP_TABS: { label: string; kinds: ItemKind[] }[] = [
  { label: "Légendaires", kinds: ["legendary"] },
  { label: "Composants", kinds: ["component"] },
  { label: "Consommables", kinds: ["potion", "elixir"] },
];

const BLOCK_LABELS: Record<Exclude<BuyBlock, null>, string> = {
  gold: "Pas assez d'or",
  full: "Inventaire plein",
  elixir: "Un élixir est déjà actif",
  potions: "Maximum atteint",
};

const KIND_LABELS: Record<ItemKind, string> = {
  legendary: "Légendaire",
  component: "Composant",
  potion: "Potion",
  elixir: "Élixir",
};

/** Prochain légendaire du build recommandé que le joueur ne possède pas encore. */
function recommended(run: RunState): string | null {
  return BUILDS[run.championId]?.core.find((id) => !run.items.includes(id)) ?? null;
}

export function Shop({ run, setRun }: { run: RunState; setRun: (run: RunState) => void }) {
  const [tab, setTab] = useState(0);
  const next = recommended(run);
  const [focus, setFocus] = useState<string>(next ?? ITEMS[0].id);
  const items = ITEMS.filter((i) => SHOP_TABS[tab].kinds.includes(i.kind));

  return (
    <section className="panel p-4" aria-label="Boutique">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="title text-lg">Boutique</h2>
        <Gold amount={run.gold} />
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
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
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="tabpanel">
          {items.map((item) => {
            const block = buyBlock(run, item.id);
            const cost = effectiveCost(run.items, item.id);
            const isNext = item.id === next;
            return (
              <li
                key={item.id}
                onMouseEnter={() => setFocus(item.id)}
                onFocus={() => setFocus(item.id)}
                className={`flex items-center gap-3 rounded-lg border bg-black/20 p-2 transition-colors ${
                  focus === item.id ? "border-gold/70" : isNext ? "border-teal/60" : "border-line"
                }`}
              >
                <ItemIcon item={item} className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  {isNext ? (
                    <p className="text-[11px] font-bold text-teal">Recommandé pour ton build</p>
                  ) : (
                    <p className="line-clamp-2 text-xs leading-snug text-muted">{item.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost shrink-0 flex-col !gap-0 !px-2 !py-1 text-xs"
                  disabled={block !== null}
                  title={block ? BLOCK_LABELS[block] : `Acheter ${item.name}`}
                  onClick={() => setRun(buyItem(run, item.id))}
                >
                  <Gold amount={cost} />
                  {cost < item.cost && <span className="text-[10px] text-dim line-through">{fmt(item.cost)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <ItemDetail item={getItem(focus)} run={run} next={next} onFocus={setFocus} onBuy={() => setRun(buyItem(run, focus))} />
      </div>
    </section>
  );
}

/** Fiche d'un objet : recette (avec composants possédés et prix réel) ou légendaires constructibles. */
function ItemDetail({
  item,
  run,
  next,
  onFocus,
  onBuy,
}: {
  item: ItemDef;
  run: RunState;
  next: string | null;
  onFocus: (id: string) => void;
  onBuy: () => void;
}) {
  const consumed = consumedComponents(run.items, item.id);
  const ownedParts = consumed.map((i) => run.items[i]);
  const discount = item.cost - effectiveCost(run.items, item.id);
  const block = buyBlock(run, item.id);
  const into = item.kind === "component" ? buildsInto(item.id) : [];
  // Marque chaque emplacement de la recette comme possédé, une seule fois par composant.
  const remaining = [...ownedParts];
  const recipe = (item.from ?? []).map((id) => {
    const index = remaining.indexOf(id);
    if (index !== -1) remaining.splice(index, 1);
    return { item: getItem(id), owned: index !== -1 };
  });

  return (
    <aside className="rounded-lg border border-gold/30 bg-black/25 p-4 lg:sticky lg:top-20" aria-live="polite">
      <div className="flex items-center gap-3">
        <ItemIcon item={item} className="h-14 w-14 shrink-0" />
        <div className="min-w-0">
          <p className="title text-lg leading-tight">{item.name}</p>
          <p className="text-xs text-dim">{KIND_LABELS[item.kind]}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gold-bright/90">{item.description}</p>

      {recipe.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gold">Recette</h3>
          <ul className="space-y-1.5">
            {recipe.map(({ item: part, owned }, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm hover:bg-white/5"
                  onClick={() => onFocus(part.id)}
                >
                  <ItemIcon item={part} className={`h-7 w-7 ${owned ? "" : "opacity-50"}`} />
                  <span className={`flex-1 ${owned ? "text-leaf" : "text-muted"}`}>
                    {part.name}
                    {owned && " ✓"}
                  </span>
                  <Gold amount={part.cost} className="text-xs" />
                </button>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-0.5 border-t border-line/70 pt-2 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted">Prix</dt>
              <dd>{fmt(item.cost)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-leaf">
                <dt>Composants possédés</dt>
                <dd>− {fmt(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <dt>À payer</dt>
              <dd>
                <Gold amount={item.cost - discount} />
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-dim">
            Les composants de la recette que tu possèdes sont absorbés à l&apos;achat : leur prix complet est déduit et leur
            emplacement libéré.
          </p>
        </div>
      )}

      {into.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gold">Sert à construire</h3>
          <ul className="space-y-1.5">
            {into.map((legendary) => (
              <li key={legendary.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-sm hover:bg-white/5"
                  onClick={() => onFocus(legendary.id)}
                >
                  <ItemIcon item={legendary} className="h-7 w-7" />
                  <span className="flex-1">
                    {legendary.name}
                    {legendary.id === next && <span className="ml-1.5 text-[11px] font-bold text-teal">recommandé</span>}
                  </span>
                  <Gold amount={legendary.cost} className="text-xs" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="btn btn-primary mt-4 w-full" disabled={block !== null} onClick={onBuy}>
        Acheter · <Gold amount={item.cost - discount} />
      </button>
      {block && <p className="mt-3 text-xs text-blood">{BLOCK_LABELS[block]}</p>}
    </aside>
  );
}
