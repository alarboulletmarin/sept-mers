/**
 * Les images du compte Instagram, dessinées avec le design system de l'app.
 *
 *   node scripts/social.mjs
 *
 * Elles ne sont pas des captures : une capture cadre un téléphone, une image
 * de réseau cadre une affiche. Mais elles sortent des mêmes jetons, des mêmes
 * deux familles et des mêmes formes — `docs/design-system.md` fait foi, et
 * rien n'est redessiné à côté. Monochrome, sans ombre, sans dégradé : ce qui
 * ne vit pas dans l'app ne vit pas ici non plus.
 *
 * Les polices sont embarquées en base64 plutôt que servies : la page n'a alors
 * aucune requête à faire, et le rendu ne dépend pas d'un serveur qui tourne.
 *
 * Écrit dans `docs/social/`. Trois formats, ceux d'Instagram : le carré
 * 1080×1080, le portrait 1080×1350 — celui qui prend le plus de place dans le
 * fil —, et la story 1080×1920.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { launchChromium } from './browser.mjs'

const OUT = new URL('../docs/social/', import.meta.url).pathname

const base64 = (file) =>
  readFileSync(new URL(`../src/styles/fonts/${file}`, import.meta.url)).toString('base64')

/*
 * Une seule tranche par famille : `latin` couvre les accents français, qui
 * vivent tous sous U+00FF. `latin-ext` n'aurait rien à porter ici.
 */
const SANS = base64('instrument-sans-latin.woff2')
const MONO = base64('jetbrains-mono-latin.woff2')

/*
 * Le logotype, pris à la source. Le `.svg` de l'app enferme le dessin dans une
 * tuile noire aux coins arrondis ; on ne garde que les tracés, et ils héritent
 * de la couleur du texte comme partout ailleurs.
 */
const FAVICON = readFileSync(new URL('../public/icons/favicon.svg', import.meta.url), 'utf8')
const GLYPH = FAVICON.slice(FAVICON.indexOf('<path'), FAVICON.lastIndexOf('</g>'))

const logo = (size) =>
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${GLYPH}</svg>`

/** Une capture du README, posée dans une affiche. */
const capture = (name) =>
  `data:image/png;base64,${readFileSync(new URL(`../docs/captures/${name}.png`, import.meta.url)).toString('base64')}`

/*
 * Les jetons, tels quels. L'échelle typographique, elle, ne se reprend pas :
 * une affiche se regarde à un mètre et un téléphone à trente centimètres. Les
 * rapports sont gardés, les tailles montent.
 */
const CSS = `
@font-face {
  font-family: 'Instrument Sans';
  font-weight: 400 700;
  font-stretch: 75% 100%;
  src: url(data:font/woff2;base64,${SANS}) format('woff2');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-weight: 100 800;
  src: url(data:font/woff2;base64,${MONO}) format('woff2');
}

:root {
  --accent: #0f0f0f;
  --accent-on: #fafafa;
  --accent-muted: #a0a0a0;
  --card: #ffffff;
  --card-on: #0f0f0f;
  --card-muted: #6a6a6a;
  --sunken: #bdbdbb;
  --sunken-on: #0f0f0f;
  --sunken-muted: #3d3d3b;
  --canvas: #e4e4e2;
  --canvas-on: #0f0f0f;
  --canvas-muted: #5b5b59;
  --hairline: #d0d0ce;
  --font-sans: 'Instrument Sans', sans-serif;
  --font-figure: 'JetBrains Mono', monospace;
}

