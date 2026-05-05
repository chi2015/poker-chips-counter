import React, { useState } from 'react'
import { useGame, useCurrentTable, getNextMTTBlinds } from '../../store/gameStore.jsx'
import { hasSidePots } from '../../utils/potCalculator.js'
import './WinnerModal.css'

export default function WinnerModal() {
  const { dispatch } = useGame()
  const table = useCurrentTable()
  const [blindsUp, setBlindsUp] = useState(false)

  if (!table || !table.showWinner) return null

  const eligiblePlayers = table.players.filter(p => p.status !== 'folded')
  const autoWinner = eligiblePlayers.length === 1 ? eligiblePlayers[0] : null

  const allPotsAwarded = table.pot <= 0

  // Pots still to be awarded (use side pots if present, else synthetic main pot)
  const potsToAward = !allPotsAwarded
    ? (table.pots && table.pots.length > 0
        ? table.pots
        : [{ amount: table.pot, eligiblePlayers: eligiblePlayers.map(p => p.id) }])
    : []

  function getPlayerById(id) {
    return table.players.find(p => p.id === id)
  }

  function getEligibleForPot(pot) {
    return pot.eligiblePlayers
      .map(id => getPlayerById(id))
      .filter(Boolean)
      .filter(p => p.status !== 'folded')
  }

  function handleAwardPot(winnerId, potAmount) {
    dispatch({ type: 'AWARD_POT', payload: { winnerId, potAmount } })
  }

  function handleNewHand() {
    dispatch({ type: 'NEW_HAND', payload: { blindsUp } })
    setBlindsUp(false)
  }

  return (
    <div className="winner-modal-overlay">
      <div className="winner-modal">
        <div className="winner-modal-header">
          <span className="winner-modal-icon">🏆</span>
          <h2 className="winner-modal-title">
            {autoWinner ? `${autoWinner.name} Wins!` : 'Showdown'}
          </h2>
        </div>

        <div className="winner-modal-pot-total">
          <span className="winner-modal-pot-label">Total Pot</span>
          <span className="winner-modal-pot-amount">{table.pot.toLocaleString()}</span>
        </div>

        {!allPotsAwarded && (
          autoWinner ? (
            <div className="winner-auto-section">
              <p className="winner-auto-text">
                All other players folded. <strong>{autoWinner.name}</strong> wins the pot!
              </p>
              <button
                className="btn-primary winner-award-btn"
                onClick={() => handleAwardPot(autoWinner.id, table.pot)}
              >
                Award {table.pot.toLocaleString()} to {autoWinner.name}
              </button>
            </div>
          ) : (
            <div className="winner-pots-section">
              {potsToAward.map((pot, potIdx) => {
                const eligible = getEligibleForPot(pot)
                return (
                  <div key={potIdx} className="winner-pot-item">
                    <div className="winner-pot-header">
                      <span className="winner-pot-label">
                        {hasSidePots(potsToAward) ? (potIdx === 0 ? 'Main Pot' : `Side Pot ${potIdx}`) : 'Pot'}
                      </span>
                      <span className="winner-pot-amount">{pot.amount.toLocaleString()}</span>
                    </div>
                    <div className="winner-player-grid">
                      {eligible.map(player => (
                        <button
                          key={player.id}
                          className="winner-player-btn"
                          onClick={() => handleAwardPot(player.id, pot.amount)}
                        >
                          <span className="winner-player-name">{player.name}</span>
                          <span className="winner-player-chips">{player.chips} chips</span>
                          <span className="winner-player-win-amount">+ {pot.amount}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {allPotsAwarded && (
          <div className="winner-modal-footer">
            <p className="winner-chips-note">Chips have been distributed.</p>
            <label className="winner-blinds-up-row">
              <input
                type="checkbox"
                className="winner-blinds-up-checkbox"
                checked={blindsUp}
                onChange={e => setBlindsUp(e.target.checked)}
              />
              <span className="winner-blinds-up-label">
                Blinds are up
                {blindsUp && (
                  <span className="winner-blinds-up-preview">
                    {' '}→ {getNextMTTBlinds(table.bigBlind)[0]}/{getNextMTTBlinds(table.bigBlind)[1]}
                  </span>
                )}
              </span>
            </label>
            <button className="btn-primary winner-new-hand-btn" onClick={handleNewHand}>
              Play Next Hand
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
