"use client";

import { useEffect, useState } from "react";
import { aiTurn } from "@/game/ai";
import {
  act,
  defOf,
  effectiveStats,
  estimateAction,
  findSpell,
  isStunned,
  opponent,
  spellBlock,
  totalShield,
  type Estimate,
} from "@/game/battle";
import { getItem } from "@/game/data/items";
import { canUsePotion, drinkPotion, type RunState } from "@/game/run";
import type {
  Action,
  BattleState,
  Combatant,
  LogEntry,
  Side,
  SpellKey,
} from "@/game/types";
import { ddragon } from "@/lib/ddragon";
import { KeyBadge, SpellDetail, SpellIcon, type KitSlot } from "./Kit";
import {
  ArchetypeChip,
  Bar,
  FighterCard,
  fmt,
  ItemIcon,
  RemoteImg,
  StatSheet,
  StatusList,
  type BarPreview,
} from "./ui";

/** Délai avant que l'adversaire joue, pour laisser lire l'action précédente. */
const ENEMY_DELAY_MS = 900;

interface Props {
  run: RunState;
  update: (fn: (run: RunState) => RunState) => void;
  onFinish: () => void;
}

/** Ce que le panneau de détail affiche : un sort du joueur ou de l'adversaire. */
interface Focus {
  side: Side;
  slot: KitSlot;
}

