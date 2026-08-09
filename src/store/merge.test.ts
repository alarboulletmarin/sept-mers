import { describe, expect, it } from 'vitest'
import { findTwins, freeName, mergeStores, planMerge, type MergePlan } from './merge.ts'
import { reducer, type Action } from './reducer.ts'
import { emptyStore, parseStore, serialiseStore } from './storage.ts'
import {
  DEFAULT_OPTIONS,
  EMPTY_BONUS,
  type Game,
  type Id,
  type Round,
  type Store,
} from '../domain/types.ts'

const run = (store: Store, ...actions: Action[]): Store =>
  actions.reduce((current, action) => reducer(current, action), store)

const OPTIONS = { ...DEFAULT_OPTIONS }
const FORMAT = { rounds: 2, firstRoundCards: 1 }
const BORN = '2026-01-01T00:00:00.000Z'

function round(index: number, cards: number, values: [Id, number, number][]): Round {
  return {
    index,
    cards,
    entries: values.map(([playerId, bid, tricks]) => ({
      playerId,
      bid,
      tricks,
      bonus: { ...EMPTY_BONUS },
    })),
  }
}

/** Une partie terminée, écrite à la main : la fusion travaille sur des formes. */
function game(
  id: string,
  playerIds: Id[],
  names: Record<Id, string>,
  at: string,
  rounds: Round[],
): Game {
  return {
    id,
    startedAt: at,
    endedAt: at,
    playerIds,
    options: OPTIONS,
    format: FORMAT,
    rounds,
    nameSnapshot: names,
  }
}

function store(players: [Id, string][], games: Game[]): Store {
  return {
    ...emptyStore(),
    players: players.map(([id, name]) => ({ id, name, createdAt: BORN })),
    games,
  }
}

/** Deux manches jouées par deux joueurs, de quoi porter une empreinte. */
function evening(id: string, a: Id, b: Id, names: Record<Id, string>, at: string): Game {
  return game(id, [a, b], names, at, [
    round(1, 1, [
      [a, 1, 1],
      [b, 0, 0],
    ]),
    round(2, 2, [
      [a, 1, 0],
      [b, 2, 2],
    ]),
  ])
}

/** Le plan, avec un rattachement forcé à la main. */
function forced(plan: MergePlan, id: Id, linkTo: Id | null): MergePlan {
  return {
    ...plan,
    players: plan.players.map((seat) => (seat.id === id ? { ...seat, linkTo } : seat)),
  }
}

describe('rapprochement des joueurs', () => {
  it('rattache par le nom, à la casse et aux espaces près', () => {
    const local = store(
      [
        ['p1', 'Ana'],
        ['p2', 'Bo'],
      ],
      [],
    )
    const file = store(
      [
        ['x1', ' ana '],
        ['x2', 'Cy'],
      ],
      [],
    )

    const plan = planMerge(local, file)
    expect(plan.players.map((seat) => [seat.id, seat.linkTo, seat.by])).toEqual([
      ['x1', 'p1', 'name'],
      ['x2', null, 'none'],
    ])
  })

  it("fait passer l'identifiant avant le nom", () => {
    // Le même joueur, renommé sur un seul des deux téléphones : son nom ne dit
    // plus rien, son identifiant si.
    const local = store(
      [
        ['p1', 'Ana'],
        ['p2', 'Bo'],
      ],
      [],
    )
    const file = store(
      [
        ['p2', 'Ana'],
        ['p1', 'Zoe'],
      ],
      [],
    )

    const plan = planMerge(local, file)
    expect(plan.players.map((seat) => [seat.id, seat.linkTo, seat.by])).toEqual([
      ['p2', 'p2', 'id'],
      ['p1', 'p1', 'id'],
    ])
  })

  it('ne rattache jamais deux joueurs du fichier au même joueur d’ici', () => {
    const local = store([['p1', 'Ana']], [])
    const file = store(
      [
        ['x1', 'Ana'],
        ['x2', 'ANA'],
      ],
      [],
    )

    const plan = planMerge(local, file)
    expect(plan.players.map((seat) => seat.linkTo)).toEqual(['p1', null])
  })

  it('propose aussi les joueurs que le fichier n’a plus en fiche', () => {
    const file: Store = {
      ...store([], [evening('g1', 'x1', 'x2', { x1: 'Ana', x2: 'Bo' }, '2026-02-01T20:00:00.000Z')]),
    }
    const local = store([['p1', 'Ana']], [])

    const plan = planMerge(local, file)
    expect(plan.players).toEqual([
      { id: 'x1', name: 'Ana', games: 1, orphan: true, linkTo: 'p1', by: 'name' },
      { id: 'x2', name: 'Bo', games: 1, orphan: true, linkTo: null, by: 'none' },
    ])
  })
})

