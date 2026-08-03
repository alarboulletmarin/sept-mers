# Sept Mers

**Compteur de points non officiel pour Skull King.**
Front only, hors ligne, sans compte, sans serveur, sans suivi.

Sept Mers remplace le carnet de score papier autour d'une table. L'app répond à
quatre questions, vite, sur un téléphone qui passe de main en main : qui a parié
quoi, qui a tenu son pari, qui mène, et quelle était déjà la règle sur les
sirènes. Elle ne joue pas, ne conseille pas, et ne suit pas les cartes jouées.

## Ce qu'elle fait

- **Score classique**, 2 à 8 joueurs, 10 manches, tout calculé par l'app.
- **Saisie sans clavier** : une grille de tuiles, une par joueur, avec un
  contrôle moins / plus. Appui maintenu pour défiler. Le dernier joueur non
  renseigné se complète tout seul, et sa valeur se recalcule à chaque saisie.
- **Les cinq bonus** derrière un bouton nommé sur chaque tuile, avec leurs
  bornes matérielles : on ne peut pas attribuer trois sirènes ni faire capturer
  le Skull King deux fois.
- **Plafond du paquet** appliqué automatiquement : à 8 joueurs, les manches 9 et
  10 se jouent à 8 cartes.
- **Reprise exacte** de la manche et de la phase après fermeture de l'app.
- **Quatre graphiques** en SVG écrit à la main, historique, joueurs récurrents et
  statistiques par joueur.
- **Règles réécrites**, consultables depuis l'accueil ou en feuille modale sans
  quitter la manche en cours.
- **Français et anglais**, thème clair, sombre ou système, changeables à chaud.
- **Export / import** du fichier de données.
- **Aucun scroll latéral**, à aucune largeur : tout se plie à l'écran.
- **Noms entiers partout**, jamais une initiale ni une pastille de couleur. Dans
  le tableau des scores, les huit noms sont écrits en diagonale pour tenir dans
  la largeur d'un téléphone. La couleur ne porte jamais seule une information.

## Faire tourner le projet

```bash
npm install
npm run dev        # serveur de développement
npm run verify     # types, tests et build
npm run build      # bundle de production dans dist/
```

Node 22.12 ou plus récent.

| Script | Ce qu'il fait |
|---|---|
| `npm run dev` | Vite en développement |
| `npm run build` | Vérification des types puis bundle de production |
| `npm run test` | Tests Vitest sur `domain/`, `store/`, `i18n/` et `charts/` |
| `npm run typecheck` | TypeScript seul |
| `npm run verify` | Les trois d'affilée |
| `node scripts/smoke.mjs` | Parcours complet dans un vrai navigateur, sur `dist/` |
| `node scripts/offline.mjs` | Mode avion et suivi du thème système, sur `dist/` |
| `node scripts/nooverflow.mjs` | Absence de scroll latéral, à cinq largeurs |
| `python3 scripts/make-icons.py` | Regénère les icônes PNG depuis le logotype |

`scripts/smoke.mjs` joue une partie entière à quatre, vérifie la reprise après
rechargement, le plafond à huit joueurs, le changement de thème et de langue,
l'absence de requête réseau et l'absence d'emoji. Il attend un `dist/` à jour.
L'option `--shots` écrit des captures dans `shots/`.

`scripts/offline.mjs` coupe le réseau une fois le service worker installé, puis
relance l'app, valide une manche et ouvre les règles hors ligne. Il vérifie aussi
que le thème système bascule en direct, sans rechargement.

`scripts/nooverflow.mjs` parcourt les treize écrans à 320, 360, 390, 430 et
820 px, avec huit joueurs et le sélecteur le plus long, et échoue dès qu'un
élément dépasse la largeur ou qu'un composant défile horizontalement.

## Architecture

