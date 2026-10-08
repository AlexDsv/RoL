import { getFighter } from "./data/fighters";
import { getItem } from "./data/items";
import { nextRandom } from "./rng";
import { addStats, statsAtLevel } from "./stats";
import type {
  Action,
  BattleState,
  Combatant,
  DamageType,
  Effect,
  FighterDef,
  LogEntry,
  Scaling,
  Side,
  SpellDef,
  SpellKey,
  Stats,
  Status,
} from "./types";

export const CRIT_MULTIPLIER = 1.75;
/** Une attaque de base occupe un tour entier : elle frappe plus fort que dans LoL. */
export const ATTACK_POWER = 1.5;
/** Multiplicateur global des dégâts : règle la durée moyenne des combats. */
export const DAMAGE_SCALE = 1.3;
/** À partir de ce round, la « mort subite » inflige des dégâts croissants aux deux camps. */
export const SUDDEN_DEATH_ROUND = 25;

const SPELL_KEYS: SpellKey[] = ["Q", "W", "E", "R"];

// ---------------------------------------------------------------------------
// Création

export function createCombatant(
  def: FighterDef,
  level: number,
  bonuses: Partial<Stats>[] = [],
  hpRatio = 1,
): Combatant {
  const base = addStats(statsAtLevel(def, level), ...bonuses);
  if (def.hpScale) base.maxHp = Math.round(base.maxHp * def.hpScale);
  return {
    defId: def.id,
    name: def.name,
    level,
    base,
    hp: Math.max(1, Math.round(base.maxHp * hpRatio)),
    resource: base.maxResource,
    cooldowns: { Q: 0, W: 0, E: 0, R: 0 },
    statuses: [],
    attackCount: 0,
    spellCount: 0,
    phasesTriggered: 0,
  };
}

export function createBattle(player: Combatant, enemy: Combatant, seed: number): BattleState {
  const state: BattleState = {
    player: cloneCombatant(player),
    enemy: cloneCombatant(enemy),
    turn: "player",
    round: 1,
    rng: seed,
    log: [{ side: "system", text: `${enemy.name} (niv. ${enemy.level}) entre dans l'arène !`, tone: "info" }],
    winner: null,
  };
  for (const side of ["player", "enemy"] as const) applyStartShield(state, side);
  return state;
}

/** Copie rapide d'un combattant (les simulations en font des millions). */
export function cloneCombatant(c: Combatant): Combatant {
  return { ...c, base: { ...c.base }, cooldowns: { ...c.cooldowns }, statuses: c.statuses.map((st) => ({ ...st })) };
}

/** Copie rapide de l'état ; les entrées du journal ne sont jamais modifiées, on les partage. */
export function cloneBattle(s: BattleState): BattleState {
  return { ...s, player: cloneCombatant(s.player), enemy: cloneCombatant(s.enemy), log: [...s.log] };
}

// ---------------------------------------------------------------------------
// Lecture de l'état

export function defOf(c: Combatant): FighterDef {
  return getFighter(c.defId);
}

export function opponent(side: Side): Side {
  return side === "player" ? "enemy" : "player";
}

export function effectiveStats(c: Combatant): Stats {
  const s = { ...c.base };
  for (const status of c.statuses) {
    if ((status.kind === "buff" || status.kind === "debuff") && status.stat) {
      s[status.stat] += status.amount ?? 0;
    }
  }
  const passive = defOf(c).passive;
  if (passive.kind === "lowHpBonus" && c.hp / s.maxHp < passive.below) {
    s[passive.stat] += passive.amount;
  }
  s.crit = Math.min(Math.max(s.crit, 0), 1);
  s.attackSpeed = Math.min(Math.max(s.attackSpeed, 0), 1);
  return s;
}

export function totalShield(c: Combatant): number {
  return c.statuses.reduce((sum, st) => sum + (st.kind === "shield" ? (st.amount ?? 0) : 0), 0);
}

export function isStunned(c: Combatant): boolean {
  return c.statuses.some((st) => st.kind === "stun");
}

