@AGENTS.md

# Rift Gauntlet

- Jeu en français : textes d'interface et journaux de combat en français, formulations neutres en genre (« subit un étourdissement », pas « est étourdi »).
- `src/game/` reste du TypeScript pur, sans import de React ni de `@/components`.
- Après toute modification de sort, de stats, d'objet ou de monstre : `npm run calibrate` puis `npm run report` ; ne jamais modifier `src/game/data/balance.ts` à la main.
- Avant de livrer : `npx tsc --noEmit`, `npx eslint src scripts`, `npm test`, `npm run build`.
