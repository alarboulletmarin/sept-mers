# Sept Mers — Design system

> Un tableau de bord posé au milieu de la table, pas une feuille de calcul.
> Il doit se lire d'un coup d'œil, à bout de bras, par quelqu'un qui tient ses
> cartes de l'autre main — et par quelqu'un qui ne distingue pas les couleurs.

---

## 1. Direction

**La mosaïque, pas le tableau.**

L'information ne vit pas dans une grille de lignes et de colonnes, mais dans des
**widgets** : des blocs autonomes, de tailles inégales, chacun avec sa propre
couleur de fond, posés sur un canevas teinté. Un widget répond à une question et
une seule, et il l'annonce par un chiffre qu'on lit de loin.

Trois principes.

1. **Le chiffre est l'objet.** Il occupe la moitié du widget, en graisse lourde
   et chasse fixe. Le libellé est une étiquette minuscule au-dessus. Jamais
   l'inverse.
2. **La couleur découpe, elle n'informe pas.** Un widget est encre, écume, sable
   ou marée. Ce choix crée le rythme de la mosaïque et hiérarchise l'écran. Il ne
   dit jamais si un score est bon ou mauvais.
3. **Rien ne flotte sans raison.** Pas d'ombre décorative, pas de dégradé. Les
   widgets se distinguent par leur fond, pas par leur relief.

**Le risque assumé** : l'écran de partie ressemble à un tableau de bord, pas à un
carnet. Une tuile par joueur, son nom en clair, son chiffre en grand, sa couleur
de fond. C'est ce qu'on reconnaîtra, et c'est ce qui rend la lecture instantanée
autour d'une table mal éclairée.

## 2. Couleurs

### Le principe qui prime sur tous les autres

**La palette est construite sur la clarté, pas sur la teinte.** Chaque surface se
distingue de ses voisines par sa luminosité, de sorte que la mosaïque reste
lisible en vision dichromate comme en noir et blanc.

Il en découle une règle absolue : **aucune information n'est portée par la seule
couleur**. Un score positif ne se distingue pas d'un score négatif par du vert et
du rouge, mais par son **signe** (`+60`, `−20`) et, quand il faut appuyer, par un
**remplissage** contre un **contour**. La teinte n'est qu'un renfort pour ceux qui
la perçoivent.

### Surfaces

Quatre surfaces de widget, identiques dans les deux thèmes. C'est ce qui donne à
l'app la même allure de jour comme de nuit.

| Rôle | Valeur | Texte dessus | Sourdine dessus | Usage |
|---|---|---|---|---|
| `ink` | `#131C1B` | `#F5F3EC` | `#93A9A5` | Widget dense, chiffres clairs sur fond sombre |
| `foam` | `#F5F3EC` | `#131C1B` | `#5C6B68` | Widget courant, le plus fréquent |
| `sand` | `#DCEE6B` | `#131C1B` | `#46521C` | Ce qui est actif, en cours, à faire maintenant |
| `tide` | `#9AA6F2` | `#131C1B` | `#23285C` | Second plan, information de contexte |

Le **canevas** est la seule chose qui change avec le thème.

| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| `canvas` | `#E9E5DA` | `#0C2A28` | Fond de page, derrière la mosaïque |
| `canvas-ink` | `#131C1B` | `#F5F3EC` | Texte posé directement sur le canevas |
| `canvas-muted` | `#5A6360` | `#8FA8A4` | Libellé secondaire sur le canevas |
| `hairline` | `#D2CCBC` | `#1B403D` | Le peu de filets qui subsistent |

Tous les couples texte/fond dépassent 4.9:1, la plupart 13:1.

`sand` est l'accent : la manche en cours, l'action principale, la valeur choisie.
Une seule zone `sand` par écran, sinon elle ne veut plus rien dire.

### Ce qui remplace le vert et le rouge

| Cas | Traitement |
|---|---|
| Score positif | `+60`, signe collé au chiffre. Sur fond `sand` quand il faut appuyer. |
| Score négatif | `−20`, avec un vrai signe moins typographique. Fond `ink`, ou contour seul. |
| Mise tenue | Pastille pleine + le mot |
| Mise ratée | Pastille contourée + le mot |

Deux teintes de renfort existent, `gain` et `loss`, mais elles n'apparaissent
jamais seules : toujours accompagnées d'un signe ou d'un mot.

| Rôle | Clair | Sombre |
|---|---|---|
| `gain` | `#1F6B4A` | `#7BE0A8` |
| `loss` | `#A8431F` | `#F0A07A` |

### Couleurs de joueur