export function scaleValue(sc: Scaling, caster: Combatant, target: Combatant): number {
  const cs = effectiveStats(caster);
  const ts = effectiveStats(target);
  const power = defOf(caster).power ?? 1;
  return power * (
    sc.base +
    (sc.perLevel ?? 0) * (caster.level - 1) +
    (sc.ad ?? 0) * cs.ad +
    (sc.ap ?? 0) * cs.ap +
    (sc.maxHp ?? 0) * cs.maxHp +
    (sc.armor ?? 0) * cs.armor +
    (sc.targetMaxHp ?? 0) * ts.maxHp +
    (sc.targetMissingHp ?? 0) * Math.max(0, ts.maxHp - target.hp)
  );
}

export function mitigate(raw: number, type: DamageType, target: Stats): number {
  raw *= DAMAGE_SCALE;
  if (type === "true") return Math.round(raw);
  const resist = type === "physical" ? target.armor : target.mr;
  const mult = resist >= 0 ? 100 / (100 + resist) : 2 - 100 / (100 - resist);
  return Math.max(0, Math.round(raw * mult));
}

export type SpellBlock = "cooldown" | "resource" | "condition" | null;

export function spellBlock(state: BattleState, side: Side, key: SpellKey): SpellBlock {
  const caster = state[side];
  const target = state[opponent(side)];
  const spell = findSpell(caster, key);
  if (!spell) return "condition";
  if (caster.cooldowns[key] > 0) return "cooldown";
  if (caster.resource < spell.cost) return "resource";
  if (spell.requiresTargetBelow !== undefined) {
    const ratio = target.hp / effectiveStats(target).maxHp;
    if (ratio > spell.requiresTargetBelow) return "condition";
  }
  return null;
}

export function findSpell(c: Combatant, key: SpellKey): SpellDef | undefined {
  return defOf(c).spells.find((s) => s.key === key);
}

