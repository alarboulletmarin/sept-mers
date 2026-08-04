import {
  DEFAULT_FORMAT,
  GREY_BEARD,
  RASCAL_VALUES,
  hasGreyBeard,
  type Game,
  type RoundBonus,
} from '../domain/types.ts'
import { parseSpectatorPayload, type SpectatorPayload } from './protocol.ts'

/**
 * Le lien-résumé : la partie entière, figée dans le fragment d'une adresse.
 *
 * Le fragment ne part jamais au serveur — il n'y a d'ailleurs pas de serveur —
 * et un QR d'écran à caméra le transporte sans réseau du tout. Pour qu'il
 * tienne dans un QR qui se scanne du premier coup, on ne sérialise pas les
 * objets : des tableaux de position, sans clés ni identifiants, puis le
 * deflate natif du navigateur, puis du base64 d'URL. Une partie pleine tient
 * en quelques centaines de caractères.
 *
 * La version 2 ajoute trois choses qui n'existaient pas : le format de la
 * partie, le pas d'Harry le Géant, et la coupe des deux monstres marins en deux
 * bascules. Un lien de version 1 se relit encore — c'est tout l'intérêt d'avoir
 * numéroté —, avec le format du livret et un seul bit pour les deux monstres.
 */
export const SNAPSHOT_VERSION = 2
export const SNAPSHOT_PARAM = 's'

/** Au-delà, un nom n'apporte plus rien au résumé et gonfle le QR. */
const NAME_MAX = 24

/** L'ordre des bits du masque d'options. À ne jamais réordonner : il est écrit. */
const OPTION_KEYS = [
  'bonusIfBidMissed',
  'kraken',
  'advancedPirates',
  'rascalScoring',
  'cannonball',
  'whiteWhale',
] as const

/**
 * Le même masque, tel que la version 1 l'écrivait. Son bit 1 nommait les deux
 * monstres à la fois : on le rend aux deux clés d'aujourd'hui.
 */
const OPTION_KEYS_V1 = [
  'bonusIfBidMissed',
  'seaMonsters',
  'advancedPirates',
  'rascalScoring',
  'cannonball',
] as const

/** L'ordre des compteurs d'une ligne de manche. Écrit lui aussi. */
const BONUS_ORDER = [
  'colorFourteens',
  'blackFourteen',
  'mermaidsTakenByPirate',
  'piratesTakenBySkullKing',
  'skullKingTakenByMermaid',
] as const satisfies readonly (keyof RoundBonus)[]

/** bid, plis, les cinq bonus, l'indice du pari, le boulet, le pas d'Harry. */
const ENTRY_STRIDE = 10
/** La même ligne avant qu'Harry existe : tout sauf son pas. */
const ENTRY_STRIDE_V1 = 9
/** index, cartes, plis écartés, plis du fantôme — puis les sièges. */
const ROUND_HEAD = 4
/** manche, phase, plis écartés — puis les mises, les plis, les pas d'Harry. */
const DRAFT_HEAD = 3

const RASCAL_NONE = RASCAL_VALUES.indexOf(0)

export class SnapshotError extends Error {
  readonly reason: 'format' | 'version' | 'data'
  constructor(reason: 'format' | 'version' | 'data', message: string) {
    super(message)
    this.reason = reason
  }
}

// ----------------------------------------------------------------- Base64 URL

const BASE64_URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const toBase64Url = (bytes: Uint8Array): string => {
  let text = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]
    const b = i + 1 < bytes.length ? bytes[i + 1] : null
    const c = i + 2 < bytes.length ? bytes[i + 2] : null
    text += BASE64_URL[a >> 2]
    text += BASE64_URL[((a & 0b11) << 4) | ((b ?? 0) >> 4)]
    if (b === null) break
    text += BASE64_URL[((b & 0b1111) << 2) | ((c ?? 0) >> 6)]
    if (c === null) break
    text += BASE64_URL[c & 0b111111]
  }
  return text
}

