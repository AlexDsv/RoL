"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { randomSeed } from "@/game/rng";
import { finishBattle, newRun, type RunState } from "@/game/run";
import { loadMeta, loadRun, recordRunEnd, saveRun } from "@/lib/storage";
import { BattleScreen } from "./BattleScreen";
import { EndScreen } from "./EndScreen";
import { HomeScreen } from "./HomeScreen";
import { MapScreen } from "./MapScreen";
import { SelectScreen } from "./SelectScreen";

const noopSubscribe = () => () => {};

/** La partie vit dans le navigateur (localStorage) : rien n'est rendu côté serveur. */
export function Game() {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {mounted ? <GameScreens /> : <p className="py-20 text-center text-muted">Chargement de la Faille…</p>}
      </main>
      <Footer />
    </>
  );
}

function GameScreens() {
  const [run, setRun] = useState<RunState | null>(() => loadRun());
  const [meta, setMeta] = useState(() => loadMeta());
  const [choosing, setChoosing] = useState(false);

  useEffect(() => saveRun(run), [run]);
  const update = useCallback((fn: (r: RunState) => RunState) => setRun((r) => (r ? fn(r) : r)), []);

  if (!run) {
    if (choosing) {
      return (
        <SelectScreen
          onBack={() => setChoosing(false)}
          onStart={(championId) => {
            setRun(newRun(championId, randomSeed()));
            setChoosing(false);
          }}
        />
      );
    }
    return <HomeScreen meta={meta} onNewGame={() => setChoosing(true)} />;
  }

  if (run.status === "won" || run.status === "lost") {
    return (
      <EndScreen
        run={run}
        meta={meta}
        onNewGame={() => {
          setRun(null);
          setChoosing(true);
        }}
        onHome={() => setRun(null)}
      />
    );
  }

  if (run.status === "battle") {
    return (
      <BattleScreen
        run={run}
        update={update}
        onFinish={() => {
          const next = finishBattle(run);
          if (next.status === "won" || next.status === "lost") setMeta(recordRunEnd(next));
          setRun(next);
        }}
      />
    );
  }

  return (
    <MapScreen
      run={run}
      setRun={setRun}
      onAbandon={() => {
        setMeta(recordRunEnd({ ...run, status: "lost" }));
        setRun(null);
      }}
    />
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-gold-dark/50 bg-[linear-gradient(180deg,rgba(9,20,40,0.96),rgba(1,10,19,0.9))] backdrop-blur-md">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,transparent,rgba(200,170,110,0.6)_30%,rgba(10,200,185,0.5)_70%,transparent)]" />
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true">
          <defs>
            <linearGradient id="logo-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0e6d2" />
              <stop offset="1" stopColor="#a07c3c" />
            </linearGradient>
          </defs>
          <path d="M13 1 25 7v9c0 6.5-5 11.5-12 13C6 27.5 1 22.5 1 16V7l12-6Z" fill="#091428" stroke="url(#logo-gold)" strokeWidth="1.6" />
          <path d="M13 7 8 17h4l-1 6 7-11h-4l2-5h-3Z" fill="#0ac8b9" />
        </svg>
        <span className="title text-lg leading-none sm:text-xl">
          Rift <span className="text-gold">Gauntlet</span>
        </span>
        <span className="chip ml-1 hidden sm:inline-flex">Fan-game</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-line/70 bg-black/30">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 text-xs leading-relaxed text-dim">
        <p>
          <strong className="text-muted">Rift Gauntlet</strong> est un fan-game gratuit et non commercial. Il n&apos;est pas
          approuvé par Riot Games et ne reflète pas les opinions de Riot Games ou de quiconque officiellement impliqué dans la
          production ou la gestion des propriétés de Riot Games.
        </p>
        <p>
          Riot Games, League of Legends et toutes les propriétés associées sont des marques commerciales ou des marques déposées
          de Riot Games, Inc. Images fournies par Data Dragon.
        </p>
      </div>
    </footer>
  );
}
