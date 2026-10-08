"use client";

import { useState } from "react";
import { totalShield } from "@/game/battle";
import { ARCHETYPE_LABELS } from "@/game/data/fighters";
import type { ItemDef } from "@/game/data/items";
import type { Combatant, FighterDef, Stats, Status } from "@/game/types";
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

export function Portrait({ def, className = "w-16 h-16" }: { def: FighterDef; className?: string }) {
  const version = useDdragonVersion();
  if (def.art.kind === "monster") {
    return (
      <span
        className={`grid place-items-center rounded-lg text-3xl ${className}`}
        style={{ background: `radial-gradient(circle at 50% 35%, ${def.art.color}aa, ${def.art.color}22 70%), #0b1626` }}
        role="img"
        aria-label={def.name}
      >
        <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{def.art.emoji}</span>
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

export function Bar({
  value,
  max,
  shield = 0,
  color,
  height = "h-3.5",
  label,
}: {
  value: number;
  max: number;
  shield?: number;
  color: string;
  height?: string;
  label?: string;
}) {
  const total = Math.max(max, value + shield);
  const valuePct = (Math.max(0, value) / total) * 100;
  const shieldPct = (shield / total) * 100;
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
