import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  EMPTY_BONUS,
  GREY_BEARD,
  type Draft,
  type Game,
} from '../domain/types.ts'
import {
  SNAPSHOT_VERSION,
  SnapshotError,
  decodeSnapshot,
  encodeSnapshot,
  snapshotUrl,
} from './codec.ts'

const seats = (count: number): string[] => Array.from({ length: count }, (_, i) => `p${i + 1}`)

/**
 * Les identifiants des fixtures sont déjà `p1`, `p2`, … — ceux que le décodage
 * synthétise. Un aller-retour doit donc rendre la partie à l'identique, au
 * `id` près, qui devient `snapshot`.
 */
function makeGame(count: number, overrides: Partial<Game> = {}): Game {
  const playerIds = seats(count)
  return {
    id: 'g1',
    startedAt: '2026-02-03T20:00:00.000Z',
    playerIds,
    options: {
      bonusIfBidMissed: false,
      kraken: false,
      whiteWhale: false,
      advancedPirates: false,
      rascalScoring: false,
      cannonball: false,
    },
    format: { ...DEFAULT_FORMAT },
    rounds: [],
    nameSnapshot: Object.fromEntries(playerIds.map((id, i) => [id, `Joueur ${i + 1}`] as const)),
    ...overrides,
  }
}

