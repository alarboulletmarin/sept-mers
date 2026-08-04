# Sept Mers

**Compteur de points non officiel pour Skull King.**
Front only, hors ligne, sans compte, sans serveur, sans suivi.

Sept Mers remplace le carnet de score papier autour d'une table. L'app répond à
quatre questions, vite, sur un téléphone qui passe de main en main : qui a parié
quoi, qui a tenu son pari, qui mène, et quelle était déjà la règle sur les
sirènes. Elle ne joue pas, ne conseille pas, et ne suit pas les cartes jouées.

## Ce qu'elle fait

- **Score classique**, 2 à 8 joueurs, 10 manches, tout calculé par l'app.
- **Deux variantes en option**, choisies au lancement d'une partie et
  expliquées dans les règles : le Kraken et la Baleine blanche, qui font qu'un
  pli peut n'être remporté par personne ; les pouvoirs des pirates, dont seul le
  pari de Rascal Jack change le score.
- **Saisie sans clavier** : une grille de tuiles, une par joueur, avec un
  contrôle moins / plus. Appui maintenu pour défiler. Les mises partent à zéro,
  les plis partent sur la mise de chacun, et le dernier joueur qu'on n'a pas
  repris en main se complète tout seul — une manche où tout le monde tient sa
  mise se valide sans un geste.
- **Les cinq bonus** derrière un bouton nommé sur chaque tuile, avec leurs
  bornes matérielles : on ne peut pas attribuer trois sirènes ni faire capturer
  le Skull King deux fois.
- **Plafond du paquet** appliqué automatiquement : à 8 joueurs, les manches 9 et
  10 se jouent à 8 cartes — 9 avec les monstres marins, que les 2 cartes de plus
  suffisent à faire tenir la manche 9.
- **Reprise exacte** de la manche et de la phase après fermeture de l'app.
- **Marche arrière** : on revient à la manche précédente pour la corriger, et la
  saisie en cours est mise de côté le temps qu'on y retourne.
- **Trois graphiques** en SVG écrit à la main, historique, joueurs récurrents et
  statistiques par joueur.
- **Règles réécrites**, consultables depuis l'accueil ou en feuille modale sans
  quitter la manche en cours.
- **Français et anglais**, thème clair, sombre ou système, changeables à chaud.
- **Export / import** du fichier de données.
- **Aucun scroll latéral**, à aucune largeur : tout se plie à l'écran.
- **Design en mosaïque, monochrome** : des widgets noir, blanc ou gris, un
  chiffre en héros par widget. Voir [le design system](docs/design-system.md).
- **Deux familles typographiques** : une pour la voix, une chasse fixe pour les
  chiffres. Les deux sont embarquées et précachées : rien à télécharger, y
  compris en mode avion.
- **Barre de navigation basse**, quatre destinations, présente y compris au
  milieu d'une manche : aller lire une règle ne fait perdre ni la partie ni la
  saisie en cours.
- **Guidage permanent** : trois phrases au premier lancement, une consigne sous
  chaque titre d'écran, la progression de la partie et le temps de la manche
  affichés en continu, et un blocage qui se nomme avant de griser un bouton.
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

Node 22. Le champ `engines` déclare `22.x` plutôt qu'une plage : c'est la forme
que les hébergeurs reconnaissent sans discuter. Vite 7 demande au minimum
Node 22.12, que toute version 22 récente satisfait.

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
| `node scripts/contrast.mjs` | Absence de texte illisible, dans les deux thèmes |
| `python3 scripts/make-icons.py` | Regénère les icônes PNG depuis le logotype |

Les quatre parcours navigateur ont besoin d'un Chromium. Après
`npx playwright install chromium` ils le trouvent seuls ; `scripts/browser.mjs`
regarde d'abord `CHROMIUM_PATH`, puis les emplacements où un Chromium
préinstallé se trouve d'ordinaire, et laisse Playwright résoudre à défaut.

