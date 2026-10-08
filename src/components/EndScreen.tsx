"use client";

import { getFighter } from "@/game/data/fighters";
import { getItem } from "@/game/data/items";
import { playerLevel, type RunState } from "@/game/run";
import type { Meta } from "@/lib/storage";
import { FighterCard, ItemIcon } from "./ui";

export function EndScreen({ run, meta, onNewGame, onHome }: { run: RunState; meta: Meta; onNewGame: () => void; onHome: () => void }) {
  const won = run.status === "won";
  const champion = getFighter(run.championId);
  const killer = !won && run.ladder[run.stage] ? getFighter(run.ladder[run.stage]) : null;

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-4">
      <section className={`panel p-6 text-center sm:p-10 ${won ? "border-gold" : "border-blood/60"}`}>
        <p className={`title text-4xl font-extrabold sm:text-5xl ${won ? "text-gold" : "text-blood"}`}>
          {won ? "La Faille est conquise" : "Ascension terminée"}
        </p>
        <p className="mt-3 text-muted">
          {won
            ? `${champion.name} a vaincu tous les champions, la jungle, les dragons et le Baron Nashor !`
            : killer
              ? `Défaite face à ${killer.name}, à l'étape ${run.stage + 1} sur ${run.ladder.length}.`
              : `Partie abandonnée à l'étape ${run.stage + 1}.`}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <FighterCard def={champion} className="w-32 sm:w-40" />
          {killer && (
            <>
              <span className="title text-2xl text-dim">vs</span>
              <FighterCard def={killer} tone="blood" className="w-32 sm:w-40" />
            </>
          )}
        </div>
        <dl className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border border-line bg-black/20 p-2">
            <dt className="text-xs text-muted">Étapes</dt>
            <dd className="title text-xl">{run.stage}</dd>
          </div>
          <div className="rounded-lg border border-line bg-black/20 p-2">
            <dt className="text-xs text-muted">Niveau</dt>
            <dd className="title text-xl">{playerLevel(run)}</dd>
          </div>
          <div className="rounded-lg border border-line bg-black/20 p-2">
            <dt className="text-xs text-muted">Record</dt>
            <dd className="title text-xl">{meta.bestStage}</dd>
          </div>
        </dl>
        {run.items.length > 0 && (
          <ul className="mt-4 flex justify-center gap-1.5" aria-label="Objets">
            {run.items.map((id, i) => (
              <li key={i} title={getItem(id).name}>
                <ItemIcon item={getItem(id)} className="h-9 w-9" />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" className="btn btn-primary px-8 py-3" onClick={onNewGame}>
            Nouvelle partie
          </button>
          <button type="button" className="btn btn-ghost px-8 py-3" onClick={onHome}>
            Accueil
          </button>
        </div>
      </section>
    </div>
  );
}
