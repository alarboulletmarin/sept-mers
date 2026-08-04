# Sept Mers — Design system

> Un carnet de bord posé au milieu de la table, pas une feuille de calcul.
> Il doit se lire d'un coup d'œil, à bout de bras, par quelqu'un qui tient ses
> cartes de l'autre main. Il est monochrome : rien n'y dépend d'une teinte.

---

## 1. Direction

**La mosaïque, pas le tableau. Deux familles, pas une.**

L'information ne vit pas dans une grille de lignes et de colonnes, mais dans des
**widgets** : des blocs autonomes, de tailles inégales, chacun avec sa propre
valeur de fond, posés sur un canevas neutre. Un widget répond à une question et
une seule, et il l'annonce par un chiffre qu'on lit de loin.

Quatre principes.

1. **Le texte parle, les chiffres se lisent.** Une seule famille pour tout ce
   qui s'énonce, une chasse fixe pour tout ce qui se compte. C'est la règle qui
   donne à l'app sa voix, et c'est aussi elle qui l'empêche de bavarder.
2. **Le chiffre est l'objet.** Il occupe la moitié du widget, serré et tabulaire.
   L'étiquette est une pastille minuscule au-dessus. Jamais l'inverse.
3. **La valeur découpe, elle n'informe pas.** Un widget est encre, papier ou
   fumée. Ce choix crée le rythme de la mosaïque et hiérarchise l'écran. Il ne
   dit jamais si un score est bon ou mauvais.
4. **Rien ne flotte sans raison.** Pas d'ombre décorative, pas de dégradé. Les
   widgets se distinguent par leur fond, pas par leur relief. Le seul ornement de
   l'app est un filet d'un pixel.

**Le risque assumé** : l'écran de partie ressemble à un tableau de bord, pas à un
carnet manuscrit. Une tuile par joueur, son nom en clair, son chiffre en grand,
sa surface pleine ou vide. C'est ce qu'on reconnaîtra, et c'est ce qui rend la
lecture instantanée autour d'une table mal éclairée.

## 2. Couleurs

**Monochrome. Noir, blanc, gris. Rien d'autre.**

Ce n'est pas une contrainte subie, c'est le parti. Une mosaïque qui ne dispose
que de la valeur doit dire les choses par la **taille**, le **remplissage**, la
**forme** et la **typographie** — et ce sont précisément les signaux qui
survivent à un écran mal éclairé, à une photocopie, et à une vision dichromate.

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

**Corollaire, et c'est une faute qu'on a déjà commise** : un composant posé dans
un widget ne doit jamais coder `--accent` en dur pour dire « choisi ». Sur un
widget encre, la pastille cochée devenait noire sur noire. Un état choisi se dit
`var(--surface-on)` sur `var(--surface)`, jamais autrement.

Tous les couples texte/fond dépassent 5.3:1 dans les deux thèmes, la plupart
15:1. Un test les vérifie (`src/styles/tokens.test.ts`), et `scripts/contrast.mjs`
mesure le contraste réel de chaque texte de l'app contre son fond effectif.

**Règle du filet** : une surface dont l'écart au canevas tombe sous 1.4 se
dissoudrait ; elle prend alors un filet `hairline`. C'est le cas de `card` dans
les deux thèmes (1.27 et 1.11).

### Ce qui remplace le vert et le rouge

| Cas | Traitement |
|---|---|
| Score positif | `+60`, signe collé au chiffre |
| Score négatif | `−20`, avec un vrai signe moins typographique |
| Valeur posée | Tuile `accent`, pleine |
| Valeur manquante | Tuile `card`, vide, avec un trait à remplir |
| Action destructrice | Bouton à **filet tireté** — la forme du contour, plus le mot |

Il n'existe aucun jeton `gain` ni `loss`. La question ne se pose plus.

### Séries de graphique

Huit séries à distinguer sans une seule couleur. Trois signaux, dans cet ordre.

1. **Le nom**, écrit en légende ou sous la barre. C'est le seul signal qui se lit
   sans apprentissage.
