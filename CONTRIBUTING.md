# Contribuer à Sept Mers

Merci de passer par ici. Le projet est petit, tenu à la main, et il a des
partis pris ; les connaître fait gagner du temps aux deux bouts.

## Faire tourner le projet

```bash
npm install
npm run dev        # serveur de développement
npm run verify     # types, tests et build
```

Node 22. Les parcours navigateur demandent un Chromium :
`npx playwright install chromium`.

## Ce que la barrière de qualité vérifie

Une contribution doit passer les sept vérifications, celles-là mêmes que
[`.github/workflows/verification.yml`](.github/workflows/verification.yml)
lance à chaque poussée :

```bash
npm run verify \
  && node scripts/smoke.mjs \
  && node scripts/share.mjs \
  && node scripts/offline.mjs \
  && node scripts/nooverflow.mjs \
  && node scripts/contrast.mjs \
  && node scripts/licenses.mjs
```

## Les partis pris, et pourquoi

Ils sont détaillés dans le [README](README.md) et le
[design system](docs/design-system.md). Les cinq qu'on ne discute pas sans
argument sérieux :

1. **Front seul, hors ligne, sans compte.** Aucune requête réseau après le
   premier chargement, hors le partage de table qui ne s'ouvre qu'à la main.
   Pas d'analytics, jamais.
2. **Monochrome.** Aucune information ne peut dépendre d'une teinte : un score
   se lit à son signe, un état à son remplissage, une série à son tracé.
3. **Peu de dépendances.** Deux à l'exécution, et chacune s'est justifiée. Pas
   de routeur, pas de librairie d'état, pas de framework CSS, pas de pack
   d'icônes.
4. **Le moteur de score est pur.** `src/domain/` ne lit ni horloge, ni
   stockage, ni `window`. C'est ce qui le rend testable ligne à ligne.
5. **Rien ne se saisit qui ne soit atteignable au clavier**, et aucun texte ne
   descend sous le contraste que `scripts/contrast.mjs` mesure.

## Le style

- **Français** pour les commentaires, les noms de tests et les messages de
  commit. Anglais pour le code lui-même.
- Les commentaires disent **pourquoi**, pas quoi. Un commentaire qui paraphrase
  la ligne d'en dessous est du bruit ; un commentaire qui explique la décision
  ou l'accident qu'elle évite vaut dix lignes de code.
- Toute chaîne visible passe par `src/i18n/`, **dans les deux langues**. Un test
  refuse une clé présente d'un seul côté, et un autre refuse une clé que
  personne n'emploie.

## Ouvrir une issue, ouvrir une PR

Une issue vaut mieux qu'une grosse PR surprise : le projet a une direction, et
il vaut mieux la confronter avant d'écrire trois cents lignes. Pour un bug, la
manche exacte et le nombre de joueurs valent tous les récits.

Les PR sont relues sur trois questions : est-ce que ça marche, est-ce que ça
tient les partis pris ci-dessus, et est-ce que quelqu'un qui relira dans un an
comprendra pourquoi.

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous la
licence MIT du projet.
