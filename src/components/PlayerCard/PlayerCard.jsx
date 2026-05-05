import React from 'react'
import './PlayerCard.css'

export default function PlayerCard({ player, isCurrentPlayer }) {
  const statusClass = {
    active: 'status-active',
    folded: 'status-folded',
    'all-in': 'status-allin',
  }[player.status] || ''

  const cardClass = [
    'player-card',
    player.isActive ? 'player-card--active' : '',
    player.status === 'folded' ? 'player-card--folded' : '',
    player.status === 'all-in' ? 'player-card--allin' : '',
    isCurrentPlayer ? 'player-card--current' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      {/* Active indicator */}
      {player.isActive && <div className="player-card-active-pulse" />}

      {/* Header row */}
      <div className="player-card-header">
        <div className="player-card-name-row">
          {player.isDealer && <span className="dealer-chip" title="Dealer">D</span>}
          <span className="player-card-name">{player.name}</span>
        </div>
        <span className={`player-status-badge ${statusClass}`}>
          {player.status === 'active' && player.isActive ? 'YOUR TURN' : player.status.toUpperCase().replace('-', ' ')}
        </span>
      </div>

      {/* Chips */}
      <div className="player-card-chips">
        <span className="player-card-chips-label">Chips</span>
        <span className="player-card-chips-value">{player.chips.toLocaleString()}</span>
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="player-card-bet">
          <span className="player-card-bet-label">Bet</span>
          <span className="player-card-bet-value">{player.currentBet.toLocaleString()}</span>
        </div>
      )}

      {/* Folded overlay */}
      {player.status === 'folded' && (
        <div className="player-card-fold-overlay">FOLDED</div>
      )}
    </div>
  )
}
