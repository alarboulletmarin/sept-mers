# Fontes embarquées

Deux familles, six fichiers `woff2`, 152 ko au total.

| Fichier | Famille | Style | Tranche |
|---|---|---|---|
| `instrument-sans-latin.woff2` | Instrument Sans | variable, `wght` 400–700, `wdth` 75–100 | latin |
| `instrument-sans-latin-ext.woff2` | Instrument Sans | idem | latin étendu |
| `instrument-serif-latin.woff2` | Instrument Serif | romain 400 | latin |
| `instrument-serif-latin-ext.woff2` | Instrument Serif | romain 400 | latin étendu |
| `instrument-serif-italic-latin.woff2` | Instrument Serif | italique 400 | latin |
| `instrument-serif-italic-latin-ext.woff2` | Instrument Serif | italique 400 | latin étendu |

Ce sont les fichiers servis par Google Fonts, repris tels quels — le découpage
par `unicode-range` vient de là, et `latin-ext` ne descend que si un caractère
l'exige.

Ils vivent dans `src/` et non dans `public/` pour une raison précise : Vite ne
pose un hash de contenu que sur ce qu'il voit passer, et `vite.config.ts`
construit la liste de précache du service worker à partir du bundle produit.
Posés dans `public/`, ils seraient servis sans hash et absents du précache — le
mode avion perdrait la typographie de l'app.

## Licence

Les deux familles sont publiées par Instrument sous **SIL Open Font License
1.1**. Le texte complet et la mention de copyright de chacune sont conservés
ici, comme la licence l'exige :

- [`OFL-instrument-sans.txt`](OFL-instrument-sans.txt)
- [`OFL-instrument-serif.txt`](OFL-instrument-serif.txt)

La licence de l'app elle-même (MIT) ne s'applique pas à ces fichiers.