describe('fusion', () => {
  const local = store(
    [
      ['p1', 'Alexandre'],
      ['p2', 'Bo'],
    ],
    [evening('g-ici', 'p1', 'p2', { p1: 'Alexandre', p2: 'Bo' }, '2026-02-01T20:00:00.000Z')],
  )
  const file = store(
    [
      ['x1', 'Alexandre'],
      ['x2', 'Cy'],
    ],
    [evening('g-la', 'x1', 'x2', { x1: 'Alex', x2: 'Cy' }, '2026-03-01T20:00:00.000Z')],
  )

  it('remappe la table, les manches et le tableau des noms', () => {
    const plan = planMerge(local, file)
    const { store: merged, summary } = mergeStores(local, file, plan)

    const added = merged.games.find((candidate) => candidate.id === 'g-la')
    expect(added).toBeDefined()
    expect(added?.playerIds).toEqual(['p1', 'x2'])
    expect(added?.rounds[0].entries.map((entry) => entry.playerId)).toEqual(['p1', 'x2'])
    expect(summary.playersLinked).toBe(1)
    expect(summary.playersAdded).toBe(1)
    expect(summary.gamesAdded).toBe(1)
  })

  it('affiche le nom d’ici sur les parties importées', () => {
    const plan = planMerge(local, file)
    const { store: merged } = mergeStores(local, file, plan)

    // « Alex » là-bas, « Alexandre » ici : la jointure a été faite exprès, et
    // l'historique ne doit pas appeler la même personne de deux façons.
    const added = merged.games.find((candidate) => candidate.id === 'g-la')
    expect(added?.nameSnapshot).toEqual({ p1: 'Alexandre', x2: 'Cy' })
  })

  it('garde les joueurs, les parties et les réglages d’ici', () => {
    const themed: Store = {
      ...local,
      settings: { ...local.settings, locale: 'en', theme: 'dark' },
    }
    const { store: merged } = mergeStores(themed, file, planMerge(themed, file))

    expect(merged.settings.locale).toBe('en')
    expect(merged.settings.theme).toBe('dark')
    expect(merged.games.map((candidate) => candidate.id)).toEqual(['g-ici', 'g-la'])
    expect(merged.players.find((player) => player.id === 'p1')?.name).toBe('Alexandre')
  })

  it('ajoute le joueur non rattaché, avec sa fiche', () => {
    const { store: merged } = mergeStores(local, file, planMerge(local, file))
    expect(merged.players.map((player) => player.name)).toEqual(['Alexandre', 'Bo', 'Cy'])
  })

  it('donne un identifiant neuf au joueur dont l’identifiant est déjà pris', () => {
    // On refuse le rapprochement proposé : ce n'est pas la même personne, et
    // son identifiant ne peut pas écraser celui d'ici.
    const twins = store([['p1', 'Zoe']], [])
    const plan = forced(planMerge(local, twins), 'p1', null)
    const { store: merged } = mergeStores(local, twins, plan)

    const zoe = merged.players.find((player) => player.name === 'Zoe')
    expect(zoe).toBeDefined()
    expect(zoe?.id).not.toBe('p1')
    expect(merged.players.find((player) => player.id === 'p1')?.name).toBe('Alexandre')
  })

  it('suffixe le nom déjà porté ici', () => {
    const other = store([['x9', 'Bo']], [])
    const plan = forced(planMerge(local, other), 'x9', null)
    const { store: merged, summary } = mergeStores(local, other, plan)

    expect(merged.players.map((player) => player.name)).toEqual(['Alexandre', 'Bo', 'Bo (2)'])
    expect(summary.renamed).toEqual([{ from: 'Bo', to: 'Bo (2)' }])
  })

  it('écarte une partie déjà présente et ne double rien à la relecture', () => {
    const once = mergeStores(local, file, planMerge(local, file)).store
    const plan = planMerge(once, file)
    const twice = mergeStores(once, file, plan)

    expect(twice.summary.gamesAdded).toBe(0)
    expect(twice.summary.gamesSkipped).toBe(1)
    expect(twice.store.games).toHaveLength(2)
    expect(twice.store.players).toHaveLength(3)
  })

  it('garde le fantôme d’une partie à deux', () => {
    const ghost = store(
      [
        ['x1', 'Alexandre'],
        ['x2', 'Cy'],
      ],
      [
        game('g-ghost', ['x1', 'x2'], { x1: 'Alex', x2: 'Cy' }, '2026-04-01T20:00:00.000Z', [
          {
            ...round(1, 1, [
              ['x1', 1, 1],
              ['x2', 0, 0],
            ]),
            greyBeard: 1,
          },
        ]),
      ],
    )
    const { store: merged } = mergeStores(local, ghost, planMerge(local, ghost))
    const added = merged.games.find((candidate) => candidate.id === 'g-ghost')

    expect(added?.playerIds).toEqual(['p1', 'x2'])
    expect(added?.rounds[0].greyBeard).toBe(1)
  })

  it('laisse au joueur sans fiche son nom d’époque, sans lui en créer une', () => {
    const orphans = store(
      [],
      [evening('g-orph', 'x7', 'x8', { x7: 'Dee', x8: 'Eli' }, '2026-05-01T20:00:00.000Z')],
    )
    const { store: merged, summary } = mergeStores(local, orphans, planMerge(local, orphans))

    expect(summary.playersAdded).toBe(0)
    expect(merged.players).toHaveLength(2)
    expect(merged.games.find((candidate) => candidate.id === 'g-orph')?.nameSnapshot).toEqual({
      x7: 'Dee',
      x8: 'Eli',
    })
  })

  it('fusionne dans un store vide comme un import', () => {
    const fresh = emptyStore()
    const { store: merged } = mergeStores(fresh, file, planMerge(fresh, file))

    expect(merged.players.map((player) => player.name)).toEqual(['Alexandre', 'Cy'])
    expect(merged.games).toHaveLength(1)
    expect(merged.settings.locale).toBe(fresh.settings.locale)
  })

  it('rend un fichier que l’app relit sans le corriger', () => {
    const { store: merged } = mergeStores(local, file, planMerge(local, file))
    const { store: reread } = parseStore(serialiseStore(merged))
    expect(reread).toEqual(merged)
  })
})

