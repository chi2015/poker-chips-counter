import React from 'react'
import { useGame, useCurrentTable } from '../../store/gameStore.jsx'
import './TournamentWinnerModal.css'

export default function TournamentWinnerModal() {
  const { dispatch } = useGame()
  const table = useCurrentTable()

  if (!table || !table.tournamentWinner) return null

  const winner = table.players.find(p => p.id === table.tournamentWinner)
  if (!winner) return null

  function handleClose() {
    dispatch({ type: 'CLOSE_TABLE' })
  }

  return (
    <div className="tourn-overlay">
      <div className="tourn-modal">
        <div className="tourn-trophy">🏆</div>
        <h2 className="tourn-title">Tournament Winner!</h2>
        <p className="tourn-name">{winner.name}</p>
        <p className="tourn-chips">{winner.chips.toLocaleString()} chips</p>
        <button className="btn-primary tourn-close-btn" onClick={handleClose}>
          Close Table
        </button>
      </div>
    </div>
  )
}