```
src/
  main.tsx
  app/          App, Router, Layout, StoreProvider, ThemeProvider, useWakeLock
  screens/      Home, NewGame, Game, GameSummary, History, Players, Rules, Settings
  components/   Button, Stepper, PlayerChip, ScoreTable, Sheet, Toast,
                Icon, EmptyState, BonusDrawer
  domain/       scoring, deck, validation, stats, types
  store/        storage, reducer, migrations
  charts/       ScoreLines, AccuracyBars, BonusBars, RankingBars, primitives
  i18n/         fr.json, en.json, index
  content/      rules.fr, rules.en, RulesBody
  styles/       tokens.css, base.css
public/         manifest.webmanifest, sw.js, icons/
```

**React 19 + TypeScript + Vite, et rien d'autre en dépendance d'exécution.**
Pas de routeur, pas de librairie d'état, pas de Tailwind, pas de librairie de
graphiques, pas de pack d'icônes. Le routeur tient sur le hash, l'état sur un
`useReducer` persisté, les styles sur des variables CSS et des modules CSS, les
graphiques sur du SVG calculé à la main.

Le moteur de score (`domain/scoring.ts`) est un module pur : il prend une mise,
des plis, un nombre de cartes et un objet d'options, et rend un score. Il ne lit
ni horloge ni stockage. Les variantes à venir — système Rascal, extensions —
passeront par cet objet d'options, pas par une réécriture.

Le stockage tient dans une clé `localStorage`, écrite avec 300 ms de debounce et
vidée dès que l'onglet passe en arrière-plan. La lecture est défensive : un
fichier abîmé ou bricolé à la main ne doit pas empêcher l'app de démarrer autour
d'une table. `store/migrations.ts` existe déjà, vide, pour que la prochaine
version de schéma soit une addition et pas une réécriture.

## Tests

133 tests unitaires couvrent le moteur de score — dont les huit cas de référence
du cahier des charges —, la validation de saisie, le plafonnement du paquet, les
statistiques, le réducteur, la complétion automatique du dernier joueur,
l'aller-retour export/import, la lecture défensive du stockage, les pluriels et
la géométrie des graphiques. Le parcours navigateur
complète le tout sur l'app réellement construite.

```bash
npm run verify \
  && node scripts/smoke.mjs \
  && node scripts/offline.mjs \
  && node scripts/nooverflow.mjs
```

## Déploiement

L'app est un site statique : `npm run build` produit `dist/`, et n'importe quel
hébergeur de fichiers suffit. `vercel.json` est fourni pour Vercel — préréglage
Vite, aucune variable d'environnement, aucune fonction serveur.

Deux détails y comptent vraiment. `sw.js` et `sw-version.js` sont servis sans
cache : ce sont eux qui portent la liste des fichiers à précacher, et un service
worker périmé empêcherait toute mise à jour d'arriver. Les fichiers de `assets/`
portent un hash de contenu et sont donc mis en cache pour un an.

L'app vivant sur le hash, il n'y a aucune route serveur à réécrire : la
redirection déclarée ne sert qu'à rattraper une adresse tapée à la main.

## Vie privée

Aucun compte, aucun serveur, aucune requête réseau après le premier chargement,
aucun analytics. Les données vivent dans le navigateur et n'en sortent que par un
export déclenché à la main. Le mode avion n'empêche ni le lancement ni aucune
fonctionnalité.

## Mentions légales

Sept Mers n'est ni affilié à, ni approuvé par Grandpa Beck's Games, Inc.
Skull King est une marque déposée de son propriétaire respectif.

Le texte des règles présenté dans l'app est une réécriture originale. Les
mécanismes d'un jeu ne sont pas protégeables, la prose d'un livret l'est : rien
n'est repris du livret officiel, ni dans les mots, ni dans le découpage des
chapitres. L'app ne contient aucune illustration de carte, aucun visuel de boîte,
aucune reprise de la typographie ou du logo du jeu.

Le logotype est un dessin original : sept traits horizontaux de longueurs
inégales, une houle vue de profil, sept traits pour sept mers.

## Licence

MIT. Voir [LICENSE](LICENSE).