describe('parties jumelles', () => {
  // La même soirée marquée sur les deux téléphones : ni le même identifiant,
  // ni la même heure de départ, mais les mêmes mises et les mêmes plis.
  const local = store(
    [
      ['p1', 'Ana'],
      ['p2', 'Bo'],
    ],
    [evening('g-ici', 'p1', 'p2', { p1: 'Ana', p2: 'Bo' }, '2026-02-01T20:00:00.000Z')],
  )
  const file = store(
    [
      ['x1', 'Ana'],
      ['x2', 'Bo'],
    ],
    [evening('g-la', 'x1', 'x2', { x1: 'Ana', x2: 'Bo' }, '2026-02-01T20:07:00.000Z')],
  )

  it('repère la recopie sous un autre identifiant', () => {
    const plan = planMerge(local, file)
    expect(plan.twins).toEqual([
      { id: 'g-la', localId: 'g-ici', startedAt: '2026-02-01T20:07:00.000Z', rounds: 2 },
    ])
  })

  it('l’écarte par défaut', () => {
    const plan = planMerge(local, file)
    const { store: merged, summary } = mergeStores(local, file, plan)

    expect(summary.gamesAdded).toBe(0)
    expect(summary.gamesSkipped).toBe(1)
    expect(merged.games).toHaveLength(1)
  })

  it('l’importe quand on la garde', () => {
    const plan = planMerge(local, file)
    const { store: merged, summary } = mergeStores(local, file, plan, new Set(['g-la']))

    expect(summary.gamesAdded).toBe(1)
    expect(merged.games).toHaveLength(2)
  })

  it('ne la reconnaît qu’une fois la table rapprochée', () => {
    // Les noms de blague : « Alex » là-bas ne ressemble à personne ici tant
    // qu'on ne l'a pas dit, et la soirée recopiée passe inaperçue.
    const joke = store(
      [
        ['p1', 'Bibi le Boss'],
        ['p2', 'Bo'],
      ],
      [evening('g-ici', 'p1', 'p2', { p1: 'Bibi le Boss', p2: 'Bo' }, '2026-02-01T20:00:00.000Z')],
    )
    const plan = planMerge(joke, file)
    expect(plan.twins).toEqual([])

    const linked = forced(plan, 'x1', 'p1')
    expect(findTwins(joke, file, linked.players)).toHaveLength(1)
  })

  it('ne rapproche pas deux soirées qui ne se ressemblent pas', () => {
    const other = store(
      [
        ['x1', 'Ana'],
        ['x2', 'Bo'],
      ],
      [
        game('g-autre', ['x1', 'x2'], { x1: 'Ana', x2: 'Bo' }, '2026-02-01T20:07:00.000Z', [
          round(1, 1, [
            ['x1', 0, 0],
            ['x2', 1, 1],
          ]),
          round(2, 2, [
            ['x1', 2, 2],
            ['x2', 1, 0],
          ]),
        ]),
      ],
    )
    expect(planMerge(local, other).twins).toEqual([])
  })
})

