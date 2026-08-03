import type { RuleSection } from './rulesTypes.ts'

/**
 * Original text. Game mechanics are not protectable, the booklet's prose is:
 * nothing here is lifted from the official rulebook, neither its wording nor
 * its chapter structure.
 */
export const rulesEn: RuleSection[] = [
  {
    id: 'hierarchy',
    title: 'Who takes the trick',
    quick: true,
    blocks: [
      {
        kind: 'p',
        text: 'From weakest to strongest, a card beats everything listed above it.',
      },
      {
        kind: 'ol',
        items: [
          'Escapes. They never win anything.',
          'Suit cards that neither follow the lead nor are black. They cannot win.',
          'Cards of the led suit, highest one wins.',
          'Black cards, highest one wins. Black beats every other suit.',
          'Pirates. The first pirate played beats the later ones.',
          'The Skull King. It beats the pirates and everything else.',
          'A mermaid, but only against the Skull King.',
        ],
      },
      {
        kind: 'p',
        text: 'That last line closes the loop: a mermaid loses to a pirate, a pirate loses to the Skull King, and the Skull King loses to a mermaid.',
      },
    ],
  },
  {
    id: 'material',
    title: 'The deck',
    blocks: [
      { kind: 'p', text: 'Seventy cards, laid out like this.' },
      {
        kind: 'ul',
        items: [
          'Four suits numbered 1 to 14: green, yellow, purple, and black which trumps.',
          'Five Escapes, which lose on purpose.',
          'Five pirates.',
          'The Tigress, played either as a pirate or as an Escape.',
          'Two mermaids.',
          'The Skull King.',
        ],
      },
      {
        kind: 'p',
        text: 'Black is the permanent trump suit: a black card always beats a standard suit card, whatever the value.',
      },
    ],
  },
  {
    id: 'flow',
    title: 'How a round runs',
    blocks: [
      {
        kind: 'p',
        text: 'A game runs ten rounds. In the first, everyone gets one card, in the second two, and so on up to ten. The number of tricks to win in a round is exactly the number of cards in hand.',
      },
      {
        kind: 'p',
        text: 'Once the cards are dealt, everyone announces at the same time how many tricks they expect to take. Zero is allowed. That number is locked for the whole round.',
      },
      {
        kind: 'p',
        text: 'Tricks are then played one at a time. Whoever leads plays any card. The others follow the led suit if they hold it; otherwise they play whatever they like. The winner of a trick leads the next one.',
      },
      {
        kind: 'p',
        text: 'At the end of the round, the announcement is compared with the tricks actually won, and points are scored.',
      },
      {
        kind: 'p',
        text: 'With eight players the deck runs short for the last two rounds: they are dealt eight cards each. The app applies that cap on its own.',
      },
    ],
  },
  {
    id: 'specials',
    title: 'The cards that change everything',
    blocks: [
      {
        kind: 'ul',
        items: [
          'An Escape never takes a trick. A trick made only of Escapes goes to the first one played.',
          'A pirate beats every suit, black included. If several pirates land in the same trick, the first one played wins.',
          'A mermaid beats the suits and black, loses to a pirate, and beats the Skull King.',
          'The Skull King beats everyone, unless a mermaid is in the trick.',
          'The Tigress is announced out loud as it is played: it counts either as a pirate or as an Escape. Played as a pirate, it counts as a pirate for the bonuses.',
        ],
      },
      {
        kind: 'p',
        text: 'A special card may lead a trick. There is then no suit to follow, and everyone plays freely.',
      },
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring',
    blocks: [
      { kind: 'p', text: 'Two cases, depending on whether the announcement was zero.' },
      {
        kind: 'ul',
        items: [
          'Announcement of one or more, met exactly: twenty points per trick announced.',
          'Announcement of one or more, missed: ten points off per trick of difference, either way. Tricks won earn nothing.',
          'Announcement of zero, met: ten points per card dealt in the round.',
          'Announcement of zero, missed: ten points off per card dealt in the round.',
        ],
      },
      {
        kind: 'p',
        text: 'A zero announcement therefore grows more expensive as the game goes on, in both directions. In round ten it earns a hundred points or costs a hundred.',
      },
    ],
  },
  {
    id: 'bonus',
    title: 'The bonuses',
    blocks: [
      {
        kind: 'ul',
        items: [
          'Ten points per standard suit 14 held at the end of the round: green, yellow, purple.',
          'Twenty points for the black 14 held at the end of the round.',
          'Twenty points per mermaid captured in a trick won by a pirate.',
          'Thirty points per pirate captured in a trick won by the Skull King. The Tigress played as a pirate counts.',
          'Forty points for the Skull King captured in a trick won by a mermaid.',
        ],
      },
      {
        kind: 'p',
        text: 'The 14 bonus goes to whoever holds the card at the end of the round, meaning the winner of the trick it fell in, even if they did not play it.',
      },
      {
        kind: 'p',
        text: 'Tables do not all agree on what happens to the bonuses when the announcement is missed. The app lets you choose when the game starts, and remembers your setting.',
      },
    ],
  },
  {
    id: 'faq',
    title: 'Recurring questions',
    blocks: [
      {
        kind: 'p',
        text: 'A mermaid and the Skull King in the same trick, no pirate. The mermaid takes the trick, and whoever played it earns forty bonus points.',
      },
      {
        kind: 'p',
        text: 'A mermaid, the Skull King and a pirate in the same trick. The Skull King wins: the loop only closes when a mermaid faces the Skull King without a pirate.',
      },
      {
        kind: 'p',
        text: 'Two pirates in the same trick. The one played first takes it, so the seating order decides.',
      },
      {
        kind: 'p',
        text: 'Someone leads with a pirate or a mermaid. No suit is imposed, and everyone plays whatever they like.',
      },
      {
        kind: 'p',
        text: 'Only Escapes and nothing else playable. An Escape does not win, but somebody has to collect: a trick made only of Escapes goes to the first one played.',
      },
      {
        kind: 'p',
        text: 'The Skull King is captured by a mermaid. It therefore takes no trick with that card, and cannot capture a pirate in the same round.',
      },
    ],
  },
]
