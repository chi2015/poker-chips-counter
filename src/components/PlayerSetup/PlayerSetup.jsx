import React, { useState } from 'react'
import { useGame, useCurrentTable } from '../../store/gameStore.jsx'
import './PlayerSetup.css'

export default function PlayerSetup() {
  const { dispatch } = useGame()
  const table = useCurrentTable()

  const [playerName, setPlayerName] = useState('')
  const [playerChips, setPlayerChips] = useState(String(table?.buyIn || 1000))
  const [nameError, setNameError] = useState('')

  if (!table) return null

  function handleAddPlayer(e) {
    e.preventDefault()
    const name = playerName.trim()
    if (!name) {
      setNameError('Player name is required')
      return
    }
    if (table.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setNameError('A player with this name already exists')
      return
    }
    const chips = Number(playerChips)
    if (!chips || chips <= 0) {
      setNameError('Starting chips must be > 0')
      return
    }

    dispatch({
      type: 'ADD_PLAYER',
      payload: { tableId: table.id, name, chips },
    })
    setPlayerName('')
    setPlayerChips(String(table.buyIn))
    setNameError('')
  }

  function handleRemovePlayer(playerId) {
    dispatch({
      type: 'REMOVE_PLAYER',
      payload: { tableId: table.id, playerId },
    })
  }

  function handleStartGame() {
    if (table.players.length < 2) return
    dispatch({ type: 'START_GAME', payload: { tableId: table.id } })
  }

  function handleBack() {
    dispatch({ type: 'NAVIGATE', payload: 'home' })
  }

  return (
    <div className="player-setup screen">
      <div className="screen-header">
        <button className="back-btn" onClick={handleBack}>← Back</button>
        <h1 className="screen-title">{table.name}</h1>
      </div>

      <div className="player-setup-content">
        {/* Add player form */}
        <div className="card player-setup-add-card">
          <h2 className="player-setup-section-title">Add Player</h2>
          <form onSubmit={handleAddPlayer} className="player-setup-form">
            <div className="form-group">
              <label htmlFor="playerName">Player Name</label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={e => { setPlayerName(e.target.value); setNameError('') }}
                placeholder="Enter player name"
                autoComplete="off"
              />
              {nameError && <span className="field-error">{nameError}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="playerChips">Starting Chips</label>
              <input
                id="playerChips"
                type="number"
                min="1"
                value={playerChips}
                onChange={e => setPlayerChips(e.target.value)}
                placeholder={String(table.buyIn)}
              />
            </div>
            <button type="submit" className="btn-outline-gold player-setup-add-btn">
              + Add Player
            </button>
          </form>
        </div>

        {/* Players list */}
        <div className="player-setup-list-section">
          <div className="player-setup-list-header">
            <h2 className="player-setup-section-title">
              Players ({table.players.length})
            </h2>
            {table.players.length >= 2 && (
              <span className="player-ready-badge">Ready to play!</span>
            )}
          </div>

          {table.players.length === 0 ? (
            <div className="player-empty">
              <p>No players added yet. Add at least 2 players to start.</p>
            </div>
          ) : (
            <div className="player-list">
              {table.players.map((player, idx) => (
                <div key={player.id} className="player-item card">
                  <div className="player-item-info">
                    <span className="player-item-num">{idx + 1}</span>
                    <div className="player-item-details">
                      <span className="player-item-name">{player.name}</span>
                      <span className="chip-badge">{player.chips}</span>
                    </div>
                  </div>
                  <button
                    className="btn-danger player-item-remove"
                    onClick={() => handleRemovePlayer(player.id)}
                    title="Remove player"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Start game button */}
      <div className="player-setup-footer">
        {table.players.length < 2 && (
          <p className="player-setup-warning">
            Need at least 2 players to start
          </p>
        )}
        <button
          className="btn-primary player-setup-start"
          disabled={table.players.length < 2}
          onClick={handleStartGame}
        >
          Start Game ({table.players.length} players)
        </button>
      </div>
    </div>
  )
}
