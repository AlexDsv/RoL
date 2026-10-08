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

Le moteur est déterministe : une graine donne toujours le même combat. On peut donc simuler des milliers de combats.

```bash
npm run balance             # duels 1v1 aux niveaux 1, 9 et 18, puis parties complètes simulées
npm run balance -- 40 duels # uniquement les duels
npm run tune                # recalcule le coefficient « power » de chaque champion (~50 % en duel)
npx tsx scripts/duel.ts ahri zed 9   # journal d'un duel
```

Après une modification de sort ou de stats, relance `npm run tune`, reporte les coefficients dans `src/game/data/champions.ts`, puis vérifie les parties complètes avec `npm run balance`.

## Mentions

Rift Gauntlet est un fan-game gratuit et non commercial. Il n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ou de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games, League of Legends et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc.