2. **Le tracé** : huit motifs de tiretés distincts, du plein au pointillé serré.
3. **Le remplissage**, pour les barres : plein, hachures montantes, hachures
   descendantes, quadrillage, pointillé, contour seul.

**La légende vient avant le dessin**, jamais après : elle donne la convention, et
une convention se lit d'abord. Sa pastille reproduit le signal exact de la série
— le motif de tiretés pour une courbe, le remplissage pour une barre —, jamais un
carré plein qui n'apprendrait rien. Le nom y est écrit **en entier** : c'est la
place qui permet de ne pas le tronquer, contrairement à l'intérieur du `viewBox`.

```
--dash-1: none        --dash-2: 7 3        --dash-3: 2 3        --dash-4: 11 3
--dash-5: 7 3 2 3     --dash-6: 1 3        --dash-7: 13 3 2 4   --dash-8: 4 2 1 2
```

Les tracés eux-mêmes sont en `currentColor` : ils héritent de la surface qui les
porte, et restent donc lisibles sur `accent` comme sur `card`.

## 3. Typographie

**Deux familles. Le texte parle, les chiffres se lisent.**

C'est le cœur du système. En monochrome, la typographie fait à elle seule le
travail que la couleur ferait ailleurs.

| Famille | Rôle | Ce qu'elle porte |
|---|---|---|
| **Instrument Sans** | La voix | Noms de joueurs, titres, libellés, boutons, règles, consignes, étiquettes |
| **JetBrains Mono** | Le chiffre | Scores, mises, plis, numéros de manche, colonnes de totaux, valeurs de bonus |

Le partage n'est pas décoratif, il est fonctionnel. **La chasse fixe est la
raison d'être de l'app** : un carnet de score est une colonne de nombres qu'on
relit d'une manche à l'autre, et une colonne ne se relit que si elle ne danse
pas. Le zéro barré, le signe moins de même largeur qu'un chiffre, les colonnes
qui s'alignent sans qu'on ait rien à demander — tout cela vient du dessin de la
police, pas d'un réglage.

Il en découle une frontière nette, et elle n'a qu'une exception : **un mot qui
introduit un chiffre reste dans la voix**. « sur 10 » s'écrit avec « sur » en
Instrument Sans et « 10 » à sa suite ; le mot passé en chasse fixe se lisait
comme du code.

Les deux familles sont **embarquées** (`src/styles/fonts.css`), en `woff2`
variable, découpées en `latin` et `latin-ext` par `unicode-range` : les accents
ne coûtent que quand ils servent. Elles pèsent 132 ko au total, vivent dans
`src/` et non dans `public/` pour que Vite leur donne un hash de contenu, et le
service worker les précache avec le reste du bundle — le mode avion n'a rien à
télécharger. Les deux tranches `latin` sont préchargées dans le HTML.

**Instrument Sans est variable sur deux axes** : `wght` 400→700 et `wdth`
75→100. La chasse étroite n'est pas un effet : elle est réservée aux
micro-libellés en capitales, où c'est elle — et non une graisse de plus — qui
donne l'allure de tampon, et aux noms en diagonale du tableau des scores, où
elle gagne les deux lettres qui font tenir un nom entier plutôt qu'une
abréviation.

### L'échelle

| Rôle | Famille | Taille / interligne | Graisse | Approche |
|---|---|---|---|---|
| `t-display` | voix | `clamp(30, 8.5vw, 40)` / 1.02 | 700 | −0.035em |
| `t-title` | voix | 26 / 1.15 | 700 | −0.025em |
| `t-lede` | voix | 16 / 1.45 | 400 | −0.005em |
| `t-hero` | chiffre | 50 / 0.86 | 700 | −0.03em |
| `t-figure` | chiffre | 32 / 0.9 | 700 | −0.02em |
| `t-figure-sm` | chiffre | 23 / 1 | 700 | −0.03em |
| `t-subtitle` | voix | 16 / 1.25 | 600 | −0.01em |
| `t-body` | voix | 15 / 1.6 | 400 | 0 |
| `t-label` | voix | 13 / 1.4 | 600 | 0 |
| `t-caption` | voix | 12 / 1.45 | 500 | 0 |
| `t-tag` | voix, chasse 84 % | 11 / 1 | 700 | +0.14em, capitales |

