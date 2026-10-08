// Génère reports/balance.html à partir de reports/balance.json.
//   npx tsx scripts/report-html.ts

import { readFileSync, writeFileSync } from "node:fs";

type Skill = "beginner" | "average" | "expert";
interface ChampionRun {
  id: string;
  runs: number;
  winRate: number;
  ci: [number, number];
  avgStage: number;
  deaths: Record<"champions" | "jungle" | "dragons" | "baron", number>;
}
interface Report {
  generatedAt: string;
  commit: string;
  quick: boolean;
  target: number;
  fights: number;
  minutes: number;
  champions: { id: string; name: string; archetype: string; power: number; runPower: number; difficulty: number }[];
  duels: { levels: number[]; perChampion: { id: string; winRate: number; ci: [number, number]; byLevel: number[] }[]; matrix: (number | null)[][]; rounds: number[]; total: number };
  runs: Record<Skill, { runs: number; winRate: number; ci: [number, number]; perChampion: ChampionRun[] }>;
  enemies: { id: string; name: string; chapter: string; fights: number; lossRate: number; hpLost: number; rounds: number; potions: number }[];
}

const report = JSON.parse(readFileSync("reports/balance.json", "utf8")) as Report;
const name = Object.fromEntries(report.champions.map((c) => [c.id, c.name]));
const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits).replace(".", ",")} %`;
const num = (x: number) => Math.round(x).toLocaleString("fr-FR");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ARCH: Record<string, string> = { fighter: "Combattant", tank: "Tank", assassin: "Assassin", mage: "Mage", marksman: "Tireur", support: "Support" };
const DIFF = ["", "Facile", "Moyenne", "Difficile"];

const avg = report.runs.average;
const sorted = [...avg.perChampion].sort((a, b) => b.winRate - a.winRate);
const lo = sorted.at(-1)!;
const hi = sorted[0];
const tolerance = 0.06;

// --------------------------------------------------------------- Graphique 1 : victoires par niveau de joueur
function dumbbell(): string {
  const rowH = 30;
  const left = 110;
  const width = 720;
  const plotW = width - left - 24;
  const max = Math.max(0.7, ...(["beginner", "average", "expert"] as Skill[]).flatMap((s) => report.runs[s].perChampion.map((c) => c.winRate))) ;
  const x = (v: number) => left + (v / max) * plotW;
  const height = sorted.length * rowH + 40;
  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].filter((t) => t <= max + 1e-9);
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="c1-title" class="chart">`;
  svg += `<rect x="${x(report.target - tolerance)}" y="0" width="${x(report.target + tolerance) - x(report.target - tolerance)}" height="${height - 30}" fill="var(--band)"/>`;
  for (const t of ticks) {
    svg += `<line x1="${x(t)}" x2="${x(t)}" y1="0" y2="${height - 30}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${x(t)}" y="${height - 12}" class="tick" text-anchor="middle">${Math.round(t * 100)} %</text>`;
  }
  svg += `<line x1="${x(report.target)}" x2="${x(report.target)}" y1="0" y2="${height - 30}" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  sorted.forEach((c, i) => {
    const y = i * rowH + rowH / 2 + 4;
    const b = report.runs.beginner.perChampion.find((p) => p.id === c.id)!;
    const e = report.runs.expert.perChampion.find((p) => p.id === c.id)!;
    svg += `<text x="${left - 12}" y="${y + 4}" class="label" text-anchor="end">${esc(name[c.id])}</text>`;
    svg += `<line x1="${x(Math.min(b.winRate, e.winRate))}" x2="${x(Math.max(b.winRate, e.winRate))}" y1="${y}" y2="${y}" stroke="var(--muted-line)" stroke-width="2"/>`;
    svg += `<line x1="${x(c.ci[0])}" x2="${x(c.ci[1])}" y1="${y}" y2="${y}" stroke="var(--s1)" stroke-width="6" stroke-linecap="round" opacity="0.45"/>`;
    const dot = (v: number, color: string, label: string, shape: "circle" | "square" | "diamond") => {
      const tip = esc(`${name[c.id]} · ${label} : ${pct(v)}`);
      const cx = x(v);
      const mark =
        shape === "circle"
          ? `<circle cx="${cx}" cy="${y}" r="5.5" fill="${color}" stroke="var(--surface)" stroke-width="2"/>`
          : shape === "square"
            ? `<rect x="${cx - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="${color}" stroke="var(--surface)" stroke-width="2"/>`
            : `<rect x="${cx - 5}" y="${y - 5}" width="10" height="10" fill="${color}" stroke="var(--surface)" stroke-width="2" transform="rotate(45 ${cx} ${y})"/>`;
      return `<g data-tip="${tip}"><circle cx="${cx}" cy="${y}" r="12" fill="transparent"/>${mark}</g>`;
    };
    svg += dot(b.winRate, "var(--s2)", "Débutant", "square");
    svg += dot(e.winRate, "var(--s3)", "Expert", "diamond");
    svg += dot(c.winRate, "var(--s1)", `Moyen (IC 95 % : ${pct(c.ci[0])} – ${pct(c.ci[1])})`, "circle");
  });
  return svg + `</svg>`;
}

