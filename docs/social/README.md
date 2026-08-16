# Les images des réseaux

Huit affiches, produites par `node scripts/social.mjs`. Elles ne sont pas
dessinées à côté de l'app : elles sortent des jetons de `docs/design-system.md`,
des deux familles embarquées et des mêmes formes. Monochrome, sans ombre, sans
dégradé, et le logotype pris à la source dans `public/icons/favicon.svg` — le
jour où l'un des trois change, une commande suffit à refaire les huit.

L'échelle typographique, elle, ne se reprend pas telle quelle : une affiche se
regarde à un mètre et un téléphone à trente centimètres. Les rapports sont
gardés, les tailles montent.

## Les huit, en portrait

| Fichier | Format | Ce qu'elle dit |
|---|---|---|
| `01-logotype.png` | 1080×1350 | Le nom, la baseline, la houle. L'image de couverture. |
| `02-vainqueur.png` | 1080×1080 | Un widget encre plein cadre, un chiffre et rien d'autre. |
| `03-mosaique.png` | 1080×1350 | La mosaïque : quatre widgets de valeurs inégales et le graphique. |
| `04-saisie.png` | 1080×1350 | Les tuiles de saisie, deux posées et deux qui attendent. |
| `05-comment-ca-marche.png` | 1080×1350 | Les trois phrases de l'accueil, en thème sombre. |
| `06-manifeste.png` | 1080×1080 | Hors ligne, sans compte, sans suivi. |
| `07-story.png` | 1080×1920 | La story, au format vertical. |
| `08-captures.png` | 1080×1350 | Deux captures réelles, celles que le parcours produit. |

Le carrousel se lit dans l'ordre : `01`, `04`, `03`, `08`, `06`. Les deux
carrés (`02`, `06`) tiennent seuls en publication simple, et `07` ne sert qu'en
story.

## Les huit, en paysage — `16-9/`

Le 16:9 n'est pas le portrait recadré. Un format large ne se remplit pas en
empilant : il se coupe en deux colonnes — ce qui se dit à gauche, ce qui se
montre à droite —, sinon tout se tasse en haut et la moitié de l'image ne porte
rien. Les huit sont donc réécrites pour la largeur, pas redimensionnées.

Toutes en 1920×1080. Elles reprennent les mêmes sujets, à deux exceptions près :
`02` pose le score final et la courbe qui y mène côte à côte, `08` loge trois
captures de front là où le portrait n'en tenait que deux, et la story cède la
place à `07-couverture.png` — un format vertical n'a rien à faire en 16:9.

C'est le format des bannières, des miniatures et de tout ce qui se regarde sur
un écran couché ; Instagram, lui, recadre au-delà de 1.91:1 et n'aime le paysage
qu'en publication simple.

## Ce qui est vérifié

Une affiche est un cadre fermé : ce qui dépasse n'est pas coupé à l'affichage,
il est perdu à l'export. Le script mesure donc le débordement de chaque page
avant de l'écrire, comme `nooverflow.mjs` le fait sur l'app, et sort en erreur
si une affiche est plus haute que son format.

## Quelques légendes

- Le carnet de score de Skull King, posé au milieu de la table. Hors ligne,
  sans compte, sans suivi.
- Une tuile par joueur, un chiffre qu'on lit de loin, et pas un clavier à
  l'horizon.
- L'app compte les points. Vous, vous jouez.
- Les autres suivent la partie en direct sur leur téléphone. Pair-à-pair,
  chiffré, sans serveur.
