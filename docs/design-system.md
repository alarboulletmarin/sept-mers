# Sept Mers — Design system

> Un tableau de bord posé au milieu de la table, pas une feuille de calcul.
> Il doit se lire d'un coup d'œil, à bout de bras, par quelqu'un qui tient ses
> cartes de l'autre main. Elle est monochrome : rien n'y dépend d'une teinte.

---

## 1. Direction

**La mosaïque, pas le tableau.**

L'information ne vit pas dans une grille de lignes et de colonnes, mais dans des
**widgets** : des blocs autonomes, de tailles inégales, chacun avec sa propre
valeur de fond, posés sur un canevas neutre. Un widget répond à une question et
une seule, et il l'annonce par un chiffre qu'on lit de loin.

Trois principes.

1. **Le chiffre est l'objet.** Il occupe la moitié du widget, en graisse lourde
   et chasse fixe. Le libellé est une étiquette minuscule au-dessus. Jamais
   l'inverse.
2. **La valeur découpe, elle n'informe pas.** Un widget est encre, papier ou
   fumée. Ce choix crée le rythme de la mosaïque et hiérarchise l'écran. Il ne
   dit jamais si un score est bon ou mauvais.
3. **Rien ne flotte sans raison.** Pas d'ombre décorative, pas de dégradé. Les
   widgets se distinguent par leur fond, pas par leur relief.

**Le risque assumé** : l'écran de partie ressemble à un tableau de bord, pas à un
carnet. Une tuile par joueur, son nom en clair, son chiffre en grand, sa couleur
de fond. C'est ce qu'on reconnaîtra, et c'est ce qui rend la lecture instantanée
autour d'une table mal éclairée.

## 2. Couleurs

**Monochrome. Noir, blanc, gris. Rien d'autre.**

Ce n'est pas une contrainte subie, c'est le parti. Une mosaïque qui ne dispose
que de la valeur doit dire les choses par la **taille**, le **remplissage** et
la **forme** — et ce sont précisément les signaux qui survivent à un écran mal
éclairé, à une photocopie, et à une vision dichromate.

Il en découle une règle qui n'a plus aucune exception : **aucune information
n'est portée par une teinte**, puisqu'il n'y en a plus. Un score se lit à son
signe, un état à son remplissage, une série à son tracé.

### Surfaces

Trois surfaces plus le canevas. Elles portent un **rôle**, pas une valeur, et
**s'inversent avec le thème** : une surface figée aurait donné, en thème sombre,
du noir sur du noir.

| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| `accent` | `#0F0F0F` | `#FAFAFA` | Ce qui est actif, en cours, choisi, principal |
| `card` | `#FFFFFF` | `#1E1E1E` | La surface courante, la plus fréquente |
| `sunken` | `#BDBDBB` | `#323232` | Second plan, information de contexte |
| `canvas` | `#E4E4E2` | `#131313` | Fond de page, derrière la mosaïque |

Chaque surface publie son texte et sa sourdine, si bien que ce qui vit dedans
hérite du bon contraste sans le redéclarer.

| Sur | Texte clair | Sourdine claire | Texte sombre | Sourdine sombre |
|---|---|---|---|---|
| `accent` | `#FAFAFA` | `#A0A0A0` | `#0F0F0F` | `#575757` |
| `card` | `#0F0F0F` | `#6A6A6A` | `#FAFAFA` | `#9A9A9A` |
| `sunken` | `#0F0F0F` | `#3D3D3B` | `#FAFAFA` | `#B4B4B4` |
| `canvas` | `#0F0F0F` | `#5B5B59` | `#FAFAFA` | `#9E9E9E` |

**`accent` est le contraste maximal.** En monochrome, l'accent ne peut être que
ça : ce qui compte est plein, le reste ne l'est pas. La tuile dont la valeur est
posée, la manche en cours, l'action principale, la valeur choisie — tout cela est
`accent`. Une seule zone `accent` dominante par écran.

Tous les couples texte/fond dépassent 5.3:1 dans les deux thèmes, la plupart
15:1. Un test les vérifie (`src/styles/tokens.test.ts`).

**Règle du filet** : une surface dont l'écart au canevas tombe sous 1.4 se
dissoudrait ; elle prend alors un filet `hairline`. C'est le cas de `card` dans
les deux thèmes (1.27 et 1.11). Aucune autre bordure n'existe dans l'app.

### Ce qui remplace le vert et le rouge

| Cas | Traitement |
|---|---|
| Score positif | `+60`, signe collé au chiffre |
| Score négatif | `−20`, avec un vrai signe moins typographique |
| Valeur posée | Tuile `accent`, pleine |
| Valeur manquante | Tuile `card`, vide |
| Action destructrice | Bouton à **filet tireté** — la forme du contour, plus le mot |

Il n'existe aucun jeton `gain` ni `loss`. La question ne se pose plus.

### Séries de graphique

Huit séries à distinguer sans une seule couleur. Trois signaux, dans cet ordre.

1. **Le nom**, écrit en bout de tracé ou sous la barre. C'est le seul signal qui
   se lit sans apprentissage.
