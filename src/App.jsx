import React from 'react'
import { GameProvider, useGame } from './store/gameStore.jsx'
import Home from './components/Home/Home.jsx'
import TableSetup from './components/TableSetup/TableSetup.jsx'
import PlayerSetup from './components/PlayerSetup/PlayerSetup.jsx'
import Game from './components/Game/Game.jsx'

function AppRouter() {
  const { state } = useGame()

  switch (state.currentScreen) {
    case 'home':
      return <Home />
    case 'tableSetup':
      return <TableSetup />
    case 'playerSetup':
      return <PlayerSetup />
    case 'game':
      return <Game />
    default:
      return <Home />
  }
}

export default function App() {
  return (
    <GameProvider>
      <AppRouter />
    </GameProvider>
  )
}