// --------------------------------------------------------------- Graphique 2 : où s'arrêtent les parties
const STAGES: { key: "champions" | "jungle" | "dragons" | "baron" | "won"; label: string; color: string }[] = [
  { key: "champions", label: "Battu par un champion", color: "var(--s1)" },
  { key: "jungle", label: "Battu dans la jungle", color: "var(--s2)" },
  { key: "dragons", label: "Battu par un dragon", color: "var(--s3)" },
  { key: "baron", label: "Battu par le Baron", color: "var(--s4)" },
  { key: "won", label: "Victoire", color: "var(--s5)" },
];

function stacked(): string {
  const rowH = 26;
  const left = 110;
  const width = 720;
  const plotW = width - left - 16;
  const height = sorted.length * rowH + 8;
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="c2-title" class="chart">`;
  sorted.forEach((c, i) => {
    const y = i * rowH + 4;
    svg += `<text x="${left - 12}" y="${y + rowH / 2 + 2}" class="label" text-anchor="end">${esc(name[c.id])}</text>`;
    let cursor = left;
    for (const s of STAGES) {
      const share = s.key === "won" ? c.winRate : c.deaths[s.key];
      const w = share * plotW;
      if (w <= 0) continue;
      const gap = 2;
      svg += `<rect x="${cursor}" y="${y}" width="${Math.max(0, w - gap)}" height="${rowH - 8}" rx="${w > 8 ? 3 : 1}" fill="${s.color}" data-tip="${esc(`${name[c.id]} · ${s.label} : ${pct(share)}`)}"/>`;
      if (w > 34) svg += `<text x="${cursor + (w - gap) / 2}" y="${y + rowH / 2}" class="inbar" text-anchor="middle">${Math.round(share * 100)}</text>`;
      cursor += w;
    }
  });
  return svg + `</svg>`;
}

// --------------------------------------------------------------- Heatmaps (divergent bleu ↔ rouge autour de 50 %)
function diverging(v: number): string {
  const t = Math.max(-1, Math.min(1, (v - 0.5) / 0.25));
  const mid = [56, 56, 53];
  const pos = [57, 135, 229];
  const neg = [230, 103, 103];
  const end = t >= 0 ? pos : neg;
  const k = Math.abs(t);
  const c = mid.map((m, i) => Math.round(m + (end[i] - m) * k));
  return `rgb(${c.join(",")})`;
}

function levelHeatmap(): string {
  const levels = report.duels.levels;
  const rows = [...report.duels.perChampion].sort((a, b) => b.winRate - a.winRate);
  const cell = 52;
  const left = 110;
  const top = 26;
  const width = left + (levels.length + 1) * (cell + 4) + 8;
  const height = top + rows.length * 26 + 4;
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="c3-title" class="chart chart-narrow">`;
  levels.forEach((lv, j) => (svg += `<text x="${left + j * (cell + 4) + cell / 2}" y="16" class="tick" text-anchor="middle">Niv. ${lv}</text>`));
  svg += `<text x="${left + levels.length * (cell + 4) + cell / 2}" y="16" class="tick strong" text-anchor="middle">Total</text>`;
  rows.forEach((r, i) => {
    const y = top + i * 26;
    svg += `<text x="${left - 12}" y="${y + 15}" class="label" text-anchor="end">${esc(name[r.id])}</text>`;
    [...r.byLevel, r.winRate].forEach((v, j) => {
      const x = left + j * (cell + 4);
      const label = j < levels.length ? `niveau ${levels[j]}` : "tous niveaux";
      svg += `<rect x="${x}" y="${y}" width="${cell}" height="22" rx="3" fill="${diverging(v)}" data-tip="${esc(`${name[r.id]} · ${label} : ${pct(v)} de victoires en duel`)}"/>`;
      svg += `<text x="${x + cell / 2}" y="${y + 15}" class="incell" text-anchor="middle">${Math.round(v * 100)}</text>`;
    });
  });
  return svg + `</svg>`;
}