`scripts/smoke.mjs` joue une partie entière à quatre, vérifie la reprise après
rechargement, le plafond à huit joueurs, le changement de thème et de langue,
l'absence de requête réseau et l'absence d'emoji. Il attend un `dist/` à jour.
L'option `--shots` écrit des captures dans `shots/`.

`scripts/offline.mjs` coupe le réseau une fois le service worker installé, puis
relance l'app, valide une manche et ouvre les règles hors ligne. Il vérifie aussi
que le thème système bascule en direct, sans rechargement.

`scripts/nooverflow.mjs` parcourt les treize écrans à 320, 360, 390, 430 et
820 px, avec huit joueurs et la valeur la plus haute, et échoue dès qu'un
élément dépasse la largeur ou qu'un composant défile horizontalement.

`scripts/contrast.mjs` mesure le contraste réel de chaque texte contre son fond
effectif, dans les deux thèmes. Il attrape la classe de défaut qui ne casse
rien par ailleurs : un bloc qui pose une surface sans publier ses couleurs de
texte, et dont le contenu devient blanc sur blanc.

## Architecture

```
src/
  main.tsx
  app/          App, Router, Layout, TabBar, StoreProvider, ThemeProvider,
                useWakeLock
  screens/      Home, NewGame, Game, GameSummary, History, Players, Rules, Settings
  components/   Widget, Button, Stepper, Rail, PlayerChip, ScoreTable, Sheet,
                Toast, Icon, EmptyState, BonusDrawer, OptionSwitch
  domain/       scoring, deck, validation, stats, types
  store/        storage, reducer, migrations
  charts/       ScoreLines, AccuracyBars, RankingBars, primitives
  i18n/         fr.json, en.json, index
  content/      rules.fr, rules.en, RulesBody
  styles/       tokens.css, fonts.css, base.css, fonts/*.woff2
public/         manifest.webmanifest, sw.js, icons/
docs/           design-system.md
```

**React 19 + TypeScript + Vite, et rien d'autre en dépendance d'exécution.**
En développement s'ajoutent Vitest et Playwright, pour les parcours navigateur.
Pas de routeur, pas de librairie d'état, pas de Tailwind, pas de librairie de
graphiques, pas de pack d'icônes. Les deux fichiers de police vivent dans `src/`
pour que Vite leur pose un hash de contenu et que le service worker les
précache avec le bundle. Le routeur tient sur le hash, l'état sur un
`useReducer` persisté, les styles sur des variables CSS et des modules CSS, les
graphiques sur du SVG calculé à la main.

Le moteur de score (`domain/scoring.ts`) est un module pur : il prend une mise,
des plis, un nombre de cartes et un objet d'options, et rend un score. Il ne lit
ni horloge ni stockage. C'est par cet objet d'options que les variantes sont
arrivées, et non par une réécriture : le pari de Rascal Jack s'ajoute au total
sans passer par les primes, puisque l'option qui annule les primes d'une mise
ratée ne l'annule pas.

Le stockage tient dans une clé `localStorage`, écrite avec 300 ms de debounce et
vidée dès que l'onglet passe en arrière-plan. La lecture est défensive : un
fichier abîmé ou bricolé à la main ne doit pas empêcher l'app de démarrer autour
d'une table. `store/migrations.ts` existe déjà, vide, pour que la prochaine
version de schéma soit une addition et pas une réécriture.

## Tests

220 tests unitaires couvrent le moteur de score — dont les huit cas de référence
du cahier des charges —, la validation de saisie, le plafonnement du paquet, les
variantes, les statistiques, le réducteur, le préremplissage et la complétion
automatique du dernier joueur, la marche arrière entre manches, l'aller-retour
export/import, la lecture défensive du stockage, les pluriels, la géométrie des
graphiques, la configuration de déploiement, les icônes d'installation, les
jetons de la palette et le système typographique — familles, échelle, fichiers de fonte
embarqués, et l'absence de toute famille écrite en dur hors des jetons. Le
parcours navigateur complète le tout sur l'app réellement construite.