[data-theme='dark'] {
  --accent: #fafafa;
  --accent-on: #0f0f0f;
  --accent-muted: #575757;
  --card: #1e1e1e;
  --card-on: #fafafa;
  --card-muted: #9a9a9a;
  --sunken: #323232;
  --sunken-on: #fafafa;
  --sunken-muted: #b4b4b4;
  --canvas: #131313;
  --canvas-on: #fafafa;
  --canvas-muted: #9e9e9e;
  --hairline: #2c2c2c;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-sans);
  background: var(--canvas);
  color: var(--canvas-on);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

.poster {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 84px;
  height: 100%;
}

/* ------------------------------------------------------------ typographie */

.display {
  font-size: 168px;
  line-height: 0.92;
  font-weight: 700;
  letter-spacing: -0.035em;
}

.title { font-size: 86px; line-height: 1.08; font-weight: 700; letter-spacing: -0.03em; }
.lede { font-size: 42px; line-height: 1.4; font-weight: 400; letter-spacing: -0.005em; color: var(--canvas-muted); }
.body { font-size: 38px; line-height: 1.5; font-weight: 400; }
.caption { font-size: 30px; line-height: 1.45; font-weight: 500; color: var(--surface-muted, var(--canvas-muted)); }

/* Le chiffre est l'objet : chasse fixe, tabulaire, serré, collé au bord. */
.figure {
  font-family: var(--font-figure);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 0.9;
  margin-left: -0.02em;
}

.hero { font-size: 132px; line-height: 0.86; letter-spacing: -0.03em; margin-left: -0.03em; }

/*
 * L'étiquette : capitales, chasse étroite, approche très ouverte. C'est la
 * signature de la mosaïque, et le seul endroit où l'on crie. Elle inverse
 * toujours la surface qui la porte.
 */
.tag {
  display: inline-flex;
  align-items: center;
  /* Comme dans l'app : l'étiquette garde sa largeur, elle ne s'étire jamais
     à la colonne qui la porte. */
  align-self: flex-start;
  padding: 14px 26px;
  border-radius: 999px;
  background: var(--surface-on, var(--canvas-on));
  color: var(--surface, var(--canvas));
  font-size: 30px;
  line-height: 1;
  font-weight: 700;
  font-stretch: 84%;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

/* Le filet de section : l'intitulé, puis le trait jusqu'au bord. */
.rule {
  display: flex;
  align-items: center;
  gap: 28px;
  width: 100%;
  color: var(--canvas-muted);
}
.rule span {
  font-size: 30px;
  font-weight: 700;
  font-stretch: 84%;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.rule::after { content: ''; flex: 1; height: 2px; background: currentColor; opacity: 0.45; }

/* -------------------------------------------------------------- la mosaïque */

.widget {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 22px;
  padding: 44px;
  border-radius: 55px;
  background: var(--surface);
  color: var(--surface-on);
  border: 2px solid transparent;
}
.accent { --surface: var(--accent); --surface-on: var(--accent-on); --surface-muted: var(--accent-muted); }
.card { --surface: var(--card); --surface-on: var(--card-on); --surface-muted: var(--card-muted); border-color: var(--hairline); }
.sunken { --surface: var(--sunken); --surface-on: var(--sunken-on); --surface-muted: var(--sunken-muted); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.span2 { grid-column: span 2; }

/* La houle : un trait par manche. Jouées posées, en cours plus haute et plus
   longue, à venir à 22 %. */
.rail { display: flex; align-items: center; gap: 8px; width: 100%; height: 22px; }
.mark { flex: 1 1 0; height: 6px; border-radius: 999px; background: currentColor; }
.done { opacity: 0.55; }
.now { flex-grow: 1.8; height: 16px; }
.todo { opacity: 0.22; }

/* Le bouton principal : une seule par écran, rayon 999, pleine largeur. */
.pill {
  display: grid;
  place-items: center;
  width: 100%;
  flex: none;
  height: 150px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* La signature, en pied d'affiche. */
.sign { display: flex; align-items: center; gap: 20px; color: var(--canvas-muted); }
.sign b { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; color: var(--canvas-on); }
.sign span { font-size: 30px; font-weight: 500; }

.spacer { flex: 1; }
.row { display: flex; align-items: center; }
.col { display: flex; flex-direction: column; }
`

/** La houle, `total` traits dont le `current` en cours. */
const rail = (total, current) =>
  `<div class="rail">${Array.from({ length: total }, (_, index) => {
    const round = index + 1
    const state = round < current ? 'done' : round === current ? 'now' : 'todo'
    return `<span class="mark ${state}"></span>`
  }).join('')}</div>`

/*
 * Le graphique d'évolution : huit séries se distinguent sans une seule teinte,
 * par le nom d'abord, le tracé ensuite. Les motifs sont ceux des jetons
 * `--dash-*`, à l'échelle de l'affiche.
 */
const SERIES = [
  { name: 'Ana', dash: 'none', points: [20, 60, 110, 150, 200, 240, 280, 320, 360, 400] },
  { name: 'Bo', dash: '21 9', points: [10, 40, 70, 110, 140, 180, 210, 240, 270, 300] },
  { name: 'Cy', dash: '6 9', points: [0, 30, 50, 80, 100, 130, 150, 180, 200, 220] },
  { name: 'Dee', dash: '33 9', points: [-20, 0, 30, 40, 80, 90, 130, 140, 180, 220] },
]

const chart = (h = 420) => {
  const w = 872
  const x = (index) => 16 + (index * (w - 60)) / (SERIES[0].points.length - 1)
  const y = (value) => h - 22 - ((value + 40) / 450) * (h - 52)
  const grid = [200, 400]
    .map(
      (value) =>
        `<line x1="120" y1="${y(value)}" x2="${w - 20}" y2="${y(value)}" stroke="currentColor" stroke-width="2" opacity="0.3"/>` +
        `<text x="16" y="${y(value) + 12}" font-family="JetBrains Mono" font-size="30" font-weight="700" fill="currentColor" opacity="0.55">${value}</text>`,
    )
    .join('')
  const lines = SERIES.map((serie) => {
    const points = serie.points.map((value, index) => `${x(index) + 104},${y(value)}`).join(' ')
    const last = serie.points.at(-1)
    return (
      `<polyline points="${points}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"${serie.dash === 'none' ? '' : ` stroke-dasharray="${serie.dash}"`}/>` +
      `<circle cx="${x(serie.points.length - 1) + 104}" cy="${y(last)}" r="10" fill="currentColor"/>`
    )
  }).join('')
  /* La légende vient avant le dessin : une convention se lit d'abord, et la
     pastille reproduit le tracé exact de la série, jamais un carré plein. */
  const legend = SERIES.map(
    (serie) =>
      `<span class="row" style="gap:16px"><svg width="72" height="8"><line x1="3" y1="4" x2="69" y2="4" stroke="currentColor" stroke-width="6" stroke-linecap="round"${serie.dash === 'none' ? '' : ` stroke-dasharray="${serie.dash}"`}/></svg>` +
      `<b style="font-size:30px;font-weight:600">${serie.name}</b></span>`,
  ).join('')
  return `<div class="col" style="gap:28px;width:100%">
      <div class="row" style="gap:40px;flex-wrap:wrap">${legend}</div>
      <svg viewBox="0 0 ${w} ${h}" width="100%" aria-hidden="true">${grid}${lines}</svg>
    </div>`
}

/**
 * Une tuile de joueur, telle qu'elle apparaît en saisie. La valeur crie, les
 * boutons chuchotent — ils sont au filet, pas pleins.
 *
 * Tant qu'aucune valeur n'est posée, la place du chiffre est un trait à
 * remplir : un tiret se serait lu comme un séparateur, une ligne vide se lit
 * comme une case qui attend.
 */
const tile = (name, value, posed) => `
  <div class="widget ${posed ? 'accent' : 'card'}" style="gap:30px;padding:38px">
    <div style="font-size:40px;font-weight:600;letter-spacing:-0.015em">${name}</div>
    <div class="row" style="width:100%;justify-content:space-between">
      <span style="width:88px;height:88px;border-radius:999px;border:3px solid currentColor;opacity:0.45;display:grid;place-items:center;font-size:46px">−</span>
      ${
        posed
          ? `<span class="figure" style="font-size:76px">${value}</span>`
          : '<span style="width:74px;height:7px;border-radius:999px;background:currentColor;opacity:0.3"></span>'
      }
      <span style="width:88px;height:88px;border-radius:999px;border:3px solid currentColor;opacity:0.45;display:grid;place-items:center;font-size:46px">+</span>
    </div>
  </div>`

/* La signature de pied d'affiche. Sans sa glose quand la ligne est partagée. */
const signature = (gloss = true) =>
  `<div class="sign">${logo(52)}<b>Sept&nbsp;Mers</b>${gloss ? '<span>· compteur de points pour Skull King</span>' : ''}</div>`

/* --------------------------------------------------- les affiches, en portrait */

const portrait = [
  {
    /* 1. Le logotype. Le nom d'abord, la promesse ensuite, la houle en pied :
       trois traits horizontaux et rien de plus. */
    name: '01-logotype',
    width: 1080,
    height: 1350,
    theme: 'light',
    body: `
      <div class="poster">
        ${logo(132)}
        <div style="height:160px"></div>
        <h1 class="display">Sept<br/>Mers</h1>
        <p class="lede" style="margin-top:40px;max-width:820px">Le carnet de score de Skull King, posé au milieu de la table.</p>
        <div class="spacer"></div>
        <div class="row" style="gap:18px;flex-wrap:wrap;margin-bottom:56px">
          <span class="tag">Hors ligne</span>
          <span class="tag">Sans compte</span>
          <span class="tag">Sans suivi</span>
        </div>
        ${rail(10, 4)}
      </div>`,
  },
  {
    /* 2. Le chiffre. Un widget accent plein cadre : c'est l'écran de fin de
       partie, agrandi jusqu'à ce qu'il ne reste que ce qu'on vient y lire. */
    name: '02-vainqueur',
    width: 1080,
    height: 1080,
    theme: 'light',
    body: `
      <div class="poster" style="padding:44px">
        <div class="widget accent" style="flex:1;padding:76px;gap:0">
          <span class="tag">Fin de partie</span>
          <div class="spacer"></div>
          <div style="font-size:64px;font-weight:700;letter-spacing:-0.03em">Ana l'emporte</div>
          <div class="figure" style="font-size:340px;margin-top:24px">400</div>
          <div class="caption" style="font-size:38px;margin-top:36px">+100 sur le suivant · 10 manches · 4 joueurs</div>
          <div class="spacer"></div>
          <div class="row" style="gap:20px;color:var(--surface-on)">
            ${logo(52)}<b style="font-size:34px">Sept&nbsp;Mers</b>
          </div>
        </div>
      </div>`,
  },
  {
    /* 3. La mosaïque. Des blocs de tailles inégales, chacun avec sa valeur de
       fond : c'est la direction du système, montrée plutôt qu'expliquée. */
    name: '03-mosaique',
    width: 1080,
    height: 1350,
    theme: 'light',
    body: `
      <div class="poster" style="padding:56px">
        <div class="row" style="justify-content:space-between;width:100%">
          ${signature(false)}
          <span class="tag">Fin de partie</span>
        </div>
        <div class="grid" style="margin-top:44px;gap:24px">
          <div class="widget accent span2" style="padding:36px;gap:16px">
            <span class="tag">1er</span>
            <div style="font-size:42px;font-weight:600">Ana</div>
            <div class="figure hero" style="font-size:108px">400</div>
            <div class="caption">+100 sur le suivant</div>
          </div>
          <div class="widget card" style="padding:36px;gap:16px">
            <span class="tag">2e</span>
            <div style="font-size:38px;font-weight:600">Bo</div>
            <div class="figure" style="font-size:84px">300</div>
          </div>
          <div class="widget sunken" style="padding:36px;gap:16px">
            <span class="tag">3e</span>
            <div style="font-size:38px;font-weight:600">Cy</div>
            <div class="figure" style="font-size:84px">220</div>
          </div>
          <div class="widget accent span2" style="padding:36px;gap:24px">
            <span class="tag">Évolution des scores</span>
            ${chart(250)}
          </div>
        </div>
      </div>`,
  },
  {
    /* 4. La saisie. Deux tuiles posées, deux qui attendent : le seul retour
       dont on a besoin pour savoir où on en est. */
    name: '04-saisie',
    width: 1080,
    height: 1350,
    theme: 'light',
    body: `
      <div class="poster" style="padding:64px">
        <div class="rule"><span>Une manche</span></div>
        <h2 class="title" style="margin-top:36px">Pas de clavier.<br/>Moins, plus, suivant.</h2>
        <div class="grid" style="margin-top:56px">
          ${tile('Ana', '2', true)}
          ${tile('Bo', '0', true)}
          ${tile('Cy', '—', false)}
          ${tile('Dee', '—', false)}
        </div>
        <p class="lede" style="margin-top:40px">Les tuiles restées blanches sont celles qui manquent. On les repère sans rien lire.</p>
        <div class="spacer"></div>
        <div class="pill" style="margin-top:36px">Valider les mises</div>
        <div style="margin-top:48px">${signature()}</div>
      </div>`,
  },
  {
    /* 5. Le mode d'emploi, en thème sombre : le même écran d'accueil, la nuit. */
    name: '05-comment-ca-marche',
    width: 1080,
    height: 1350,
    theme: 'dark',
    body: `
      <div class="poster">
        <div class="rule"><span>Comment ça marche</span></div>
        <ol class="col" style="gap:56px;margin-top:72px;list-style:none">
          <li class="row" style="gap:36px;align-items:flex-start">
            <span class="figure" style="flex:none;width:76px;height:76px;border-radius:999px;border:3px solid currentColor;display:grid;place-items:center;font-size:36px;opacity:0.75">1</span>
            <span class="body">Compose la table : qui joue, et dans quel ordre vous êtes assis.</span>
          </li>
          <li class="row" style="gap:36px;align-items:flex-start">
            <span class="figure" style="flex:none;width:76px;height:76px;border-radius:999px;border:3px solid currentColor;display:grid;place-items:center;font-size:36px;opacity:0.75">2</span>
            <span class="body">Avant chaque manche, chacun annonce le nombre de plis qu'il pense remporter.</span>
          </li>
          <li class="row" style="gap:36px;align-items:flex-start">
            <span class="figure" style="flex:none;width:76px;height:76px;border-radius:999px;border:3px solid currentColor;display:grid;place-items:center;font-size:36px;opacity:0.75">3</span>
            <span class="body">La manche jouée, tu entres les plis et les bonus. L'app compte les points.</span>
          </li>
        </ol>
        <div class="spacer"></div>
        <div class="widget sunken" style="width:100%">
          <span class="tag">Partage de table</span>
          <p style="font-size:36px;line-height:1.45;font-weight:400">Les autres suivent la partie en direct sur leur téléphone. Un code de six caractères, pair-à-pair et chiffré, sans compte ni serveur.</p>
        </div>
        <div class="pill" style="margin-top:44px">Nouvelle partie</div>
      </div>`,
  },
  {
    /* 6. Le manifeste. Trois lignes, en encre pleine : ce que l'app ne fait
       pas est ce qu'il y a de plus rare à dire. */
    name: '06-manifeste',
    width: 1080,
    height: 1080,
    theme: 'light',
    body: `
      <div class="poster" style="background:var(--accent);color:var(--accent-on);padding:84px">
        <div class="spacer"></div>
        <h2 class="display" style="font-size:132px">Hors ligne.<br/>Sans compte.<br/>Sans suivi.</h2>
        <p style="font-size:40px;line-height:1.45;margin-top:48px;color:var(--accent-muted);max-width:820px">Tout reste sur le téléphone. Pas de serveur, pas de publicité, pas une ligne de code qui vous regarde jouer.</p>
        <div class="spacer"></div>
        <div class="row" style="gap:20px;color:var(--accent-muted)">
          ${logo(52)}<b style="font-size:34px;color:var(--accent-on);font-weight:700">Sept&nbsp;Mers</b><span style="font-size:30px">· gratuit et libre</span>
        </div>
      </div>`,
  },
  {
    /* 7. La story. Même geste, format vertical, l'appel à l'action en pied. */
    name: '07-story',
    width: 1080,
    height: 1920,
    theme: 'dark',
    body: `
      <div class="poster" style="padding:96px 84px 180px">
        <div style="height:120px"></div>
        ${logo(140)}
        <h1 class="display" style="margin-top:64px">Sept<br/>Mers</h1>
        <p class="lede" style="margin-top:48px">Compteur de points non officiel pour Skull King. De 2 à 8 joueurs, 10 manches, tout calculé.</p>
        <div style="margin-top:72px">${rail(10, 7)}</div>
        <div class="spacer"></div>
        <div class="grid">
          <div class="widget card">
            <span class="tag">Manche</span>
            <div class="figure" style="font-size:96px">7<span style="font-family:var(--font-sans);font-size:38px;font-weight:600;color:var(--surface-muted)"> sur 10</span></div>
          </div>
          <div class="widget accent">
            <span class="tag">En tête</span>
            <div class="figure" style="font-size:96px">240</div>
            <div class="caption">Ana</div>
          </div>
        </div>
        <div class="row" style="gap:18px;flex-wrap:wrap;margin-top:56px">
          <span class="tag">Hors ligne</span>
          <span class="tag">Sans compte</span>
        </div>
        <div class="spacer"></div>
        <div class="pill">Nouvelle partie</div>
      </div>`,
  },
  {
    /* 8. La capture, telle que le parcours l'a produite. Une affiche qui montre
       l'app elle-même, et non son idée : c'est celle qui fait installer. */
    name: '08-captures',
    width: 1080,
    height: 1350,
    theme: 'light',
    body: `
      <div class="poster" style="padding:64px">
        <div class="rule"><span>Sur le téléphone</span></div>
        <h2 class="title" style="margin-top:40px;font-size:72px">Une tuile par joueur.<br/>Un chiffre qu'on lit de loin.</h2>
        <div class="row" style="gap:32px;margin-top:56px;justify-content:center">
          <img src="${capture('manche')}" width="420" style="border-radius:44px;border:2px solid var(--hairline)"/>
          <img src="${capture('fin-de-partie')}" width="420" style="border-radius:44px;border:2px solid var(--hairline)"/>
        </div>
        <div class="spacer"></div>
        ${signature()}
      </div>`,
  },
]

/* -------------------------------------------------- les affiches, en paysage
 *
 * Le 16:9 n'est pas le portrait recadré. Un format large ne se remplit pas en
 * empilant : il se coupe en deux colonnes — ce qui se dit à gauche, ce qui se
 * montre à droite — sinon tout se tasse en haut et la moitié de l'image ne
 * porte rien. Les affiches sont donc réécrites, pas redimensionnées.
 */

const WIDE = { width: 1920, height: 1080, dir: '16-9/' }

const landscape = [
  {
    /* 1. Le logotype. Le nom tient la gauche, la promesse se pose à sa droite,
       et la houle traverse toute la largeur — c'est le format qui lui va le
       mieux : dix traits alignés, sans rien pour les serrer. */
    ...WIDE,
    name: '01-logotype',
    theme: 'light',
    body: `
      <div class="poster" style="padding:96px">
        <div class="row" style="justify-content:space-between;align-items:flex-start;width:100%">
          ${logo(124)}
          <div class="col" style="gap:18px;align-items:flex-end">
            <span class="tag">Hors ligne</span>
            <span class="tag">Sans compte</span>
            <span class="tag">Sans suivi</span>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="row" style="align-items:flex-end;gap:96px;width:100%">
          <h1 class="display" style="font-size:236px">Sept<br/>Mers</h1>
          <p class="lede" style="font-size:46px;max-width:780px;padding-bottom:32px">Le carnet de score de Skull King, posé au milieu de la table.</p>
        </div>
        <div class="spacer"></div>
        ${rail(10, 4)}
      </div>`,
  },
  {
    /* 2. Le chiffre, et ce qui l'a produit. La largeur permet de poser côte à
       côte le score final et la courbe qui y mène : c'est la même question,
       répondue deux fois. */
    ...WIDE,
    name: '02-vainqueur',
    theme: 'light',
    body: `
      <div class="poster" style="padding:44px">
        <div class="widget accent" style="flex:1;flex-direction:row;padding:76px;gap:88px;align-items:stretch">
          <div class="col" style="flex:1;min-width:0">
            <span class="tag">Fin de partie</span>
            <div class="spacer"></div>
            <div style="font-size:60px;font-weight:700;letter-spacing:-0.03em">Ana l'emporte</div>
            <div class="figure" style="font-size:300px;margin-top:20px">400</div>
            <div class="caption" style="font-size:36px;margin-top:32px">+100 sur le suivant · 10 manches · 4 joueurs</div>
            <div class="spacer"></div>
            <div class="row" style="gap:20px;color:var(--surface-on)">
              ${logo(52)}<b style="font-size:34px">Sept&nbsp;Mers</b>
            </div>
          </div>
          <div class="col" style="flex:1.1;min-width:0;justify-content:center;gap:32px">
            <span class="tag">Évolution des scores</span>
            ${chart(420)}
          </div>
        </div>
      </div>`,
  },
  {
    /* 3. La mosaïque. En paysage, le classement tient la colonne de gauche et
       le graphique s'étale : les blocs restent de tailles inégales, ce qui est
       tout le propos. */
    ...WIDE,
    name: '03-mosaique',
    theme: 'light',
    body: `
      <div class="poster" style="padding:64px">
        <div class="row" style="justify-content:space-between;width:100%">
          ${signature()}
          <span class="tag">Fin de partie</span>
        </div>
        <div style="display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:24px;margin-top:36px;flex:1">
          <div class="widget accent" style="grid-row:span 2;padding:44px;gap:20px;justify-content:center">
            <span class="tag">1er</span>
            <div style="font-size:46px;font-weight:600">Ana</div>
            <div class="figure hero" style="font-size:150px">400</div>
            <div class="caption" style="font-size:34px">+100 sur le suivant</div>
          </div>
          <div class="widget card" style="padding:36px;gap:16px">
            <span class="tag">2e</span>
            <div style="font-size:38px;font-weight:600">Bo</div>
            <div class="figure" style="font-size:84px">300</div>
          </div>
          <div class="widget sunken" style="padding:36px;gap:16px">
            <span class="tag">3e</span>
            <div style="font-size:38px;font-weight:600">Cy</div>
            <div class="figure" style="font-size:84px">220</div>
          </div>
          <div class="widget accent" style="grid-column:span 2;padding:36px;gap:24px">
            <span class="tag">Évolution des scores</span>
            ${chart(300)}
          </div>
        </div>
      </div>`,
  },
  {
    /* 4. La saisie. Ce qu'on dit à gauche, ce qu'on montre à droite : les
       quatre tuiles gardent leur grille de deux colonnes, celle du téléphone. */
    ...WIDE,
    name: '04-saisie',
    theme: 'light',
    body: `
      <div class="poster" style="padding:80px;flex-direction:row;gap:80px;align-items:stretch">
        <div class="col" style="flex:1;min-width:0">
          <div class="rule"><span>Une manche</span></div>
          <h2 class="title" style="margin-top:40px;font-size:82px">Pas de clavier.<br/>Moins, plus,<br/>suivant.</h2>
          <p class="lede" style="margin-top:40px">Les tuiles restées blanches sont celles qui manquent. On les repère sans rien lire.</p>
          <div class="spacer"></div>
          <div class="pill">Valider les mises</div>
          <div style="margin-top:40px">${signature()}</div>
        </div>
        <div class="grid" style="flex:1.05;min-width:0;align-content:center">
          ${tile('Ana', '2', true)}
          ${tile('Bo', '0', true)}
          ${tile('Cy', '', false)}
          ${tile('Dee', '', false)}
        </div>
      </div>`,
  },
  {
    /* 5. Le mode d'emploi. Trois étapes, trois colonnes : la largeur les met de
       front, et l'ordre se lit alors dans les chiffres, pas dans la pile. */
    ...WIDE,
    name: '05-comment-ca-marche',
    theme: 'dark',
    body: `
      <div class="poster" style="padding:80px">
        <div class="rule"><span>Comment ça marche</span></div>
        <div class="spacer"></div>
        <div class="row" style="gap:56px;align-items:flex-start;width:100%">
          <div class="col" style="flex:1;gap:32px">
            <span class="figure" style="width:88px;height:88px;border-radius:999px;border:3px solid currentColor;display:grid;place-items:center;font-size:42px;opacity:0.75">1</span>
            <span class="body" style="font-size:40px">Compose la table : qui joue, et dans quel ordre vous êtes assis.</span>
          </div>
          <div class="col" style="flex:1;gap:32px">
            <span class="figure" style="width:88px;height:88px;border-radius:999px;border:3px solid currentColor;display:grid;place-items:center;font-size:42px;opacity:0.75">2</span>
            <span class="body" style="font-size:40px">Avant chaque manche, chacun annonce le nombre de plis qu'il pense remporter.</span>
          </div>
          <div class="col" style="flex:1;gap:32px">
            <span class="figure" style="width:88px;height:88px;border-radius:999px;border:3px solid currentColor;display:grid;place-items:center;font-size:42px;opacity:0.75">3</span>
            <span class="body" style="font-size:40px">La manche jouée, tu entres les plis et les bonus. L'app compte les points.</span>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="row" style="gap:40px;align-items:stretch;width:100%">
          <div class="widget sunken" style="flex:1.4">
            <span class="tag">Partage de table</span>
            <p style="font-size:34px;line-height:1.4;font-weight:400">Les autres suivent la partie en direct sur leur téléphone. Un code de six caractères, pair-à-pair et chiffré, sans compte ni serveur.</p>
          </div>
          <div class="col" style="flex:1;justify-content:flex-end;gap:32px">
            ${signature(false)}
            <div class="pill">Nouvelle partie</div>
          </div>
        </div>
      </div>`,
  },
  {
    /* 6. Le manifeste. Trois lignes en encre pleine, et la glose posée dans la
       colonne de droite plutôt qu'en dessous. */
    ...WIDE,
    name: '06-manifeste',
    theme: 'light',
    body: `
      <div class="poster" style="background:var(--accent);color:var(--accent-on);padding:96px">
        <div class="spacer"></div>
        <div class="row" style="gap:96px;align-items:flex-end;width:100%">
          <h2 class="display" style="font-size:158px">Hors ligne.<br/>Sans compte.<br/>Sans suivi.</h2>
          <p style="font-size:42px;line-height:1.45;color:var(--accent-muted);max-width:520px;padding-bottom:24px">Tout reste sur le téléphone. Pas de serveur, pas de publicité, pas une ligne de code qui vous regarde jouer.</p>
        </div>
        <div class="spacer"></div>
        <div class="row" style="gap:20px;color:var(--accent-muted)">
          ${logo(52)}<b style="font-size:34px;color:var(--accent-on);font-weight:700">Sept&nbsp;Mers</b><span style="font-size:30px">· gratuit et libre</span>
        </div>
      </div>`,
  },
  {
    /* 7. La couverture. Le même geste que le logotype, mais avec deux widgets
       en regard : de quoi montrer une partie en cours sans rien expliquer. */
    ...WIDE,
    name: '07-couverture',
    theme: 'dark',
    body: `
      <div class="poster" style="padding:88px;flex-direction:row;gap:96px;align-items:stretch">
        <div class="col" style="flex:1.1;min-width:0">
          ${logo(124)}
          <div class="spacer"></div>
          <h1 class="display" style="font-size:180px">Sept<br/>Mers</h1>
          <p class="lede" style="margin-top:40px;max-width:660px">Compteur de points non officiel pour Skull King. De 2 à 8 joueurs, 10 manches, tout calculé.</p>
          <div class="spacer"></div>
          ${rail(10, 7)}
        </div>
        <div class="col" style="flex:1;min-width:0;gap:28px;justify-content:center">
          <div class="widget card">
            <span class="tag">Manche</span>
            <div class="figure" style="font-size:104px">7<span style="font-family:var(--font-sans);font-size:40px;font-weight:600;color:var(--surface-muted)"> sur 10</span></div>
          </div>
          <div class="widget accent">
            <span class="tag">En tête</span>
            <div class="figure" style="font-size:104px">240</div>
            <div class="caption">Ana · 60 points d'avance</div>
          </div>
          <div class="pill">Nouvelle partie</div>
        </div>
      </div>`,
  },
  {
    /* 8. Les captures, telles que le parcours les produit. Trois tiennent de
       front en paysage, là où le portrait n'en logeait que deux. */
    ...WIDE,
    name: '08-captures',
    theme: 'light',
    body: `
      <div class="poster" style="padding:80px;flex-direction:row;gap:72px;align-items:stretch">
        <div class="col" style="flex:1;min-width:0">
          <div class="rule"><span>Sur le téléphone</span></div>
          <div class="spacer"></div>
          <h2 class="title" style="font-size:70px">Une tuile par joueur.<br/>Un chiffre qu'on lit de loin.</h2>
          <p class="lede" style="margin-top:40px">Une mosaïque de blocs, pas un tableau. Chacun répond à une question, et l'annonce par un chiffre.</p>
          <div class="spacer"></div>
          ${signature(false)}
        </div>
        <div class="row" style="gap:28px;flex:none">
          <img src="${capture('accueil')}" width="332" style="border-radius:38px;border:2px solid var(--hairline)"/>
          <img src="${capture('manche')}" width="332" style="border-radius:38px;border:2px solid var(--hairline)"/>
          <img src="${capture('fin-de-partie')}" width="332" style="border-radius:38px;border:2px solid var(--hairline)"/>
        </div>
      </div>`,
  },
]

const posters = [...portrait, ...landscape]

/* ------------------------------------------------------------------ le rendu */

mkdirSync(OUT, { recursive: true })
mkdirSync(`${OUT}${WIDE.dir}`, { recursive: true })

const browser = await launchChromium()
const overflows = []

for (const poster of posters) {
  const context = await browser.newContext({
    viewport: { width: poster.width, height: poster.height },
    deviceScaleFactor: 1,
    locale: 'fr-FR',
  })
  const page = await context.newPage()
  await page.setContent(
    `<!doctype html><html lang="fr" data-theme="${poster.theme}"><head><meta charset="utf-8"/><style>${CSS}
     html, body { width: ${poster.width}px; height: ${poster.height}px; }</style></head><body>${poster.body}</body></html>`,
    { waitUntil: 'load' },
  )
  // Sans cette attente, la première image sort dans la police de secours.
  await page.evaluate(() => document.fonts.ready)
  /*
   * Une affiche est un cadre fermé : ce qui dépasse n'est pas coupé à
   * l'affichage, il est perdu à l'export. Le débordement se mesure donc ici,
   * comme `nooverflow.mjs` le fait sur l'app.
   */
  const spill = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
  }))
  if (spill.height > poster.height || spill.width > poster.width) {
    overflows.push(`${poster.dir ?? ''}${poster.name} déborde : ${spill.width}×${spill.height}`)
  }
  await page.screenshot({ path: `${OUT}${poster.dir ?? ''}${poster.name}.png` })
  await context.close()
  console.log(`  ${poster.dir ?? ''}${poster.name}.png  ${poster.width}×${poster.height}`)
}

await browser.close()

if (overflows.length) {
  console.error('\n' + overflows.map((line) => `  FAIL ${line}`).join('\n'))
  process.exitCode = 1
}
