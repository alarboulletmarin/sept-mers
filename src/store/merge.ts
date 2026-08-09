import { BONUS_KEYS, type Game, type Id, type Player, type Store } from '../domain/types.ts'
import { normalisedName } from './reducer.ts'
import { newId, normalise } from './storage.ts'

/**
 * La fusion de deux fichiers.
 *
 * Une table qui marque ses parties sur deux téléphones se retrouve avec deux
 * historiques et deux listes de joueurs, sans rien pour les réunir : l'import
 * remplaçait tout, ce qui revenait à choisir un téléphone et jeter l'autre.
 *
 * Réunir demande de répondre à une question que l'app ne peut pas trancher
 * seule : le « Marie » du fichier et la « marie » d'ici sont-ils la même
 * personne ? On la pose donc — avec une réponse déjà proposée, parce qu'elle
 * est juste presque à chaque fois, et modifiable, parce que « presque » n'est
 * pas « toujours ».
 *
 * Le module est pur : il ne lit ni n'écrit rien, il calcule un plan puis un
 * `Store`. La feuille de l'écran affiche l'un et l'autre avant que quoi que ce
 * soit ne parte dans le stockage.
 */

/** Un joueur du fichier importé, et ce qu'on propose d'en faire. */
export interface Incoming {
  id: Id
  name: string
  /** Parties du fichier où il est à table. */
  games: number
  /**
   * Vrai quand le fichier n'a plus sa fiche : il ne vit que dans des parties.
   * Supprimé là-bas, il ne revient pas ici — seuls ses résultats voyagent.
   */
  orphan: boolean
  /** Le joueur d'ici auquel le rattacher. `null` : il arrive tel quel. */
  linkTo: Id | null
  /** Ce sur quoi le rapprochement proposé s'appuie. */
  by: 'id' | 'name' | 'none'
}

/** Une partie du fichier qui recopie trait pour trait une partie d'ici. */
export interface Twin {
  /** Son identifiant dans le fichier. */
  id: Id
  /** La partie d'ici dont elle est le double. */
  localId: Id
  startedAt: string
  rounds: number
}

export interface MergePlan {
  players: Incoming[]
  twins: Twin[]
}

export interface MergeSummary {
  playersLinked: number
  playersAdded: number
  /** Les noms qu'il a fallu suffixer parce qu'ils étaient déjà portés ici. */
  renamed: { from: string; to: string }[]
  gamesAdded: number
  gamesSkipped: number
  /** Une partie en cours venue du fichier a été enregistrée comme écourtée. */
  closed: boolean
}

/**
 * L'empreinte d'une partie : sa table et ce qui s'y est joué, sans sa date ni
 * son identifiant.
 *
 * Deux téléphones qui marquent la même soirée ne lui donnent ni le même
 * identifiant ni la même heure de départ — mais ils écrivent les mêmes mises
 * et les mêmes plis, manche après manche. C'est ce qui les rapproche, et deux
 * soirées réellement différentes n'ont aucune chance de le partager.
 */
function fingerprint(game: Game, resolve: (id: Id) => Id): string {
  const table = game.playerIds.map(resolve).sort().join(',')
  const rounds = [...game.rounds]
    .sort((a, b) => a.index - b.index)
    .map((round) => {
      const entries = round.entries
        .map((entry) =>
          [
            resolve(entry.playerId),
            entry.bid,
            entry.tricks,
            ...BONUS_KEYS.map((key) => entry.bonus[key]),
            entry.rascal ?? 0,
            entry.harry ?? 0,
            entry.cannonball ? 1 : 0,
          ].join(':'),
        )
        .sort()
      return [round.index, round.cards, round.voided ?? 0, round.greyBeard ?? 0, ...entries].join(
        '|',
      )
    })
  return [table, ...rounds].join('#')
}

/** Un nom libre à cette table : « Marie », puis « Marie (2) »… */
export function freeName(players: Player[], wanted: string): string {
  const base = wanted.trim() || 'Joueur'
  const free = (candidate: string) =>
    !players.some((player) => normalisedName(player.name) === normalisedName(candidate))
  if (free(base)) return base
  let suffix = 2
  while (!free(`${base} (${suffix})`)) suffix += 1
  return `${base} (${suffix})`
}

