// Types partagés du moteur de jeu. Tout ce dossier est du TypeScript pur,
// sans React, pour pouvoir être testé et simulé hors de l'interface.

export type Archetype =
  | "tank"
  | "fighter"
  | "assassin"
  | "mage"
  | "marksman"
  | "support"
  | "monster"
  | "dragon"
  | "baron";

export type DamageType = "physical" | "magic" | "true";
export type ResourceKind = "mana" | "energy" | "none";
export type SpellKey = "Q" | "W" | "E" | "R";

/** Stats « vivantes » d'un combattant, une fois niveau, objets et bonus appliqués. */
export interface Stats {
  maxHp: number;
  ad: number;
  ap: number;
  armor: number;
  mr: number;
  /** Chance de coup critique sur les attaques de base, de 0 à 1. */
  crit: number;
  /** Chance de frapper deux fois avec une attaque de base, de 0 à 1. */
  attackSpeed: number;
  /** Part des dégâts infligés rendue en PV, de 0 à 1. */
  lifesteal: number;
  /** Part des dégâts physiques d'attaque de base renvoyés à l'attaquant. */
  thorns: number;
  /** Dégâts physiques bonus des attaques de base, en % des PV actuels de la cible. */
  onHitCurrentHp: number;
  maxResource: number;
  resourceRegen: number;
  /** PV régénérés au début de chaque tour, en % des PV max. */
  hpRegenPct: number;
}

export type StatKey = keyof Stats;

export interface Scaling {
  base: number;
  /** Bonus de base par niveau au-delà du niveau 1. */
  perLevel?: number;
  ad?: number;
  ap?: number;
  /** Ratio des PV max du lanceur. */
  maxHp?: number;
  /** Ratio de l'armure du lanceur. */
  armor?: number;
  /** Ratio des PV max de la cible (dégâts uniquement). */
  targetMaxHp?: number;
  /** Ratio des PV manquants de la cible (exécutions). */
  targetMissingHp?: number;
}

export type Effect =
  | { kind: "damage"; type: DamageType; amount: Scaling; hits?: number }
  | { kind: "heal"; amount: Scaling }
  | { kind: "shield"; amount: Scaling; turns: number }
  | { kind: "stun"; turns: number; chance?: number }
  | { kind: "dot"; type: DamageType; amount: Scaling; turns: number; label: string }
  | { kind: "buff"; stat: StatKey; amount: number; turns: number; label: string }
  | { kind: "debuff"; stat: StatKey; amount: number; turns: number; label: string }
  | { kind: "dodge"; turns: number };

export interface SpellDef {
  key: SpellKey;
  name: string;
  description: string;
  cost: number;
  cooldown: number;
  effects: Effect[];
  /** Le sort n'est utilisable que si la cible est sous ce % de PV. */
  requiresTargetBelow?: number;
}

export type PassiveDef =
  | { kind: "regen"; name: string; description: string; pct: number }
  | { kind: "bleedOnHit"; name: string; description: string; amount: Scaling; turns: number }
  | { kind: "everyNthAttack"; name: string; description: string; n: number; bonus: Scaling; type: DamageType }
  | { kind: "spellVamp"; name: string; description: string; pct: number }
  | { kind: "startShield"; name: string; description: string; pctMaxHp: number; every: number }
  | { kind: "lowHpBonus"; name: string; description: string; below: number; stat: StatKey; amount: number }
  | { kind: "stunEveryNSpells"; name: string; description: string; n: number }
  | { kind: "none"; name: string; description: string };

export interface BaseStats {
  hp: number;
  hpPerLevel: number;
  ad: number;
  adPerLevel: number;
  armor: number;
  armorPerLevel: number;
  mr: number;
  mrPerLevel: number;
  ap?: number;
  apPerLevel?: number;
  crit?: number;
  attackSpeed?: number;
  resource: ResourceKind;
  resourceMax: number;
  resourceMaxPerLevel?: number;
  resourceRegen: number;
}

export interface FighterDef {
  id: string;
  name: string;
  title: string;
  archetype: Archetype;
  /** Clé Data Dragon (champions) ou identifiant d'icône (monstres). */
  art: { kind: "champion"; ddKey: string } | { kind: "monster"; emoji: string; color: string };
  stats: BaseStats;
  passive: PassiveDef;
  spells: SpellDef[];
  /** Coefficient d'équilibrage appliqué à tous ses dégâts, soins et boucliers (1 par défaut). */
  power?: number;
  /** Bonus permanent obtenu en battant ce monstre (buffs de jungle, dragons). */
  reward?: { label: string; stats: Partial<Stats> };
  /** Phases de boss : à ce % de PV, applique un buff permanent. */
  phases?: { below: number; label: string; buff: Partial<Stats> }[];
}

export interface Status {
  id: string;
  label: string;
  turns: number;
  kind: "buff" | "debuff" | "dot" | "stun" | "shield" | "dodge";
  stat?: StatKey;
  amount?: number;
  damageType?: DamageType;
  /** Pour les DoT : dégâts par tour, déjà calculés au moment de l'application. */
  perTurn?: number;
}

export interface Combatant {
  defId: string;
  name: string;
  level: number;
  base: Stats;
  hp: number;
  resource: number;
  cooldowns: Record<SpellKey, number>;
  statuses: Status[];
  attackCount: number;
  spellCount: number;
  phasesTriggered: number;
}

export type Side = "player" | "enemy";

export type Action =
  | { kind: "attack" }
  | { kind: "spell"; key: SpellKey }
  | { kind: "potion"; itemId: string };

export interface LogEntry {
  side: Side | "system";
  text: string;
  tone?: "damage" | "heal" | "shield" | "control" | "info" | "crit";
}

export interface BattleState {
  player: Combatant;
  enemy: Combatant;
  turn: Side;
  round: number;
  rng: number;
  log: LogEntry[];
  winner: Side | null;
}