export function availableActions(state: BattleState, side: Side): Action[] {
  const actions: Action[] = [{ kind: "attack" }];
  for (const key of SPELL_KEYS) {
    if (spellBlock(state, side, key) === null) actions.push({ kind: "spell", key });
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Estimations (sans hasard) pour l'IA et les infobulles

export interface Estimate {
  damage: number;
  heal: number;
  shield: number;
  stun: number;
  dot: number;
  buff: number;
  debuff: number;
  dodge: number;
}

export function estimateAction(state: BattleState, side: Side, action: Action): Estimate {
  const est = estimateRaw(state, side, action);
  const factor = damageFactor(state, side);
  return { ...est, damage: est.damage * factor, dot: est.dot * factor };
}

function estimateRaw(state: BattleState, side: Side, action: Action): Estimate {
  const est: Estimate = { damage: 0, heal: 0, shield: 0, stun: 0, dot: 0, buff: 0, debuff: 0, dodge: 0 };
  const a = state[side];
  const d = state[opponent(side)];
  const as = effectiveStats(a);
  const ds = effectiveStats(d);
  if (action.kind === "attack") {
    const perHit = as.ad * ATTACK_POWER * (defOf(a).power ?? 1) * (1 + as.crit * (CRIT_MULTIPLIER - 1)) + as.onHitCurrentHp * d.hp;
    est.damage = mitigate(perHit, "physical", ds) * (1 + as.attackSpeed);
    const passive = defOf(a).passive;
    if (passive.kind === "everyNthAttack" && (a.attackCount + 1) % passive.n === 0) {
      est.damage += mitigate(scaleValue(passive.bonus, a, d), passive.type, ds);
    }
    return est;
  }
  if (action.kind === "potion") {
    est.heal = getItem(action.itemId).potion!.healPct * as.maxHp;
    return est;
  }
  const spell = findSpell(a, action.key);
  if (!spell) return est;
  for (const effect of spell.effects) {
    switch (effect.kind) {
      case "damage":
        est.damage += mitigate(scaleValue(effect.amount, a, d), effect.type, ds) * (effect.hits ?? 1);
        break;
      case "heal":
        est.heal += scaleValue(effect.amount, a, d);
        break;
      case "shield":
        est.shield += scaleValue(effect.amount, a, d);
        break;
      case "stun":
        est.stun += effect.turns * (effect.chance ?? 1);
        break;
      case "dot":
        est.dot += mitigate(scaleValue(effect.amount, a, d), effect.type, ds) * effect.turns;
        break;
      case "buff":
        est.buff += effect.turns;
        break;
      case "debuff":
        est.debuff += effect.turns;
        break;
      case "dodge":
        est.dodge += effect.turns;
        break;
    }
  }
  return est;
}

// ---------------------------------------------------------------------------
// Résolution

/**
 * Joue une action pour le camp dont c'est le tour et renvoie le nouvel état.
 * Les potions ne terminent pas le tour ; les autres actions passent la main
 * à l'adversaire (en sautant ses tours s'il est étourdi).
 */
export function act(state: BattleState, action: Action): BattleState {
  const s = cloneBattle(state);
  if (s.winner) return s;
  const side = s.turn;
  s.lastAction = { seq: (s.lastAction?.seq ?? 0) + 1, side, kind: action.kind, key: action.kind === "spell" ? action.key : undefined };

  if (action.kind === "potion") {
    applyPotion(s, side, action.itemId);
    return s;
  }
  if (action.kind === "spell") {
    if (spellBlock(s, side, action.key) !== null) throw new Error(`Sort ${action.key} indisponible`);
    castSpell(s, side, action.key);
  } else {
    autoAttack(s, side);
  }
  if (checkWinner(s, side)) return s;
  passTurn(s, side);
  return s;
}

function rand(s: BattleState): number {
  const [value, next] = nextRandom(s.rng);
  s.rng = next;
  return value;
}

function log(s: BattleState, entry: LogEntry) {
  if (s.quiet) return;
  s.log.push(entry);
  if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
}

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

function fmt(n: number): string {
  return NUMBER_FORMAT.format(Math.round(n));
}

function checkWinner(s: BattleState, lastActor: Side): boolean {
  const other = opponent(lastActor);
  if (s[other].hp <= 0) s.winner = lastActor;
  else if (s[lastActor].hp <= 0) s.winner = other;
  if (s.winner) {
    const loser = s[opponent(s.winner)];
    log(s, { side: "system", text: `${loser.name} tombe au combat !`, tone: "info" });
  }
  return s.winner !== null;
}

function heal(c: Combatant, amount: number): number {
  const max = effectiveStats(c).maxHp;
  const before = c.hp;
  c.hp = Math.min(max, c.hp + Math.round(amount));
  return c.hp - before;
}

/**
 * Multiplicateur des dégâts infligés par un camp : dégâts propres aux monstres et,
 * en partie, coefficient « en partie » du champion joué (dégâts infligés × coef,
 * dégâts subis ÷ coef). Vaut 1 dans un duel entre champions.
 */
export function damageFactor(s: BattleState, attackerSide: Side): number {
  const attacker = defOf(s[attackerSide]);
  const target = defOf(s[opponent(attackerSide)]);
  let factor = attacker.damageScale ?? 1;
  if (s.run) factor *= attackerSide === "player" ? (attacker.runPower ?? 1) : 1 / (target.runPower ?? 1);
  return factor;
}

/** Applique des dégâts déjà réduits par les résistances ; les boucliers absorbent en premier. */
function applyDamage(s: BattleState, side: Side, amount: number, fromOpponent = true): number {
  const c = s[side];
  if (fromOpponent) amount *= damageFactor(s, opponent(side));
  let rest = Math.round(amount);
  for (const st of c.statuses) {
    if (st.kind !== "shield" || rest <= 0) continue;
    const absorbed = Math.min(st.amount ?? 0, rest);
    st.amount = (st.amount ?? 0) - absorbed;
    rest -= absorbed;
  }
  c.statuses = c.statuses.filter((st) => st.kind !== "shield" || (st.amount ?? 0) > 0);
  const dealt = Math.min(c.hp, rest);
  c.hp -= dealt;
  checkPhases(s, side);
  return Math.round(amount);
}

function checkPhases(s: BattleState, side: Side) {
  const c = s[side];
  const phases = defOf(c).phases;
  if (!phases || c.hp <= 0) return;
  while (c.phasesTriggered < phases.length && c.hp / c.base.maxHp <= phases[c.phasesTriggered].below) {
    const phase = phases[c.phasesTriggered];
    const extraHp = phase.buff.maxHp ?? 0;
    c.base = addStats(c.base, phase.buff);
    c.hp += extraHp;
    c.phasesTriggered++;
    log(s, { side, text: `${c.name} : ${phase.label}`, tone: "control" });
  }
}

function consumeDodge(c: Combatant): boolean {
  const idx = c.statuses.findIndex((st) => st.kind === "dodge");
  if (idx === -1) return false;
  c.statuses.splice(idx, 1);
  return true;
}

function addStatus(c: Combatant, status: Status) {
  // Un même effet ne se cumule pas : on rafraîchit la durée et on garde la plus forte valeur.
  const existing = c.statuses.find((st) => st.id === status.id);
  if (existing && status.kind !== "dot" && status.kind !== "shield") {
    existing.turns = Math.max(existing.turns, status.turns);
    if (status.amount !== undefined) {
      existing.amount =
        Math.abs(status.amount) > Math.abs(existing.amount ?? 0) ? status.amount : existing.amount;
    }
    return;
  }
  c.statuses.push(status);
}

function autoAttack(s: BattleState, side: Side) {
  const a = s[side];
  const targetSide = opponent(side);
  const d = s[targetSide];
  const as = effectiveStats(a);
  const passive = defOf(a).passive;
  const hits = rand(s) < as.attackSpeed ? 2 : 1;

  for (let i = 0; i < hits && d.hp > 0 && a.hp > 0; i++) {
    const ds = effectiveStats(d);
    if (consumeDodge(d)) {
      log(s, { side, text: `${d.name} esquive l'attaque de ${a.name}.`, tone: "info" });
      continue;
    }
    a.attackCount++;
    const crit = rand(s) < as.crit;
    if (crit && s.lastAction) s.lastAction.crit = true;
    let raw = as.ad * ATTACK_POWER * (defOf(a).power ?? 1) * (crit ? CRIT_MULTIPLIER : 1) + as.onHitCurrentHp * d.hp;
    let dealt = applyDamage(s, targetSide, mitigate(raw, "physical", ds));
    let text = `${a.name} attaque${crit ? " (critique !)" : ""} : ${fmt(dealt)} dégâts.`;

    if (passive.kind === "everyNthAttack" && a.attackCount % passive.n === 0) {
      raw = scaleValue(passive.bonus, a, d);
      const bonus = applyDamage(s, targetSide, mitigate(raw, passive.type, ds));
      dealt += bonus;
      text += ` ${passive.name} : +${fmt(bonus)}.`;
    }
    if (passive.kind === "bleedOnHit") {
      const stacks = d.statuses.filter((st) => st.id === `bleed-${side}`).length;
      if (stacks < 5) {
        d.statuses.push({
          id: `bleed-${side}`,
          label: passive.name,
          kind: "dot",
          turns: passive.turns,
          damageType: "physical",
          perTurn: mitigate(scaleValue(passive.amount, a, d), "physical", ds),
        });
      }
    }
    log(s, { side, text, tone: crit ? "crit" : "damage" });

    if (as.lifesteal > 0) {
      const healed = heal(a, dealt * as.lifesteal);
      if (healed > 0) log(s, { side, text: `Vol de vie : +${fmt(healed)} PV.`, tone: "heal" });
    }
    if (ds.thorns > 0) {
      const reflected = applyDamage(s, side, mitigate(dealt * ds.thorns, "magic", as));
      log(s, { side: targetSide, text: `Épines : ${fmt(reflected)} dégâts renvoyés.`, tone: "damage" });
    }
  }
}

function castSpell(s: BattleState, side: Side, key: SpellKey) {
  const a = s[side];
  const targetSide = opponent(side);
  const d = s[targetSide];
  const spell = findSpell(a, key)!;
  const passive = defOf(a).passive;

  a.resource -= spell.cost;
  a.cooldowns[key] = spell.cooldown;
  a.spellCount++;
  log(s, { side, text: `${a.name} lance ${spell.name} (${key}).`, tone: "info" });

  const offensive = spell.effects.some((e) => isOffensive(e));
  const dodged = offensive && consumeDodge(d);
  if (dodged) log(s, { side, text: `${d.name} esquive ${spell.name} !`, tone: "info" });

  let damageDealt = 0;
  for (const effect of spell.effects) {
    if (dodged && isOffensive(effect)) continue;
    if (d.hp <= 0) break;
    damageDealt += applyEffect(s, side, effect, spell);
  }

  if (passive.kind === "spellVamp" && damageDealt > 0) {
    const healed = heal(a, damageDealt * passive.pct);
    if (healed > 0) log(s, { side, text: `${passive.name} : +${fmt(healed)} PV.`, tone: "heal" });
  }
  if (
    passive.kind === "stunEveryNSpells" &&
    !dodged &&
    offensive &&
    a.spellCount % passive.n === 0 &&
    d.hp > 0 &&
    !d.statuses.some((st) => st.id === "tenacity")
  ) {
    addStatus(d, { id: `stun-${side}`, label: "Étourdissement", kind: "stun", turns: 1 });
    log(s, { side, text: `${passive.name} étourdit ${d.name} !`, tone: "control" });
  }
}

function isOffensive(e: Effect): boolean {
  return e.kind === "damage" || e.kind === "stun" || e.kind === "dot" || e.kind === "debuff";
}

function applyEffect(s: BattleState, side: Side, effect: Effect, spell: SpellDef): number {
  const a = s[side];
  const targetSide = opponent(side);
  const d = s[targetSide];
  switch (effect.kind) {
    case "damage": {
      let total = 0;
      for (let i = 0; i < (effect.hits ?? 1) && d.hp > 0; i++) {
        total += applyDamage(s, targetSide, mitigate(scaleValue(effect.amount, a, d), effect.type, effectiveStats(d)));
      }
      const typeLabel = effect.type === "physical" ? "physiques" : effect.type === "magic" ? "magiques" : "bruts";
      log(s, { side, text: `${spell.name} inflige ${fmt(total)} dégâts ${typeLabel}.`, tone: "damage" });
      return total;
    }
    case "heal": {
      const healed = heal(a, scaleValue(effect.amount, a, d));
      log(s, { side, text: `${a.name} récupère ${fmt(healed)} PV.`, tone: "heal" });
      return 0;
    }
    case "shield": {
      const amount = Math.round(scaleValue(effect.amount, a, d));
      addStatus(a, { id: `shield-${spell.key}-${s.round}`, label: "Bouclier", kind: "shield", turns: effect.turns, amount });
      log(s, { side, text: `${a.name} gagne un bouclier de ${fmt(amount)}.`, tone: "shield" });
      return 0;
    }
    case "stun": {
      if (d.statuses.some((st) => st.id === "tenacity")) {
        log(s, { side, text: `Ténacité : ${d.name} résiste à l'étourdissement.`, tone: "info" });
        return 0;
      }
      if (effect.chance !== undefined && rand(s) >= effect.chance) {
        log(s, { side, text: `${d.name} résiste à l'étourdissement.`, tone: "info" });
        return 0;
      }
      addStatus(d, { id: `stun-${side}`, label: "Étourdissement", kind: "stun", turns: effect.turns });
      log(s, { side, text: `${d.name} subit un étourdissement !`, tone: "control" });
      return 0;
    }
    case "dot": {
      const perTurn = mitigate(scaleValue(effect.amount, a, d), effect.type, effectiveStats(d));
      d.statuses.push({
        id: `dot-${side}-${spell.key}`,
        label: effect.label,
        kind: "dot",
        turns: effect.turns,
        damageType: effect.type,
        perTurn,
      });
      log(s, { side, text: `${d.name} subit ${effect.label} (${fmt(perTurn)} par tour).`, tone: "damage" });
      return 0;
    }
    case "buff": {
      addStatus(a, { id: `buff-${side}-${spell.key}-${effect.stat}`, label: effect.label, kind: "buff", stat: effect.stat, amount: effect.amount, turns: effect.turns });
      log(s, { side, text: `${a.name} : ${effect.label}.`, tone: "info" });
      return 0;
    }
    case "debuff": {
      addStatus(d, { id: `debuff-${side}-${spell.key}-${effect.stat}`, label: effect.label, kind: "debuff", stat: effect.stat, amount: -effect.amount, turns: effect.turns });
      log(s, { side, text: `${d.name} : ${effect.label}.`, tone: "control" });
      return 0;
    }
    case "dodge": {
      addStatus(a, { id: `dodge-${side}`, label: "Esquive", kind: "dodge", turns: effect.turns });
      log(s, { side, text: `${a.name} se prépare à esquiver.`, tone: "info" });
      return 0;
    }
  }
}

function applyPotion(s: BattleState, side: Side, itemId: string) {
  const item = getItem(itemId);
  if (!item.potion) throw new Error(`${item.name} n'est pas une potion`);
  const c = s[side];
  const stats = effectiveStats(c);
  const healed = heal(c, stats.maxHp * item.potion.healPct);
  let text = `${c.name} boit une ${item.name} : +${fmt(healed)} PV`;
  if (item.potion.resourcePct && stats.maxResource > 0) {
    const before = c.resource;
    c.resource = Math.min(stats.maxResource, c.resource + Math.round(stats.maxResource * item.potion.resourcePct));
    text += `, +${fmt(c.resource - before)} ressource`;
  }
  log(s, { side, text: `${text}.`, tone: "heal" });
}

function applyStartShield(s: BattleState, side: Side) {
  const c = s[side];
  const passive = defOf(c).passive;
  if (passive.kind !== "startShield") return;
  c.statuses = c.statuses.filter((st) => st.id !== `passive-shield-${side}`);
  const amount = Math.round(effectiveStats(c).maxHp * passive.pctMaxHp);
  c.statuses.push({ id: `passive-shield-${side}`, label: passive.name, kind: "shield", turns: 99, amount });
}

function passTurn(s: BattleState, from: Side) {
  let side = opponent(from);
  // Boucle : un camp étourdi passe son tour et rend la main.
  for (let guard = 0; guard < 6; guard++) {
    if (side === "player") s.round++;
    s.turn = side;
    const skipped = beginTurn(s, side);
    if (s.winner) return;
    if (!skipped) return;
    side = opponent(side);
  }
}

/** Début de tour : régénération, recharges, effets sur la durée. Renvoie true si le tour est sauté. */
function beginTurn(s: BattleState, side: Side): boolean {
  const c = s[side];
  const def = defOf(c);
  const stats = effectiveStats(c);

  if (stats.hpRegenPct > 0) heal(c, stats.maxHp * stats.hpRegenPct);
  if (def.passive.kind === "regen") {
    const healed = heal(c, stats.maxHp * def.passive.pct);
    if (healed > 0) log(s, { side, text: `${def.passive.name} : +${fmt(healed)} PV.`, tone: "heal" });
  }
  if (def.passive.kind === "startShield" && s.round % def.passive.every === 0) applyStartShield(s, side);
  c.resource = Math.min(stats.maxResource, c.resource + stats.resourceRegen);
  for (const key of SPELL_KEYS) c.cooldowns[key] = Math.max(0, c.cooldowns[key] - 1);

  for (const st of c.statuses) {
    if (st.kind === "dot" && st.perTurn) {
      const dealt = applyDamage(s, side, st.perTurn);
      log(s, { side: opponent(side), text: `${st.label} : ${c.name} subit ${fmt(dealt)} dégâts.`, tone: "damage" });
    }
  }
  if (s.round >= SUDDEN_DEATH_ROUND) {
    const dealt = applyDamage(s, side, stats.maxHp * 0.05 * (s.round - SUDDEN_DEATH_ROUND + 1), false);
    log(s, { side: "system", text: `Mort subite : ${c.name} perd ${fmt(dealt)} PV.`, tone: "damage" });
  }
  if (c.hp <= 0) {
    s.winner = opponent(side);
    log(s, { side: "system", text: `${c.name} tombe au combat !`, tone: "info" });
    return false;
  }

  const stunned = isStunned(c);
  for (const st of c.statuses) st.turns--;
  c.statuses = c.statuses.filter((st) => st.turns > 0);
  if (stunned) {
    // Un étourdissement est suivi d'un tour d'immunité, pour éviter les chaînes.
    c.statuses.push({ id: "tenacity", label: "Ténacité", kind: "buff", turns: 2 });
    log(s, { side, text: `Étourdissement : ${c.name} passe son tour.`, tone: "control" });
  }
  return stunned;
}
