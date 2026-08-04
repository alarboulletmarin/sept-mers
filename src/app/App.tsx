import { useCallback, useEffect } from 'react'
import { ToastProvider } from '../components/Toast.tsx'
import { Game } from '../screens/Game.tsx'
import { GameSummary } from '../screens/GameSummary.tsx'
import { History } from '../screens/History.tsx'
import { Home } from '../screens/Home.tsx'
import { NewGame } from '../screens/NewGame.tsx'
import { Players } from '../screens/Players.tsx'
import { Recap } from '../screens/Recap.tsx'
import { Rules } from '../screens/Rules.tsx'
import { Settings } from '../screens/Settings.tsx'
import { Watch } from '../screens/Watch.tsx'
import { TOTAL_ROUNDS } from '../domain/types.ts'
import { runningGame } from '../store/reducer.ts'
import { ShareProvider } from '../share/ShareProvider.tsx'
import { useRoute, useScrollReset, type Route } from './Router.tsx'
import { StoreProvider, useStore } from './StoreProvider.tsx'
import { TabBar } from './TabBar.tsx'
import { ThemeProvider } from './ThemeProvider.tsx'
import { UpdatePrompt } from './UpdatePrompt.tsx'

export function App() {
  return (
    <StoreProvider>
      <ThemeProvider>
        <ToastProvider>
          {/* Comme la proposition de recharger, la session de partage vit
              au-dessus des écrans : la salle reste ouverte de la manche au
              résumé, et ne meurt pas d'un passage par l'accueil. */}
          <ShareProvider>
            <Screens />
          </ShareProvider>
          <UpdatePrompt />
        </ToastProvider>
      </ThemeProvider>
    </StoreProvider>
  )
}

function Screens() {
  const { route, go } = useRoute()
  const { store } = useStore()
  useScrollReset(
    `${route.name}:${'gameId' in route ? route.gameId : ''}${'playerId' in route ? route.playerId : ''}${'code' in route ? route.code : ''}`,
  )

  const navigate = useCallback((next: Route) => go(next), [go])

  const running = runningGame(store)

  // La route `game` n'a de sens qu'avec une partie en cours : sans elle,
  // on renvoie à l'accueil plutôt que d'afficher un écran vide.
  useEffect(() => {
    if (route.name === 'game' && !running) navigate({ name: 'home' })
  }, [route.name, running, navigate])

  // Reprise à la manche et à la phase exactes : c'est le store qui les porte,
  // l'écran s'y remet tout seul au lancement.
  useEffect(() => {
    if (route.name !== 'home' || !running) return
    if (running.rounds.length >= TOTAL_ROUNDS) return
  }, [route.name, running])

  return (
    <>
      <Screen route={route} go={navigate} />
      {/* La barre ne dépend d'aucun écran : elle est le seul repère qui ne
          bouge jamais, y compris au milieu d'une manche. */}
      <TabBar route={route} go={navigate} />
    </>
  )
}

function Screen({ route, go }: { route: Route; go: (next: Route) => void }) {
  switch (route.name) {
    case 'new':
      return <NewGame go={go} />
    case 'game':
      return <Game go={go} />
    case 'summary':
      return <GameSummary gameId={route.gameId} go={go} />
    case 'history':
      return <History go={go} />
    case 'players':
      return <Players playerId={route.playerId} go={go} />
    case 'rules':
      return <Rules go={go} />
    case 'settings':
      return <Settings go={go} />
    case 'watch':
      return <Watch code={route.code} go={go} />
    case 'recap':
      return <Recap go={go} />
    default:
      return <Home go={go} />
  }
}
