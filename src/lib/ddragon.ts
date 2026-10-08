"use client";

import { useEffect, useState } from "react";

// Data Dragon : le CDN officiel de Riot pour les images et données du jeu.
// On ne télécharge rien au build : le navigateur charge les images à la volée,
// et l'interface affiche un repli si le CDN est inaccessible.

const CDN = "https://ddragon.leagueoflegends.com";
const FALLBACK_VERSION = "15.1.1";
const VERSION_KEY = "rift-gauntlet:ddragon-version";

let versionPromise: Promise<string> | null = null;

function readCachedVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_KEY);
  } catch {
    return null;
  }
}

function fetchVersion(): Promise<string> {
  versionPromise ??= fetch(`${CDN}/api/versions.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((versions: string[]) => {
      const latest = versions[0] ?? FALLBACK_VERSION;
      try {
        localStorage.setItem(VERSION_KEY, latest);
      } catch {}
      return latest;
    })
    .catch(() => readCachedVersion() ?? FALLBACK_VERSION);
  return versionPromise;
}

export function useDdragonVersion(): string {
  const [version, setVersion] = useState(() => readCachedVersion() ?? FALLBACK_VERSION);
  useEffect(() => {
    let alive = true;
    fetchVersion().then((v) => alive && setVersion(v));
    return () => {
      alive = false;
    };
  }, []);
  return version;
}

export const ddragon = {
  championSquare: (version: string, key: string) => `${CDN}/cdn/${version}/img/champion/${key}.png`,
  splash: (key: string) => `${CDN}/cdn/img/champion/splash/${key}_0.jpg`,
  /** Portrait d'écran de chargement (308×560) ; `skin` = numéro de skin, 0 pour le skin de base. */
  loading: (key: string, skin = 0) => `${CDN}/cdn/img/champion/loading/${key}_${skin}.jpg`,
  item: (version: string, id: string) => `${CDN}/cdn/${version}/img/item/${id}.png`,
  spell: (version: string, file: string) => `${CDN}/cdn/${version}/img/spell/${file}`,
  passive: (version: string, file: string) => `${CDN}/cdn/${version}/img/passive/${file}`,
};

export interface ChampionIcons {
  passive: string;
  spells: string[];
}

const iconCache = new Map<string, Promise<ChampionIcons | null>>();

function fetchChampionIcons(version: string, key: string): Promise<ChampionIcons | null> {
  const cacheKey = `${version}/${key}`;
  let p = iconCache.get(cacheKey);
  if (!p) {
    p = fetch(`${CDN}/cdn/${version}/data/fr_FR/champion/${key}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((json) => {
        const data = json.data[key];
        return {
          passive: ddragon.passive(version, data.passive.image.full),
          spells: data.spells.map((s: { image: { full: string } }) => ddragon.spell(version, s.image.full)),
        };
      })
      .catch(() => null);
    iconCache.set(cacheKey, p);
  }
  return p;
}

/** Icônes du passif et des sorts d'un champion (null tant qu'elles ne sont pas chargées). */
export function useChampionIcons(key: string | null): ChampionIcons | null {
  const version = useDdragonVersion();
  const [icons, setIcons] = useState<{ key: string; icons: ChampionIcons | null } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetchChampionIcons(version, key).then((res) => alive && setIcons({ key, icons: res }));
    return () => {
      alive = false;
    };
  }, [version, key]);
  return icons && icons.key === key ? icons.icons : null;
}
