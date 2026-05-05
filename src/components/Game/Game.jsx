import React, { useState } from 'react'
import { useGame, useCurrentTable } from '../../store/gameStore.jsx'
import PlayerCard from '../PlayerCard/PlayerCard.jsx'
import ActionPanel from '../ActionPanel/ActionPanel.jsx'
import PotDisplay from '../PotDisplay/PotDisplay.jsx'
import WinnerModal from '../WinnerModal/WinnerModal.jsx'
import './Game.css'

const STAGE_LABELS = {
  preflop: 'Pre-Flop',
  flop: 'Flop',
  turn: 'Turn',
  river: 'River',
}

const STAGE_ORDER = ['preflop', 'flop', 'turn', 'river']

export default function Game() {
  const { dispatch } = useGame()
  const table = useCurrentTable()

  const [showBlindsEditor, setShowBlindsEditor] = useState(false)
  const [blindsForm, setBlindsForm] = useState({ smallBlind: '', bigBlind: '' })

  if (!table) return null

  const currentStageIdx = STAGE_ORDER.indexOf(table.stage)
  const isLastStage = currentStageIdx === STAGE_ORDER.length - 1

  const activePlayer = table.players[table.activePlayerIndex]
  const activePlayers = table.players.filter(p => p.status === 'active')
  const allInPlayers = table.players.filter(p => p.status === 'all-in')

  const canAdvanceStage = table.roundComplete && !table.showWinner
  const allAllIn = activePlayers.length === 0 && allInPlayers.length >= 2

  function handleNextStage() {
    dispatch({ type: 'NEXT_STAGE' })
  }

  function handleHome() {
    dispatch({ type: 'NAVIGATE', payload: 'home' })
  }

  function openBlindsEditor() {
    setBlindsForm({ smallBlind: table.smallBlind, bigBlind: table.bigBlind })
    setShowBlindsEditor(true)
  }

  function handleBlindsSubmit(e) {
    e.preventDefault()
    const sb = Number(blindsForm.smallBlind)
    const bb = Number(blindsForm.bigBlind)
    if (sb > 0 && bb > 0 && bb >= sb) {
      dispatch({ type: 'UPDATE_BLINDS', payload: { smallBlind: sb, bigBlind: bb } })
      setShowBlindsEditor(false)
    }
  }

  return (
    <div className="game-screen">
      {/* Top bar */}
      <div className="game-topbar">
        <button className="btn-ghost game-home-btn" onClick={handleHome}>
          ← Home
        </button>
        <div className="game-topbar-center">
          <span className="game-table-name">{table.name}</span>
          <div className="game-stages">
            {STAGE_ORDER.map((stage, i) => (
              <span
                key={stage}
                className={[
                  'game-stage-pip',
                  i < currentStageIdx ? 'stage-done' : '',
                  i === currentStageIdx ? 'stage-current' : '',
                  i > currentStageIdx ? 'stage-future' : '',
                ].filter(Boolean).join(' ')}
                title={STAGE_LABELS[stage]}
              >
                {STAGE_LABELS[stage]}
              </span>
            ))}
          </div>
          <button className="game-blinds-btn" onClick={openBlindsEditor} title="Edit blinds">
            Blinds: {table.smallBlind}/{table.bigBlind} ✎
          </button>
        </div>
        <div className="game-topbar-right">
          <PotDisplay pot={table.pot} pots={table.pots} players={table.players} />
        </div>
      </div>

      {/* Current bet indicator */}
      {table.currentBet > 0 && (
        <div className="game-current-bet-bar">
          <span className="game-current-bet-label">Current Bet:</span>
          <span className="game-current-bet-value">{table.currentBet}</span>
        </div>
      )}

      {/* Player grid */}
      <div className="game-players-grid">
        {table.players.map(player => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>

      {/* Action panel */}
      {!table.showWinner && activePlayer && activePlayer.status === 'active' && (
        <div className="game-action-section">
          <ActionPanel />
        </div>
      )}

      {/* Stage controls */}
      {!table.showWinner && (
        <div className="game-stage-controls">
          {allAllIn && (
            <div className="game-allin-notice">
              All players are all-in — run out the board
            </div>
          )}

          {(canAdvanceStage || allAllIn) && (
            <button
              className="btn-primary game-next-stage-btn"
              onClick={handleNextStage}
            >
              {isLastStage ? 'Showdown' : `Deal ${STAGE_LABELS[STAGE_ORDER[currentStageIdx + 1]] || 'Next'} →`}
            </button>
          )}

          {table.roundComplete && (
            <div className="game-round-status">
              Betting complete
            </div>
          )}
        </div>
      )}

      {/* Blinds editor modal */}
      {showBlindsEditor && (
        <div className="blinds-editor-overlay" onClick={() => setShowBlindsEditor(false)}>
          <div className="blinds-editor-modal" onClick={e => e.stopPropagation()}>
            <h3 className="blinds-editor-title">Edit Blinds</h3>
            <p className="blinds-editor-note">Takes effect from the next hand.</p>
            <form onSubmit={handleBlindsSubmit} className="blinds-editor-form">
              <label className="blinds-editor-label">
                Small Blind
                <input
                  className="blinds-editor-input"
                  type="number"
                  min="1"
                  value={blindsForm.smallBlind}
                  onChange={e => setBlindsForm(f => ({ ...f, smallBlind: e.target.value }))}
                />
              </label>
              <label className="blinds-editor-label">
                Big Blind
                <input
                  className="blinds-editor-input"
                  type="number"
                  min="1"
                  value={blindsForm.bigBlind}
                  onChange={e => setBlindsForm(f => ({ ...f, bigBlind: e.target.value }))}
                />
              </label>
              <div className="blinds-editor-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowBlindsEditor(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    !blindsForm.smallBlind || !blindsForm.bigBlind ||
                    Number(blindsForm.bigBlind) < Number(blindsForm.smallBlind)
                  }
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Winner modal */}
      <WinnerModal />
    </div>
  )
}
