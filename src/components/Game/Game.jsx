import React from 'react'
import { useGame, useCurrentTable } from '../../store/gameStore.jsx'
import PlayerCard from '../PlayerCard/PlayerCard.jsx'
import ActionPanel from '../ActionPanel/ActionPanel.jsx'
import PotDisplay from '../PotDisplay/PotDisplay.jsx'
import WinnerModal from '../WinnerModal/WinnerModal.jsx'
import TournamentWinnerModal from '../TournamentWinnerModal/TournamentWinnerModal.jsx'
import BlindTimer from '../BlindTimer/BlindTimer.jsx'
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

  if (!table) return null

  const currentStageIdx = STAGE_ORDER.indexOf(table.stage)
  const isLastStage = currentStageIdx === STAGE_ORDER.length - 1

  const activePlayer = table.players[table.activePlayerIndex]
  const activePlayers = table.players.filter(p => p.status === 'active')
  const allInPlayers = table.players.filter(p => p.status === 'all-in')

  const canAdvanceStage = table.roundComplete && !table.showWinner
  const allAllIn = activePlayers.length === 0 && allInPlayers.length >= 2
  const inHandPlayers = table.players.filter(p => p.status !== 'folded')
  const noMoreBetting = activePlayers.length <= 1 && inHandPlayers.length >= 2

  function handleNextStage() {
    dispatch({ type: 'NEXT_STAGE' })
  }

  function handleHome() {
    dispatch({ type: 'NAVIGATE', payload: 'home' })
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
          {!table.levelDurationMinutes && (
            <span className="game-blinds-info">
              {table.smallBlind}/{table.bigBlind}
            </span>
          )}
        </div>
        <div className="game-topbar-right">
          <PotDisplay pot={table.pot} />
        </div>
      </div>

      {/* Blind timer — shows level, countdown, and current/next blinds in brackets */}
      <BlindTimer />

      {/* Dead small blind notice (Dead Button Rule) */}
      {table.deadSmallBlind && table.stage === 'preflop' && (
        <div className="game-dead-sb-bar">
          Dead small blind — a player was eliminated in the previous hand
        </div>
      )}

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
              {isLastStage || noMoreBetting ? 'Showdown' : `Deal ${STAGE_LABELS[STAGE_ORDER[currentStageIdx + 1]] || 'Next'} →`}
            </button>
          )}

          {table.roundComplete && (
            <div className="game-round-status">
              Betting complete
            </div>
          )}
        </div>
      )}

      {/* Winner modal */}
      <WinnerModal />

      {/* Tournament winner modal */}
      <TournamentWinnerModal />
    </div>
  )
}