Huit teintes, réservées **aux graphiques seuls**. Elles n'apparaissent jamais
dans l'interface : ni pastille d'initiale, ni point coloré à côté d'un nom. Un
joueur se reconnaît à son nom écrit en entier, jamais à sa couleur.

```
--player-1: #3D7DD8   --player-2: #2F9E6E   --player-3: #C2603F   --player-4: #7C6AC4
--player-5: #2AA3A8   --player-6: #C34F62   --player-7: #7E8F3A   --player-8: #6C7A85
```

Dans un graphique, chaque série porte **aussi** son nom en bout de tracé, et les
séries empilées se distinguent **aussi** par un remplissage (plein, hachuré,
pointillé). La couleur est toujours le troisième signal, jamais le premier.

## 3. Typographie

Aucune police téléchargée : l'app pèse ce qu'elle affiche, et la pile système
donne un rendu natif partout. Le caractère vient des **tailles** et des
**graisses**, pas d'un fichier de police.

```css
--font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, "Helvetica Neue", Arial, sans-serif;
```

| Rôle | Taille / interligne | Graisse | Approche | Notes |
|---|---|---|---|---|
| `hero` | 64 / 0.9 | 800 | −0.04em | Le chiffre d'un grand widget |
| `figure` | 40 / 0.95 | 800 | −0.035em | Le chiffre d'un widget courant |
| `figure-sm` | 28 / 1 | 700 | −0.02em | Chiffre d'une tuile de joueur |
| `title` | 22 / 1.2 | 700 | −0.015em | Titre d'écran |
| `subtitle` | 17 / 1.3 | 600 | 0 | Nom de joueur, titre de widget |
| `body` | 15 / 1.5 | 400 | 0 | Texte courant, règles |
| `label` | 13 / 1.4 | 600 | 0 | Libellés de contrôle |
| `tag` | 11 / 1 | 700 | 0.08em | Étiquette en pastille, capitales |

**Règle absolue** : tout élément contenant un nombre porte
`font-variant-numeric: tabular-nums`. Sans ça les colonnes dansent à chaque
manche.

Les chiffres héros portent aussi `font-feature-settings: "ss01"` quand la
plateforme le propose, et une approche négative : c'est ce qui leur donne leur
densité.

## 4. Espacement, formes, élévation

```
espacement : 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56
rayons     : 10 (contrôles) · 20 (widgets) · 999 (pastilles, boutons ronds)
filets     : 1px solid var(--hairline), rares
```

Le rayon de 20 px sur les widgets est un marqueur d'identité : il est franc,
assumé, et il tranche avec les cartes à 8 px de tout le monde.

L'élévation n'existe que pour ce qui flotte réellement : feuille modale et
bandeau d'annulation.

```css
--shadow-sheet: 0 -12px 40px rgb(0 0 0 / 0.28);
--shadow-toast: 0 6px 20px rgb(0 0 0 / 0.24);
```

## 5. Le widget — la brique de base

C'est le composant central. Tout écran est une mosaïque de widgets.

**Anatomie**, de haut en bas :

1. **Étiquette** (optionnelle) — pastille arrondie, texte `tag` en capitales.
   Sur `ink` elle est `sand` ; sur les surfaces claires elle est `ink`.
2. **Chiffre** — `hero` ou `figure`, collé à gauche, signe compris.
3. **Légende** — une ligne `label` en sourdine, qui dit de quoi le chiffre parle.
4. **Contenu** (optionnel) — liste, mini-graphique, contrôle.

**Tailles**, dans une grille de 2 colonnes sur téléphone :

| Taille | Emprise | Usage |
|---|---|---|
| `sm` | 1 colonne | Une valeur, un joueur |
| `md` | 2 colonnes | Un graphique, une liste courte |
| `lg` | 2 colonnes, haut | Le classement, le tableau |

Un widget ne porte jamais de bordure. Il se détache par son fond. La seule
exception est le widget `foam` sur canevas clair, qui prend un filet `hairline`
pour ne pas se dissoudre.

## 6. Composants

### Stepper — le contrôle central

Deux fois par manche, une fois par joueur. Tout le reste peut être ordinaire,
celui-ci doit être parfait.

- `−` valeur `+`, sur une ligne, la valeur au centre en `figure-sm`.
- Boutons ronds de 44 px, fond de la surface opposée à celle du widget.
- Appui maintenu pour défiler : atteindre 8 ne doit pas coûter huit taps.
- Retour haptique léger à chaque pas quand l'API est disponible.
- Tant qu'aucune valeur n'est posée, la valeur affiche `—` et le premier appui
  tombe sur `0`, la mise la plus fréquente.
