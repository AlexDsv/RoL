"use client";

import { useEffect, useState } from "react";
import { aiTurn } from "@/game/ai";
import { act, defOf, effectiveStats, estimateAction, findSpell, spellBlock, totalShield, type Estimate } from "@/game/battle";
import { getItem } from "@/game/data/items";
import { canUsePotion, drinkPotion, type RunState } from "@/game/run";
import type { Action, BattleState, Combatant, LogEntry, Side, SpellKey } from "@/game/types";
import { ddragon } from "@/lib/ddragon";
import { KeyBadge, SpellIcon } from "./Kit";
import { ArchetypeChip, Bar, fmt, ItemIcon, Portrait, RemoteImg, StatusList } from "./ui";

/** Délai avant que l'adversaire joue, pour laisser lire l'action précédente. */
const ENEMY_DELAY_MS = 900;

interface Props {
  run: RunState;
  update: (fn: (run: RunState) => RunState) => void;
  onFinish: () => void;
}

export function BattleScreen({ run, update, onFinish }: Props) {
  const battle = run.battle!;
  const enemyDef = defOf(battle.enemy);
  const enemyTurn = battle.turn === "enemy" && !battle.winner;

  useEffect(() => {
    if (!enemyTurn) return;
    const timer = setTimeout(() => {
      update((r) => (r.battle && r.battle.turn === "enemy" && !r.battle.winner ? { ...r, battle: act(r.battle, aiTurn(r.battle)) } : r));
    }, ENEMY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enemyTurn, battle.log.length, update]);

  const play = (action: Action) =>
    update((r) => (r.battle && r.battle.turn === "player" && !r.battle.winner ? { ...r, battle: act(r.battle, action) } : r));

  return (
    <div className="animate-fade-in relative space-y-3">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 opacity-25">
        {enemyDef.art.kind === "champion" ? (
          <RemoteImg src={ddragon.splash(enemyDef.art.ddKey)} alt="" className="h-full w-full object-cover blur-[2px]" fallback={null} />
        ) : (
          <div className="h-full w-full" style={{ background: `radial-gradient(800px 500px at 50% 20%, ${enemyDef.art.color}, transparent 70%)` }} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,10,19,0.4),rgba(1,10,19,0.95))]" />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="chip">
          Étape {run.stage + 1} / {run.ladder.length}
        </span>
        <span className="text-muted">
          Round {battle.round} ·{" "}
          {battle.winner ? "Combat terminé" : enemyTurn ? <span className="text-blood">Tour de l&apos;adversaire…</span> : <span className="text-leaf">À toi de jouer</span>}
        </span>
      </div>

      <FighterPanel c={battle.enemy} side="enemy" active={enemyTurn} />

      <CombatLog log={battle.log} />

      <FighterPanel c={battle.player} side="player" active={battle.turn === "player" && !battle.winner} />

      <ActionBar battle={battle} run={run} onAction={play} onPotion={(id) => update((r) => drinkPotion(r, id))} />

      {battle.winner && <ResultOverlay battle={battle} onContinue={onFinish} />}
    </div>
  );
}

function useHit(hp: number) {
  // Ajustement d'état pendant le rendu (motif React recommandé) pour animer chaque variation de PV.
  const [prev, setPrev] = useState(hp);
  const [hit, setHit] = useState({ key: 0, delta: 0 });
  if (hp !== prev) {
    setPrev(hp);
    setHit((h) => ({ key: h.key + 1, delta: hp - prev }));
  }
  return hit;
}