2. **Le tracé** : huit motifs de tiretés distincts, du plein au pointillé serré.
3. **Le remplissage**, pour les barres : plein, hachures montantes, hachures
   descendantes, quadrillage, pointillé, contour seul.

```
--dash-1: none        --dash-2: 7 3        --dash-3: 2 3        --dash-4: 11 3
--dash-5: 7 3 2 3     --dash-6: 1 3        --dash-7: 13 3 2 3   --dash-8: 4 2 1 2
```

Les tracés eux-mêmes sont en `currentColor` : ils héritent de la surface qui les
porte, et restent donc lisibles sur `accent` comme sur `card`.

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
   Elle inverse toujours sa surface : claire sur `accent`, sombre sur les autres.
2. **Chiffre** — `hero` ou `figure`, collé à gauche, signe compris.
3. **Légende** — une ligne `label` en sourdine, qui dit de quoi le chiffre parle.
4. **Contenu** (optionnel) — liste, mini-graphique, contrôle.

**Tailles**, dans une grille de 2 colonnes sur téléphone :

| Taille | Emprise | Usage |
|---|---|---|
| `sm` | 1 colonne | Une valeur, un joueur |
| `md` | 2 colonnes | Un graphique, une liste courte |
| `lg` | 2 colonnes, haut | Le classement, le tableau |

Un widget ne porte de bordure que lorsque son fond est trop proche du canevas
pour s'en détacher — voir la règle du filet en section 2. Partout ailleurs, c'est
l'écart de valeur qui sépare.

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
| `primary` | Fond `accent`, texte `card`, hauteur 56, rayon 999, pleine largeur | Une seule par écran, ancrée en bas |
| `secondary` | Fond `card`, texte `accent` | Action parallèle |
| `ghost` | Sans fond, filet `hairline` | Action tertiaire |
| `quiet` | Sans fond ni filet, texte en sourdine | Annuler, déplier |
| `danger` | Filet **tireté**, sans fond | Supprimer. Le contour tireté et le mot portent l'avertissement à eux deux. |

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

La tuile dont la valeur est posée passe en `accent`, pleine. C'est le seul retour
dont on a besoin pour savoir où on en est : les tuiles restées blanches sont
celles qui manquent, et on les repère d'un coup d'œil sans rien lire.

### ScoreBoard

La mosaïque ne remplace pas le tableau complet, elle le met dans un widget `lg`.

- Une ligne par manche, une colonne par joueur.
- Les noms de colonne sont écrits **en diagonale**, à −58°. C'est ce qui permet
  d'afficher huit noms entiers dans la largeur d'un téléphone sans les réduire à
  une initiale.
- La manche en cours porte un fond `accent` sur toute sa ligne.
- Chaque résultat porte son signe. Le cumul est en dessous, en sourdine.
- Au-delà de cinq joueurs la table se resserre et le cumul cède la place.
- **Aucun défilement horizontal**, à aucune largeur.

### Sheet

Feuille modale montant du bas, coins hauts à 20 px, poignée de 36 × 4, fermeture
au glissé et par un bouton. Fond `card` : elle suit le thème comme le reste.

### Toast

Bandeau bas, fond `accent`, texte `accent-on`, rayon 999, action à droite. Cinq secondes.
Il remplace toute boîte de confirmation : on agit d'abord, on peut revenir.
Il se pose **au-dessus** de la barre d'action, jamais par-dessus.

### EmptyState

Un widget `md` en `sunken`, un titre, une phrase qui dit quoi faire, un bouton.
Aucune illustration.

## 7. Règles absolues d'accessibilité

Elles priment sur toute considération esthétique.

1. **Jamais d'initiale seule pour désigner un joueur.** Trois joueurs dont le nom
   commence par D doivent rester distinguables. Le nom entier, partout.
2. **Aucune teinte nulle part.** L'app est monochrome, donc la question ne se
   pose plus : signe, mot, forme et remplissage portent tout.
3. Cibles tactiles de 44 px, 48 px pour le stepper.
4. Contraste AA sur tous les textes, dans les deux thèmes, sourdines comprises.
5. Navigation clavier complète, focus visible en contour de 2 px, dans la
   couleur du texte de la surface.
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
  dernière valeur, nom du joueur en bout de tracé, et un motif de tiretés propre
  à chaque série.
- Barres : rayon 2 en haut, valeur écrite au-dessus, et un remplissage propre à
  chaque série.
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

Il se pose toujours dans la couleur de texte de sa surface. Sur l'icône PWA
maskable, blanc sur noir.

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
  /* Surfaces — elles portent un rôle et s'inversent avec le thème. */
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

  /* Motifs de tiretés, seul moyen de distinguer huit séries sans teinte. */
  --dash-1: none;      --dash-2: 7 3;
  --dash-3: 2 3;       --dash-4: 11 3;
  --dash-5: 7 3 2 3;   --dash-6: 1 3;
  --dash-7: 13 3 2 3;  --dash-8: 4 2 1 2;

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

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-sheet: 0ms; }
}
```

Le thème s'applique par `data-theme` sur `<html>`. En mode système, un
`matchMedia('(prefers-color-scheme: dark)')` met l'attribut à jour en direct,
sans rechargement. La `theme-color` du manifeste suit le canevas actif.
