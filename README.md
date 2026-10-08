# Rift Gauntlet

Fan-game roguelike au tour par tour dans l'univers de League of Legends.

Choisis un champion, puis affronte tous les autres en duel, un par un. Viennent ensuite les monstres de la jungle, les six dragons élémentaires et enfin le Baron Nashor. Entre deux combats, tu achètes des potions, des élixirs et des objets. Tes PV ne remontent que partiellement d'un combat à l'autre, et une défaite fait tout recommencer.

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests du moteur (Vitest)
npm run build    # build de production
```

La partie est sauvegardée dans le navigateur (`localStorage`). Il n'y a ni serveur ni compte.

## Organisation

| Dossier | Contenu |
|---|---|
| `src/game/` | Le moteur, en TypeScript pur, sans React : il se teste et se simule hors interface. |
| `src/game/battle.ts` | Résolution des combats : dégâts, résistances, boucliers, effets sur la durée, étourdissements, phases de boss. |
| `src/game/ai.ts` | L'IA des adversaires. Elle estime la valeur de chaque action avec le moteur, puis la pondère selon la personnalité du type (tank, assassin…). |
| `src/game/run.ts` | La partie : ascension, or, boutique, niveaux, récompenses. |
| `src/game/data/` | Les champions, monstres et objets. Ajouter un champion se résume à ajouter une fiche. |
| `src/components/` | L'interface (Next.js + Tailwind) : accueil, sélection, carte et boutique, combat, bilan. |
| `scripts/` | Les outils d'équilibrage. |

Les images (portraits, sorts, objets, splash arts) viennent de [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon), le CDN officiel de Riot. Le navigateur les charge directement, et l'interface affiche un repli si une image ne charge pas.

## Équilibrage

Le moteur est déterministe : une graine donne toujours le même combat. On peut donc simuler des centaines de milliers de combats, répartis sur tous les cœurs.

- Les **adversaires** jouent avec l'IA du jeu (`src/game/ai.ts`).
- Le **joueur simulé** (`src/game/player-ai.ts`) existe en trois niveaux : débutant, moyen et expert. Il anticipe le tour adverse, suit le build recommandé du champion (`src/game/data/builds.ts`), l'adapte au prochain adversaire et fait parfois des erreurs.
- Les coefficients d'équilibrage sont générés dans `src/game/data/balance.ts` :
  - `power` : force d'un champion, pour ~50 % de victoires en duel ;
  - `runPower` : coefficient appliqué au champion joué en partie, pour ~30 % de victoires pour un joueur moyen ;
  - `hpScale` et `damageScale` : réglages des monstres (durée des combats, usure, dangerosité du Baron).

```bash
npm run calibrate                     # recalcule balance.ts (~10 min)
npm run calibrate -- --skip-duels     # garde les coefficients de duel
npm run report                        # rapport de validation (~730 000 combats, ~3 min) → reports/balance.json
npm run report -- --quick             # version rapide
npm run report -- --check             # échoue si un champion sort des fourchettes
npx tsx scripts/report-html.ts        # page de graphiques → reports/balance.html
npx tsx scripts/duel.ts ahri zed 9    # journal d'un duel
```

Le calibrage utilise un lot de graines, le rapport un autre lot jamais utilisé, pour ne pas mesurer un équilibrage taillé sur mesure. Après une modification de sort, de stats ou d'objet : `npm run calibrate`, puis `npm run report`.

## Mentions

Rift Gauntlet est un fan-game gratuit et non commercial. Il n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ou de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games, League of Legends et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc.
