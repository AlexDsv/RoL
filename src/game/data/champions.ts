import type { FighterDef } from "../types";
import { BALANCE } from "./balance";
import { buff, debuff, dmg, dodge, dot, energy, heal, mana, noResource, shield, spell, stats, stun } from "./builders";

export const CHAMPIONS: FighterDef[] = [
  // ------------------------------------------------------------- Combattants
  {
    id: "garen",
    name: "Garen",
    title: "la Force de Demacia",
    archetype: "fighter",
    art: { kind: "champion", ddKey: "Garen" },
    stats: stats({ hp: 690, hpPerLevel: 69, ad: 66, adPerLevel: 4.5, armor: 36, armorPerLevel: 4.7, mr: 32, mrPerLevel: 2.4 }, noResource),
    passive: { kind: "regen", name: "Persévérance", description: "Régénère 1,2 % des PV max au début de chaque tour.", pct: 0.012 },
    spells: [
      spell("Q", "Coup décisif", "Un coup puissant qui fait taire la cible.", 0, 2, [dmg("physical", { base: 40, perLevel: 9, ad: 1.2 }), debuff("ap", 20, 1, "Silence")]),
      spell("W", "Courage", "Gagne un bouclier et durcit sa défense.", 0, 4, [shield({ base: 60, perLevel: 12, maxHp: 0.08 }), buff("armor", 25, 2, "Courage : +25 armure"), buff("mr", 25, 2, "Courage : +25 RM")]),
      spell("E", "Jugement", "Tournoie sur lui-même et frappe trois fois.", 0, 3, [dmg("physical", { base: 16, perLevel: 4, ad: 0.4 }, 3), debuff("armor", 15, 2, "Armure brisée (-15)")]),
      spell("R", "Justice de Demacia", "Exécute la cible : dégâts bruts selon ses PV manquants.", 0, 6, [dmg("true", { base: 100, perLevel: 22, targetMissingHp: 0.25 })]),
    ],
  },
  {
    id: "darius",
    name: "Darius",
    title: "la Main de Noxus",
    archetype: "fighter",
    art: { kind: "champion", ddKey: "Darius" },
    stats: stats({ hp: 652, hpPerLevel: 77, ad: 64, adPerLevel: 5, armor: 39, armorPerLevel: 5.2, mr: 32, mrPerLevel: 2.8 }, mana(263, 20, 58)),
    passive: { kind: "bleedOnHit", name: "Hémorragie", description: "Les attaques font saigner la cible (cumulable 5 fois).", amount: { base: 6, perLevel: 1.2, ad: 0.1 }, turns: 3 },
    spells: [
      spell("Q", "Décimation", "Fait tournoyer sa hache et se soigne.", 30, 3, [dmg("physical", { base: 50, perLevel: 8, ad: 1.2 }), heal({ base: 20, maxHp: 0.04 })]),
      spell("W", "Frappe estropiante", "Une attaque qui ralentit la cible.", 30, 2, [dmg("physical", { base: 10, perLevel: 3, ad: 1.5 }), debuff("attackSpeed", 0.3, 2, "Ralentissement")]),
      spell("E", "Appréhender", "Attire la cible et perce son armure.", 45, 5, [stun(1), debuff("armor", 20, 3, "Armure percée (-20)")]),
      spell("R", "Guillotine noxienne", "Bondit et exécute la cible.", 100, 5, [dmg("true", { base: 100, perLevel: 22, ad: 0.75, targetMissingHp: 0.2 })]),
    ],
  },
  {
    id: "yasuo",
    name: "Yasuo",
    title: "l'Implacable",
    archetype: "fighter",
    art: { kind: "champion", ddKey: "Yasuo" },
    stats: stats({ hp: 590, hpPerLevel: 77, ad: 60, adPerLevel: 3.2, armor: 30, armorPerLevel: 4.6, mr: 32, mrPerLevel: 2.8, crit: 0.2 }, noResource),
    passive: { kind: "startShield", name: "Voie du vagabond", description: "Un bouclier de 8 % des PV max, rechargé tous les 4 rounds. Coups critiques plus fréquents.", pctMaxHp: 0.08, every: 4 },
    spells: [
      spell("Q", "Tempête d'acier", "Une estocade rapide, sans temps de recharge.", 0, 1, [dmg("physical", { base: 20, perLevel: 6, ad: 0.95 })]),
      spell("W", "Mur de vent", "Bloque la prochaine attaque ou le prochain sort.", 0, 4, [dodge(1)]),
      spell("E", "Lame tranchante", "Traverse la cible en la tailladant.", 0, 2, [dmg("magic", { base: 60, perLevel: 9, ad: 0.2 }), buff("crit", 0.15, 2, "Flux : +15 % critique")]),
      spell("R", "Dernier soupir", "Projette la cible dans les airs et la frappe à répétition.", 0, 6, [dmg("physical", { base: 150, perLevel: 18, ad: 1.3 }), stun(1), debuff("armor", 30, 2, "Armure ignorée (-30)")]),
    ],
  },

  // ------------------------------------------------------------- Tanks
  {
    id: "malphite",
    name: "Malphite",
    title: "l'Éclat du Monolithe",
    archetype: "tank",
    art: { kind: "champion", ddKey: "Malphite" },
    stats: stats({ hp: 665, hpPerLevel: 73, ad: 62, adPerLevel: 4, armor: 40, armorPerLevel: 5.5, mr: 28, mrPerLevel: 2.8 }, mana(280, 28, 60)),
    passive: { kind: "startShield", name: "Bouclier de granit", description: "Un bouclier de 10 % des PV max, rechargé tous les 4 rounds.", pctMaxHp: 0.1, every: 4 },
    spells: [
      spell("Q", "Éclat sismique", "Projette un fragment de roche qui ralentit la cible.", 70, 2, [dmg("magic", { base: 70, perLevel: 12, ap: 0.6 }), debuff("attackSpeed", 0.25, 2, "Ralentissement")]),
      spell("W", "Coup de tonnerre", "Renforce sa carapace.", 30, 4, [buff("armor", 40, 3, "Coup de tonnerre : +40 armure"), buff("ad", 20, 3, "Coup de tonnerre : +20 AD")]),
      spell("E", "Frappe du sol", "Frappe le sol ; dégâts selon son armure.", 50, 3, [dmg("magic", { base: 60, perLevel: 8, ap: 0.6, armor: 0.4 }), debuff("attackSpeed", 0.3, 2, "Vitesse d'attaque réduite")]),
      spell("R", "Force imparable", "Charge et projette la cible dans les airs.", 100, 6, [dmg("magic", { base: 150, perLevel: 25, ap: 0.8 }), stun(1)]),
    ],
  },
  {
    id: "leona",
    name: "Leona",
    title: "l'Aube radieuse",
    archetype: "tank",
    art: { kind: "champion", ddKey: "Leona" },
    stats: stats({ hp: 646, hpPerLevel: 71, ad: 60, adPerLevel: 3, armor: 43, armorPerLevel: 4.8, mr: 32, mrPerLevel: 2.8 }, mana(302, 28, 40)),
    passive: { kind: "everyNthAttack", name: "Lumière du soleil", description: "Toutes les 3 attaques, la lumière solaire inflige des dégâts magiques.", n: 3, bonus: { base: 30, perLevel: 9 }, type: "magic" },
    spells: [
      spell("Q", "Bouclier de l'aube", "Frappe avec son bouclier et étourdit.", 45, 5, [dmg("magic", { base: 55, perLevel: 10, ap: 0.3 }), stun(1)]),
      spell("W", "Éclipse", "Gagne des résistances puis explose.", 50, 4, [buff("armor", 35, 2, "Éclipse : +35 armure"), buff("mr", 35, 2, "Éclipse : +35 RM"), dmg("magic", { base: 60, perLevel: 11, ap: 0.4 })]),
      spell("E", "Lame du zénith", "Projette une lame solaire.", 40, 2, [dmg("magic", { base: 70, perLevel: 12, ap: 0.4 })]),
      spell("R", "Éruption solaire", "Fait s'abattre un rayon de soleil.", 100, 6, [dmg("magic", { base: 130, perLevel: 22, ap: 0.8 }), stun(1)]),
    ],
  },

  // ------------------------------------------------------------- Assassins
  {
    id: "zed",
    name: "Zed",
    title: "le Maître des ombres",
    archetype: "assassin",
    art: { kind: "champion", ddKey: "Zed" },
    stats: stats({ hp: 654, hpPerLevel: 69, ad: 63, adPerLevel: 3.4, armor: 32, armorPerLevel: 4.7, mr: 32, mrPerLevel: 2.8 }, energy),
    passive: { kind: "everyNthAttack", name: "Mépris des faibles", description: "Toutes les 3 attaques, inflige 8 % des PV max de la cible en dégâts magiques.", n: 3, bonus: { base: 0, targetMaxHp: 0.08 }, type: "magic" },
    spells: [
      spell("Q", "Shuriken rasoir", "Lui et son ombre lancent un shuriken.", 75, 1, [dmg("physical", { base: 35, perLevel: 10, ad: 0.6 }, 2)]),
      spell("W", "Ombre vivante", "Se cache dans son ombre et gagne de l'énergie.", 40, 4, [dodge(1), buff("ad", 25, 2, "Ombre vivante : +25 AD")]),
      spell("E", "Taillade des ombres", "Lui et son ombre taillent tout autour.", 50, 2, [dmg("physical", { base: 30, perLevel: 9, ad: 0.5 }, 2), debuff("attackSpeed", 0.2, 2, "Ralentissement")]),
      spell("R", "Marque de la mort", "Devient intouchable et marque la cible.", 0, 6, [dodge(1), dmg("physical", { base: 60, perLevel: 10, ad: 1 }), dot("true", { base: 20, perLevel: 6, targetMissingHp: 0.08 }, 2, "Marque de la mort")]),
    ],
  },
  {
    id: "katarina",
    name: "Katarina",
    title: "la Lame sinistre",
    archetype: "assassin",
    art: { kind: "champion", ddKey: "Katarina" },
    stats: stats({ hp: 672, hpPerLevel: 76, ad: 58, adPerLevel: 3.2, armor: 28, armorPerLevel: 4.7, mr: 32, mrPerLevel: 2.8, ap: 0, apPerLevel: 3 }, noResource),
    passive: { kind: "lowHpBonus", name: "Voracité", description: "Sous 40 % de PV, gagne +40 puissance.", below: 0.4, stat: "ap", amount: 40 },
    spells: [
      spell("Q", "Lame rebondissante", "Lance une dague qui rebondit.", 0, 1, [dmg("magic", { base: 90, perLevel: 16, ap: 0.35 })]),
      spell("W", "Préparation", "Lance une dague en l'air et s'esquive.", 0, 4, [dodge(1), buff("attackSpeed", 0.4, 2, "Préparation : +40 % double frappe")]),
      spell("E", "Shunpo", "Se téléporte et frappe.", 0, 2, [dmg("magic", { base: 55, perLevel: 12, ad: 0.4, ap: 0.25 }), dmg("physical", { base: 0, ad: 0.5 })]),
      spell("R", "Lotus de la mort", "Une tempête de lames qui empêche les soins.", 0, 6, [dmg("magic", { base: 35, perLevel: 9, ap: 0.19 }, 6), debuff("hpRegenPct", 0.02, 3, "Blessures graves")]),
    ],
  },

  // ------------------------------------------------------------- Mages
  {
    id: "ahri",
    name: "Ahri",
    title: "le Renard à neuf queues",
    archetype: "mage",
    art: { kind: "champion", ddKey: "Ahri" },
    stats: stats({ hp: 590, hpPerLevel: 73, ad: 53, adPerLevel: 3, armor: 21, armorPerLevel: 4.2, mr: 30, mrPerLevel: 2.1, ap: 0, apPerLevel: 2.5 }, mana(418, 38, 25)),
    passive: { kind: "spellVamp", name: "Vol d'essence", description: "Ses sorts lui rendent 6 % des dégâts infligés.", pct: 0.06 },
    spells: [
      spell("Q", "Orbe d'illusion", "Un orbe qui frappe à l'aller (magique) et au retour (brut).", 55, 1, [dmg("magic", { base: 32, perLevel: 5, ap: 0.35 }), dmg("true", { base: 32, perLevel: 5, ap: 0.35 })]),
      spell("W", "Feu de renard", "Trois feux follets s'abattent sur la cible.", 40, 2, [dmg("magic", { base: 28, perLevel: 5, ap: 0.3 }, 3)]),
      spell("E", "Charme", "Un baiser qui charme la cible.", 70, 5, [dmg("magic", { base: 80, perLevel: 12, ap: 0.6 }), stun(1), debuff("mr", 20, 2, "Charme : -20 RM")]),
      spell("R", "Vol spirituel", "Bondit à trois reprises, insaisissable.", 100, 6, [dodge(1), dmg("magic", { base: 45, perLevel: 8, ap: 0.3 }, 3)]),
    ],
  },
  {
    id: "lux",
    name: "Lux",
    title: "la Dame de lumière",
    archetype: "mage",
    art: { kind: "champion", ddKey: "Lux" },
    stats: stats({ hp: 580, hpPerLevel: 69, ad: 54, adPerLevel: 3.3, armor: 21, armorPerLevel: 5.2, mr: 30, mrPerLevel: 2.1, ap: 0, apPerLevel: 4.5 }, mana(480, 40, 23)),
    passive: { kind: "everyNthAttack", name: "Illumination", description: "Toutes les 2 attaques, la lumière explose en dégâts magiques.", n: 2, bonus: { base: 30, perLevel: 10, ap: 0.2 }, type: "magic" },
    spells: [
      spell("Q", "Entrave lumineuse", "Immobilise la cible.", 50, 5, [dmg("magic", { base: 80, perLevel: 11, ap: 0.6 }), stun(1)]),
      spell("W", "Barrière prismatique", "Un bouclier de lumière.", 60, 4, [shield({ base: 60, perLevel: 15, ap: 0.35 })]),
      spell("E", "Singularité lucide", "Une zone de lumière qui ralentit puis explose.", 70, 2, [dmg("magic", { base: 70, perLevel: 12, ap: 0.65 }), debuff("attackSpeed", 0.3, 2, "Ralentissement")]),
      spell("R", "Étincelle finale", "Un rayon de lumière dévastateur.", 100, 5, [dmg("magic", { base: 170, perLevel: 28, ap: 1 })]),
    ],
  },
  {
    id: "annie",
    name: "Annie",
    title: "l'Enfant des ténèbres",
    archetype: "mage",
    art: { kind: "champion", ddKey: "Annie" },
    stats: stats({ hp: 600, hpPerLevel: 71, ad: 50, adPerLevel: 2.6, armor: 23, armorPerLevel: 4, mr: 30, mrPerLevel: 2.1, ap: 0, apPerLevel: 4 }, mana(418, 38, 25)),
    passive: { kind: "stunEveryNSpells", name: "Pyromanie", description: "Tous les 4 sorts offensifs, étourdit la cible.", n: 4 },
    spells: [
      spell("Q", "Désintégration", "Une boule de feu.", 60, 1, [dmg("magic", { base: 90, perLevel: 13, ap: 0.75 })]),
      spell("W", "Incinération", "Un cône de flammes.", 70, 2, [dmg("magic", { base: 85, perLevel: 14, ap: 0.85 })]),
      spell("E", "Bouclier de flammes", "Un bouclier qui brûle les assaillants.", 40, 4, [shield({ base: 50, perLevel: 12, ap: 0.4 }), buff("thorns", 0.3, 2, "Bouclier de flammes : renvoie 30 %")]),
      spell("R", "Invocation : Tibbers", "Invoque Tibbers, qui écrase puis brûle la cible.", 100, 6, [dmg("magic", { base: 150, perLevel: 25, ap: 0.75 }), dot("magic", { base: 25, perLevel: 5, ap: 0.12 }, 3, "Brûlure de Tibbers")]),
    ],
  },

  // ------------------------------------------------------------- Tireurs
  {
    id: "jinx",
    name: "Jinx",
    title: "la Gâchette folle",
    archetype: "marksman",
    art: { kind: "champion", ddKey: "Jinx" },
    stats: stats({ hp: 630, hpPerLevel: 74, ad: 59, adPerLevel: 5.5, armor: 26, armorPerLevel: 4.7, mr: 30, mrPerLevel: 2.1, crit: 0.15, attackSpeed: 0.25 }, mana(260, 25, 50)),
    passive: { kind: "lowHpBonus", name: "Excitée !", description: "Sous 50 % de PV, +30 % de double frappe.", below: 0.5, stat: "attackSpeed", amount: 0.3 },
    spells: [
      spell("Q", "Changement d'arme !", "Passe à la mitrailleuse : tirs plus rapides.", 20, 4, [buff("attackSpeed", 0.4, 3, "Mitrailleuse : +40 % double frappe"), buff("ad", 20, 3, "Mitrailleuse : +20 AD")]),
      spell("W", "Zap !", "Un tir électrique qui ralentit.", 50, 3, [dmg("physical", { base: 20, perLevel: 10, ad: 1.6 }), debuff("attackSpeed", 0.3, 2, "Ralentissement")]),
      spell("E", "Croque-flammes !", "Des grenades qui immobilisent la cible.", 70, 5, [stun(1), dmg("magic", { base: 70, perLevel: 10, ap: 1 })]),
      spell("R", "Super-méga-roquette de la mort !", "Une roquette qui inflige plus de dégâts aux cibles blessées.", 100, 5, [dmg("physical", { base: 150, perLevel: 25, ad: 1.1, targetMissingHp: 0.25 })]),
    ],
  },
  {
    id: "ashe",
    name: "Ashe",
    title: "l'Archère de givre",
    archetype: "marksman",
    art: { kind: "champion", ddKey: "Ashe" },
    stats: stats({ hp: 610, hpPerLevel: 71, ad: 59, adPerLevel: 5.5, armor: 26, armorPerLevel: 4.6, mr: 30, mrPerLevel: 2.1, attackSpeed: 0.15 }, mana(280, 25, 35)),
    passive: { kind: "everyNthAttack", name: "Tir glacial", description: "Toutes les 3 attaques, une flèche glacée inflige des dégâts bonus.", n: 3, bonus: { base: 10, perLevel: 4, ad: 0.5 }, type: "physical" },
    spells: [
      spell("Q", "Concentration du ranger", "Une rafale de flèches.", 30, 4, [buff("attackSpeed", 0.45, 3, "Concentration : +45 % double frappe"), buff("ad", 15, 3, "Concentration : +15 AD")]),
      spell("W", "Salve", "Une volée de flèches glacées.", 50, 2, [dmg("physical", { base: 40, perLevel: 12, ad: 1.2 }), debuff("attackSpeed", 0.2, 2, "Givre")]),
      spell("E", "Rapace", "Repère les points faibles de la cible.", 30, 4, [buff("crit", 0.3, 3, "Rapace : +30 % critique")]),
      spell("R", "Flèche de cristal enchantée", "Une flèche géante qui gèle la cible.", 100, 6, [dmg("magic", { base: 150, perLevel: 22, ap: 1 }), stun(1)]),
    ],
  },
  {
    id: "caitlyn",
    name: "Caitlyn",
    title: "le Shérif de Piltover",
    archetype: "marksman",
    art: { kind: "champion", ddKey: "Caitlyn" },
    stats: stats({ hp: 580, hpPerLevel: 75, ad: 62, adPerLevel: 5.5, armor: 27, armorPerLevel: 4.7, mr: 30, mrPerLevel: 2.1, crit: 0.1 }, mana(315, 25, 40)),
    passive: { kind: "everyNthAttack", name: "Tir dans la tête", description: "Toutes les 4 attaques, un tir dans la tête inflige de lourds dégâts.", n: 4, bonus: { base: 30, perLevel: 8, ad: 1 }, type: "physical" },
    spells: [
      spell("Q", "Pacificateur de Piltover", "Un tir perforant.", 50, 2, [dmg("physical", { base: 50, perLevel: 10, ad: 1.3 })]),
      spell("W", "Piège yordle", "Un piège qui peut immobiliser la cible.", 30, 3, [stun(1, 0.6), dmg("physical", { base: 20, perLevel: 6, ad: 0.4 })]),
      spell("E", "Filet calibre 90", "Tire un filet et recule d'un bond.", 75, 4, [dmg("magic", { base: 70, perLevel: 10, ap: 0.8 }), dodge(1)]),
      spell("R", "As de la gâchette", "Un tir précis à longue portée.", 100, 6, [dmg("physical", { base: 250, perLevel: 25, ad: 1.5 })]),
    ],
  },

  // ------------------------------------------------------------- Supports
  {
    id: "soraka",
    name: "Soraka",
    title: "l'Enfant des étoiles",
    archetype: "support",
    art: { kind: "champion", ddKey: "Soraka" },
    stats: stats({ hp: 605, hpPerLevel: 62, ad: 50, adPerLevel: 3, armor: 32, armorPerLevel: 5.2, mr: 30, mrPerLevel: 2.1, ap: 0, apPerLevel: 3 }, mana(425, 45, 40)),
    passive: { kind: "regen", name: "Salut", description: "Régénère 1 % des PV max au début de chaque tour.", pct: 0.01 },
    spells: [
      spell("Q", "Frappe stellaire", "Une étoile qui frappe et la soigne.", 50, 1, [dmg("magic", { base: 55, perLevel: 9, ap: 0.35 }), heal({ base: 15, perLevel: 3, ap: 0.15 })]),
      spell("W", "Infusion astrale", "Canalise l'énergie des étoiles pour se soigner.", 60, 4, [heal({ base: 50, perLevel: 10, ap: 0.4, maxHp: 0.03 })]),
      spell("E", "Équinoxe", "Une zone qui réduit la cible au silence.", 70, 4, [dmg("magic", { base: 60, perLevel: 10, ap: 0.4 }), stun(1, 0.6)]),
      spell("R", "Souhait", "Un soin céleste massif.", 100, 6, [heal({ base: 120, perLevel: 20, ap: 0.6, maxHp: 0.06 })]),
    ],
  },
  {
    id: "janna",
    name: "Janna",
    title: "la Furie de la tempête",
    archetype: "support",
    art: { kind: "champion", ddKey: "Janna" },
    stats: stats({ hp: 600, hpPerLevel: 63, ad: 47, adPerLevel: 2.5, armor: 28, armorPerLevel: 4.5, mr: 30, mrPerLevel: 2.1, ap: 0, apPerLevel: 3 }, mana(360, 45, 50)),
    passive: { kind: "everyNthAttack", name: "Vent arrière", description: "Toutes les 2 attaques, une rafale inflige des dégâts magiques.", n: 2, bonus: { base: 30, perLevel: 8, ap: 0.25 }, type: "magic" },
    spells: [
      spell("Q", "Chasse-tornade", "Une tornade qui projette la cible.", 60, 5, [dmg("magic", { base: 60, perLevel: 10, ap: 0.35 }), stun(1)]),
      spell("W", "Zéphyr", "Un élémentaire de l'air frappe et ralentit.", 50, 2, [dmg("magic", { base: 65, perLevel: 12, ap: 0.5 }), debuff("attackSpeed", 0.3, 2, "Ralentissement")]),
      spell("E", "Œil de la tempête", "Un bouclier qui renforce ses attaques.", 70, 3, [shield({ base: 70, perLevel: 16, ap: 0.5 }), buff("ad", 20, 2, "Œil de la tempête : +20 AD")]),
      spell("R", "Mousson", "Repousse la cible et se soigne.", 100, 6, [heal({ base: 120, perLevel: 25, ap: 0.5 }), debuff("ad", 25, 2, "Recul : -25 AD")]),
    ],
  },
];

// Coefficients d'équilibrage générés par scripts/calibrate.ts.
for (const c of CHAMPIONS) Object.assign(c, BALANCE[c.id]);