describe('partie en cours', () => {
  it('clôt celle du fichier et laisse celle d’ici intacte', () => {
    const here = run(
      emptyStore(),
      { type: 'players/add', name: 'Ana', id: 'p1', now: BORN },
      { type: 'players/add', name: 'Bo', id: 'p2', now: BORN },
      {
        type: 'game/start',
        playerIds: ['p1', 'p2'],
        options: OPTIONS,
        format: FORMAT,
        id: 'g-ici',
        now: '2026-02-01T20:00:00.000Z',
      },
    )
    const file: Store = {
      ...store(
        [
          ['x1', 'Ana'],
          ['x2', 'Bo'],
        ],
        [
          {
            ...evening('g-la', 'x1', 'x2', { x1: 'Ana', x2: 'Bo' }, '2026-03-01T20:00:00.000Z'),
            endedAt: undefined,
          },
        ],
      ),
    }

    const { store: merged, summary } = mergeStores(here, file, planMerge(here, file))

    expect(summary.closed).toBe(true)
    expect(merged.games.filter((candidate) => !candidate.endedAt).map((candidate) => candidate.id)).toEqual(
      ['g-ici'],
    )
    // La saisie en cours ici n'est pas dérangée par ce qui arrive.
    expect(merged.draft?.gameId).toBe('g-ici')
  })
})

describe('noms libres', () => {
  it('rend le nom voulu quand il est libre', () => {
    expect(freeName([{ id: 'p1', name: 'Ana', createdAt: BORN }], 'Bo')).toBe('Bo')
  })

  it('compte à partir de deux, et saute ce qui est pris', () => {
    const players = [
      { id: 'p1', name: 'Bo', createdAt: BORN },
      { id: 'p2', name: 'bo (2)', createdAt: BORN },
    ]
    expect(freeName(players, 'Bo')).toBe('Bo (3)')
  })
})