const deflateRaw = async (text: string): Promise<Uint8Array> => {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const wrapAs = async (version: number, json: string): Promise<string> =>
  `${version}.${Buffer.from(await deflateRaw(json)).toString('base64url')}`

const wrap = async (json: string): Promise<string> => wrapAs(SNAPSHOT_VERSION, json)

const reasonOf = async (hash: string): Promise<string> => {
  try {
    await decodeSnapshot(hash)
    return 'aucune'
  } catch (error) {
    return error instanceof SnapshotError ? error.reason : 'autre'
  }
}

describe('aller-retour du lien-résumé', () => {
  it('refait une partie finie à l identique, à l identifiant près', async () => {
    const game = makeGame(4, {
      endedAt: '2026-02-03T22:30:00.000Z',
      options: {
        bonusIfBidMissed: true,
        kraken: true,
        whiteWhale: true,
        advancedPirates: false,
        rascalScoring: true,
        cannonball: false,
      },
      rounds: [
        {
          index: 1,
          cards: 1,
          entries: [
            { playerId: 'p1', bid: 1, tricks: 1, bonus: { ...EMPTY_BONUS, blackFourteen: 1 } },
            { playerId: 'p2', bid: 0, tricks: 0, bonus: { ...EMPTY_BONUS } },
            { playerId: 'p3', bid: 0, tricks: 0, bonus: { ...EMPTY_BONUS }, rascal: -10 },
            { playerId: 'p4', bid: 1, tricks: 0, bonus: { ...EMPTY_BONUS }, cannonball: true },
          ],
        },
        {
          index: 2,
          cards: 2,
          voided: 1,
          entries: [
            {
              playerId: 'p1',
              bid: 0,
              tricks: 0,
              bonus: { ...EMPTY_BONUS, mermaidsTakenByPirate: 2 },
            },
            { playerId: 'p2', bid: 1, tricks: 1, bonus: { ...EMPTY_BONUS }, rascal: 20 },
            { playerId: 'p3', bid: 0, tricks: 0, bonus: { ...EMPTY_BONUS } },
            { playerId: 'p4', bid: 0, tricks: 0, bonus: { ...EMPTY_BONUS } },
          ],
        },
      ],
    })

    const decoded = await decodeSnapshot(await encodeSnapshot({ game }))
    expect(decoded.game).toEqual({ ...game, id: 'snapshot' })
    expect(decoded.draft).toBeUndefined()
  })

  it('garde la saisie en cours, plis du fantôme compris', async () => {
    const game = makeGame(2)
    const draft: Draft = {
      gameId: 'g1',
      roundIndex: 3,
      phase: 'results',
      bids: { p1: 2, p2: null },
      tricks: { p1: 1, p2: null, [GREY_BEARD]: 1 },
      bonus: { p1: { ...EMPTY_BONUS }, p2: { ...EMPTY_BONUS } },
      rascal: { p1: 0, p2: 0 },
      harry: { p1: 0, p2: 0 },
      cannonball: { p1: false, p2: false },
      voided: 1,
      touchedTricks: ['p1'],
      autoTricks: null,
    }

    const decoded = await decodeSnapshot(await encodeSnapshot({ game, draft }))
    expect(decoded.draft).toEqual({
      gameId: 'snapshot',
      roundIndex: 3,
      phase: 'results',
      bids: { p1: 2, p2: null },
      tricks: { p1: 1, p2: null, [GREY_BEARD]: 1 },
      bonus: { p1: { ...EMPTY_BONUS }, p2: { ...EMPTY_BONUS } },
      rascal: { p1: 0, p2: 0 },
      harry: { p1: 0, p2: 0 },
      cannonball: { p1: false, p2: false },
      voided: 1,
      // La main posée et la déduction ne se transportent pas : un spectateur
      // ne saisit rien, il n'a besoin que des valeurs.
      touchedTricks: [],
      autoTricks: null,
    })
  })

  it('écarte au décodage la saisie d une partie finie', async () => {
    const game = makeGame(3, { endedAt: '2026-02-03T22:30:00.000Z' })
    const draft: Draft = {
      gameId: 'g1',
      roundIndex: 1,
      phase: 'bids',
      bids: { p1: null, p2: null, p3: null },
      tricks: { p1: null, p2: null, p3: null },
      bonus: { p1: { ...EMPTY_BONUS }, p2: { ...EMPTY_BONUS }, p3: { ...EMPTY_BONUS } },
      rascal: { p1: 0, p2: 0, p3: 0 },
      harry: { p1: 0, p2: 0, p3: 0 },
      cannonball: { p1: false, p2: false, p3: false },
      voided: 0,
      touchedTricks: [],
      autoTricks: null,
    }
    const decoded = await decodeSnapshot(await encodeSnapshot({ game, draft }))
    expect(decoded.draft).toBeUndefined()
  })

  it('tronque les noms à vingt-quatre caractères', async () => {
    const long = 'Capitaine Barbe-Rousse du Grand Large'
    const game = makeGame(2, { nameSnapshot: { p1: long, p2: 'Bo' } })
    const decoded = await decodeSnapshot(await encodeSnapshot({ game }))
    expect(decoded.game.nameSnapshot.p1).toBe(long.slice(0, 24))
    expect(decoded.game.nameSnapshot.p2).toBe('Bo')
  })

  it('accepte le fragment habillé comme nu', async () => {
    const encoded = await encodeSnapshot({ game: makeGame(3) })
    const bare = await decodeSnapshot(encoded)
    const dressed = await decodeSnapshot(`#s=${encoded}`)
    const half = await decodeSnapshot(`s=${encoded}`)
    expect(dressed).toEqual(bare)
    expect(half).toEqual(bare)
  })

  it('compose l adresse du résumé sur la route recap', () => {
    expect(snapshotUrl('https://exemple.test', '1.abc')).toBe('https://exemple.test/recap#s=1.abc')
  })
})

describe('taille du lien-résumé', () => {
  it('tient dans un QR scannable au pire de la grille', async () => {
    // Huit joueurs, dix manches, toutes options, des valeurs qui varient d'un
    // siège à l'autre pour ne pas offrir au deflate des lignes identiques, et
    // une saisie pleine par-dessus. C'est la borne qui garde le QR lisible :
    // si elle casse, c'est l'encodage qu'on resserre, pas le test.
    const ids = seats(8)
    const game = makeGame(8, {
      options: {
        bonusIfBidMissed: true,
        kraken: true,
        whiteWhale: true,
        advancedPirates: true,
        rascalScoring: true,
        cannonball: true,
      },
      nameSnapshot: Object.fromEntries(
        ids.map((id, i) => [id, `Joueur numéro ${i} au nom long`.slice(0, 20)] as const),
      ),
      rounds: Array.from({ length: 10 }, (_, i) => ({
        index: i + 1,
        cards: Math.min(i + 1, 9),
        voided: i % 3 === 0 ? 1 : 0,
        entries: ids.map((playerId, seat) => ({
          playerId,
          bid: (seat + i) % 9,
          tricks: (seat * i) % 9,
          bonus: {
            colorFourteens: (seat + i) % 4,
            blackFourteen: (seat + i) % 2,
            mermaidsTakenByPirate: (seat * i) % 3,
            piratesTakenBySkullKing: (seat + 2 * i) % 7,
            skullKingTakenByMermaid: (seat * i) % 2,
          },
          ...((seat + i) % 5 !== 2 ? { rascal: [-20, -10, 0, 10, 20][(seat + i) % 5] } : {}),
          ...((seat + i) % 2 === 0 ? { cannonball: true } : {}),
        })),
      })),
    })
    const draft: Draft = {
      gameId: 'g1',
      roundIndex: 10,
      phase: 'results',
      bids: Object.fromEntries(ids.map((id, seat) => [id, seat % 9] as const)),
      tricks: Object.fromEntries(ids.map((id, seat) => [id, (seat + 3) % 9] as const)),
      bonus: Object.fromEntries(ids.map((id) => [id, { ...EMPTY_BONUS }] as const)),
      rascal: Object.fromEntries(ids.map((id) => [id, 0] as const)),
      harry: Object.fromEntries(ids.map((id) => [id, 0] as const)),
      cannonball: Object.fromEntries(ids.map((id) => [id, false] as const)),
      voided: 1,
      touchedTricks: [],
      autoTricks: null,
    }

    const encoded = await encodeSnapshot({ game, draft })
    expect(encoded.length).toBeLessThan(900)
    // Et l'aller-retour reste exact, même au pire.
    const decoded = await decodeSnapshot(encoded)
    expect(decoded.game.rounds).toHaveLength(10)
    expect(decoded.draft?.roundIndex).toBe(10)
  })
})

describe('le format et Harry voyagent', () => {
  it('refait une partie courte, première donne comprise', async () => {
    const game = makeGame(3, {
      format: { rounds: 4, firstRoundCards: 3 },
      rounds: [
        {
          index: 1,
          cards: 3,
          entries: [
            { playerId: 'p1', bid: 2, tricks: 3, bonus: { ...EMPTY_BONUS }, harry: 1 },
            { playerId: 'p2', bid: 1, tricks: 0, bonus: { ...EMPTY_BONUS } },
            { playerId: 'p3', bid: 0, tricks: 0, bonus: { ...EMPTY_BONUS } },
          ],
        },
      ],
    })
    const decoded = await decodeSnapshot(await encodeSnapshot({ game }))
    expect(decoded.game).toEqual({ ...game, id: 'snapshot' })
  })

  it('garde le pas d Harry de la saisie en cours', async () => {
    const game = makeGame(3, { options: { ...DEFAULT_OPTIONS, advancedPirates: true } })
    const draft: Draft = {
      gameId: 'g1',
      roundIndex: 2,
      phase: 'results',
      bids: { p1: 1, p2: 0, p3: 1 },
      tricks: { p1: 2, p2: 0, p3: 0 },
      bonus: { p1: { ...EMPTY_BONUS }, p2: { ...EMPTY_BONUS }, p3: { ...EMPTY_BONUS } },
      rascal: { p1: 0, p2: 0, p3: 0 },
      harry: { p1: 1, p2: 0, p3: 0 },
      cannonball: { p1: false, p2: false, p3: false },
      voided: 0,
      touchedTricks: [],
      autoTricks: null,
    }
    const decoded = await decodeSnapshot(await encodeSnapshot({ game, draft }))
    expect(decoded.draft?.harry).toEqual({ p1: 1, p2: 0, p3: 0 })
  })
})

describe('liens abîmés ou hostiles', () => {
  it('nomme un préfixe absent ou illisible', async () => {
    expect(await reasonOf('')).toBe('format')
    expect(await reasonOf('nimportequoi')).toBe('format')
    expect(await reasonOf('.abc')).toBe('format')
    expect(await reasonOf('x1.abc')).toBe('format')
  })

  it('nomme un résumé d une version plus récente', async () => {
    expect(await reasonOf('9.AAAA')).toBe('version')
  })

  it('nomme un contenu qui ne se déplie pas', async () => {
    expect(await reasonOf('1.$$$$')).toBe('format')
    expect(await reasonOf('1.AAAAA')).toBe('format')
    expect(await reasonOf('1.AAAAAAAA')).toBe('format')
  })

  it('nomme un contenu déplié qui n est pas l enveloppe attendue', async () => {
    expect(await reasonOf(await wrap('pas du json'))).toBe('format')
    expect(await reasonOf(await wrap('[]'))).toBe('format')
    expect(await reasonOf(await wrap('{"v":1}'))).toBe('format')
  })

  it('nomme une géométrie de manche qui ne colle pas à la table', async () => {
    const packed = [
      SNAPSHOT_VERSION,
      0,
      0,
      0,
      ['Ana', 'Bo'],
      [[1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 2, 0]],
      0,
      [10, 1],
    ]
    expect(await reasonOf(await wrap(JSON.stringify(packed)))).toBe('format')
  })

  it('nomme une partie irrecevable une fois durcie', async () => {
    const solo = [SNAPSHOT_VERSION, 0, 0, 0, ['Solo'], [], 0, [10, 1]]
    expect(await reasonOf(await wrap(JSON.stringify(solo)))).toBe('data')
  })

  it('nomme un format absent de la version courante', async () => {
    const noFormat = [SNAPSHOT_VERSION, 0, 0, 0, ['Ana', 'Bo'], [], 0]
    expect(await reasonOf(await wrap(JSON.stringify(noFormat)))).toBe('format')
  })
})

describe('les résumés de la version 1', () => {
  /** Une manche à 1 carte, deux sièges, à la géométrie de la version 1. */
  const legacyRound = [
    1, 1, 0, 0,
    // p1 : mise 1, 1 pli, aucune prime, aucun pari, aucune charge.
    1, 1, 0, 0, 0, 0, 0, 2, 0,
    // p2 : mise 0, aucun pli.
    0, 0, 0, 0, 0, 0, 0, 2, 0,
  ]

  it('se relit encore, au format du livret et avec les deux monstres', async () => {
    // Le bit 1 de la version 1 nommait les deux monstres à la fois : un lien
    // envoyé avant la coupe doit rendre une table qui joue les deux.
    const packed = [1, 1770000000, 1770003600, 0b000010, ['Ana', 'Bo'], [legacyRound], 0]
    const decoded = await decodeSnapshot(await wrapAs(1, JSON.stringify(packed)))
    expect(decoded.game.options.kraken).toBe(true)
    expect(decoded.game.options.whiteWhale).toBe(true)
    expect(decoded.game.format).toEqual(DEFAULT_FORMAT)
    expect(decoded.game.rounds[0].entries).toHaveLength(2)
    expect(decoded.game.rounds[0].entries[0].bid).toBe(1)
    // Harry n'existait pas : personne n'a déplacé sa mise.
    expect(decoded.game.rounds[0].entries[0].harry).toBeUndefined()
  })

  it('refuse la géométrie d aujourd hui sous le préfixe d hier', async () => {
    const packed = [1, 0, 0, 0, ['Ana', 'Bo'], [legacyRound], 0, [10, 1]]
    expect(await reasonOf(await wrapAs(1, JSON.stringify(packed)))).toBe('format')
  })
})
