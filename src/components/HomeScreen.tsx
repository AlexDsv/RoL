"use client";

import { CHAMPIONS } from "@/game/data/champions";
import { BARON, DRAGONS, JUNGLE } from "@/game/data/monsters";
import type { Meta } from "@/lib/storage";
import { Portrait } from "./ui";

const STEPS = [
  {
    title: "Choisis ton champion",
    text: "Quinze champions, six styles de jeu : tank, combattant, assassin, mage, tireur ou support.",
  },
  {
    title: "Affronte-les tous",
    text: "Un duel au tour par tour contre chaque autre champion. Chaque adversaire joue selon son type.",
  },
  {
    title: "Équipe-toi",
    text: "Gagne de l'or, achète potions, élixirs et objets entre les combats. Tes PV ne remontent pas entièrement.",
  },
  {
    title: "Conquiers la Faille",
    text: "La jungle, les six dragons élémentaires, puis le Baron Nashor. Une défaite, et tout recommence.",
  },
];

export function HomeScreen({ meta, onNewGame }: { meta: Meta; onNewGame: () => void }) {
  return (
    <div className="animate-fade-in space-y-8">
      <section className="panel overflow-hidden px-6 py-10 text-center sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_50%_0%,rgba(10,200,185,0.18),transparent_70%)]"
        />
        <p className="chip relative mx-auto">Roguelike au tour par tour</p>
        <h1 className="title relative mt-4 text-4xl font-extrabold sm:text-6xl">
          Rift <span className="text-gold">Gauntlet</span>
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-muted">
          {CHAMPIONS.length - 1} champions, {JUNGLE.length} monstres de la jungle, {DRAGONS.length} dragons et{" "}
          {BARON.name}. Un seul champion pour tous les vaincre.
        </p>
        <div className="relative mt-6 flex justify-center -space-x-3">
          {CHAMPIONS.slice(0, 8).map((c) => (
            <Portrait key={c.id} def={c} className="h-12 w-12 rounded-full border-2 border-abyss sm:h-14 sm:w-14" />
          ))}
        </div>
        <button type="button" className="btn btn-primary relative mt-8 px-8 py-3 text-base" onClick={onNewGame}>
          Nouvelle partie
        </button>
        {meta.runs > 0 && (
          <p className="relative mt-5 text-sm text-muted">
            {meta.runs} partie{meta.runs > 1 ? "s" : ""} jouée{meta.runs > 1 ? "s" : ""} · record : étape {meta.bestStage}
            {meta.wins > 0 && ` · ${meta.wins} victoire${meta.wins > 1 ? "s" : ""} contre le Baron`}
          </p>
        )}
      </section>

      <section aria-labelledby="how-to-play">
        <h2 id="how-to-play" className="title mb-3 text-xl">
          Comment jouer
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="panel p-4">
              <span className="title text-2xl text-gold">{i + 1}</span>
              <h3 className="mt-1 font-bold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
