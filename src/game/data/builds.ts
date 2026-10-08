// Builds recommandés : composants de départ, puis légendaires dans l'ordre.
// Utilisés par le joueur simulé et proposés au joueur dans la boutique.

export interface Build {
  /** Composants achetés en attendant de pouvoir s'offrir le prochain légendaire. */
  early: string[];
  /** Légendaires, dans l'ordre d'achat. */
  core: string[];
  /** Objets défensifs à avancer face à un adversaire surtout physique ou surtout magique. */
  versusPhysical: string;
  versusMagic: string;
}

const AD_FIGHTER: Build = {
  early: ["long-sword", "ruby-crystal"],
  core: ["steraks-gage", "bloodthirster", "sunfire", "force-of-nature", "thornmail", "warmogs"],
  versusPhysical: "thornmail",
  versusMagic: "force-of-nature",
};

const CRIT: Build = {
  early: ["cloak-of-agility", "long-sword"],
  core: ["infinity-edge", "phantom-dancer", "bloodthirster", "botrk", "force-of-nature", "steraks-gage"],
  versusPhysical: "steraks-gage",
  versusMagic: "force-of-nature",
};

const MAGE: Build = {
  early: ["amp-tome", "sapphire-crystal"],
  core: ["ludens", "rabadons", "zhonyas", "force-of-nature", "warmogs", "sunfire"],
  versusPhysical: "zhonyas",
  versusMagic: "force-of-nature",
};

const AP_TANK: Build = {
  early: ["cloth-armor", "amp-tome"],
  core: ["zhonyas", "sunfire", "rabadons", "thornmail", "force-of-nature", "warmogs"],
  versusPhysical: "thornmail",
  versusMagic: "force-of-nature",
};

const ENCHANTER: Build = {
  early: ["amp-tome", "ruby-crystal"],
  core: ["ludens", "warmogs", "zhonyas", "rabadons", "force-of-nature", "sunfire"],
  versusPhysical: "zhonyas",
  versusMagic: "force-of-nature",
};

export const BUILDS: Record<string, Build> = {
  garen: { ...AD_FIGHTER, core: ["steraks-gage", "sunfire", "bloodthirster", "force-of-nature", "thornmail", "warmogs"] },
  darius: AD_FIGHTER,
  yasuo: { ...CRIT, core: ["infinity-edge", "phantom-dancer", "bloodthirster", "steraks-gage", "force-of-nature", "thornmail"] },
  malphite: AP_TANK,
  leona: { ...AP_TANK, core: ["zhonyas", "ludens", "sunfire", "rabadons", "force-of-nature", "thornmail"] },
  zed: {
    early: ["long-sword", "vampiric-scepter"],
    core: ["bloodthirster", "steraks-gage", "infinity-edge", "botrk", "force-of-nature", "thornmail"],
    versusPhysical: "thornmail",
    versusMagic: "force-of-nature",
  },
  katarina: {
    early: ["amp-tome", "long-sword"],
    core: ["ludens", "rabadons", "zhonyas", "steraks-gage", "force-of-nature", "warmogs"],
    versusPhysical: "zhonyas",
    versusMagic: "force-of-nature",
  },
  ahri: MAGE,
  lux: MAGE,
  annie: { ...MAGE, core: ["ludens", "zhonyas", "rabadons", "force-of-nature", "warmogs", "sunfire"] },
  jinx: CRIT,
  ashe: CRIT,
  caitlyn: CRIT,
  soraka: ENCHANTER,
  janna: ENCHANTER,
};
