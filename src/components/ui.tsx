"use client";

import { useState } from "react";
import { totalShield } from "@/game/battle";
import { ARCHETYPE_LABELS } from "@/game/data/fighters";
import type { ItemDef } from "@/game/data/items";
import type { Combatant, FighterDef, Stats, Status } from "@/game/types";
import { useMonsterIconCandidates } from "@/lib/cdragon";
import { ddragon, useDdragonVersion } from "@/lib/ddragon";

export const fmt = (n: number) => Math.round(n).toLocaleString("fr-FR");
export const pct = (n: number) => `${Math.round(n * 100)} %`;

/** Image distante avec repli si elle ne charge pas (CDN bloqué, objet retiré…). */
export function RemoteImg({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images Data Dragon non optimisables
    <img src={src} alt={alt} className={`bg-panel-2 ${className ?? ""}`} draggable={false} onError={() => setFailed(src)} />
  );
}

function Initials({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`grid place-items-center bg-panel-2 font-display font-bold text-gold ${className ?? ""}`}>
      {text.slice(0, 2)}
    </span>
  );
}

/** Icône d'un monstre (CommunityDragon), en essayant chaque URL candidate ; emoji en dernier recours. */
function MonsterArt({ folder, emoji, className, emojiClassName = "text-3xl" }: { folder: string; emoji: string; className?: string; emojiClassName?: string }) {
  const candidates = useMonsterIconCandidates(folder);
  const [failed, setFailed] = useState<string[]>([]);
  const src = candidates.find((url) => !failed.includes(url));
  if (!src) {
    return <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] ${emojiClassName}`}>{emoji}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images CommunityDragon non optimisables
    <img src={src} alt="" className={className} draggable={false} onError={() => setFailed((f) => [...f, src])} />
  );
}

export function Portrait({ def, className = "w-16 h-16" }: { def: FighterDef; className?: string }) {
  const version = useDdragonVersion();
  if (def.art.kind === "monster") {
    return (
      <span
        className={`grid place-items-center overflow-hidden rounded-lg ${className}`}
        style={{ background: `radial-gradient(circle at 50% 35%, ${def.art.color}aa, ${def.art.color}22 70%), #0b1626` }}
        role="img"
        aria-label={def.name}
      >
        <MonsterArt folder={def.art.cdragon} emoji={def.art.emoji} className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <RemoteImg
      src={ddragon.championSquare(version, def.art.ddKey)}
      alt={def.name}
      className={`rounded-lg object-cover ${className}`}
      fallback={<Initials text={def.name} className={`rounded-lg ${className}`} />}
    />
  );
}

/**
 * Carte portrait au format de l'écran de chargement de LoL (308×560).
 * `skin` prépare le choix de skin : 0 = skin de base.
 */
