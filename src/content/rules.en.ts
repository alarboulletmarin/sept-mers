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
      { kind: 'p', text: '70 cards, laid out like this.' },
      {
        kind: 'ul',
        items: [
          '4 suits numbered 1 to 14: green, yellow, purple, and black which trumps.',
          '5 Escapes, which lose on purpose.',
          '5 pirates.',
          'The Tigress, played either as a pirate or as an Escape.',
          '2 mermaids.',
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
        text: 'A game runs 10 rounds. You get 1 card in round 1, 2 in round 2, and so on up to 10. The number of tricks to win in a round is exactly the number of cards in hand.',
      },
      {
        kind: 'p',
        text: 'Once the cards are dealt, everyone announces at the same time how many tricks they expect to take. 0 is allowed. That number is locked for the whole round.',
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
        text: 'With 8 players the deck runs short for the last 2 rounds: they are dealt 8 cards each. The app applies that cap on its own.',
      },
      {
        kind: 'p',
        text: 'With 2 players the tricks of a round are not shared between them alone: a third hand is dealt, and it takes its share. See the next chapter.',
      },
    ],
  },
  {
    id: 'twoPlayers',
    title: "With 2 players: Greybeard's ghost",
    blocks: [
      {
        kind: 'p',
        text: "3 hands are dealt: one each, and a third laid face down as a pile. That is Greybeard's ghost. It never bids and never scores a point: it is there to steal tricks and wreck bids.",
      },
      {
        kind: 'ul',
        items: [
          'The 2 players take turns leading from one round to the next.',
          'The ghost always plays second — unless it won the previous trick, in which case it leads the next one.',
          'On its turn, flip the top card of its pile. It does not follow the led suit.',
          'Its Tigress is always played as an escape.',
        ],
      },
      {
        kind: 'p',
        text: 'It follows that the tricks of the 2 players no longer add up to the number of cards in the round. That is why the results screen shows a third tile in its name: it fills itself with whatever is left, and stays correctable if the count is off.',
      },
      {
        kind: 'p',
        text: 'A table that would rather play with 2 and no ghost has nothing to set: leave its tile at zero, and the 2 players share every trick as anywhere else.',
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
      { kind: 'p', text: '2 cases, depending on whether the announcement was 0.' },
      {
        kind: 'ul',
        items: [
          'Announcement of 1 or more, met exactly: 20 points per trick announced.',
          'Announcement of 1 or more, missed: 10 points off per trick of difference, either way. Tricks won earn nothing.',
          'Announcement of 0, met: 10 points per card dealt in the round.',
          'Announcement of 0, missed: 10 points off per card dealt in the round.',
        ],
      },
      {
        kind: 'p',
        text: 'A 0 announcement therefore grows more expensive as the game goes on, in both directions. In round 10 it earns 100 points, or costs 100.',
      },
      {
        kind: 'p',
        text: 'That is the classic scoring. A second one exists, Rascal scoring, gentler and more calculating: it is chosen when a game is started, and it is described in the variants chapter.',
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
          '10 points per standard suit 14 held at the end of the round: green, yellow, purple.',
          '20 points for the black 14 held at the end of the round.',
          '20 points per mermaid captured in a trick won by a pirate.',
          '30 points per pirate captured in a trick won by the Skull King. The Tigress played as a pirate counts.',
          '40 points for the Skull King captured in a trick won by a mermaid.',
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
    id: 'variants',
    title: 'The optional variants',
    blocks: [
      {
        kind: 'p',
        text: "Three settings are chosen as the table is set, and the app remembers them from one game to the next. Nothing is forced: a table that leaves them off plays the classic score, unchanged.",
      },
      {
        kind: 'p',
        text: 'Kraken and White Whale: 2 more cards in the deck, so 72.',
      },
      {
        kind: 'ul',
        items: [
          'The Kraken voids the trick. Nobody takes it and it counts for nobody: the tricks of the round then add up to less than the number of cards dealt.',
          "The White Whale strips every special card of its power for that trick: the highest number wins, whatever the suit. If nobody played a number, that trick is voided too.",
        ],
      },
      {
        kind: 'p',
        text: 'So the app asks, each round, how many tricks were voided. That is all it needs to know about them.',
      },
      {
        kind: 'p',
        text: 'Pirate powers: each of the 5 pirates gains one, announced as it is played.',
      },
      {
        kind: 'ul',
        items: [
          'Harry the Giant lets you change your own bid by 1 trick, up or down. To correct it in the app, step back to the bids: the round entry is not lost.',
          'Rosie D’Laney names who leads the next trick.',
          'Bendt the Bandit draws 2 cards from the stock, then discards 2.',
          'Juanita Jade lets you look through the undealt cards and swap one for a card in your hand.',
          'Rascal Jack wagers 0, 10 or 20 points on taking this trick. Wager met, you score it. Wager lost, you pay it.',
        ],
      },
      {
        kind: 'p',
        text: "Rascal Jack's wager is entered in the bonus sheet, but it is not a bonus: it counts whatever happens, including when the bid is missed and the bonuses are cancelled. There is only one Rascal Jack in the deck, so at most one wager per round.",
      },
      {
        kind: 'p',
        text: "The app does not track the cards played. Of those 7 additions it only asks for the 2 that change the score: the voided tricks, and the Rascal's wager.",
      },
      {
        kind: 'p',
        text: 'Rascal scoring: the second scoring system. Every round holds the same potential for everyone, whatever the bid — 10 points per card dealt. What varies is the accuracy.',
      },
      {
        kind: 'ul',
        items: [
          'Bid met exactly: all the points of the round.',
          'Off by 1 trick, either way: half.',
          'Off by 2 tricks or more: nothing.',
        ],
      },
      {
        kind: 'p',
        text: 'Bonuses follow exactly the same scale: all, half, or nothing. There is never a negative score, which makes for a more calculating mood than the classic system. This scoring replaces the setting for bonuses on a missed bid, which no longer has anything to do: the switch leaves the panel while it is on.',
      },
      {
        kind: 'p',
        text: 'Cannonball: an option of Rascal scoring. After bidding, everyone secretly chooses how to load their cannon, and all reveal at the same time.',
      },
      {
        kind: 'ul',
        items: [
          'Grapeshot: normal Rascal scoring, 10 points per card, with half when off by 1.',
          'Cannonball: 15 points per card, but nothing at all at the slightest difference.',
        ],
      },
      {
        kind: 'p',
        text: "The app records the charge once it is revealed: it does not keep it secret, that is for the table to do. Rascal Jack's wager stays outside the scale — it counts signed, never halved and never cancelled, and it is the only way a round total can drop below zero.",
      },
    ],
  },
  {
    id: 'faq',
    title: 'Recurring questions',
    blocks: [
      {
        kind: 'p',
        text: 'A mermaid and the Skull King in the same trick, no pirate. The mermaid takes the trick, and whoever played it earns 40 bonus points.',
      },
      {
        kind: 'p',
        text: 'A mermaid, the Skull King and a pirate in the same trick. The Skull King wins: the loop only closes when a mermaid faces the Skull King without a pirate.',
      },
      {
        kind: 'p',
        text: '2 pirates in the same trick. The one played first takes it, so the seating order decides.',
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
