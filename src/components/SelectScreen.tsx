"use client";

import { useState } from "react";
import { createCombatant } from "@/game/battle";
import { CHAMPIONS } from "@/game/data/champions";
import { ARCHETYPE_LABELS } from "@/game/data/fighters";
import type { Archetype } from "@/game/types";
import { ddragon } from "@/lib/ddragon";
import { Kit } from "./Kit";
import { ArchetypeChip, Portrait, RemoteImg, StatGrid } from "./ui";

const FILTERS: (Archetype | "all")[] = ["all", "fighter", "tank", "assassin", "mage", "marksman", "support"];

export function SelectScreen({ onStart, onBack }: { onStart: (championId: string) => void; onBack: () => void }) {
  const [filter, setFilter] = useState<Archetype | "all">("all");
  const [selectedId, setSelectedId] = useState(CHAMPIONS[0].id);
  const selected = CHAMPIONS.find((c) => c.id === selectedId)!;
  const visible = CHAMPIONS.filter((c) => filter === "all" || c.archetype === filter);
  const ddKey = selected.art.kind === "champion" ? selected.art.ddKey : "";

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="title text-2xl sm:text-3xl">Choisis ton champion</h1>
        <button type="button" className="btn btn-ghost !py-1.5 text-sm" onClick={onBack}>
          Retour
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par type">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`btn !px-3 !py-1 text-xs ${filter === f ? "btn-primary" : "btn-ghost"}`}
          >
            {f === "all" ? "Tous" : ARCHETYPE_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <ul className="grid grid-cols-4 content-start gap-2 sm:grid-cols-5">
          {visible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-pressed={c.id === selectedId}
                className={`group w-full rounded-xl border p-1.5 text-center transition-colors ${
                  c.id === selectedId ? "border-gold bg-gold/10 animate-glow" : "border-line bg-panel/60 hover:border-gold/60"
                }`}
              >
                <Portrait def={c} className="mx-auto aspect-square w-full" />
                <span className="mt-1 block truncate text-xs font-bold">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>

        <section className="panel overflow-hidden" aria-live="polite">
          <div className="relative h-40 sm:h-52">
            <RemoteImg
              src={ddragon.splash(ddKey)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[50%_20%]"
              fallback={<div className="absolute inset-0 bg-panel-2" />}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,20,40,0)_30%,rgba(9,20,40,0.98))]" />
            <div className="absolute bottom-3 left-4 right-4">
              <span className="flex flex-wrap gap-1.5">
                <ArchetypeChip def={selected} />
                {selected.difficulty && <DifficultyChip level={selected.difficulty} />}
              </span>
              <h2 className="title mt-1 text-3xl font-extrabold">{selected.name}</h2>
              <p className="text-sm text-muted first-letter:uppercase">{selected.title}</p>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-gold">Stats au niveau 1</h3>
              <StatGrid stats={createCombatant(selected, 1).base} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gold">Compétences</h3>
              <Kit def={selected} />
            </div>
            <button type="button" className="btn btn-primary w-full py-3 text-base" onClick={() => onStart(selected.id)}>
              Commencer l&apos;ascension avec {selected.name}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

const DIFFICULTY = {
  1: { label: "Facile", className: "border-leaf/60 text-leaf" },
  2: { label: "Moyenne", className: "border-gold/60 text-gold" },
  3: { label: "Difficile", className: "border-blood/60 text-blood" },
} as const;

function DifficultyChip({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className={`chip ${DIFFICULTY[level].className}`} title="Difficulté d'une partie complète, mesurée par simulation">
      Difficulté : {DIFFICULTY[level].label}
    </span>
  );
}