- Jamais de champ de saisie, jamais de `<select>`, jamais de clavier.

### Button

| Variante | Apparence | Usage |
|---|---|---|
| `primary` | Fond `sand`, texte `ink`, hauteur 56, rayon 999, pleine largeur | Une seule par écran, ancrée en bas |
| `secondary` | Fond `ink` sur canevas clair, `foam` sur canevas sombre | Action parallèle |
| `ghost` | Sans fond, filet `hairline` | Action tertiaire |
| `quiet` | Sans fond ni filet, texte en sourdine | Annuler, déplier |
| `danger` | Contour et texte `loss`, sans fond | Supprimer. Le mot porte l'avertissement, la couleur ne fait que l'accompagner. |

Le libellé décrit l'effet : « Valider la manche », pas « Suivant ». Et le message
qui suit reprend le même verbe : « Manche 4 enregistrée ».

### Tag

Pastille de 11 px en capitales, `letter-spacing: 0.08em`, rayon 999, padding
4/10. C'est la signature visuelle de la mosaïque : chaque widget qui a besoin
d'être nommé porte la sienne.

### PlayerTile

Widget `sm`. Nom entier en `subtitle`, sur deux lignes si nécessaire, **jamais**
abrégé en initiale. Puis le stepper. Puis, en phase de résultats, le rappel de
mise et le score de la manche.

La tuile dont la valeur est posée passe en `sand`. C'est le seul retour dont on a
besoin pour savoir où on en est dans la saisie : les tuiles restées claires sont
celles qui manquent.

### ScoreBoard

La mosaïque ne remplace pas le tableau complet, elle le met dans un widget `lg`.

- Une ligne par manche, une colonne par joueur.
- Les noms de colonne sont écrits **en diagonale**, à −58°. C'est ce qui permet
  d'afficher huit noms entiers dans la largeur d'un téléphone sans les réduire à
  une initiale.
- La manche en cours porte un fond `sand` sur toute sa ligne.
- Chaque résultat porte son signe. Le cumul est en dessous, en sourdine.
- Au-delà de cinq joueurs la table se resserre et le cumul cède la place.
- **Aucun défilement horizontal**, à aucune largeur.

### Sheet

Feuille modale montant du bas, coins hauts à 20 px, poignée de 36 × 4, fermeture
au glissé et par un bouton. Fond `foam` en thème clair, `ink` en thème sombre.

### Toast

Bandeau bas, fond `ink`, texte `foam`, rayon 999, action à droite. Cinq secondes.
Il remplace toute boîte de confirmation : on agit d'abord, on peut revenir.
Il se pose **au-dessus** de la barre d'action, jamais par-dessus.

### EmptyState

Un widget `md` en `tide`, un titre, une phrase qui dit quoi faire, un bouton.
Aucune illustration.

## 7. Règles absolues d'accessibilité

Elles priment sur toute considération esthétique.

1. **Jamais d'initiale seule pour désigner un joueur.** Trois joueurs dont le nom
   commence par D doivent rester distinguables. Le nom entier, partout.
2. **Jamais de couleur seule pour porter une information.** Signe, mot, forme ou
   remplissage viennent toujours en premier.
3. Cibles tactiles de 44 px, 48 px pour le stepper.
4. Contraste AA sur tous les textes, dans les deux thèmes, sourdines comprises.
5. Navigation clavier complète, focus visible en contour `sand` de 2 px.
6. `prefers-reduced-motion` respecté : toutes les durées tombent à zéro.
7. `env(safe-area-inset-*)` géré en haut et en bas.
8. **Aucun défilement horizontal**, sur aucun écran ni aucun composant, de 320 px
   à l'écran large.

## 8. Graphiques

Quatre composants SVG maison, sans librairie.

- `viewBox` fixe, largeur 100 %, hauteur par le ratio. Toute la géométrie se
  calcule dans le `viewBox`, jamais en pixels d'écran.
- Un graphique vit **dans** un widget et hérite de sa surface.
- Grille : filets horizontaux seulement, jamais de verticales, jamais de fond.
- Séries : trait de 2.5, sans lissage — les manches sont des points discrets, une
  courbe mentirait sur les valeurs intermédiaires. Point de 3.5 px sur la
  dernière valeur, nom du joueur en bout de tracé.
- Barres : rayon 6 en haut, valeur écrite au-dessus ou dedans.
- Les séries empilées se distinguent par un **remplissage** autant que par une
  couleur.
