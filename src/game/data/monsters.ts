import type { FighterDef } from "../types";
import { buff, debuff, dmg, dodge, dot, heal, monsterStats, shield, spell, stun } from "./builders";

// Les monstres ont des stats fixes : ils arrivent toujours au même moment de
// l'ascension, donc face à un champion de niveau connu (15 à 18).

export const JUNGLE: FighterDef[] = [
  {
    id: "scuttler",
    name: "Carapateur",
    title: "Crabe de la rivière",
    archetype: "monster",
    art: { kind: "monster", emoji: "🦀", color: "#4fa3c7" },
    stats: monsterStats({ hp: 2350, ad: 95, armor: 90, mr: 90 }),
    passive: { kind: "startShield", name: "Carapace", description: "Un bouclier de 10 % des PV max, rechargé tous les 3 rounds.", pctMaxHp: 0.1, every: 3 },
    spells: [
      spell("Q", "Pinces", "Deux coups de pince.", 0, 2, [dmg("physical", { base: 70 }, 2)]),
      spell("W", "Plongeon", "Plonge dans la rivière.", 0, 4, [dodge(1), heal({ base: 150 })]),
    ],
    reward: { label: "Sanctuaire du Carapateur : +200 PV", stats: { maxHp: 200 } },
  },
  {
    id: "gromp",
    name: "Gromp",
    title: "Crapaud géant",
    archetype: "monster",
    art: { kind: "monster", emoji: "🐸", color: "#7a9e3a" },
    stats: monsterStats({ hp: 4300, ad: 186, armor: 60, mr: 60 }),
    passive: { kind: "none", name: "Peau visqueuse", description: "Aucun effet particulier." },
    spells: [
      spell("Q", "Crachat toxique", "Un jet de poison.", 0, 2, [dmg("magic", { base: 185 }), dot("magic", { base: 65 }, 3, "Poison du Gromp")]),
      spell("W", "Peau visqueuse", "Sa peau gluante renvoie les coups.", 0, 4, [buff("thorns", 0.3, 2, "Peau visqueuse : renvoie 30 %")]),
    ],
    reward: { label: "Poison du Gromp : +25 puissance", stats: { ap: 25 } },
  },
  {
    id: "krugs",
    name: "Krugs anciens",
    title: "Colosses de pierre",
    archetype: "monster",
    art: { kind: "monster", emoji: "🪨", color: "#9a7b5a" },
    stats: monsterStats({ hp: 5050, ad: 209, armor: 150, mr: 50 }),
    passive: { kind: "none", name: "Fragmentation", description: "Aucun effet particulier." },
    spells: [
      spell("Q", "Charge de pierre", "Une charge brutale.", 0, 2, [dmg("physical", { base: 240 })]),
      spell("W", "Petits Krugs", "Les petits Krugs attaquent en nombre.", 0, 3, [dmg("physical", { base: 75 }, 3)]),
      spell("E", "Peau de pierre", "Se fige dans la roche.", 0, 4, [buff("armor", 60, 2, "Peau de pierre : +60 armure")]),
    ],
    reward: { label: "Éclats de Krug : +15 armure", stats: { armor: 15 } },
  },
  {
    id: "raptors",
    name: "Corbins",
    title: "Nuée affamée",
    archetype: "monster",
    art: { kind: "monster", emoji: "🐦‍⬛", color: "#b05a7a" },
    stats: monsterStats({ hp: 3750, ad: 194, armor: 55, mr: 55, attackSpeed: 0.35, crit: 0.2 }),
    passive: { kind: "none", name: "Nuée", description: "Attaque souvent deux fois." },
    spells: [
      spell("Q", "Nuée de Corbins", "Toute la nuée fond sur la cible.", 0, 3, [dmg("physical", { base: 65 }, 6)]),
      spell("W", "Bec acéré", "Déchire les défenses de la cible.", 0, 3, [dmg("physical", { base: 115 }), debuff("armor", 25, 2, "Armure déchirée (-25)")]),
    ],
    reward: { label: "Plumes de Corbin : +6 % de critique", stats: { crit: 0.06 } },
  },
  {
    id: "wolves",
    name: "Loups des ténèbres",
    title: "Meute affamée",
    archetype: "monster",
    art: { kind: "monster", emoji: "🐺", color: "#6c6f8f" },
    stats: monsterStats({ hp: 4200, ad: 217, armor: 70, mr: 50, attackSpeed: 0.2 }),
    passive: { kind: "bleedOnHit", name: "Crocs", description: "Les morsures font saigner.", amount: { base: 35 }, turns: 3 },
    spells: [
      spell("Q", "Morsure", "Une morsure qui nourrit la meute.", 0, 2, [dmg("physical", { base: 260 }), heal({ base: 170 })]),
      spell("W", "Hurlement", "La meute s'enrage et intimide.", 0, 4, [buff("ad", 40, 2, "Hurlement : +40 AD"), debuff("ad", 25, 2, "Intimidation : -25 AD")]),
    ],
    reward: { label: "Instinct de meute : +6 % de double frappe", stats: { attackSpeed: 0.06 } },
  },
  {
    id: "blue",
    name: "Sentinelle bleue",
    title: "Gardien arcanique",
    archetype: "monster",
    art: { kind: "monster", emoji: "🔵", color: "#3b7bd9" },
    stats: monsterStats({ hp: 4350, ad: 150, armor: 80, mr: 110 }),
    passive: { kind: "regen", name: "Crête de perspicacité", description: "Régénère 0,8 % des PV max par tour.", pct: 0.008 },
    spells: [
      spell("Q", "Orbe arcanique", "Une sphère d'énergie pure.", 0, 2, [dmg("magic", { base: 230 })]),
      spell("W", "Rune d'emprise", "Une rune qui immobilise.", 0, 4, [stun(1), dmg("magic", { base: 100 })]),
      spell("E", "Garde de pierre", "Un bouclier runique.", 0, 4, [shield({ base: 495 })]),
    ],
    reward: { label: "Buff bleu : +30 puissance, +30 régénération de ressource", stats: { ap: 30, resourceRegen: 30 } },
  },
  {
    id: "red",
    name: "Brambleback rouge",
    title: "Bête ardente",
    archetype: "monster",
    art: { kind: "monster", emoji: "🔴", color: "#d9503b" },
    stats: monsterStats({ hp: 4600, ad: 221, armor: 95, mr: 70 }),
    passive: { kind: "bleedOnHit", name: "Brûlure", description: "Les coups brûlent la cible.", amount: { base: 40 }, turns: 2 },
    spells: [
      spell("Q", "Écrasement", "Un coup qui peut sonner.", 0, 3, [dmg("physical", { base: 280 }), stun(1, 0.4)]),
      spell("W", "Souffle ardent", "Des flammes persistantes.", 0, 3, [dot("magic", { base: 95 }, 3, "Flammes du Brambleback")]),
      spell("R", "Fureur", "Entre dans une rage brûlante.", 0, 6, [buff("ad", 60, 3, "Fureur : +60 AD")]),
    ],
    reward: { label: "Buff rouge : +20 AD, régénère 1 % des PV max par tour", stats: { ad: 20, hpRegenPct: 0.01 } },
  },
];