export function FighterCard({
  def,
  skin = 0,
  subtitle,
  tone = "gold",
  active = false,
  className = "",
  children,
}: {
  def: FighterDef;
  skin?: number;
  subtitle?: React.ReactNode;
  tone?: "gold" | "blood";
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const border = tone === "blood" ? "border-blood/70" : "border-gold/80";
  return (
    <div
      className={`relative aspect-[308/560] overflow-hidden rounded-xl border-2 bg-panel-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] ${border} ${
        active ? "animate-glow" : ""
      } ${className}`}
    >
      {def.art.kind === "champion" ? (
        <RemoteImg
          src={ddragon.loading(def.art.ddKey, skin)}
          alt={def.name}
          className="absolute inset-0 h-full w-full object-cover"
          fallback={
            <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,#1d3550,#091428)] font-display text-5xl font-bold text-gold/70">
              {def.name.slice(0, 2)}
            </span>
          }
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ background: `radial-gradient(circle at 50% 38%, ${def.art.color}cc, ${def.art.color}22 62%), linear-gradient(180deg,#0b1626,#050c16)` }}
          role="img"
          aria-label={def.name}
        >
          <MonsterArt
            folder={def.art.cdragon}
            emoji={def.art.emoji}
            className="w-3/4 -translate-y-6 rounded-full border-2 border-gold/50 shadow-[0_0_40px_-6px_rgba(0,0,0,0.9)]"
            emojiClassName="-translate-y-6 text-7xl"
          />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-1.5 rounded-lg border border-gold-bright/20" />
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(1,10,19,0.85)_35%,rgba(1,10,19,0.98))] px-3 pb-3 pt-10 text-center">
        <p className="title truncate text-base font-bold leading-tight sm:text-lg">{def.name}</p>
        {subtitle && <div className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function ItemIcon({ item, className = "w-10 h-10" }: { item: ItemDef; className?: string }) {
  const version = useDdragonVersion();
  return (
    <RemoteImg
      src={ddragon.item(version, item.ddId)}
      alt={item.name}
      className={`rounded-md border border-gold-dark/70 ${className}`}
      fallback={<Initials text={item.name} className={`rounded-md border border-gold-dark/70 text-xs ${className}`} />}
    />
  );
}

export function ArchetypeChip({ def }: { def: FighterDef }) {
  return <span className="chip">{ARCHETYPE_LABELS[def.archetype]}</span>;
}

/** Prévisualisation sur une barre de vie : dégâts à venir (bouclier d'abord) ou soin. */
export interface BarPreview {
  damage?: number;
  heal?: number;
}

export function Bar({
  value,
  max,
  shield = 0,
  color,
  height = "h-3.5",
  label,
  preview,
}: {
  value: number;
  max: number;
  shield?: number;
  color: string;
  height?: string;
  label?: string;
  preview?: BarPreview;
}) {
  const total = Math.max(max, value + shield);
  const hp = Math.max(0, value);
  const valuePct = (hp / total) * 100;
  const shieldPct = (shield / total) * 100;
  const damage = preview?.damage ?? 0;
  const shieldLoss = Math.min(shield, damage);
  const hpLoss = Math.min(hp, damage - shieldLoss);
  const heal = Math.min(preview?.heal ?? 0, max - hp);
  return (
    <div
      className={`relative ${height} overflow-hidden rounded-full border border-black/60 bg-black/50`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <div className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out" style={{ width: `${valuePct}%`, background: color }} />
      {shield > 0 && (
        <div
          className="absolute inset-y-0 bg-gold-bright/80 transition-[width,left] duration-500"
          style={{ left: `${valuePct}%`, width: `${shieldPct}%` }}
        />
      )}
      {hpLoss > 0 && (
        <div
          className="animate-preview absolute inset-y-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.85)_0_4px,rgba(255,255,255,0.35)_4px_8px)]"
          style={{ left: `${((hp - hpLoss) / total) * 100}%`, width: `${(hpLoss / total) * 100}%` }}
        />
      )}
      {shieldLoss > 0 && (
        <div
          className="animate-preview absolute inset-y-0 bg-[repeating-linear-gradient(135deg,rgba(0,0,0,0.55)_0_4px,transparent_4px_8px)]"
          style={{ left: `${valuePct + ((shield - shieldLoss) / total) * 100}%`, width: `${(shieldLoss / total) * 100}%` }}
        />
      )}
      {heal > 0 && (
        <div
          className="animate-preview absolute inset-y-0 bg-leaf/70"
          style={{ left: `${valuePct}%`, width: `${(heal / total) * 100}%` }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_55%)]" />
    </div>
  );
}

const STATUS_STYLE: Record<Status["kind"], string> = {
  buff: "border-leaf/50 text-leaf",
  debuff: "border-blood/50 text-blood",
  dot: "border-ember/50 text-ember",
  stun: "border-violet/60 text-violet",
  shield: "border-gold-bright/50 text-gold-bright",
  dodge: "border-sky/50 text-sky",
};

export function StatusList({ c }: { c: Combatant }) {
  const visible = c.statuses.filter((s) => s.kind !== "shield");
  const shield = totalShield(c);
  if (visible.length === 0 && shield === 0) return <div className="h-5" />;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Effets actifs">
      {shield > 0 && <li className={`chip ${STATUS_STYLE.shield}`}>Bouclier {fmt(shield)}</li>}
      {visible.map((s, i) => (
        <li key={`${s.id}-${i}`} className={`chip ${STATUS_STYLE[s.kind]}`} title={`${s.turns} tour(s) restant(s)`}>
          {s.kind === "dot" ? `${s.label} (${fmt(s.perTurn ?? 0)}/tour)` : s.label}
          <span className="opacity-70">· {s.turns}</span>
        </li>
      ))}
    </ul>
  );
}

const STAT_ROWS: { key: keyof Stats; label: string; format?: (n: number) => string; hideZero?: boolean }[] = [
  { key: "maxHp", label: "PV" },
  { key: "ad", label: "AD" },
  { key: "ap", label: "Puissance", hideZero: true },
  { key: "armor", label: "Armure" },
  { key: "mr", label: "RM" },
  { key: "crit", label: "Critique", format: pct, hideZero: true },
  { key: "attackSpeed", label: "Double frappe", format: pct, hideZero: true },
  { key: "lifesteal", label: "Vol de vie", format: pct, hideZero: true },
  { key: "thorns", label: "Épines", format: pct, hideZero: true },
  { key: "hpRegenPct", label: "Régén. PV/tour", format: (n) => `${(n * 100).toFixed(1)} %`, hideZero: true },
];

export function StatGrid({ stats }: { stats: Stats }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
      {STAT_ROWS.filter((r) => !(r.hideZero && stats[r.key] === 0)).map((r) => (
        <div key={r.key} className="flex justify-between gap-2 border-b border-line/60 py-0.5">
          <dt className="text-muted">{r.label}</dt>
          <dd className="font-semibold tabular-nums">{(r.format ?? fmt)(stats[r.key])}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Gold({ amount, className = "" }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular-nums text-[#f5c542] ${className}`}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="#f5c542" stroke="#8a6414" strokeWidth="1.2" />
        <circle cx="8" cy="8" r="3.5" fill="none" stroke="#8a6414" strokeWidth="1" />
      </svg>
      {fmt(amount)}
      <span className="sr-only">pièces d&apos;or</span>
    </span>
  );
}

const SHEET_ROWS: { key: keyof Stats; label: string; format: (n: number) => string; hint?: string }[] = [
  { key: "maxHp", label: "PV max", format: fmt },
  { key: "ad", label: "Dégâts d'attaque (AD)", format: fmt },
  { key: "ap", label: "Puissance", format: fmt },
  { key: "armor", label: "Armure", format: fmt },
  { key: "mr", label: "Résistance magique", format: fmt },
  { key: "crit", label: "Coup critique", format: pct, hint: "Chance qu'une attaque inflige ×1,75" },
  { key: "attackSpeed", label: "Double frappe", format: pct, hint: "Chance qu'une attaque frappe deux fois" },
  { key: "lifesteal", label: "Vol de vie", format: pct, hint: "Part des dégâts d'attaque rendue en PV" },
  { key: "onHitCurrentHp", label: "Dégâts sur PV actuels", format: pct, hint: "Bonus des attaques, en % des PV actuels de la cible" },
  { key: "thorns", label: "Renvoi de dégâts", format: pct, hint: "Part des dégâts d'attaque subis renvoyée" },
  { key: "hpRegenPct", label: "Régénération de PV", format: (n) => `${(n * 100).toFixed(1).replace(".", ",")} %/tour` },
  { key: "maxResource", label: "Ressource max", format: fmt },
  { key: "resourceRegen", label: "Régénération de ressource", format: (n) => `${fmt(n)}/tour` },
];

const reduction = (resist: number) => (resist >= 0 ? 1 - 100 / (100 + resist) : -(1 - 100 / (100 - resist)));

/**
 * Fiche de stats complète. `current` inclut les bonus et malus en cours ;
 * l'écart avec `base` est affiché en vert ou en rouge.
 */
export function StatSheet({ base, current = base, compact = false }: { base: Stats; current?: Stats; compact?: boolean }) {
  const rows = SHEET_ROWS.filter((r) => !(r.key === "maxResource" || r.key === "resourceRegen") || base.maxResource > 0);
  const delta = (key: keyof Stats) => current[key] - base[key];
  return (
    <dl className={`grid gap-x-4 ${compact ? "grid-cols-1 text-xs" : "grid-cols-1 text-sm sm:grid-cols-2"}`}>
      {rows.map((r) => {
        const d = delta(r.key);
        const changed = Math.abs(d) > 1e-6;
        return (
          <div key={r.key} className="flex items-baseline justify-between gap-2 border-b border-line/50 py-0.5" title={r.hint}>
            <dt className={current[r.key] === 0 && !changed ? "text-dim" : "text-muted"}>{r.label}</dt>
            <dd className="font-semibold tabular-nums">
              {r.format(current[r.key])}
              {changed && (
                <span className={`ml-1 text-[11px] ${d > 0 ? "text-leaf" : "text-blood"}`}>
                  ({d > 0 ? "+" : "−"}
                  {r.format(Math.abs(d))})
                </span>
              )}
            </dd>
          </div>
        );
      })}
      <div className="flex items-baseline justify-between gap-2 border-b border-line/50 py-0.5" title="Part des dégâts physiques bloqués par l'armure">
        <dt className="text-muted">Réduction physique</dt>
        <dd className="font-semibold tabular-nums">{pct(reduction(current.armor))}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-2 border-b border-line/50 py-0.5" title="Part des dégâts magiques bloqués par la résistance magique">
        <dt className="text-muted">Réduction magique</dt>
        <dd className="font-semibold tabular-nums">{pct(reduction(current.mr))}</dd>
      </div>
    </dl>
  );
}