export function BattleScreen({ run, update, onFinish }: Props) {
  const battle = run.battle!;
  const enemyDef = defOf(battle.enemy);
  const enemyTurn = battle.turn === "enemy" && !battle.winner;
  const [focus, setFocus] = useState<Focus | null>(null);
  // Survol en cours (s'efface en quittant le bouton), pour la prévisualisation sur les barres de vie.
  const [hover, setHover] = useState<Focus | null>(null);
  const point = (side: Side) => (slot: KitSlot | null) => {
    if (slot) setFocus({ side, slot });
    setHover(slot ? { side, slot } : null);
  };
  const preview = previewFor(battle, hover);

  useEffect(() => {
    if (!enemyTurn) return;
    const timer = setTimeout(() => {
      update((r) =>
        r.battle && r.battle.turn === "enemy" && !r.battle.winner
          ? { ...r, battle: act(r.battle, aiTurn(r.battle)) }
          : r,
      );
    }, ENEMY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enemyTurn, battle.log.length, update]);

  const play = (action: Action) =>
    update((r) =>
      r.battle && r.battle.turn === "player" && !r.battle.winner
        ? { ...r, battle: act(r.battle, action) }
        : r,
    );

  return (
    <div className="animate-fade-in relative">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-25"
      >
        {enemyDef.art.kind === "champion" ? (
          <RemoteImg
            src={ddragon.splash(enemyDef.art.ddKey)}
            alt=""
            className="h-full w-full object-cover blur-[2px]"
            fallback={null}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: `radial-gradient(800px 500px at 50% 20%, ${enemyDef.art.color}, transparent 70%)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,10,19,0.4),rgba(1,10,19,0.95))]" />
      </div>

      <div className="grid grid-cols-2 items-start gap-3 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,16rem)] lg:gap-5">
        <FighterColumn
          c={battle.player}
          side="player"
          active={battle.turn === "player" && !battle.winner}
          onFocus={point("player")}
          preview={preview.player}
          lastAction={battle.lastAction}
          className="lg:col-start-1 lg:row-start-1"
        />
        <FighterColumn
          c={battle.enemy}
          side="enemy"
          active={enemyTurn}
          onFocus={point("enemy")}
          preview={preview.enemy}
          lastAction={battle.lastAction}
          className="lg:col-start-3 lg:row-start-1"
        />

        <div className="relative col-span-2 space-y-3 lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <CastBanner battle={battle} />
          <div className="flex items-center justify-between text-sm">
            <span className="chip">
              Étape {run.stage + 1} / {run.ladder.length}
            </span>
            <span className="text-muted">
              Round {battle.round} ·{" "}
              {battle.winner ? (
                "Combat terminé"
              ) : enemyTurn ? (
                <span className="text-blood">Tour de l&apos;adversaire…</span>
              ) : (
                <span className="text-leaf">À toi de jouer</span>
              )}
            </span>
          </div>
          <CombatLog log={battle.log} />
          <ActionBar
            battle={battle}
            run={run}
            onAction={play}
            onPotion={(id) => update((r) => drinkPotion(r, id))}
            onFocus={point("player")}
          />
          <DetailPanel battle={battle} focus={focus} />
        </div>
      </div>

      {battle.winner && <ResultOverlay battle={battle} onContinue={onFinish} />}
    </div>
  );
}

/** Effet attendu de l'action survolée : dégâts sur la cible, soin sur le lanceur. */
function previewFor(
  battle: BattleState,
  hover: Focus | null,
): Partial<Record<Side, BarPreview>> {
  if (!hover || hover.slot === "P" || battle.winner) return {};
  // Pendant le tour adverse, on n'affiche pas l'aperçu de ses propres sorts.
  if (hover.side === "player" && battle.turn !== "player") return {};
  const action: Action =
    hover.slot === "attack"
      ? { kind: "attack" }
      : { kind: "spell", key: hover.slot };
  const est = estimateAction(battle, hover.side, action);
  return {
    [opponent(hover.side)]: est.damage > 0 ? { damage: est.damage } : undefined,
    [hover.side]: est.heal > 0 ? { heal: est.heal } : undefined,
  };
}

/** Bandeau du sort qui vient d'être lancé, au centre de l'arène. */
function CastBanner({ battle }: { battle: BattleState }) {
  const last = battle.lastAction;
  if (!last || last.kind !== "spell" || !last.key) return null;
  const caster = battle[last.side];
  const spell = findSpell(caster, last.key);
  if (!spell) return null;
  return (
    <div
      key={last.seq}
      aria-hidden="true"
      className={`animate-cast pointer-events-none absolute left-1/2 top-40 z-20 flex items-center gap-3 rounded-xl border-2 bg-abyss/90 px-4 py-2.5 shadow-[0_10px_40px_-6px_rgba(0,0,0,0.9)] ${
        last.side === "player" ? "border-gold" : "border-blood"
      }`}
    >
      <SpellIcon
        def={defOf(caster)}
        spellKey={last.key}
        className="h-12 w-12"
      />
      <div className="whitespace-nowrap">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {caster.name}
        </p>
        <p className="title text-xl">{spell.name}</p>
      </div>
    </div>
  );
}

function DetailPanel({
  battle,
  focus,
}: {
  battle: BattleState;
  focus: Focus | null;
}) {
  return (
    <section
      className="panel min-h-40 p-4"
      aria-live="polite"
      aria-label="Détail du sort"
    >
      {focus ? (
        <>
          <p
            className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${focus.side === "enemy" ? "text-blood" : "text-gold"}`}
          >
            {focus.side === "enemy"
              ? `Adversaire : ${battle.enemy.name}`
              : battle.player.name}
          </p>
          <SpellDetail
            def={defOf(battle[focus.side])}
            slot={focus.slot}
            ctx={{ state: battle, side: focus.side }}
          />
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          Survole un sort (le tien ou celui de l&apos;adversaire) pour voir son
          effet détaillé et les dégâts qu&apos;il infligerait maintenant.
        </p>
      )}
    </section>
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

function FighterColumn({
  c,
  side,
  active,
  onFocus,
  preview,
  lastAction,
  className = "",
}: {
  c: Combatant;
  side: Side;
  active: boolean;
  onFocus: (slot: KitSlot | null) => void;
  preview?: BarPreview;
  lastAction?: BattleState["lastAction"];
  className?: string;
}) {
  const def = defOf(c);
  const stats = effectiveStats(c);
  const shield = totalShield(c);
  const hit = useHit(c.hp);
  const shieldGain = useHit(shield);
  const stunned = isStunned(c);
  const resourceLabel = def.stats.resource === "energy" ? "Énergie" : "Mana";
  const attacking =
    lastAction && lastAction.side === side && lastAction.kind !== "potion";
  const critTaken = lastAction?.crit && lastAction.side !== side;
  const lethal =
    preview?.damage !== undefined && preview.damage >= c.hp + shield;
  return (
    <section
      className={`min-w-0 space-y-2 ${className}`}
      aria-label={side === "enemy" ? "Adversaire" : "Ton champion"}
    >
      <div
        key={attacking ? `lunge-${lastAction.seq}` : "idle"}
        className={`mx-auto max-w-44 sm:max-w-52 lg:max-w-none ${attacking ? (side === "player" ? "animate-lunge-right" : "animate-lunge-left") : ""}`}
      >
        <div
          key={hit.key}
          className={`relative ${hit.key > 0 && hit.delta < 0 ? "animate-shake" : ""}`}
        >
          <FighterCard
            def={def}
            tone={side === "enemy" ? "blood" : "gold"}
            active={active}
            subtitle={
              <span className="inline-flex items-center gap-1.5">
                <ArchetypeChip def={def} /> niv. {c.level}
              </span>
            }
          >
            {hit.key > 0 && hit.delta < 0 && (
              <span
                aria-hidden="true"
                className="animate-impact pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(232,64,87,0.75),transparent_70%)]"
              />
            )}
            {hit.key > 0 && hit.delta > 0 && (
              <span
                aria-hidden="true"
                className="animate-heal pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(52,194,122,0.7),transparent_70%)]"
              />
            )}
            {shieldGain.key > 0 && shieldGain.delta > 0 && (
              <span
                key={`shield-${shieldGain.key}`}
                aria-hidden="true"
                className="animate-shield pointer-events-none absolute inset-0 rounded-xl border-4 border-gold-bright shadow-[inset_0_0_30px_rgba(240,230,210,0.6)]"
              />
            )}
            {stunned && (
              <span className="animate-wobble pointer-events-none absolute left-1/2 top-4 rounded-full border border-violet bg-abyss/90 px-2.5 py-0.5 text-xs font-bold text-violet">
                💫 Étourdissement
              </span>
            )}
            {hit.key > 0 && (
              <span
                aria-hidden="true"
                className={`animate-rise pointer-events-none absolute inset-x-0 top-1/3 text-center font-black drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)] ${
                  hit.delta < 0
                    ? critTaken
                      ? "text-4xl text-ember"
                      : "text-3xl text-blood"
                    : "text-3xl text-leaf"
                }`}
              >
                {critTaken && hit.delta < 0 && (
                  <span className="block text-xs uppercase tracking-widest">
                    Critique !
                  </span>
                )}
                {hit.delta > 0 ? "+" : ""}
                {fmt(hit.delta)}
              </span>
            )}
          </FighterCard>
        </div>
      </div>
      <div className="panel space-y-1.5 p-2.5">
        <Bar
          value={c.hp}
          max={stats.maxHp}
          shield={shield}
          color={
            side === "enemy"
              ? "linear-gradient(90deg,#a3243a,#e84057)"
              : "linear-gradient(90deg,#1f9d55,#34c27a)"
          }
          label="Points de vie"
          preview={preview}
        />
        <p className="text-xs tabular-nums text-muted">
          {fmt(c.hp)} / {fmt(stats.maxHp)} PV
          {shield > 0 && (
            <span className="text-gold-bright"> · bouclier {fmt(shield)}</span>
          )}
        </p>
        {preview?.damage !== undefined && (
          <p
            className={`text-xs font-bold tabular-nums ${lethal ? "text-ember" : "text-gold-bright"}`}
          >
            {lethal
              ? "☠ Coup fatal probable"
              : `Aperçu : −${fmt(preview.damage)} (${Math.round((preview.damage / stats.maxHp) * 100)} % des PV max)`}
          </p>
        )}
        {preview?.heal !== undefined && (
          <p className="text-xs font-bold tabular-nums text-leaf">
            Aperçu : +{fmt(Math.min(preview.heal, stats.maxHp - c.hp))} PV
          </p>
        )}
        {stats.maxResource > 0 && (
          <Bar
            value={c.resource}
            max={stats.maxResource}
            color={
              def.stats.resource === "energy"
                ? "linear-gradient(90deg,#b8a21a,#e6d43a)"
                : "linear-gradient(90deg,#1c5fa8,#3fa7e0)"
            }
            height="h-2"
            label={resourceLabel}
          />
        )}
        <StatusList c={c} />
        {side === "enemy" && <MiniKit c={c} onFocus={onFocus} />}
        <details className="group border-t border-line/70 pt-2">
          <summary className="cursor-pointer select-none text-xs font-bold text-gold">
            Statistiques détaillées
          </summary>
          <div className="mt-2">
            <StatSheet base={c.base} current={stats} compact />
            <p className="mt-1.5 text-[11px] text-dim">
              Entre parenthèses : effet des bonus et malus en cours.
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}

/** Icônes des sorts de l'adversaire, avec leur recharge ; le survol affiche le détail. */
function MiniKit({
  c,
  onFocus,
}: {
  c: Combatant;
  onFocus: (slot: KitSlot | null) => void;
}) {
  const def = defOf(c);
  const slots: KitSlot[] = ["P", ...def.spells.map((s) => s.key)];
  return (
    <ul
      className="flex flex-wrap gap-1.5 border-t border-line/70 pt-2"
      aria-label="Sorts de l'adversaire"
    >
      {slots.map((slot) => (
        <li key={slot}>
          <button
            type="button"
            className="relative block rounded-md focus-visible:outline-2 focus-visible:outline-teal"
            onMouseEnter={() => onFocus(slot)}
            onMouseLeave={() => onFocus(null)}
            onFocus={() => onFocus(slot)}
            onBlur={() => onFocus(null)}
            onClick={() => onFocus(slot)}
            aria-label={
              slot === "P"
                ? def.passive.name
                : findSpell(c, slot as SpellKey)?.name
            }
          >
            <SpellIcon
              def={def}
              spellKey={slot === "attack" ? "P" : slot}
              className="h-8 w-8"
            />
            {slot !== "P" && slot !== "attack" && c.cooldowns[slot] > 0 && (
              <span className="absolute inset-0 grid place-items-center rounded-md bg-black/70 text-sm font-black">
                {c.cooldowns[slot]}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
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
  // Les entrées les plus récentes sont en bas, comme un chat ; les plus anciennes s'estompent en haut.
  const recent = log.slice(-12);
  const offset = log.length - recent.length;
  return (
    <section
      className="panel h-36 overflow-hidden px-4 py-2 text-xs sm:h-52 sm:text-sm lg:h-64"
      aria-label="Journal de combat"
      aria-live="polite"
    >
      <ul className="flex h-full flex-col justify-end gap-0.5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%)]">
        {recent.map((entry, i) => {
          const age = recent.length - 1 - i;
          return (
            <li
              key={offset + i}
              className={`${TONE_CLASS[entry.tone ?? "info"]} ${age === 0 ? "animate-fade-in" : ""}`}
              style={{ opacity: 1 - age * 0.065 }}
            >
              <span
                aria-hidden="true"
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                  entry.side === "player"
                    ? "bg-leaf"
                    : entry.side === "enemy"
                      ? "bg-blood"
                      : "bg-gold"
                }`}
              />
              {entry.text}
            </li>
          );
        })}
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

const BLOCK_TEXT = {
  cooldown: "En recharge",
  resource: "Ressource insuffisante",
  condition: "Condition non remplie",
} as const;

function ActionBar({
  battle,
  run,
  onAction,
  onPotion,
  onFocus,
}: {
  battle: BattleState;
  run: RunState;
  onAction: (a: Action) => void;
  onPotion: (itemId: string) => void;
  onFocus: (slot: KitSlot | null) => void;
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
          onMouseEnter={() => onFocus("attack")}
          onFocus={() => onFocus("attack")}
          onMouseLeave={() => onFocus(null)}
          onBlur={() => onFocus(null)}
        >
          <span className="grid h-11 w-11 place-items-center rounded-md border border-gold-dark/70 bg-panel-2 sm:h-12 sm:w-12">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="text-gold"
            >
              <path
                d="M14.5 3H21v6.5L10 20.5l-1.5-1.5-2 2L4 18.5l2-2L4.5 15 14.5 3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="m9 15 7-7" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="text-[11px] font-bold leading-tight sm:text-xs">
            Attaque
          </span>
          <span className="text-[10px] leading-tight text-muted">
            ~{fmt(attackEst.damage)} dég.
          </span>
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
              onMouseEnter={() => onFocus(key)}
              onFocus={() => onFocus(key)}
              onMouseLeave={() => onFocus(null)}
              onBlur={() => onFocus(null)}
              title={block ? BLOCK_TEXT[block] : undefined}
            >
              <span className="relative">
                <SpellIcon
                  def={def}
                  spellKey={key}
                  className="h-11 w-11 sm:h-12 sm:w-12"
                />
                {cd > 0 && (
                  <span className="absolute inset-0 grid place-items-center rounded-md bg-black/70 text-lg font-black text-gold-bright">
                    {cd}
                  </span>
                )}
                <KeyBadge k={key} className="absolute -bottom-1 -right-1" />
              </span>
              <span className="line-clamp-1 text-[11px] font-bold leading-tight sm:text-xs">
                {spell.name}
              </span>
              <span className="line-clamp-2 text-[10px] leading-tight text-muted">
                {spell.cost > 0 && (
                  <span className="text-sky">{spell.cost} · </span>
                )}
                {estimateText(est)}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg border border-line/70 bg-black/20 px-2 py-1.5 text-left text-xs text-muted hover:border-gold/60"
        onMouseEnter={() => onFocus("P")}
        onFocus={() => onFocus("P")}
        onMouseLeave={() => onFocus(null)}
        onBlur={() => onFocus(null)}
        onClick={() => onFocus("P")}
      >
        <SpellIcon def={def} spellKey="P" className="h-6 w-6" />
        Passif :{" "}
        <span className="font-bold text-gold-bright">{def.passive.name}</span>
      </button>
      {potions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
          <span className="text-xs text-muted">
            Potions (ne terminent pas le tour) :
          </span>
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

function ResultOverlay({
  battle,
  onContinue,
}: {
  battle: BattleState;
  onContinue: () => void;
}) {
  const won = battle.winner === "player";
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      <div
        className={`panel animate-result w-full max-w-sm p-6 text-center ${won ? "border-gold" : "border-blood/70"}`}
      >
        <p
          id="result-title"
          className={`title text-4xl font-extrabold ${won ? "text-gold" : "text-blood"}`}
        >
          {won ? "Victoire" : "Défaite"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {won
            ? `Victoire contre ${battle.enemy.name} en ${battle.round} rounds.`
            : `${battle.enemy.name} met fin à ton ascension.`}
        </p>
        <button
          type="button"
          className="btn btn-primary mt-6 w-full py-3"
          onClick={onContinue}
          autoFocus
        >
          {won ? "Continuer" : "Voir le bilan"}
        </button>
      </div>
    </div>
  );
}
