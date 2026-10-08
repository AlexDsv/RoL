"use client";

import type { FighterDef, SpellKey } from "@/game/types";
import { useChampionIcons } from "@/lib/ddragon";
import { RemoteImg } from "./ui";

const KEY_INDEX: Record<SpellKey, number> = { Q: 0, W: 1, E: 2, R: 3 };

export function KeyBadge({ k, className = "" }: { k: string; className?: string }) {
  return (
    <span
      className={`grid h-5 min-w-5 place-items-center rounded border border-gold-dark bg-abyss px-1 text-[10px] font-black text-gold ${className}`}
    >
      {k}
    </span>
  );
}

export function SpellIcon({ def, spellKey, className = "w-10 h-10" }: { def: FighterDef; spellKey: SpellKey | "P"; className?: string }) {
  const icons = useChampionIcons(def.art.kind === "champion" ? def.art.ddKey : null);
  const src = spellKey === "P" ? icons?.passive : icons?.spells[KEY_INDEX[spellKey]];
  const fallback = (
    <span
      className={`grid place-items-center rounded-md border border-gold-dark/70 bg-panel-2 font-display font-bold text-gold ${className}`}
      style={def.art.kind === "monster" ? { background: `${def.art.color}33` } : undefined}
    >
      {spellKey}
    </span>
  );
  if (!src) return fallback;
  return <RemoteImg src={src} alt="" className={`rounded-md border border-gold-dark/70 ${className}`} fallback={fallback} />;
}

/** Passif et sorts d'un combattant, avec coût et temps de recharge. */
export function Kit({ def, compact = false }: { def: FighterDef; compact?: boolean }) {
  const resource = def.stats.resource === "mana" ? "mana" : def.stats.resource === "energy" ? "énergie" : null;
  return (
    <ul className="space-y-2">
      <li className="flex gap-3">
        <SpellIcon def={def} spellKey="P" className={compact ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"} />
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {def.passive.name} <span className="font-normal text-dim">· passif</span>
          </p>
          <p className="text-xs text-muted">{def.passive.description}</p>
        </div>
      </li>
      {def.spells.map((s) => (
        <li key={s.key} className="flex gap-3">
          <span className="relative shrink-0">
            <SpellIcon def={def} spellKey={s.key} className={compact ? "h-8 w-8" : "h-10 w-10"} />
            <KeyBadge k={s.key} className="absolute -bottom-1 -right-1" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {s.name}
              <span className="ml-2 font-normal text-dim">
                {s.cost > 0 && resource ? `${s.cost} ${resource} · ` : ""}
                {s.cooldown > 1 ? `recharge ${s.cooldown} tours` : "sans recharge"}
              </span>
            </p>
            <p className="text-xs text-muted">{s.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