/**
 * Le rapprochement proposé, avant toute décision.
 *
 * L'identifiant l'emporte sur le nom, et se lit d'abord de bout en bout :
 * c'est le cas « le même joueur, renommé sur un des deux téléphones », et le
 * nom n'y dit plus rien. Un joueur d'ici déjà réclamé ne l'est pas une seconde
 * fois — deux sièges rattachés à la même fiche donneraient une partie où
 * quelqu'un est assis deux fois.
 */
export function planMerge(local: Store, incoming: Store): MergePlan {
  const counts = new Map<Id, number>()
  const labels = new Map<Id, string>()
  for (const game of incoming.games) {
    for (const id of game.playerIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
      const label = game.nameSnapshot[id]
      if (label && !labels.has(id)) labels.set(id, label)
    }
  }

  const filed = new Set(incoming.players.map((player) => player.id))
  const seats: { id: Id; name: string; orphan: boolean }[] = [
    ...incoming.players.map((player) => ({ id: player.id, name: player.name, orphan: false })),
    ...[...counts.keys()]
      .filter((id) => !filed.has(id))
      .map((id) => ({ id, name: labels.get(id) ?? 'Joueur', orphan: true })),
  ]

  const claimed = new Set<Id>()
  const links = new Map<Id, { to: Id; by: 'id' | 'name' }>()
  for (const seat of seats) {
    const found = local.players.find((player) => player.id === seat.id)
    if (!found || claimed.has(found.id)) continue
    claimed.add(found.id)
    links.set(seat.id, { to: found.id, by: 'id' })
  }
  for (const seat of seats) {
    if (links.has(seat.id)) continue
    const wanted = normalisedName(seat.name)
    if (!wanted) continue
    const found = local.players.find(
      (player) => !claimed.has(player.id) && normalisedName(player.name) === wanted,
    )
    if (!found) continue
    claimed.add(found.id)
    links.set(seat.id, { to: found.id, by: 'name' })
  }

  const players: Incoming[] = seats.map((seat) => {
    const link = links.get(seat.id)
    return {
      ...seat,
      games: counts.get(seat.id) ?? 0,
      linkTo: link?.to ?? null,
      by: link?.by ?? 'none',
    }
  })

  return { players, twins: findTwins(local, incoming, players) }
}

/**
 * Les parties du fichier qui recopient une partie d'ici.
 *
 * Elle se calcule à partir du rapprochement des joueurs, et donc à nouveau
 * chaque fois qu'il change : tant qu'« Alex » n'est pas rattaché à « Bibi le
 * Boss », la même soirée marquée sur les deux téléphones n'a pas la même table
 * de part et d'autre, et rien ne la reconnaît.
 */
export function findTwins(local: Store, incoming: Store, players: Incoming[]): Twin[] {
  const resolve = resolverFor(players)
  const localIds = new Set(local.games.map((game) => game.id))
  const marks = new Map<string, Id>()
  for (const game of local.games) {
    // Une partie sans manche n'a pas d'empreinte : elle ressemblerait à toutes
    // les autres parties vides de la même table.
    if (game.rounds.length === 0) continue
    marks.set(fingerprint(game, (id) => id), game.id)
  }

  const twins: Twin[] = []
  for (const game of incoming.games) {
    // Même identifiant : c'est la même partie, écartée sans rien demander.
    // Réimporter deux fois le même fichier ne double pas l'historique.
    if (localIds.has(game.id) || game.rounds.length === 0) continue
    const localId = marks.get(fingerprint(game, resolve))
    if (localId) {
      twins.push({ id: game.id, localId, startedAt: game.startedAt, rounds: game.rounds.length })
    }
  }
  return twins
}

function resolverFor(players: Incoming[]): (id: Id) => Id {
  const map = new Map(players.map((seat) => [seat.id, seat.linkTo ?? seat.id]))
  return (id) => map.get(id) ?? id
}

/**
 * Le store fusionné, et ce que la fusion a fait.
 *
 * Rien de ce qui est déjà là n'est écrasé : les joueurs d'ici gardent leur
 * nom et leur place, les réglages d'ici restent (la langue et le thème sont
 * des préférences d'appareil, pas des données de jeu), la partie en cours
 * d'ici n'est pas dérangée. Le fichier n'apporte que ce qui manque.
 *
 * `keep` porte les parties jumelles qu'on a choisi d'importer quand même.
 */