function FighterPanel({ c, side, active }: { c: Combatant; side: Side; active: boolean }) {
  const def = defOf(c);
  const stats = effectiveStats(c);
  const shield = totalShield(c);
  const hit = useHit(c.hp);
  const resourceLabel = def.stats.resource === "energy" ? "Énergie" : "Mana";
  return (
    <section
      className={`panel flex items-center gap-3 p-3 sm:gap-4 sm:p-4 ${active ? "border-gold/70" : ""} ${side === "enemy" ? "border-blood/40" : ""}`}
      aria-label={side === "enemy" ? "Adversaire" : "Ton champion"}
    >
      <div className="relative shrink-0">
        <div key={hit.key} className={hit.key > 0 && hit.delta < 0 ? "animate-shake" : ""}>
          <Portrait def={def} className={`h-16 w-16 sm:h-24 sm:w-24 border ${side === "enemy" ? "border-blood/70" : "border-gold"}`} />
        </div>
        {hit.key > 0 && (
          <span
            key={`n${hit.key}`}
            aria-hidden="true"
            className={`animate-rise pointer-events-none absolute inset-x-0 top-1/3 text-center text-xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] ${
              hit.delta < 0 ? "text-blood" : "text-leaf"
            }`}
          >
            {hit.delta > 0 ? "+" : ""}
            {fmt(hit.delta)}
          </span>
        )}
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border border-gold-dark bg-abyss px-1.5 text-[10px] font-black text-gold">
          {c.level}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <h2 className="title truncate text-lg sm:text-xl">{c.name}</h2>
          <ArchetypeChip def={def} />
        </div>
        <Bar
          value={c.hp}
          max={stats.maxHp}
          shield={shield}
          color={side === "enemy" ? "linear-gradient(90deg,#a3243a,#e84057)" : "linear-gradient(90deg,#1f9d55,#34c27a)"}
          label="Points de vie"
        />
        <p className="text-xs tabular-nums text-muted">
          {fmt(c.hp)} / {fmt(stats.maxHp)} PV{shield > 0 && <span className="text-gold-bright"> · bouclier {fmt(shield)}</span>}
        </p>
        {stats.maxResource > 0 && (
          <Bar
            value={c.resource}
            max={stats.maxResource}
            color={def.stats.resource === "energy" ? "linear-gradient(90deg,#b8a21a,#e6d43a)" : "linear-gradient(90deg,#1c5fa8,#3fa7e0)"}
            height="h-2"
            label={resourceLabel}
          />
        )}
        <StatusList c={c} />
      </div>
    </section>
  );
}

const TONE_CLASS: Record<NonNullable<LogEntry["tone"]>, string> = {
  damage: "text-gold-bright",
  crit: "text-ember font-bold",
  heal: "text-leaf",
  shield: "text-gold",
  control: "text-violet",
  info: "text-muted",
};