```bash
npm run verify \
  && node scripts/smoke.mjs \
  && node scripts/offline.mjs \
  && node scripts/nooverflow.mjs \
  && node scripts/contrast.mjs
```

Ces cinq vérifications tournent à chaque poussée et à chaque pull request, dans
[`.github/workflows/verification.yml`](.github/workflows/verification.yml), sur
la même majeure de Node que le déploiement.

## Déploiement

L'app est un site statique : `npm run build` produit `dist/`, et n'importe quel
hébergeur de fichiers suffit. `vercel.json` est fourni pour Vercel — préréglage
Vite, aucune variable d'environnement, aucune fonction serveur.

Ce fichier ne contient **aucun commentaire** : JSON n'en a pas, et le schéma de
Vercel refuse toute propriété inconnue, y compris une clé `"//"` employée comme
telle. Le déploiement échoue alors à la validation, avant même le clonage, avec
un « Deployment failed » sans journal — trois clés glissées dans `headers` ont
suffi. `src/deploy.test.ts` le vérifie, avec le reste de la configuration : les
clés autorisées à chaque niveau, le comportement réel de la redirection, et la
forme de `engines.node`. Les explications, elles, vivent ci-dessous.

| Fichier | Cache | Pourquoi |
|---|---|---|
| `sw.js`, `sw-version.js` | aucun | Ce sont eux qui portent la liste des fichiers à précacher. Un service worker périmé empêche toute mise à jour d'arriver, définitivement. |
| `manifest.webmanifest` | aucun | Il change avec le thème et les icônes. |
| `assets/*` | un an, immuable | Ces fichiers portent un hash de contenu : leur nom change à chaque build. |
| `icons/*` | un jour | Ils n'ont pas de hash, et on doit pouvoir les corriger. |

L'app vivant sur le hash, il n'y a aucune route serveur à réécrire : la
redirection déclarée ne sert qu'à rattraper une adresse tapée à la main.

## Vie privée

Aucun compte, aucun serveur, aucune requête réseau après le premier chargement,
aucun analytics. Les données vivent dans le navigateur et n'en sortent que par un
export déclenché à la main. Le mode avion n'empêche ni le lancement ni aucune
fonctionnalité.

## Design

Le design system vit dans [`docs/design-system.md`](docs/design-system.md) :
palette, typographie, anatomie du widget, composants, règles d'accessibilité.

L'app est **monochrome** : noir, blanc, gris. Aucune information ne peut donc
dépendre d'une teinte — un score se lit à son signe, un état à son remplissage,
une série à son motif de tiretés. C'est aussi ce qui la rend lisible en vision
dichromate comme en noir et blanc.

Sans couleur, c'est la typographie qui sépare le discours de la donnée. Deux
familles, embarquées en `woff2` variable : **Instrument Sans** pour tout ce qui
s'énonce, **JetBrains Mono** pour tout ce qui se compte. Le partage est
fonctionnel plutôt que décoratif — un carnet de score est une colonne de nombres
qu'on relit d'une manche à l'autre, et une colonne ne se relit que si elle ne
danse pas.

Les surfaces portent un rôle et **s'inversent avec le thème** : `accent` est le
bloc de contraste maximal, noir de jour et blanc de nuit. Une surface figée
donnerait, en thème sombre, du noir sur du noir.

`src/styles/tokens.test.ts` interdit toute couleur saturée dans les jetons et
vérifie le contraste de chaque couple texte/surface dans les deux thèmes.

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

Les deux familles typographiques embarquées — **Instrument Sans**, publiée par
Instrument, et **JetBrains Mono**, publiée par JetBrains — sont sous SIL Open
Font License 1.1. Leur texte de licence est conservé dans
[`src/styles/fonts/`](src/styles/fonts/), et la licence de l'app ne s'y applique
pas.