export const DRAGONS: FighterDef[] = [
  {
    id: "dragon-infernal",
    name: "Dragon infernal",
    title: "Drake de feu",
    archetype: "dragon",
    art: { kind: "monster", emoji: "🔥", color: "#e3572b" },
    stats: monsterStats({ hp: 6600, ad: 299, armor: 90, mr: 80 }),
    passive: { kind: "bleedOnHit", name: "Braises", description: "Les attaques brûlent la cible.", amount: { base: 55 }, turns: 2 },
    spells: [
      spell("Q", "Souffle de feu", "Un torrent de flammes.", 0, 2, [dmg("magic", { base: 390 })]),
      spell("W", "Incendie", "Embrase la zone.", 0, 3, [dot("magic", { base: 165 }, 3, "Incendie")]),
      spell("R", "Éruption", "Une explosion volcanique.", 0, 5, [dmg("magic", { base: 775 })]),
    ],
    reward: { label: "Drake infernal : +20 AD et +35 puissance", stats: { ad: 20, ap: 35 } },
  },
  {
    id: "dragon-mountain",
    name: "Dragon des montagnes",
    title: "Drake de pierre",
    archetype: "dragon",
    art: { kind: "monster", emoji: "⛰️", color: "#a3845d" },
    stats: monsterStats({ hp: 6800, ad: 231, armor: 110, mr: 90 }),
    passive: { kind: "startShield", name: "Écailles de roche", description: "Un bouclier de 6 % des PV max, rechargé tous les 4 rounds.", pctMaxHp: 0.06, every: 4 },
    spells: [
      spell("Q", "Éboulement", "Des rochers s'abattent.", 0, 2, [dmg("physical", { base: 265 })]),
      spell("W", "Séisme", "La terre tremble.", 0, 4, [stun(1), dmg("physical", { base: 140 })]),
      spell("E", "Rempart", "Se recouvre de pierre.", 0, 4, [shield({ base: 400 }), buff("armor", 60, 2, "Rempart : +60 armure")]),
    ],
    reward: { label: "Drake des montagnes : +20 armure et +20 RM", stats: { armor: 20, mr: 20 } },
  },
  {
    id: "dragon-ocean",
    name: "Dragon de l'océan",
    title: "Drake des eaux",
    archetype: "dragon",
    art: { kind: "monster", emoji: "🌊", color: "#2f8fc4" },
    stats: monsterStats({ hp: 7100, ad: 276, armor: 100, mr: 100 }),
    passive: { kind: "regen", name: "Marée montante", description: "Régénère 1 % des PV max par tour.", pct: 0.01 },
    spells: [
      spell("Q", "Raz-de-marée", "Une vague écrasante.", 0, 2, [dmg("magic", { base: 355 }), debuff("attackSpeed", 0.3, 2, "Trempage")]),
      spell("W", "Source de vie", "Les eaux le soignent.", 0, 3, [heal({ base: 460 })]),
      spell("R", "Maelström", "Un tourbillon dévastateur.", 0, 5, [dmg("magic", { base: 180 }, 4)]),
    ],
    reward: { label: "Drake de l'océan : régénère 1,5 % des PV max par tour", stats: { hpRegenPct: 0.015 } },
  },
  {
    id: "dragon-cloud",
    name: "Dragon des nuages",
    title: "Drake du vent",
    archetype: "dragon",
    art: { kind: "monster", emoji: "🌪️", color: "#9fc3d6" },
    stats: monsterStats({ hp: 6350, ad: 284, armor: 90, mr: 90, attackSpeed: 0.4 }),
    passive: { kind: "none", name: "Vents porteurs", description: "Attaque très souvent deux fois." },
    spells: [
      spell("Q", "Rafale", "Une bourrasque tranchante.", 0, 2, [dmg("physical", { base: 115 }, 4)]),
      spell("W", "Dans les nuages", "Disparaît dans la tempête.", 0, 3, [dodge(1), buff("attackSpeed", 0.3, 2, "Vent arrière : +30 % double frappe")]),
      spell("R", "Ouragan", "Une tornade qui projette la cible.", 0, 5, [dmg("physical", { base: 475 }), stun(1)]),
    ],
    reward: { label: "Drake des nuages : +10 % de double frappe", stats: { attackSpeed: 0.1 } },
  },
  {
    id: "dragon-hextech",
    name: "Dragon hextech",
    title: "Drake mécanique",
    archetype: "dragon",
    art: { kind: "monster", emoji: "⚡", color: "#3fd0c9" },
    stats: monsterStats({ hp: 6800, ad: 292, armor: 110, mr: 110 }),
    passive: { kind: "stunEveryNSpells", name: "Surcharge", description: "Tous les 3 sorts, la décharge étourdit.", n: 3 },
    spells: [
      spell("Q", "Arc électrique", "Un éclair qui rebondit.", 0, 1, [dmg("magic", { base: 165 }, 2)]),
      spell("W", "Champ magnétique", "Affaiblit les défenses de la cible.", 0, 3, [debuff("armor", 35, 2, "Démagnétisation : -35 armure"), debuff("mr", 35, 2, "Démagnétisation : -35 RM")]),
      spell("R", "Tempête hextech", "Une décharge massive.", 0, 5, [dmg("magic", { base: 720 }), stun(1, 0.5)]),
    ],
    reward: { label: "Drake hextech : +8 % critique et +6 % double frappe", stats: { crit: 0.08, attackSpeed: 0.06 } },
  },
  {
    id: "dragon-chemtech",
    name: "Dragon chimtech",
    title: "Drake toxique",
    archetype: "dragon",
    art: { kind: "monster", emoji: "🧪", color: "#93c43b" },
    stats: monsterStats({ hp: 7100, ad: 284, armor: 100, mr: 100 }),
    passive: { kind: "lowHpBonus", name: "Ténacité chimique", description: "Sous 35 % de PV, +80 AD.", below: 0.35, stat: "ad", amount: 80 },
    spells: [
      spell("Q", "Nuage toxique", "Un gaz corrosif.", 0, 2, [dot("magic", { base: 180 }, 3, "Gaz chimtech")]),
      spell("W", "Morsure vampirique", "Une morsure qui draine.", 0, 2, [dmg("physical", { base: 330 }), heal({ base: 330 })]),
      spell("R", "Injection", "S'injecte un sérum instable.", 0, 5, [buff("ad", 70, 3, "Sérum : +70 AD"), buff("lifesteal", 0.2, 3, "Sérum : 20 % vol de vie")]),
    ],
    reward: { label: "Drake chimtech : +250 PV et 5 % de vol de vie", stats: { maxHp: 250, lifesteal: 0.05 } },
  },
];