Quatre règles qui n'ont pas d'exception.

1. **Tout élément contenant un nombre porte `font-variant-numeric: tabular-nums`**,
   chasse fixe comprise. C'est une ceinture et des bretelles, et ça ne coûte
   rien.
2. **Une famille ne s'écrit jamais en dur dans un composant.** Trois jetons, et
   trois seulement : `--font-sans`, `--font-figure`, et rien d'autre. Un test le
   vérifie sur toutes les feuilles de `src/`.
3. **L'approche se resserre quand le corps grandit** — mais pas au même rythme
   dans les deux familles. Une chasse fixe porte ses blancs latéraux dans le
   dessin même des glyphes ; les rogner autant qu'une proportionnelle collerait
   les chiffres. Le titre est donc plus serré que le chiffre, et c'est voulu.
4. **L'échelle des chiffres est un cran sous celle d'une proportionnelle.** À
   corps égal, une chasse fixe est un tiers plus large : c'est ce qui a fait
   déborder « 1 100 » d'une tuile avant que le héros ne descende de 60 à 50.

### Ce qu'il n'y a pas

Ni romain, ni italique. Une première version en avait un — un romain d'affiche
pour les titres et une consigne en italique — et il donnait à un compteur de
points l'allure d'un magazine. Sans seconde famille de texte, la hiérarchie
tient sur trois leviers et trois seulement : la taille, la graisse et
l'approche. C'est peu, et c'est exactement pour ça que chaque cran de l'échelle
doit avoir un rôle et un seul.

## 4. Espacement, formes, élévation

