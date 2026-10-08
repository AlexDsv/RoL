import type { RunState } from "@/game/run";

// Sauvegarde locale : la partie en cours et quelques records. Tout passe par
// try/catch, le stockage pouvant être indisponible (navigation privée…).

const RUN_KEY = "rift-gauntlet:run";
const META_KEY = "rift-gauntlet:meta";

export interface Meta {
  runs: number;
  wins: number;
  bestStage: number;
  /** Champions avec lesquels le Baron a été vaincu. */
  champions: string[];
}

const EMPTY_META: Meta = { runs: 0, wins: 0, bestStage: 0, champions: [] };

export function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const run = JSON.parse(raw) as RunState;
    return run.version === 1 ? run : null;
  } catch {
    return null;
  }
}

export function saveRun(run: RunState | null) {
  try {
    if (run) localStorage.setItem(RUN_KEY, JSON.stringify(run));
    else localStorage.removeItem(RUN_KEY);
  } catch {}
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? { ...EMPTY_META, ...JSON.parse(raw) } : EMPTY_META;
  } catch {
    return EMPTY_META;
  }
}

export function recordRunEnd(run: RunState): Meta {
  const meta = loadMeta();
  const won = run.status === "won";
  const next: Meta = {
    runs: meta.runs + 1,
    wins: meta.wins + (won ? 1 : 0),
    bestStage: Math.max(meta.bestStage, run.stage),
    champions: won && !meta.champions.includes(run.championId) ? [...meta.champions, run.championId] : meta.champions,
  };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