export const BARON: FighterDef = {
  id: "baron",
  name: "Baron Nashor",
  title: "Fléau du Néant",
  archetype: "baron",
  art: { kind: "monster", emoji: "🪱", color: "#8b4fd6" },
  stats: monsterStats({ hp: 16550, ad: 373, armor: 130, mr: 120 }),
  passive: { kind: "everyNthAttack", name: "Présence du Néant", description: "Toutes les 2 attaques, inflige des dégâts bruts.", n: 2, bonus: { base: 225 }, type: "true" },
  spells: [
    spell("Q", "Acide corrosif", "Un jet d'acide qui ronge les défenses.", 0, 2, [dmg("magic", { base: 420 }), debuff("armor", 30, 2, "Corrosion : -30 armure"), debuff("mr", 30, 2, "Corrosion : -30 RM")]),
    spell("W", "Tentacules du Néant", "Des tentacules jaillissent du sol.", 0, 3, [dmg("physical", { base: 180 }, 3), stun(1, 0.5)]),
    spell("E", "Frappe du Néant", "Un coup de queue titanesque.", 0, 3, [dmg("physical", { base: 610 })]),
    spell("R", "Souffle du Néant", "Une vague d'énergie du Néant.", 0, 5, [dmg("magic", { base: 1045 }), debuff("ad", 40, 2, "Affaiblissement : -40 AD")]),
  ],
  phases: [
    { below: 0.6, label: "Le Baron s'enrage ! (+60 AD, +60 armure)", buff: { ad: 60, armor: 60 } },
    { below: 0.25, label: "Fureur du Néant ! (+35 % double frappe, 15 % vol de vie)", buff: { attackSpeed: 0.35, lifesteal: 0.15 } },
  ],
};

export const MONSTERS: FighterDef[] = [...JUNGLE, ...DRAGONS, BARON];
