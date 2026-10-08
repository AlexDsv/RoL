@AGENTS.md

# Rift Gauntlet

- Jeu en français : textes d'interface et journaux de combat en français, formulations neutres en genre (« subit un étourdissement », pas « est étourdi »).
- `src/game/` reste du TypeScript pur, sans import de React ni de `@/components`.
- Toute modification d'équilibrage se vérifie avec `npm run balance` ; recalibrer avec `npm run tune` si les duels s'écartent de 35–65 %.
- Avant de livrer : `npx tsc --noEmit`, `npx eslint src scripts`, `npm test`, `npm run build`.