- Aucun dégradé, aucune ombre, aucune animation, aucune infobulle au survol.
- Chaque graphique porte un `<title>`, un `aria-label`, et une table de données
  en `.sr-only`.

## 9. Mouvement

```
--ease: cubic-bezier(0.2, 0, 0, 1);
--dur-fast: 120ms;   /* sélection, appui */
--dur-base: 180ms;   /* apparition de contenu */
--dur-sheet: 260ms;  /* feuille modale */
```

Rien d'autre ne bouge. Pas d'entrée en fondu au chargement, pas de compteur qui
s'incrémente, pas de graphique qui se dessine.

## 10. Marque

**Sept Mers.** Le nom vient du titre décerné au vainqueur. Il ne reprend aucun
élément de la marque déposée.

Le logotype est un dessin original : **sept traits horizontaux** de longueurs
inégales, empilés, formant une houle vue de profil. Sept traits pour sept mers,
et une forme qui évoque autant une vague qu'un relevé de scores.

```svg
<svg viewBox="0 0 48 48" fill="none">
  <g stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <path d="M10 12h12" /><path d="M26 12h12" />
    <path d="M8 20h16" /><path d="M28 20h12" />
    <path d="M12 28h20" /><path d="M36 28h4" />
    <path d="M10 36h28" />
  </g>
</svg>
```

Il se pose en `sand` sur les surfaces sombres, en `ink` sur les claires. Sur
l'icône PWA maskable, `sand` sur `ink`.

**Aucune imagerie de piraterie.** Pas de crâne, pas de couronne, pas de
parchemin, pas de bois vieilli. Skull King est une marque déposée de Grandpa
Beck's Games, Inc. : un crâne couronné réimporterait visuellement exactement ce
qu'on met à distance.

## 11. Écriture de l'interface

- Phrases en minuscules après la première lettre, jamais de capitales de titre.
  Seules les étiquettes en pastille sont en capitales.
- Les boutons disent ce qui se passe : « Commencer la partie », « Valider les
  mises », « Enregistrer la manche ».
- Une action garde son nom du bouton jusqu'au message de confirmation.
- Les erreurs disent ce qui bloque et comment le lever : « Il reste 2 plis à
  attribuer », pas « Saisie invalide ».
- Les vides invitent à agir : « Aucun joueur enregistré. Ajoute le premier pour
  commencer. »
- Le tutoiement en français, cohérent partout. L'anglais reste neutre.
- Aucun emoji, aucun point d'exclamation, aucune formule enjouée.

## 12. Tokens prêts à coller

```css
/* src/styles/tokens.css */
:root {
  /* Surfaces de widget — identiques dans les deux thèmes. */
  --ink: #131c1b;
  --ink-on: #f5f3ec;
  --ink-muted: #93a9a5;

  --foam: #f5f3ec;
  --foam-on: #131c1b;
  --foam-muted: #5c6b68;

  --sand: #dcee6b;
  --sand-on: #131c1b;
  --sand-muted: #46521c;

  --tide: #9aa6f2;
  --tide-on: #131c1b;
  --tide-muted: #23285c;

  /* Canevas — la seule chose qui suit le thème. */
  --canvas: #e9e5da;
  --canvas-on: #131c1b;
  --canvas-muted: #5a6360;
  --hairline: #d2ccbc;

  --gain: #1f6b4a;
  --loss: #a8431f;

  --player-1: #3d7dd8; --player-2: #2f9e6e;
  --player-3: #c2603f; --player-4: #7c6ac4;
  --player-5: #2aa3a8; --player-6: #c34f62;
  --player-7: #7e8f3a; --player-8: #6c7a85;

  --font: ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI',
          Roboto, 'Helvetica Neue', Arial, sans-serif;

  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;
  --space-9: 56px;

  --radius-control: 10px;
  --radius-widget: 20px;
  --radius-pill: 999px;

  --shadow-sheet: 0 -12px 40px rgb(0 0 0 / 0.28);
  --shadow-toast: 0 6px 20px rgb(0 0 0 / 0.24);

  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-sheet: 260ms;

  --tap-min: 44px;
  --tap-step: 48px;
}

:root[data-theme='dark'] {
  --canvas: #0c2a28;
  --canvas-on: #f5f3ec;
  --canvas-muted: #8fa8a4;
  --hairline: #1b403d;

  --gain: #7be0a8;
  --loss: #f0a07a;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-sheet: 0ms; }
}
```

Le thème s'applique par `data-theme` sur `<html>`. En mode système, un
`matchMedia('(prefers-color-scheme: dark)')` met l'attribut à jour en direct,
sans rechargement. La `theme-color` du manifeste suit le canevas actif.