const fromBase64Url = (text: string): Uint8Array => {
  // Une longueur ≡ 1 (mod 4) ne sort d'aucun encodage : autant le dire tôt.
  if (text.length % 4 === 1) throw new SnapshotError('format', 'longueur impossible')
  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const symbol of text) {
    const value = BASE64_URL.indexOf(symbol)
    if (value < 0) throw new SnapshotError('format', 'caractère hors alphabet')
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

// ------------------------------------------------------------------- Deflate

// Le `slice()` re-tamponne : `Blob` exige un `ArrayBuffer` plein, pas une vue.
const deflate = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([bytes.slice()]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

const inflate = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const stream = new Blob([bytes.slice()])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// ------------------------------------------------------------------ Écriture

const toEpoch = (iso: string): number => {
  const millis = Date.parse(iso)
  return Number.isFinite(millis) ? Math.max(0, Math.floor(millis / 1000)) : 0
}

const packEntries = (game: Game, round: Game['rounds'][number]): number[] => {
  const flat: number[] = []
  for (const id of game.playerIds) {
    const entry = round.entries.find((candidate) => candidate.playerId === id)
    if (!entry) {
      // Pas de ligne pour ce siège : une mise à -1 le dit, le reste se tait.
      flat.push(-1, 0, 0, 0, 0, 0, 0, RASCAL_NONE, 0, 0)
      continue
    }
    flat.push(entry.bid, entry.tricks)
    for (const key of BONUS_ORDER) flat.push(entry.bonus[key])
    const rascal = (RASCAL_VALUES as readonly number[]).indexOf(entry.rascal ?? 0)
    flat.push(rascal >= 0 ? rascal : RASCAL_NONE, entry.cannonball ? 1 : 0, entry.harry ?? 0)
  }
  return flat
}

const packDraft = (payload: SpectatorPayload): number[] | 0 => {
  const draft = payload.draft
  if (!draft) return 0
  const seats = payload.game.playerIds
  const flat = [draft.roundIndex, draft.phase === 'results' ? 1 : 0, draft.voided]
  for (const id of seats) flat.push(draft.bids[id] ?? -1)
  for (const id of seats) flat.push(draft.tricks[id] ?? -1)
  if (hasGreyBeard(seats.length)) flat.push(draft.tricks[GREY_BEARD] ?? -1)
  for (const id of seats) flat.push(draft.harry[id] ?? 0)
  return flat
}

export async function encodeSnapshot(payload: SpectatorPayload): Promise<string> {
  const game = payload.game
  const optionsMask = OPTION_KEYS.reduce(
    (mask, key, bit) => (game.options[key] ? mask | (1 << bit) : mask),
    0,
  )
  const packed = [
    SNAPSHOT_VERSION,
    toEpoch(game.startedAt),
    game.endedAt ? toEpoch(game.endedAt) : 0,
    optionsMask,
    game.playerIds.map((id) => (game.nameSnapshot[id] ?? 'Joueur').slice(0, NAME_MAX)),
    game.rounds.map((round) => [
      round.index,
      round.cards,
      round.voided ?? 0,
      round.greyBeard ?? 0,
      ...packEntries(game, round),
    ]),
    packDraft(payload),
    // Le format en queue d'enveloppe : c'est ce qui laisse un résumé de
    // version 1 se relire sur ses sept cases, sans décaler quoi que ce soit.
    [game.format.rounds, game.format.firstRoundCards],
  ]
  const bytes = new TextEncoder().encode(JSON.stringify(packed))
  return `${SNAPSHOT_VERSION}.${toBase64Url(await deflate(bytes))}`
}

export function snapshotUrl(origin: string, encoded: string): string {
  return `${origin}/recap#${SNAPSHOT_PARAM}=${encoded}`
}

// ------------------------------------------------------------------- Lecture

const isNumberList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number')

/** Une date en secondes epoch qui a un sens : bornée avant l'an 10000. */
const isEpoch = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 253402300799

const format = (message: string): SnapshotError => new SnapshotError('format', message)

/**
 * Déplie les tableaux de position vers la forme du `Store`, sans rien valider
 * du jeu lui-même : les valeurs repassent ensuite par `normalise`, comme tout
 * ce qui vient d'ailleurs. Ici on ne vérifie que la géométrie.
 */
const unpack = (packed: unknown, wire: number): { game: unknown; draft: unknown } => {
  const legacy = wire === 1
  const envelope = legacy ? 7 : 8
  if (!Array.isArray(packed) || packed.length !== envelope) throw format('enveloppe inattendue')
  const [version, startedAt, endedAt, optionsMask, names, rounds, draft, packedFormat] =
    packed as unknown[]

  if (version !== wire) throw format('auto-contrôle en défaut')
  if (!isEpoch(startedAt) || !isEpoch(endedAt)) throw format('dates illisibles')
  if (typeof optionsMask !== 'number') throw format('options illisibles')
  if (!Array.isArray(names) || names.length === 0) throw format('table vide')
  if (!names.every((name) => typeof name === 'string')) throw format('noms illisibles')
  if (!Array.isArray(rounds)) throw format('manches illisibles')

  const stride = legacy ? ENTRY_STRIDE_V1 : ENTRY_STRIDE
  const seats = names.length
  const playerIds = names.map((_, seat) => `p${seat + 1}`)
  const nameSnapshot = Object.fromEntries(
    names.map((name, seat) => [`p${seat + 1}`, name] as const),
  )
  // Le masque de la version 1 nommait les deux monstres d'un seul bit :
  // `normalise` sait rendre `seaMonsters` aux deux clés d'aujourd'hui.
  const keys = legacy ? OPTION_KEYS_V1 : OPTION_KEYS
  const options = Object.fromEntries(
    keys.map((key, bit) => [key, (optionsMask & (1 << bit)) !== 0] as const),
  )

  // Le format n'existe qu'à partir de la version 2 ; avant, toute partie était
  // au format du livret.
  if (!legacy && (!isNumberList(packedFormat) || packedFormat.length !== 2)) {
    throw format('format illisible')
  }
  const gameFormat = isNumberList(packedFormat)
    ? { rounds: packedFormat[0], firstRoundCards: packedFormat[1] }
    : { ...DEFAULT_FORMAT }

  const gameRounds = rounds.map((flat) => {
    if (!isNumberList(flat) || flat.length !== ROUND_HEAD + seats * stride) {
      throw format('manche tronquée')
    }
    const [index, cards, voided, greyBeard] = flat
    const entries = playerIds.flatMap((playerId, seat) => {
      const at = ROUND_HEAD + seat * stride
      const bid = flat[at]
      if (bid < 0) return []
      const bonus = Object.fromEntries(
        BONUS_ORDER.map((key, offset) => [key, flat[at + 2 + offset]] as const),
      )
      const rascal = RASCAL_VALUES[flat[at + 7]] ?? 0
      const harry = legacy ? 0 : flat[at + 9]
      return [
        {
          playerId,
          bid,
          tricks: flat[at + 1],
          bonus,
          ...(rascal !== 0 ? { rascal } : {}),
          ...(harry !== 0 ? { harry } : {}),
          ...(flat[at + 8] === 1 ? { cannonball: true } : {}),
        },
      ]
    })
    return {
      index,
      cards,
      ...(voided > 0 ? { voided } : {}),
      ...(greyBeard > 0 ? { greyBeard } : {}),
      entries,
    }
  })

  const game = {
    id: 'snapshot',
    startedAt: new Date(startedAt * 1000).toISOString(),
    ...(endedAt > 0 ? { endedAt: new Date(endedAt * 1000).toISOString() } : {}),
    playerIds,
    options,
    format: gameFormat,
    rounds: gameRounds,
    nameSnapshot,
  }

  if (draft === 0) return { game, draft: undefined }
  const holders = seats + (hasGreyBeard(seats) ? 1 : 0)
  const draftLength = DRAFT_HEAD + seats + holders + (legacy ? 0 : seats)
  if (!isNumberList(draft) || draft.length !== draftLength) {
    throw format('saisie tronquée')
  }
  const [roundIndex, phase, draftVoided] = draft
  const bids = Object.fromEntries(
    playerIds.map((id, seat) => {
      const value = draft[DRAFT_HEAD + seat]
      return [id, value < 0 ? null : value] as const
    }),
  )
  const trickIds = hasGreyBeard(seats) ? [...playerIds, GREY_BEARD] : playerIds
  const tricks = Object.fromEntries(
    trickIds.map((id, holder) => {
      const value = draft[DRAFT_HEAD + seats + holder]
      return [id, value < 0 ? null : value] as const
    }),
  )
  const harry = Object.fromEntries(
    playerIds.map((id, seat) => {
      const value = legacy ? 0 : draft[DRAFT_HEAD + seats + holders + seat]
      return [id, value] as const
    }),
  )
  return {
    game,
    draft: {
      gameId: 'snapshot',
      roundIndex,
      phase: phase === 1 ? 'results' : 'bids',
      bids,
      tricks,
      harry,
      voided: draftVoided,
    },
  }
}

/**
 * Relit un lien-résumé. Accepte le fragment tel que le navigateur le donne
 * (`#s=1.…`), ou déjà déshabillé. Toute erreur est nommée : un lien abîmé se
 * dit, il ne s'affiche pas à moitié.
 */
export async function decodeSnapshot(hash: string): Promise<SpectatorPayload> {
  let text = hash.startsWith('#') ? hash.slice(1) : hash
  if (text.startsWith(`${SNAPSHOT_PARAM}=`)) text = text.slice(SNAPSHOT_PARAM.length + 1)

  const dot = text.indexOf('.')
  if (dot < 1) throw format('préfixe absent')
  const version = text.slice(0, dot)
  if (!/^\d+$/.test(version)) throw format('préfixe illisible')
  const wire = Number(version)
  if (wire > SNAPSHOT_VERSION) {
    throw new SnapshotError('version', `résumé de version ${version}`)
  }
  // Les versions d'avant se relisent tant qu'on sait les lire : un lien envoyé
  // dans une conversation de groupe survit à la mise à jour de l'app.
  if (wire < 1) throw format('version nulle')

  let packed: unknown
  try {
    const bytes = await inflate(fromBase64Url(text.slice(dot + 1)))
    packed = JSON.parse(new TextDecoder().decode(bytes))
  } catch (error) {
    if (error instanceof SnapshotError) throw error
    throw format('contenu illisible')
  }

  const { game, draft } = unpack(packed, wire)
  const payload = parseSpectatorPayload(game, draft)
  if (!payload) throw new SnapshotError('data', 'partie irrecevable')
  return payload
}
