// Descriptions détaillées des sorts, passifs et attaques, générées depuis les
// données : elles restent exactes quand on modifie l'équilibrage.

import { ATTACK_POWER, CRIT_MULTIPLIER, DAMAGE_SCALE, damageFactor, effectiveStats, mitigate, opponent, scaleValue } from "./battle";
import type { BattleState, DamageType, Effect, FighterDef, PassiveDef, Scaling, Side, SpellDef, StatKey } from "./types";

export type DetailTone = "physical" | "magic" | "true" | "heal" | "shield" | "control" | "buff" | "debuff" | "info";

export interface DetailLine {
  text: string;
  /** Valeur calculée dans le combat en cours, si un contexte est fourni. */
  value?: string;
  tone: DetailTone;
}

export interface DetailContext {
  state: BattleState;
  side: Side;
}

const n = (x: number) => Math.round(x).toLocaleString("fr-FR");
const p = (x: number) => `${Math.round(x * 100)} %`;

const DAMAGE_LABEL: Record<DamageType, string> = { physical: "physiques", magic: "magiques", true: "bruts" };

const STAT_LABEL: Record<StatKey, string> = {
  maxHp: "PV max",
  ad: "AD",
  ap: "puissance",
  armor: "armure",
  mr: "résistance magique",
  crit: "critique",
  attackSpeed: "double frappe",
  lifesteal: "vol de vie",
  thorns: "renvoi de dégâts",
  onHitCurrentHp: "dégâts sur PV actuels",
  maxResource: "ressource max",
  resourceRegen: "régénération de ressource",
  hpRegenPct: "régénération de PV",
};

const PERCENT_STATS: StatKey[] = ["crit", "attackSpeed", "lifesteal", "thorns", "onHitCurrentHp", "hpRegenPct"];

/** Formule lisible : « 52 (+12 par niveau) + 156 % AD ». `mult` intègre les coefficients cachés. */
export function formula(sc: Scaling, mult: number): string {
  const parts: string[] = [];
  const base = sc.base * mult;
  if (base) parts.push(n(base));
  if (sc.perLevel) parts.push(`${parts.length ? "" : "0 "}(+${n(sc.perLevel * mult)} par niveau)`.trim());
  const ratio = (r: number | undefined, label: string) => r && parts.push(`${parts.length ? "+ " : ""}${p(r * mult)} ${label}`);
  ratio(sc.ad, "AD");
  ratio(sc.ap, "puissance");
  ratio(sc.maxHp, "de ses PV max");
  ratio(sc.armor, "de son armure");
  ratio(sc.targetMaxHp, "des PV max de la cible");
  ratio(sc.targetMissingHp, "des PV manquants de la cible");
  return parts.join(" ") || "0";
}

function power(def: FighterDef) {
  return def.power ?? 1;
}

function damageValue(sc: Scaling, type: DamageType, ctx: DetailContext | undefined, hits = 1): string | undefined {
  if (!ctx) return undefined;
  const caster = ctx.state[ctx.side];
  const target = ctx.state[opponent(ctx.side)];
  const raw = scaleValue(sc, caster, target);
  const after = mitigate(raw, type, effectiveStats(target)) * damageFactor(ctx.state, ctx.side);
  const total = hits > 1 ? ` (×${hits} = ${n(after * hits)})` : "";
  return type === "true" ? `${n(after)}${total}` : `${n(after)} après résistances${total}`;
}

function selfValue(sc: Scaling, ctx: DetailContext | undefined): string | undefined {
  if (!ctx) return undefined;
  return n(scaleValue(sc, ctx.state[ctx.side], ctx.state[opponent(ctx.side)]));
}

const turns = (t: number) => `${t} tour${t > 1 ? "s" : ""}`;

function statAmount(stat: StatKey, amount: number) {
  return PERCENT_STATS.includes(stat) ? p(amount) : n(amount);
}

