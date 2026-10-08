"use client";

import { useEffect, useState } from "react";

// CommunityDragon : extraction communautaire des fichiers du jeu, qui contient
// les icônes des monstres absentes de Data Dragon. Les noms de fichiers changent
// d'un patch à l'autre, donc on lit le contenu du dossier plutôt que de deviner.

const RAW = "https://raw.communitydragon.org/latest/game/assets/characters";
const LISTING = "https://raw.communitydragon.org/json/latest/game/assets/characters";

const listingCache = new Map<string, Promise<string[]>>();

function hudUrl(folder: string, file: string) {
  return `${RAW}/${folder}/hud/${file}`;
}

/** Noms probables, utilisés si la liste du dossier n'est pas accessible. */
function guesses(folder: string): string[] {
  const short = folder.replace(/^sru_/, "");
  return [`${short}_square.png`, `${folder}_square.png`, `${short}_circle.png`, `${folder}_circle.png`].map((f) => hudUrl(folder, f));
}

function rank(name: string): number {
  if (/square/i.test(name)) return 0;
  if (/circle/i.test(name)) return 1;
  return 2;
}

function fetchCandidates(folder: string): Promise<string[]> {
  let p = listingCache.get(folder);
  if (!p) {
    p = fetch(`${LISTING}/${folder}/hud/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((entries: { name: string; type: string }[]) => {
        const files = entries
          .filter((e) => e.type === "file" && /\.png$/i.test(e.name))
          .map((e) => e.name)
          .sort((a, b) => rank(a) - rank(b));
        return files.length ? files.map((f) => hudUrl(folder, f)) : guesses(folder);
      })
      .catch(() => guesses(folder));
    listingCache.set(folder, p);
  }
  return p;
}

/** URLs candidates de l'icône d'un monstre, de la plus probable à la moins probable. */
export function useMonsterIconCandidates(folder: string): string[] {
  const [state, setState] = useState<{ folder: string; urls: string[] } | null>(null);
  useEffect(() => {
    let alive = true;
    fetchCandidates(folder).then((urls) => alive && setState({ folder, urls }));
    return () => {
      alive = false;
    };
  }, [folder]);
  return state?.folder === folder ? state.urls : [];
}
