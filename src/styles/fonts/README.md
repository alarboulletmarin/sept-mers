# Fontes embarquées

Deux familles, quatre fichiers `woff2`, 132 ko au total.

| Fichier | Famille | Axes | Tranche |
|---|---|---|---|
| `instrument-sans-latin.woff2` | Instrument Sans | `wght` 400–700, `wdth` 75–100 | latin |
| `instrument-sans-latin-ext.woff2` | Instrument Sans | idem | latin étendu |
| `jetbrains-mono-latin.woff2` | JetBrains Mono | `wght` 100–800 | latin |
| `jetbrains-mono-latin-ext.woff2` | JetBrains Mono | idem | latin étendu |

Ce sont les fichiers servis par Google Fonts, repris tels quels — le découpage
par `unicode-range` vient de là, et `latin-ext` ne descend que si un caractère
l'exige.

Ils vivent dans `src/` et non dans `public/` pour une raison précise : Vite ne
pose un hash de contenu que sur ce qu'il voit passer, et `vite.config.ts`
construit la liste de précache du service worker à partir du bundle produit.
Posés dans `public/`, ils seraient servis sans hash et absents du précache — le
mode avion perdrait la typographie de l'app.

## Licence

Les deux familles sont publiées sous **SIL Open Font License 1.1** — Instrument
Sans par Instrument, JetBrains Mono par JetBrains. Le texte complet et la
mention de copyright de chacune sont conservés ici, comme la licence l'exige :

- [`OFL-instrument-sans.txt`](OFL-instrument-sans.txt)
- [`OFL-jetbrains-mono.txt`](OFL-jetbrains-mono.txt)

La licence de l'app elle-même (MIT) ne s'applique pas à ces fichiers.