export function mergeStores(
  local: Store,
  incoming: Store,
  plan: MergePlan,
  keep: ReadonlySet<Id> = new Set(),
): { store: Store; summary: MergeSummary } {
  const players: Player[] = [...local.players]
  const map = new Map<Id, Id>()
  const renamed: { from: string; to: string }[] = []
  let playersLinked = 0
  let playersAdded = 0

  // Un identifiant employé ici ne se reprend pas, même par un joueur que le
  // fichier appelle autrement : les parties d'ici s'y réfèrent, et une fiche
  // supprimée y laisse encore ses résultats.
  const taken = new Set<Id>([
    ...local.players.map((player) => player.id),
    ...local.games.flatMap((game) => game.playerIds),
  ])
  const claimed = new Set<Id>()

  for (const seat of plan.players) {
    const link =
      seat.linkTo && !claimed.has(seat.linkTo) && local.players.some((p) => p.id === seat.linkTo)
        ? seat.linkTo
        : null
    if (link) {
      claimed.add(link)
      map.set(seat.id, link)
      playersLinked += 1
      continue
    }

    const id = taken.has(seat.id) ? newId() : seat.id
    taken.add(id)
    map.set(seat.id, id)

    const record = incoming.players.find((player) => player.id === seat.id)
    // L'orphelin du fichier n'y avait déjà plus de fiche : il n'en gagne pas
    // une ici. Ses résultats suffisent à faire tenir les parties debout.
    if (!record) continue
    const name = freeName(players, record.name)
    if (name !== record.name) renamed.push({ from: record.name, to: name })
    players.push({ id, name, createdAt: record.createdAt })
    playersAdded += 1
  }

  const resolve = (id: Id): Id => map.get(id) ?? id
  const names = new Map(players.map((player) => [player.id, player.name]))
  const excluded = new Set(plan.twins.filter((twin) => !keep.has(twin.id)).map((twin) => twin.id))
  const localIds = new Set(local.games.map((game) => game.id))
  const games: Game[] = [...local.games]
  let gamesAdded = 0
  let gamesSkipped = 0
  let closed = false

  for (const game of incoming.games) {
    if (localIds.has(game.id) || excluded.has(game.id)) {
      gamesSkipped += 1
      continue
    }

    const playerIds = game.playerIds.map(resolve)
    // Garde-fou : un plan qui asseoit deux joueurs du fichier sur la même
    // fiche d'ici donnerait un classement faux. L'écran l'interdit ; ici on
    // écarte la partie plutôt que d'en écrire une impossible.
    if (new Set(playerIds).size !== playerIds.length) {
      gamesSkipped += 1
      continue
    }

    const nameSnapshot: Record<Id, string> = {}
    game.playerIds.forEach((source, seat) => {
      const id = playerIds[seat]
      // Le nom d'ici l'emporte : la jointure a été faite exprès, et un
      // historique qui appelle la même personne de deux façons ne se lit pas.
      // Sans fiche — un orphelin du fichier — reste le nom porté ce soir-là.
      nameSnapshot[id] = names.get(id) ?? game.nameSnapshot[source] ?? 'Joueur'
    })

    // Une partie en cours venue d'un autre téléphone arrive close : sa saisie
    // n'a pas voyagé avec elle, et une seule partie peut être en cours ici.
    // Elle rejoint l'historique comme écourtée, avec ses manches validées.
    if (!game.endedAt) closed = true

    games.push({
      ...game,
      endedAt: game.endedAt ?? game.startedAt,
      playerIds,
      rounds: game.rounds.map((round) => ({
        ...round,
        entries: round.entries.map((entry) => ({ ...entry, playerId: resolve(entry.playerId) })),
      })),
      nameSnapshot,
    })
    gamesAdded += 1
  }

  const merged: Store = {
    ...local,
    players,
    // Même tri que la restauration d'une partie supprimée : l'historique se
    // lit dans l'ordre où les soirées se sont tenues, pas dans celui des
    // fichiers.
    games: games.sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  }

  // La liste blanche du chargement sert de dernier filet : ce qui sort d'ici
  // est une forme que l'app relira sans avoir à la corriger.
  return {
    store: normalise(merged),
    summary: { playersLinked, playersAdded, renamed, gamesAdded, gamesSkipped, closed },
  }
}