function matrix(): string {
  const ids = report.champions.map((c) => c.id);
  const cell = 34;
  const left = 96;
  const top = 96;
  const size = left + ids.length * (cell + 2) + 4;
  let svg = `<svg viewBox="0 0 ${size} ${top + ids.length * (cell + 2) + 4}" role="img" aria-labelledby="c4-title" class="chart chart-square">`;
  ids.forEach((id, j) => {
    const x = left + j * (cell + 2) + cell / 2;
    svg += `<text transform="translate(${x + 4} ${top - 8}) rotate(-55)" class="tick">${esc(name[id])}</text>`;
  });
  ids.forEach((a, i) => {
    const y = top + i * (cell + 2);
    svg += `<text x="${left - 10}" y="${y + cell / 2 + 4}" class="label" text-anchor="end">${esc(name[a])}</text>`;
    ids.forEach((b, j) => {
      const v = report.duels.matrix[i][j];
      const x = left + j * (cell + 2);
      if (v === null) {
        svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="var(--grid)"/>`;
        return;
      }
      svg += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${diverging(v)}" data-tip="${esc(`${name[a]} contre ${name[b]} : ${pct(v)} de victoires`)}"/>`;
      if (Math.abs(v - 0.5) >= 0.12) svg += `<text x="${x + cell / 2}" y="${y + cell / 2 + 4}" class="incell" text-anchor="middle">${Math.round(v * 100)}</text>`;
    });
  });
  return svg + `</svg>`;
}

// --------------------------------------------------------------- Graphique 5 : les monstres
const CHAPTER: Record<string, string> = { champions: "Champions", jungle: "Jungle", dragons: "Dragons", baron: "Baron" };

function enemiesChart(): string {
  const groups = ["jungle", "dragons", "baron", "champions"];
  const rows = groups.flatMap((g) => report.enemies.filter((e) => e.chapter === g).sort((a, b) => b.lossRate - a.lossRate));
  const rowH = 24;
  const left = 150;
  const width = 720;
  const plotW = width - left - 70;
  const max = Math.max(0.1, ...rows.map((r) => r.lossRate));
  let y = 0;
  let svg = "";
  let last = "";
  for (const r of rows) {
    if (r.chapter !== last) {
      y += last ? 14 : 0;
      svg += `<text x="0" y="${y + 14}" class="group">${CHAPTER[r.chapter]}</text>`;
      y += 22;
      last = r.chapter;
    }
    const w = (r.lossRate / max) * plotW;
    svg += `<text x="${left - 12}" y="${y + 15}" class="label" text-anchor="end">${esc(r.name)}</text>`;
    svg += `<rect x="${left}" y="${y + 3}" width="${Math.max(2, w)}" height="${rowH - 8}" rx="3" fill="var(--s1)" data-tip="${esc(
      `${r.name} : ${pct(r.lossRate)} de défaites sur ${num(r.fights)} combats · ${pct(r.hpLost, 0)} des PV perdus en moyenne · ${r.rounds.toFixed(1).replace(".", ",")} rounds · ${r.potions.toFixed(2).replace(".", ",")} potion(s)`,
    )}"/>`;
    svg += `<text x="${left + Math.max(2, w) + 8}" y="${y + 15}" class="value">${pct(r.lossRate)}</text>`;
    y += rowH;
  }
  return `<svg viewBox="0 0 ${width} ${y + 6}" role="img" aria-labelledby="c5-title" class="chart">${svg}</svg>`;
}

// --------------------------------------------------------------- Tableau
function tableRows(): string {
  return sorted
    .map((c) => {
      const meta = report.champions.find((x) => x.id === c.id)!;
      const d = report.duels.perChampion.find((x) => x.id === c.id)!;
      const b = report.runs.beginner.perChampion.find((x) => x.id === c.id)!;
      const e = report.runs.expert.perChampion.find((x) => x.id === c.id)!;
      const ok = Math.abs(c.winRate - report.target) <= tolerance && d.winRate >= 0.4 && d.winRate <= 0.6;
      return `<tr>
        <th scope="row">${esc(meta.name)}</th><td>${ARCH[meta.archetype] ?? meta.archetype}</td>
        <td>${pct(d.winRate)}</td><td>${pct(b.winRate)}</td><td><strong>${pct(c.winRate)}</strong> <span class="ci">${pct(c.ci[0])}–${pct(c.ci[1])}</span></td><td>${pct(e.winRate)}</td>
        <td>${c.avgStage.toFixed(1).replace(".", ",")}</td><td>${meta.power.toFixed(2).replace(".", ",")}</td><td>${meta.runPower.toFixed(2).replace(".", ",")}</td>
        <td>${DIFF[meta.difficulty]}</td><td><span class="pill ${ok ? "ok" : "warn"}">${ok ? "✓ dans la cible" : "⚠ hors cible"}</span></td>
      </tr>`;
    })
    .join("");
}

const date = new Date(report.generatedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const inTarget = avg.perChampion.filter((c) => Math.abs(c.winRate - report.target) <= tolerance).length;

const html = `<title>Équilibrage Rift Gauntlet</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;500;600;700&display=swap">
<style>
/* Mise en page : une colonne de lecture, chaque section = une question d'équilibrage, graphique puis lecture. Thème sombre Hextech, celui du jeu. */
:root {
  color-scheme: dark;
  --bg: #050d18; --surface: #0d1a2b; --surface-2: #13243a; --ink: #f0e6d2; --muted: #a09b8c; --line: #1f3349;
  --gold: #c8aa6e; --grid: #1a2a3d; --band: rgba(200,170,110,0.12); --muted-line: #4a5b70;
  --s1: #3987e5; --s2: #d95926; --s3: #199e70; --s4: #c98500; --s5: #d55181;
  --ok: #0ca30c; --warn: #fab219;
  --display: "Cinzel", "Times New Roman", serif; --body: "Inter", system-ui, sans-serif;
}
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.55; }
.wrap { max-width: 1040px; margin: 0 auto; padding-inline: 20px; padding-block: 40px 64px; display: grid; gap: 28px; }
h1, h2 { font-family: var(--display); letter-spacing: 0.03em; text-wrap: balance; margin: 0; font-weight: 700; }
h1 { font-size: clamp(28px, 5vw, 42px); }
h1 span { color: var(--gold); }
h2 { font-size: 20px; }
p { margin: 0; max-width: 68ch; }
.lead { color: var(--muted); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.12em; font-size: 11px; font-weight: 700; color: var(--gold); }
header { display: grid; gap: 10px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: grid; gap: 2px; }
.kpi b { font-family: var(--display); font-size: 26px; color: var(--ink); font-variant-numeric: tabular-nums; }
.kpi small { color: var(--muted); font-size: 12.5px; }
section { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 22px; display: grid; gap: 14px; min-width: 0; }
.chart { width: 100%; height: auto; display: block; }
.chart-narrow { max-width: 520px; }
.chart-square { max-width: 680px; }
.scroll { overflow-x: auto; }
svg text { fill: var(--muted); font-family: var(--body); }
svg .label { font-size: 12.5px; fill: var(--ink); }
svg .tick { font-size: 11px; }
svg .tick.strong { fill: var(--ink); font-weight: 700; }
svg .group { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; fill: var(--gold); }
svg .value { font-size: 12px; fill: var(--ink); font-variant-numeric: tabular-nums; }
svg .inbar, svg .incell { font-size: 11px; font-weight: 700; fill: #ffffff; font-variant-numeric: tabular-nums; pointer-events: none; }
[data-tip] { cursor: default; }
[data-tip]:hover { filter: brightness(1.2); }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--muted); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.key { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
.key.round { border-radius: 50%; }
.key.diamond { transform: rotate(45deg); border-radius: 1px; width: 9px; height: 9px; }
.ramp { width: 160px; height: 10px; border-radius: 3px; background: linear-gradient(90deg, rgb(230,103,103), rgb(56,56,53), rgb(57,135,229)); }
.read { border-left: 2px solid var(--gold); padding-left: 12px; color: var(--ink); }
table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
thead th { color: var(--muted); font-weight: 600; font-size: 12px; }
.ci { color: var(--muted); font-size: 11.5px; }
.pill { font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
.pill.ok { color: var(--ok); border-color: color-mix(in srgb, var(--ok) 50%, transparent); }
.pill.warn { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 50%, transparent); }
details summary { cursor: pointer; color: var(--gold); font-weight: 600; }
#tip { position: fixed; pointer-events: none; background: var(--surface-2); color: var(--ink); border: 1px solid var(--gold); border-radius: 8px; padding: 6px 10px; font-size: 12.5px; max-width: 300px; box-shadow: 0 10px 24px -10px rgba(0,0,0,0.8); }
footer { color: var(--muted); font-size: 12.5px; }
@media (max-width: 600px) { section { padding: 16px; } }
</style>
<div class="wrap">
  <header>
    <p class="eyebrow">Rapport de simulation · ${date}</p>
    <h1>Équilibrage <span>Rift Gauntlet</span></h1>
    <p class="lead">${num(report.fights)} combats simulés en ${String(report.minutes).replace(".", ",")} min, sur des parties jamais utilisées pour le calibrage. Un joueur simulé de niveau « moyen » vise ${pct(report.target, 0)} de victoires avec chaque champion ; « débutant » et « expert » servent à vérifier les extrêmes.</p>
  </header>

  <div class="kpis">
    <div class="kpi"><small>Victoires, joueur moyen</small><b>${pct(avg.winRate)}</b><small>objectif ${pct(report.target, 0)} · ${num(avg.runs)} parties</small></div>
    <div class="kpi"><small>Champions dans la cible (±${Math.round(tolerance * 100)} pts)</small><b>${inTarget} / ${avg.perChampion.length}</b><small>de ${esc(name[lo.id])} ${pct(lo.winRate)} à ${esc(name[hi.id])} ${pct(hi.winRate)}</small></div>
    <div class="kpi"><small>Débutant → expert</small><b>${pct(report.runs.beginner.winRate, 0)} → ${pct(report.runs.expert.winRate, 0)}</b><small>victoires selon le niveau de jeu</small></div>
    <div class="kpi"><small>Duels équipés</small><b>${num(report.duels.total)}</b><small>chaque champion contre chaque autre, 4 niveaux</small></div>
  </div>

  <section aria-labelledby="c1-title">
    <h2 id="c1-title">Victoires en partie complète</h2>
    <p class="lead">Chaque ligne montre le taux de victoire avec ce champion selon le niveau du joueur. La barre bleue claire est l'intervalle de confiance à 95 % du joueur moyen ; la bande dorée, la cible.</p>
    <div class="legend"><span><i class="key" style="background:var(--s2)"></i>Débutant</span><span><i class="key round" style="background:var(--s1)"></i>Moyen</span><span><i class="key diamond" style="background:var(--s3)"></i>Expert</span><span><i class="key" style="background:var(--band);outline:1px dashed var(--gold)"></i>Cible ${pct(report.target - tolerance, 0)}–${pct(report.target + tolerance, 0)}</span></div>
    ${dumbbell()}
  </section>

  <section aria-labelledby="c2-title">
    <h2 id="c2-title">Où les parties s'arrêtent</h2>
    <p class="lead">Joueur moyen. Les nombres sont des pourcentages de parties.</p>
    <div class="legend">${STAGES.map((s) => `<span><i class="key" style="background:${s.color}"></i>${s.label}</span>`).join("")}</div>
    ${stacked()}
  </section>

  <section aria-labelledby="c5-title">
    <h2 id="c5-title">Les adversaires les plus meurtriers</h2>
    <p class="lead">Part des combats perdus contre chaque adversaire, joueur moyen. Survole une barre pour voir les PV perdus, la durée et les potions bues.</p>
    ${enemiesChart()}
  </section>

  <section aria-labelledby="c3-title">
    <h2 id="c3-title">Duels selon le niveau</h2>
    <p class="lead">Taux de victoire de chaque champion contre tous les autres, à niveau et budget d'objets égaux. Bleu : gagne plus souvent ; rouge : perd plus souvent ; gris : 50 %.</p>
    <div class="legend"><span>25 %</span><i class="ramp"></i><span>75 %</span></div>
    <div class="scroll">${levelHeatmap()}</div>
  </section>

  <section aria-labelledby="c4-title">
    <h2 id="c4-title">Face-à-face</h2>
    <p class="lead">Taux de victoire du champion en ligne contre celui en colonne, tous niveaux confondus. Seuls les écarts de plus de 12 points sont chiffrés.</p>
    <div class="scroll">${matrix()}</div>
  </section>

  <section aria-labelledby="t-title">
    <h2 id="t-title">Tableau complet</h2>
    <div class="scroll"><table>
      <thead><tr><th>Champion</th><th>Type</th><th>Duels</th><th>Débutant</th><th>Moyen (IC 95 %)</th><th>Expert</th><th>Étape moy.</th><th>Coef. duel</th><th>Coef. partie</th><th>Difficulté</th><th>Statut</th></tr></thead>
      <tbody>${tableRows()}</tbody>
    </table></div>
    <p class="lead">Durée moyenne des duels : ${report.duels.levels.map((lv, i) => `${report.duels.rounds[i].toFixed(1).replace(".", ",")} rounds au niveau ${lv}`).join(", ")}.</p>
  </section>

  <footer>Généré par <code>npm run report</code> sur le commit ${report.commit}${report.quick ? " (version rapide)" : ""}.</footer>
</div>
<div id="tip" hidden></div>
<script>
(() => {
  const tip = document.getElementById("tip");
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute("data-tip");
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > window.innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 16;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  });
})();
</script>
`;
writeFileSync("reports/balance.html", html);
console.log("Écrit : reports/balance.html");