function CombatLog({ log }: { log: LogEntry[] }) {
  const recent = log.slice(-8).reverse();
  return (
    <section className="panel max-h-44 overflow-hidden px-4 py-2 text-xs sm:text-sm" aria-label="Journal de combat" aria-live="polite">
      <ul className="space-y-0.5">
        {recent.map((entry, i) => (
          <li
            key={log.length - i}
            className={`${TONE_CLASS[entry.tone ?? "info"]} ${i === 0 ? "animate-fade-in" : ""}`}
            style={{ opacity: 1 - i * 0.09 }}
          >
            <span
              aria-hidden="true"
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                entry.side === "player" ? "bg-leaf" : entry.side === "enemy" ? "bg-blood" : "bg-gold"
              }`}
            />
            {entry.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

function estimateText(e: Estimate): string {
  const parts: string[] = [];
  if (e.damage > 0) parts.push(`~${fmt(e.damage)} dég.`);
  if (e.dot > 0) parts.push(`~${fmt(e.dot)} sur la durée`);
  if (e.heal > 0) parts.push(`+${fmt(e.heal)} PV`);
  if (e.shield > 0) parts.push(`bouclier ${fmt(e.shield)}`);
  if (e.stun > 0) parts.push("étourdit");
  if (e.dodge > 0) parts.push("esquive");
  if (parts.length === 0 && e.buff > 0) parts.push("renforcement");
  if (parts.length === 0 && e.debuff > 0) parts.push("affaiblit");
  return parts.join(" · ");
}

const BLOCK_TEXT = { cooldown: "En recharge", resource: "Ressource insuffisante", condition: "Condition non remplie" } as const;

function ActionBar({
  battle,
  run,
  onAction,
  onPotion,
}: {
  battle: BattleState;
  run: RunState;
  onAction: (a: Action) => void;
  onPotion: (itemId: string) => void;
}) {
  const me = battle.player;
  const def = defOf(me);
  const canAct = battle.turn === "player" && !battle.winner;
  const attackEst = estimateAction(battle, "player", { kind: "attack" });
  const potions = Object.entries(run.potions).filter(([, n]) => n > 0);

  return (
    <section className="panel space-y-3 p-3" aria-label="Actions">
      <div className="grid grid-cols-5 gap-2">
        <button
          type="button"
          className="group flex flex-col items-center gap-1 rounded-lg border border-line bg-black/25 p-2 text-center transition-colors enabled:hover:border-gold disabled:opacity-40"
          disabled={!canAct}
          onClick={() => onAction({ kind: "attack" })}
          title="Attaque de base : peut frapper deux fois et infliger un coup critique."
        >
          <span className="grid h-11 w-11 place-items-center rounded-md border border-gold-dark/70 bg-panel-2 sm:h-12 sm:w-12">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" className="text-gold">
              <path d="M14.5 3H21v6.5L10 20.5l-1.5-1.5-2 2L4 18.5l2-2L4.5 15 14.5 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="m9 15 7-7" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="text-[11px] font-bold leading-tight sm:text-xs">Attaque</span>
          <span className="text-[10px] leading-tight text-muted">~{fmt(attackEst.damage)} dég.</span>
        </button>
        {(["Q", "W", "E", "R"] as SpellKey[]).map((key) => {
          const spell = findSpell(me, key)!;
          const block = canAct ? spellBlock(battle, "player", key) : null;
          const est = estimateAction(battle, "player", { kind: "spell", key });
          const cd = me.cooldowns[key];
          return (
            <button
              key={key}
              type="button"
              className="group relative flex flex-col items-center gap-1 rounded-lg border border-line bg-black/25 p-2 text-center transition-colors enabled:hover:border-gold disabled:opacity-40"
              disabled={!canAct || block !== null}
              onClick={() => onAction({ kind: "spell", key })}
              title={`${spell.name} (${key}) : ${spell.description}${block ? ` — ${BLOCK_TEXT[block]}` : ""}`}
            >
              <span className="relative">
                <SpellIcon def={def} spellKey={key} className="h-11 w-11 sm:h-12 sm:w-12" />
                {cd > 0 && (
                  <span className="absolute inset-0 grid place-items-center rounded-md bg-black/70 text-lg font-black text-gold-bright">
                    {cd}
                  </span>
                )}
                <KeyBadge k={key} className="absolute -bottom-1 -right-1" />
              </span>
              <span className="line-clamp-1 text-[11px] font-bold leading-tight sm:text-xs">{spell.name}</span>
              <span className="line-clamp-2 text-[10px] leading-tight text-muted">
                {spell.cost > 0 && <span className="text-sky">{spell.cost} · </span>}
                {estimateText(est)}
              </span>
            </button>
          );
        })}
      </div>
      {potions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
          <span className="text-xs text-muted">Potions (ne terminent pas le tour) :</span>
          {potions.map(([id, n]) => {
            const item = getItem(id);
            return (
              <button
                key={id}
                type="button"
                className="btn btn-ghost !gap-1.5 !px-2 !py-1 text-xs"
                disabled={!canUsePotion(run, id)}
                onClick={() => onPotion(id)}
                title={item.description}
              >
                <ItemIcon item={item} className="h-6 w-6" />
                {item.name} ×{n}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ResultOverlay({ battle, onContinue }: { battle: BattleState; onContinue: () => void }) {
  const won = battle.winner === "player";
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className={`panel animate-fade-in w-full max-w-sm p-6 text-center ${won ? "border-gold" : "border-blood/70"}`}>
        <p id="result-title" className={`title text-4xl font-extrabold ${won ? "text-gold" : "text-blood"}`}>
          {won ? "Victoire" : "Défaite"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {won ? `Victoire contre ${battle.enemy.name} en ${battle.round} rounds.` : `${battle.enemy.name} met fin à ton ascension.`}
        </p>
        <button type="button" className="btn btn-primary mt-6 w-full py-3" onClick={onContinue} autoFocus>
          {won ? "Continuer" : "Voir le bilan"}
        </button>
      </div>
    </div>
  );
}