```
espacement : 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56
rayons     : 10 (contrôles) · 20 (widgets) · 999 (pastilles, boutons ronds)
filets     : 1px solid var(--hairline)
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

1. **Étiquette** (optionnelle) — pastille arrondie, texte `t-tag` en capitales.
   Elle inverse toujours sa surface : claire sur `accent`, sombre sur les autres.
2. **Chiffre** — `hero` ou `figure`, collé à gauche, signe compris.
3. **Légende** — une ligne `t-caption` en sourdine, qui dit de quoi le chiffre
   parle.
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

### La barre de navigation

Quatre destinations, en bas, toujours là — y compris au milieu d'une manche.
C'est le seul repère de l'app qui ne bouge jamais d'un écran à l'autre, et
c'est ce qui permet de sortir voir les règles ou l'historique sans avoir peur
de perdre la partie en cours.

- **Accueil, Historique, Joueurs, Règles.** Les réglages n'en font pas partie :
  on y va une fois pour choisir sa langue et son thème, pas en jouant. Ils
  vivent en bouton rond sur l'accueil.
- L'onglet **Accueil porte le logotype** plutôt qu'une maison : la marque est
  déjà le dessin de la maison.
- L'onglet actif porte **un trait court au-dessus de son icône** — le même geste
  que la houle de progression, à la plus petite échelle. Le
  trait est toujours présent et toujours à la même place ; seule son encre
  change, si bien que rien ne saute quand on change d'onglet.
- Une partie, sa composition et son résultat allument **Accueil** : ce sont
  trois moments d'un même geste, et une barre sans repère se lit comme une barre
  cassée.
- **Un onglet au repos est sourd, pas transparent.** L'opacité aurait été plus
  simple, mais un libellé de 10 px à 45 % tombe sous le seuil AA. La sourdine du
  canevas, elle, est calibrée pour le tenir.
- Sa hauteur est un jeton, `--tabbar-h`, et **tout ce qui vit en bas s'y empile**
  : la barre d'action se colle au-dessus d'elle, le bandeau au-dessus des deux.

### Le filet de section

L'intitulé de section est en capitales étroites, et **le filet le prolonge
jusqu'au bord**. C'est le seul ornement de l'app : il coûte un pixel, il tient la
page ensemble, et il vient de la même famille de gestes que la houle — des
traits horizontaux, rien d'autre.

Il remplace les fonds de section. Un empilement de blocs blancs se lit comme un
formulaire ; une suite de filets se lit comme un sommaire.

### La houle — repère de partie

Dix traits pour dix manches, du geste de la maison. Les manches jouées
sont pleines mais posées, celle en cours est plus haute et plus longue, celles à
venir sont à 22 % d'opacité.

Elle ne décore pas, **elle situe** : on voit où on en est sans lire un chiffre,
ce qui compte quand le téléphone passe de main en main au milieu d'une partie.
Elle apparaît en tête du widget de manche et dans le widget de reprise.

### Les temps — repère de manche

Une manche a deux temps : on mise, puis on compte les plis. Les deux sont
**toujours affichés**, reliés par un filet, le temps en cours plein et le
franchi au contour. Quelqu'un qui prend le téléphone en cours de partie doit
savoir lequel des deux on lui demande, sans avoir suivi.

Le temps franchi est cliquable : y revenir est une correction ordinaire, pas une
sortie de secours.

### Stepper — le contrôle central

Deux fois par manche, une fois par joueur. Tout le reste peut être ordinaire,
celui-ci doit être juste.

- `−` valeur `+`, sur une ligne, la valeur au centre à 31 px, en chasse fixe.
- **La valeur crie, les boutons chuchotent.** Des pastilles pleines faisaient de
  la commande l'objet le plus sombre de l'écran, alors que ce qu'on vient y lire
  c'est le chiffre. Elles sont donc au filet, à 45 % d'opacité, et ne se
  remplissent qu'à l'appui.
- Boutons ronds de 44 px, appui maintenu pour défiler : atteindre 8 ne doit pas
  coûter huit taps.
- Retour haptique léger à chaque pas quand l'API est disponible.
- Tant qu'aucune valeur n'est posée, **la place du chiffre est un trait à
  remplir**, comme sur un carnet. Un tiret de la taille d'un chiffre se lisait
  comme un séparateur ; une ligne vide se lit comme une case qui attend. Le
  premier appui tombe sur `0`, la mise la plus fréquente.
- Jamais de champ de saisie, jamais de `<select>`, jamais de clavier.

### Button

| Variante | Apparence | Usage |
|---|---|---|
| `primary` | Fond `accent`, texte `accent-on`, hauteur 56, rayon 999, pleine largeur | Une seule par écran, ancrée en bas |
| `secondary` | Fond `card`, filet | Action parallèle |
| `ghost` | Sans fond, filet `hairline` | Action tertiaire |
| `quiet` | Sans fond ni filet, texte en sourdine | Annuler, déplier |
| `danger` | Filet **tireté**, sans fond | Supprimer. Le contour tireté et le mot portent l'avertissement à eux deux. |

Le libellé décrit l'effet : « Valider la manche », pas « Suivant ». Et le message
qui suit reprend le même verbe : « Manche 4 enregistrée ».

### Tag

Pastille de 11 px en capitales, chasse 84 %, `letter-spacing: 0.14em`, rayon 999,
padding 5/10. C'est la signature visuelle de la mosaïque et **le seul endroit de
l'app où l'on crie**.

### PlayerTile

Widget `sm`. Nom entier en 14 px, sur deux lignes si nécessaire, **jamais**
abrégé en initiale. Puis le stepper. Puis, en phase de résultats, le rappel de
mise, le score de la manche et le bouton de bonus.

La tuile dont la valeur est posée passe en `accent`, pleine. C'est le seul retour
dont on a besoin pour savoir où on en est : les tuiles restées blanches sont
celles qui manquent, et on les repère d'un coup d'œil sans rien lire.

### ScoreBoard

La mosaïque ne remplace pas le tableau complet, elle le met dans un widget `lg`.

- Une ligne par manche, une colonne par joueur.
- Les noms de colonne sont écrits **en diagonale**, à −58°, en chasse étroite.
  C'est ce qui permet d'afficher huit noms entiers dans la largeur d'un
  téléphone sans les réduire à une initiale.
- La manche en cours porte un fond `accent` sur toute sa ligne.
- Chaque résultat porte son signe. Le cumul est en dessous, en sourdine.
- Au-delà de cinq joueurs la table se resserre et le cumul cède la place.
- **Aucun défilement horizontal**, à aucune largeur.

### Sheet

Feuille modale montant du bas, coins hauts à 20 px, poignée de 36 × 4, fermeture
au glissé et par un bouton au filet. Titre en romain, comme un titre d'écran.
Fond `card` : elle suit le thème comme le reste.

### Toast

Bandeau bas, fond `accent`, rayon 999, action à droite, croix au bout. **Une
seconde.** Il remplace toute boîte de confirmation : on agit d'abord, on peut
revenir.

Trois gestes l'écourtent — la croix, le glissé vers le bas, un appui n'importe
où dessus. C'est ce qui autorise une durée aussi courte : un message qui ne se
chasse pas devient un obstacle, et il est posé juste au-dessus du bouton
suivant.

Il s'empile **au-dessus** de la barre d'action, elle-même au-dessus de la barre
de navigation. Tout écran qui possède une barre d'action publie donc sa hauteur
via `useActionBarHeight`, sinon le bandeau intercepte le tap suivant.

**Ce que ça coûte** : la fenêtre pour annuler une manche validée tombe à une
seconde. Le rattrapage passe alors par le tableau des scores, où toute manche
jouée se rouvre à la correction.

### La feuille de bonus

Cinq lignes, pas cinq cartes. Chaque bonus tenait dans un bloc gris avec son
titre, deux lignes d'aide et parfois un motif de plafond : la feuille débordait
avant la troisième ligne, et il fallait la faire défiler pour attribuer une
sirène.

Une ligne dit trois choses, et dans cet ordre : ce que c'est, ce que ça vaut,
combien on en a. Le nombre de points sort de la phrase d'aide et prend sa propre
colonne — c'est le chiffre qu'on vient chercher. L'aide tient sur une ligne, et
cède la place au motif de plafond quand le compteur est bloqué. En tête, le
total de points du joueur suit la saisie : on voit ce qu'on ajoute sans refermer
la feuille.

### EmptyState

Un widget `md` en `sunken`, un titre, une phrase qui dit quoi faire, un bouton.
Aucune illustration.

## 7. Ne pas perdre l'utilisateur

L'app est prise en main par quelqu'un qui joue en même temps, souvent sans
l'avoir ouverte avant. Quatre dispositifs, et ils comptent autant que le reste
du design.

1. **Le premier lancement explique.** Trois phrases numérotées sur l'accueil —
   compose la table, chacun annonce ses plis, entre les plis et les bonus — et un
   lien vers les règles. Du texte, pas un widget : c'est du texte, il doit
   ressembler à du texte.
2. **Chaque écran dit à quoi il sert.** Une phrase en romain italique sous le
   titre, jamais plus d'une ligne et demie.
3. **Le contexte de la manche est permanent** : la houle pour la partie, les deux
   temps pour la manche, le nombre de cartes en étiquette, les totaux courants
   sous le tout. Et la barre de navigation reste en place : on peut aller lire
   une règle et revenir sans rien perdre.
4. **Le blocage se dit avant de bloquer.** Tant qu'il manque une saisie, la barre
   basse annonce laquelle — « Il manque la mise de 3 joueurs » — au lieu de se
   contenter de griser le bouton. Une fois tout renseigné, elle passe au compte
   des plis.

## 8. Règles absolues d'accessibilité

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

## 9. Graphiques

Trois composants SVG maison, sans librairie.

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

## 10. Mouvement

```
--ease: cubic-bezier(0.2, 0, 0, 1);
--dur-fast: 120ms;   /* sélection, appui */
--dur-base: 180ms;   /* apparition de contenu */
--dur-sheet: 260ms;  /* feuille modale */
```

Rien d'autre ne bouge. Pas d'entrée en fondu au chargement, pas de compteur qui
s'incrémente, pas de graphique qui se dessine.

## 11. Marque

**Sept Mers.** Le nom vient du titre décerné au vainqueur. Il ne reprend aucun
élément de la marque déposée.

Le logotype est un **crâne couronné**, plein, d'un seul tenant. Une silhouette
et rien d'autre : pas de contour, pas de dégradé, pas de second ton. C'est la
seule forme figurative de l'app, et elle ne sert qu'à la marque — jamais à dire
un état.

Le tracé est trop long pour être recopié ici. Il vit à trois endroits, et un
test compare les trois à chaque exécution, parce qu'une divergence ne se verrait
qu'à l'icône installée :

| Fichier | Rôle |
|---|---|
| `src/components/Icon.tsx` | Le composant `Logo`, en `currentColor` |
| `public/icons/favicon.svg` | Le favicon vectoriel, blanc sur encre |
| `scripts/make-icons.py` | Les PNG du manifeste et le `favicon.ico` |

**Deux cadrages, un tracé.** Le composant remplit son cadre, sans marge : à
21 px dans la barre d'onglets, chaque unité compte. Les tuiles — favicon, icônes
du manifeste — rétrécissent le même tracé vers leur centre : `TILE` pour une
icône pleine, `MASKABLE` pour celle que le lanceur découpe, où seuls les 80 %
centraux sont garantis et où c'est le cercle circonscrit d'un dessin haut qui
commande.

Il se pose toujours dans la couleur de texte de sa surface. Sur l'icône PWA,
blanc sur noir.

Le **trait horizontal de longueur inégale** reste, lui, le motif de la maison :
on le retrouve dans la houle de progression, dans le filet de section, et dans
le trait à remplir du stepper. C'est le même geste à trois échelles — il ne
descend plus du logotype, il tient tout seul.

**Aucune imagerie de piraterie.** Pas de crâne, pas de couronne, pas de
parchemin, pas de bois vieilli. Skull King est une marque déposée de Grandpa
Beck's Games, Inc. : un crâne couronné réimporterait visuellement exactement ce
qu'on met à distance.

## 12. Écriture de l'interface

- Phrases en minuscules après la première lettre, jamais de capitales de titre.
  Seules les étiquettes en pastille sont en capitales.
- Les boutons disent ce qui se passe : « Commencer la partie », « Valider les
  mises », « Valider la manche ».
- Une action garde son nom du bouton jusqu'au message de confirmation.
- Les erreurs disent ce qui bloque et comment le lever : « Il reste 2 plis à
  attribuer », pas « Saisie invalide ».
- Les vides invitent à agir : « Ajoute le premier pour commencer. »
- Le tutoiement en français, cohérent partout. L'anglais reste neutre.
- Aucun emoji, aucun point d'exclamation, aucune formule enjouée.

## 13. Tokens prêts à coller

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
  --dash-7: 13 3 2 4;  --dash-8: 4 2 1 2;

  /* Deux familles. Le texte parle, les chiffres se lisent. */
  --font-sans: 'Instrument Sans', ui-sans-serif, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-figure: 'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Mono',
                 Menlo, Consolas, monospace;
  --stretch-tight: 84%;

  --size-display: 40px;  --size-title: 26px;      --size-lede: 16px;
  --size-hero: 50px;     --size-figure: 32px;     --size-figure-sm: 23px;
  --size-subtitle: 16px; --size-body: 15px;       --size-label: 13px;
  --size-caption: 12px;  --size-tag: 11px;

  --track-hero: -0.03em;     --track-figure: -0.02em;
  --track-display: -0.035em; --track-tag: 0.14em;

  /* Tout ce qui vit en bas s'empile sur la barre de navigation. */
  --tabbar-h: calc(58px + env(safe-area-inset-bottom));
  --actionbar-h: 0px;

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
