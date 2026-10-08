"use client";

import { describeAttack, describePassive, describeSpell, type DetailContext, type DetailLine, type DetailTone } from "@/game/describe";
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

const TONE_DOT: Record<DetailTone, string> = {
  physical: "bg-ember",
  magic: "bg-sky",
  true: "bg-gold-bright",
  heal: "bg-leaf",
  shield: "bg-gold",
  control: "bg-violet",
  buff: "bg-leaf",
  debuff: "bg-blood",
  info: "bg-dim",
};

export function DetailLines({ lines, small = false }: { lines: DetailLine[]; small?: boolean }) {
  if (lines.length === 0) return null;
  return (
    <ul className={`space-y-1 ${small ? "text-[11px]" : "text-xs sm:text-sm"}`}>
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden="true" className={`mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[line.tone]}`} />
          <span className="text-gold-bright/90">
            {line.text}
            {line.value && <span className="ml-1.5 font-bold text-gold">→ {line.value}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type KitSlot = SpellKey | "P" | "attack";

function resourceName(def: FighterDef) {
  return def.stats.resource === "mana" ? "mana" : def.stats.resource === "energy" ? "énergie" : null;
}

/** Fiche détaillée d'un sort, du passif ou de l'attaque de base. */
export function SpellDetail({ def, slot, ctx }: { def: FighterDef; slot: KitSlot; ctx?: DetailContext }) {
  if (slot === "attack") {
    return (
      <div className="space-y-2">
        <p className="title text-lg">Attaque de base</p>
        <p className="text-sm text-muted">Une frappe simple, toujours disponible.</p>
        <DetailLines lines={describeAttack(def, ctx)} />
      </div>
    );
  }
  if (slot === "P") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <SpellIcon def={def} spellKey="P" className="h-12 w-12 shrink-0" />
          <div>
            <p className="title text-lg leading-tight">{def.passive.name}</p>
            <p className="text-xs text-dim">Passif</p>
          </div>
        </div>
        <p className="text-sm text-muted">{def.passive.description}</p>
        <DetailLines lines={describePassive(def.passive, def, ctx)} />
      </div>
    );
  }
  const spell = def.spells.find((s) => s.key === slot);
  if (!spell) return null;
  const resource = resourceName(def);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="relative shrink-0">
          <SpellIcon def={def} spellKey={slot} className="h-12 w-12" />
          <KeyBadge k={slot} className="absolute -bottom-1 -right-1" />
        </span>
        <div className="min-w-0">
          <p className="title text-lg leading-tight">{spell.name}</p>
          <p className="text-xs text-dim">
            {spell.cost > 0 && resource ? `${spell.cost} ${resource} · ` : "Sans coût · "}
            {spell.cooldown > 1 ? `recharge ${spell.cooldown} tours` : "sans recharge"}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted">{spell.description}</p>
      <DetailLines lines={describeSpell(spell, def, ctx)} />
    </div>
  );
}

/** Passif et sorts d'un combattant, avec le détail chiffré de chaque effet. */
export function Kit({ def, compact = false }: { def: FighterDef; compact?: boolean }) {
  const resource = resourceName(def);
  const icon = compact ? "h-8 w-8" : "h-10 w-10";
  return (
    <ul className="space-y-3">
      <li className="flex gap-3">
        <SpellIcon def={def} spellKey="P" className={`${icon} shrink-0`} />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-bold">
            {def.passive.name} <span className="font-normal text-dim">· passif</span>
          </p>
          <p className="text-xs text-muted">{def.passive.description}</p>
          {/* Les autres passifs sont déjà entièrement décrits par leur texte. */}
          {(def.passive.kind === "bleedOnHit" || def.passive.kind === "everyNthAttack") && (
            <DetailLines lines={describePassive(def.passive, def)} small />
          )}
        </div>
      </li>
      {def.spells.map((s) => (
        <li key={s.key} className="flex gap-3">
          <span className="relative shrink-0 self-start">
            <SpellIcon def={def} spellKey={s.key} className={icon} />
            <KeyBadge k={s.key} className="absolute -bottom-1 -right-1" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-bold">
              {s.name}
              <span className="ml-2 font-normal text-dim">
                {s.cost > 0 && resource ? `${s.cost} ${resource} · ` : ""}
                {s.cooldown > 1 ? `recharge ${s.cooldown} tours` : "sans recharge"}
              </span>
            </p>
            <p className="text-xs text-muted">{s.description}</p>
            <DetailLines lines={describeSpell(s, def)} small />
          </div>
        </li>
      ))}
    </ul>
  );
}
