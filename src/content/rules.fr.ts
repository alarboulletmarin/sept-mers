import type { RuleSection } from './rulesTypes.ts'

/**
 * Texte original. Les mécanismes d'un jeu ne sont pas protégeables, la prose
 * du livret l'est : rien ici n'est repris du livret officiel, ni dans les mots,
 * ni dans le découpage des chapitres.
 */
export const rulesFr: RuleSection[] = [
  {
    id: 'hierarchy',
    title: 'Qui remporte le pli',
    quick: true,
    blocks: [
      {
        kind: 'p',
        text: 'Du plus faible au plus fort, une carte bat toutes celles qui la précèdent dans cette liste.',
      },
      {
        kind: 'ol',
        items: [
          'Les Fuites. Elles ne gagnent jamais rien.',
          "Les cartes de couleur qui ne suivent pas l'entame et ne sont pas noires. Elles ne peuvent pas gagner.",
          "Les cartes de la couleur entamée, la plus haute l'emporte.",
          'Les cartes noires, la plus haute l’emporte. Le noir bat toutes les couleurs.',
          'Les pirates. Le premier pirate joué bat les suivants.',
          'Le Skull King. Il bat les pirates et tout le reste.',
          'Une sirène, mais seulement face au Skull King.',
        ],
      },
      {
        kind: 'p',
        text: "Cette dernière ligne fait la boucle du jeu : la sirène perd contre un pirate, le pirate perd contre le Skull King, et le Skull King perd contre la sirène.",
      },
    ],
  },
  {
    id: 'material',
    title: 'Le paquet',
    blocks: [
      { kind: 'p', text: '70 cartes, réparties ainsi.' },
      {
        kind: 'ul',
        items: [
          '4 couleurs numérotées de 1 à 14 : vert, jaune, violet, et le noir qui coupe.',
          '5 Fuites, qui perdent volontairement.',
          '5 pirates.',
          'La Tigresse, qui se joue au choix en pirate ou en Fuite.',
          '2 sirènes.',
          'Le Skull King.',
        ],
      },
      {
        kind: 'p',
        text: 'Le noir est la couleur d’atout permanente : une carte noire bat toujours une carte de couleur classique, quelle que soit la valeur.',
      },
    ],
  },
  {
    id: 'flow',
    title: 'Comment tourne une manche',
    blocks: [
      {
        kind: 'p',
        text: "La partie compte 10 manches. On reçoit 1 carte à la manche 1, 2 à la manche 2, et ainsi de suite jusqu'à 10. Le nombre de plis à remporter dans la manche est exactement le nombre de cartes en main.",
      },
      {
        kind: 'p',
        text: "Une fois les cartes distribuées, tout le monde annonce en même temps combien de plis il compte remporter. On peut annoncer 0. Ce chiffre est ferme pour toute la manche.",
      },
      {
        kind: 'p',
        text: "On joue ensuite les plis un par un. Celui qui entame pose la carte de son choix. Les autres suivent la couleur entamée s'ils l'ont ; sinon ils posent ce qu'ils veulent. Le vainqueur du pli entame le suivant.",
      },
      {
        kind: 'p',
        text: "À la fin de la manche, on compare l'annonce et le nombre de plis réellement remportés, et on marque.",
      },
      {
        kind: 'p',
        text: "À 8 joueurs, le paquet ne suffit plus pour les 2 dernières manches : elles se jouent à 8 cartes chacune. L'app applique ce plafond toute seule.",
      },
    ],
  },
  {
    id: 'specials',
    title: 'Les cartes qui changent la donne',
    blocks: [
      {
        kind: 'ul',
        items: [
          "La Fuite ne remporte jamais un pli. Un pli composé uniquement de Fuites revient à la première jouée.",
          "Le pirate bat toutes les couleurs, noir compris. Si plusieurs pirates tombent dans le même pli, c'est le premier posé qui gagne.",
          "La sirène bat les couleurs et le noir, perd contre un pirate, et bat le Skull King.",
          "Le Skull King bat tout le monde, sauf une sirène présente dans le pli.",
          "La Tigresse s'annonce à voix haute au moment où on la pose : soit elle vaut un pirate, soit elle vaut une Fuite. En pirate, elle compte comme un pirate pour les primes.",
        ],
      },
      {
        kind: 'p',
        text: "Une carte spéciale peut entamer un pli. Dans ce cas il n'y a pas de couleur à suivre, chacun pose librement.",
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Compter les points',
    blocks: [
      { kind: 'p', text: '2 cas, selon que l’annonce était 0 ou non.' },
      {
        kind: 'ul',
        items: [
          'Annonce à 1 ou plus, tenue exactement : 20 points par pli annoncé.',
          "Annonce à 1 ou plus, ratée : 10 points de moins par pli d'écart, dans un sens comme dans l'autre. Les plis remportés ne rapportent rien.",
          'Annonce à 0, tenue : 10 points par carte distribuée dans la manche.',
          'Annonce à 0, ratée : 10 points de moins par carte distribuée dans la manche.',
        ],
      },
      {
        kind: 'p',
        text: "Une annonce à 0 vaut donc de plus en plus cher au fil de la partie, dans les deux sens. En manche 10 elle rapporte 100 points, ou en coûte 100.",
      },
    ],
  },
  {
    id: 'bonus',
    title: 'Les primes',
    blocks: [
      {
        kind: 'ul',
        items: [
          '10 points par 14 de couleur classique gardé en fin de manche : le vert, le jaune, le violet.',
          '20 points pour le 14 noir gardé en fin de manche.',
          '20 points par sirène capturée dans un pli remporté par un pirate.',
          '30 points par pirate capturé dans un pli remporté par le Skull King. La Tigresse jouée en pirate compte.',
          '40 points pour le Skull King capturé dans un pli remporté par une sirène.',
        ],
      },
      {
        kind: 'p',
        text: "La prime des 14 revient à celui qui possède la carte en fin de manche, c'est-à-dire au vainqueur du pli où elle est tombée, même si ce n'est pas lui qui l'a jouée.",
      },
      {
        kind: 'p',
        text: "Les tables ne jouent pas toutes de la même façon la question des primes quand l'annonce est ratée. L'app te laisse choisir au démarrage de la partie, et se souvient de ton réglage.",
      },
    ],
  },
  {
    id: 'faq',
    title: 'Questions qui reviennent',
    blocks: [
      {
        kind: 'p',
        text: "La sirène et le Skull King sont dans le même pli, sans pirate. La sirène remporte le pli, et celui qui l'a jouée gagne 40 points de prime.",
      },
      {
        kind: 'p',
        text: "La sirène, le Skull King et un pirate sont dans le même pli. Le Skull King l'emporte : la boucle ne se referme que lorsque la sirène affronte le Skull King sans pirate.",
      },
      {
        kind: 'p',
        text: "2 pirates dans le même pli. Celui posé en premier remporte le pli, l'ordre autour de la table tranche.",
      },
      {
        kind: 'p',
        text: "Quelqu'un entame avec un pirate ou une sirène. Il n'y a alors aucune couleur imposée : chacun pose ce qu'il veut.",
      },
      {
        kind: 'p',
        text: "Une seule Fuite et rien d'autre de jouable. La Fuite ne gagne pas, mais quelqu'un doit bien ramasser : si le pli n'est fait que de Fuites, il revient à la première posée.",
      },
      {
        kind: 'p',
        text: "Le Skull King se fait capturer par une sirène. Il ne remporte donc aucun pli avec cette carte, et ne peut pas capturer de pirate dans la même manche.",
      },
    ],
  },
]
