import type { Stats } from "../types";

export type ItemKind = "component" | "legendary" | "potion" | "elixir";

export interface ItemDef {
  id: string;
  name: string;
  /** Identifiant d'objet Data Dragon, pour l'icône. */
  ddId: string;
  cost: number;
  kind: ItemKind;
  description: string;
  stats?: Partial<Stats>;
  /** Légendaires : composants absorbés à l'achat (leur prix est déduit). */
  from?: string[];
  /** Potions : soin et ressource rendus, en % du max. Ne consomme pas le tour. */
  potion?: { healPct: number; resourcePct?: number };
}

export const MAX_ITEMS = 6;
export const MAX_POTIONS = 5;
export const SELL_RATIO = 0.7;

export const ITEMS: ItemDef[] = [
  // Consommables
  {
    id: "health-potion",
    name: "Potion de soin",
    ddId: "2003",
    cost: 60,
    kind: "potion",
    description: "Rend 25 % des PV max. Ne termine pas le tour.",
    potion: { healPct: 0.25 },
  },
  {
    id: "corrupting-potion",
    name: "Potion corrompue",
    ddId: "2033",
    cost: 140,
    kind: "potion",
    description: "Rend 20 % des PV max et 40 % de la ressource. Ne termine pas le tour.",
    potion: { healPct: 0.2, resourcePct: 0.4 },
  },
  {
    id: "elixir-iron",
    name: "Élixir de fer",
    ddId: "2138",
    cost: 400,
    kind: "elixir",
    description: "Pour le prochain combat : +300 PV, +25 armure et +25 RM.",
    stats: { maxHp: 300, armor: 25, mr: 25 },
  },
  {
    id: "elixir-sorcery",
    name: "Élixir de sorcellerie",
    ddId: "2139",
    cost: 400,
    kind: "elixir",
    description: "Pour le prochain combat : +60 puissance.",
    stats: { ap: 60 },
  },
  {
    id: "elixir-wrath",
    name: "Élixir de colère",
    ddId: "2140",
    cost: 400,
    kind: "elixir",
    description: "Pour le prochain combat : +30 AD et 10 % de vol de vie.",
    stats: { ad: 30, lifesteal: 0.1 },
  },

  // Composants
  { id: "long-sword", name: "Épée longue", ddId: "1036", cost: 350, kind: "component", description: "+10 AD", stats: { ad: 10 } },
  { id: "pickaxe", name: "Pioche", ddId: "1037", cost: 875, kind: "component", description: "+25 AD", stats: { ad: 25 } },
  { id: "amp-tome", name: "Tome d'amplification", ddId: "1052", cost: 435, kind: "component", description: "+20 puissance", stats: { ap: 20 } },
  { id: "blasting-wand", name: "Baguette explosive", ddId: "1026", cost: 850, kind: "component", description: "+45 puissance", stats: { ap: 45 } },
  { id: "ruby-crystal", name: "Cristal de rubis", ddId: "1028", cost: 400, kind: "component", description: "+150 PV", stats: { maxHp: 150 } },
  { id: "cloth-armor", name: "Armure en tissu", ddId: "1029", cost: 300, kind: "component", description: "+15 armure", stats: { armor: 15 } },
  { id: "chain-vest", name: "Cotte de mailles", ddId: "1031", cost: 800, kind: "component", description: "+40 armure", stats: { armor: 40 } },
  { id: "null-magic-mantle", name: "Cape antimagie", ddId: "1033", cost: 450, kind: "component", description: "+25 résistance magique", stats: { mr: 25 } },
  { id: "dagger", name: "Dague", ddId: "1042", cost: 300, kind: "component", description: "+8 % de double frappe", stats: { attackSpeed: 0.08 } },
  { id: "cloak-of-agility", name: "Cape d'agilité", ddId: "1018", cost: 600, kind: "component", description: "+15 % de critique", stats: { crit: 0.15 } },
  { id: "vampiric-scepter", name: "Sceptre vampirique", ddId: "1053", cost: 900, kind: "component", description: "+15 AD, 7 % de vol de vie", stats: { ad: 15, lifesteal: 0.07 } },
  { id: "sapphire-crystal", name: "Cristal de saphir", ddId: "1027", cost: 300, kind: "component", description: "+150 mana ou énergie max", stats: { maxResource: 150 } },

  // Légendaires
  { id: "infinity-edge", name: "Lame d'infini", ddId: "3031", cost: 3400, kind: "legendary", from: ["pickaxe", "cloak-of-agility"], description: "+65 AD, +25 % de critique", stats: { ad: 65, crit: 0.25 } },
  { id: "bloodthirster", name: "Soif-de-sang", ddId: "3072", cost: 3400, kind: "legendary", from: ["vampiric-scepter", "pickaxe"], description: "+80 AD, 15 % de vol de vie", stats: { ad: 80, lifesteal: 0.15 } },
  { id: "botrk", name: "Lame du roi déchu", ddId: "3153", cost: 3200, kind: "legendary", from: ["vampiric-scepter", "dagger"], description: "+40 AD, +25 % de double frappe, 8 % de vol de vie. Les attaques infligent 6 % des PV actuels de la cible.", stats: { ad: 40, attackSpeed: 0.25, lifesteal: 0.08, onHitCurrentHp: 0.06 } },
  { id: "phantom-dancer", name: "Danseur fantôme", ddId: "3046", cost: 2650, kind: "legendary", from: ["cloak-of-agility", "dagger"], description: "+25 % de critique, +35 % de double frappe", stats: { crit: 0.25, attackSpeed: 0.35 } },
  { id: "steraks-gage", name: "Gage de Sterak", ddId: "3053", cost: 3100, kind: "legendary", from: ["ruby-crystal", "long-sword"], description: "+450 PV, +45 AD", stats: { maxHp: 450, ad: 45 } },
  { id: "rabadons", name: "Coiffe de Rabadon", ddId: "3089", cost: 3600, kind: "legendary", from: ["blasting-wand", "amp-tome"], description: "+140 puissance", stats: { ap: 140 } },
  { id: "zhonyas", name: "Sablier de Zhonya", ddId: "3157", cost: 3250, kind: "legendary", from: ["blasting-wand", "cloth-armor"], description: "+105 puissance, +50 armure", stats: { ap: 105, armor: 50 } },
  { id: "ludens", name: "Compagnon de Luden", ddId: "6655", cost: 2900, kind: "legendary", from: ["blasting-wand", "sapphire-crystal"], description: "+95 puissance, +300 mana ou énergie max", stats: { ap: 95, maxResource: 300 } },
  { id: "warmogs", name: "Armure de Warmog", ddId: "3083", cost: 3100, kind: "legendary", from: ["ruby-crystal", "ruby-crystal"], description: "+800 PV, régénère 3 % des PV max par tour", stats: { maxHp: 800, hpRegenPct: 0.03 } },
  { id: "thornmail", name: "Cotte épineuse", ddId: "3075", cost: 2450, kind: "legendary", from: ["chain-vest", "ruby-crystal"], description: "+150 PV, +70 armure, renvoie 25 % des dégâts d'attaque subis", stats: { maxHp: 150, armor: 70, thorns: 0.25 } },
  { id: "force-of-nature", name: "Force de la nature", ddId: "4401", cost: 2800, kind: "legendary", from: ["null-magic-mantle", "ruby-crystal"], description: "+400 PV, +70 résistance magique", stats: { maxHp: 400, mr: 70 } },
  { id: "sunfire", name: "Égide de feu solaire", ddId: "3068", cost: 2700, kind: "legendary", from: ["cloth-armor", "ruby-crystal"], description: "+450 PV, +50 armure, régénère 1 % des PV max par tour", stats: { maxHp: 450, armor: 50, hpRegenPct: 0.01 } },
];

const byId = new Map(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): ItemDef {
  const item = byId.get(id);
  if (!item) throw new Error(`Objet inconnu : ${id}`);
  return item;
}

/** Légendaires qu'un composant permet de construire. */
export function buildsInto(componentId: string): ItemDef[] {
  return ITEMS.filter((i) => i.from?.includes(componentId));
}

/**
 * Composants possédés qu'un légendaire absorberait, sous forme d'indices dans
 * l'inventaire (un même composant ne compte qu'une fois par emplacement de recette).
 */
export function consumedComponents(owned: string[], itemId: string): number[] {
  const used: number[] = [];
  for (const part of getItem(itemId).from ?? []) {
    const index = owned.findIndex((id, i) => id === part && !used.includes(i));
    if (index !== -1) used.push(index);
  }
  return used;
}

/** Prix réel d'un objet, une fois déduits les composants possédés qu'il absorbe. */
export function effectiveCost(owned: string[], itemId: string): number {
  return getItem(itemId).cost - consumedComponents(owned, itemId).reduce((sum, i) => sum + getItem(owned[i]).cost, 0);
}