export function describeEffect(effect: Effect, def: FighterDef, ctx?: DetailContext): DetailLine {
  const mult = power(def);
  switch (effect.kind) {
    case "damage": {
      const hits = effect.hits && effect.hits > 1 ? `, ${effect.hits} coups` : "";
      return {
        text: `Dégâts ${DAMAGE_LABEL[effect.type]}${hits} : ${formula(effect.amount, mult * DAMAGE_SCALE)}`,
        value: damageValue(effect.amount, effect.type, ctx, effect.hits),
        tone: effect.type,
      };
    }
    case "heal":
      return { text: `Soin : ${formula(effect.amount, mult)}`, value: selfValue(effect.amount, ctx), tone: "heal" };
    case "shield":
      return {
        text: `Bouclier pendant ${turns(effect.turns)} : ${formula(effect.amount, mult)}`,
        value: selfValue(effect.amount, ctx),
        tone: "shield",
      };
    case "stun":
      return {
        text: `Étourdit la cible pendant ${turns(effect.turns)}${effect.chance !== undefined ? ` (${p(effect.chance)} de chances)` : ""}`,
        tone: "control",
      };
    case "dot":
      return {
        text: `${effect.label} : dégâts ${DAMAGE_LABEL[effect.type]} à chaque tour pendant ${turns(effect.turns)} : ${formula(effect.amount, mult * DAMAGE_SCALE)}`,
        value: damageValue(effect.amount, effect.type, ctx) && `${damageValue(effect.amount, effect.type, ctx)} par tour`,
        tone: effect.type,
      };
    case "buff":
      return { text: `Bonus pendant ${turns(effect.turns)} : +${statAmount(effect.stat, effect.amount)} ${STAT_LABEL[effect.stat]}`, tone: "buff" };
    case "debuff":
      return { text: `Malus sur la cible pendant ${turns(effect.turns)} : -${statAmount(effect.stat, effect.amount)} ${STAT_LABEL[effect.stat]}`, tone: "debuff" };
    case "dodge":
      return { text: "Esquive la prochaine attaque ou le prochain sort offensif", tone: "info" };
  }
}

export function describeSpell(spell: SpellDef, def: FighterDef, ctx?: DetailContext): DetailLine[] {
  const lines = spell.effects.map((e) => describeEffect(e, def, ctx));
  if (spell.requiresTargetBelow !== undefined) {
    lines.push({ text: `Utilisable seulement si la cible est sous ${p(spell.requiresTargetBelow)} de ses PV`, tone: "info" });
  }
  return lines;
}

export function describePassive(passive: PassiveDef, def: FighterDef, ctx?: DetailContext): DetailLine[] {
  const mult = power(def);
  switch (passive.kind) {
    case "regen":
      return [{ text: `Régénère ${(passive.pct * 100).toFixed(1).replace(".", ",")} % des PV max au début de chaque tour`, tone: "heal" }];
    case "bleedOnHit":
      return [
        {
          text: `Chaque attaque applique un saignement (5 cumuls max) pendant ${turns(passive.turns)} : ${formula(passive.amount, mult * DAMAGE_SCALE)} par tour`,
          value: damageValue(passive.amount, "physical", ctx),
          tone: "physical",
        },
      ];
    case "everyNthAttack":
      return [
        {
          text: `Toutes les ${passive.n} attaques, dégâts ${DAMAGE_LABEL[passive.type]} bonus : ${formula(passive.bonus, mult * DAMAGE_SCALE)}`,
          value: damageValue(passive.bonus, passive.type, ctx),
          tone: passive.type,
        },
      ];
    case "spellVamp":
      return [{ text: `Les sorts rendent ${p(passive.pct)} des dégâts infligés en PV`, tone: "heal" }];
    case "startShield":
      return [{ text: `Bouclier de ${p(passive.pctMaxHp)} des PV max au début du combat, rechargé tous les ${passive.every} rounds`, tone: "shield" }];
    case "lowHpBonus":
      return [{ text: `Sous ${p(passive.below)} de PV : +${statAmount(passive.stat, passive.amount)} ${STAT_LABEL[passive.stat]}`, tone: "buff" }];
    case "stunEveryNSpells":
      return [{ text: `Tous les ${passive.n} sorts offensifs, étourdit la cible pendant 1 tour`, tone: "control" }];
    case "none":
      return [];
  }
}

export function describeAttack(def: FighterDef, ctx?: DetailContext): DetailLine[] {
  const mult = power(def) * ATTACK_POWER * DAMAGE_SCALE;
  const lines: DetailLine[] = [];
  if (ctx) {
    const s = effectiveStats(ctx.state[ctx.side]);
    const target = effectiveStats(ctx.state[opponent(ctx.side)]);
    lines.push({
      text: `Dégâts physiques : ${p(mult)} AD`,
      value: `${n(mitigate(s.ad * ATTACK_POWER * power(def), "physical", target) * damageFactor(ctx.state, ctx.side))} après résistances`,
      tone: "physical",
    });
    lines.push({ text: `Coup critique : ${p(s.crit)} de chances, dégâts ×${String(CRIT_MULTIPLIER).replace(".", ",")}`, tone: "info" });
    lines.push({ text: `Double frappe : ${p(s.attackSpeed)} de chances de frapper deux fois`, tone: "info" });
    if (s.lifesteal > 0) lines.push({ text: `Vol de vie : ${p(s.lifesteal)} des dégâts infligés`, tone: "heal" });
    if (s.onHitCurrentHp > 0) lines.push({ text: `+${p(s.onHitCurrentHp)} des PV actuels de la cible`, tone: "physical" });
  } else {
    lines.push({ text: `Dégâts physiques : ${p(mult)} AD, avec chance de critique et de double frappe`, tone: "physical" });
  }
  return lines;
}
