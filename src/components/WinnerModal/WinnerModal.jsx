import React, { useState, useEffect } from 'react'
import { useGame, useCurrentTable } from '../../store/gameStore.jsx'
import { hasSidePots } from '../../utils/potCalculator.js'
import './WinnerModal.css'

export default function WinnerModal() {
  const { dispatch } = useGame()
  const table = useCurrentTable()
  // splitSelections: { [potIdx]: string[] } — keys present = split mode active for that pot
  const [splitSelections, setSplitSelections] = useState({})

  // Auto-award pots with exactly one eligible player (e.g. uncalled all-in excess)
  useEffect(() => {
    if (!table || !table.showWinner || table.pot <= 0) return
    if (!table.pots || table.pots.length === 0) return

    for (let i = 0; i < table.pots.length; i++) {
      const pot = table.pots[i]
      const eligible = pot.eligiblePlayers
        .map(id => table.players.find(p => p.id === id))
        .filter(Boolean)
        .filter(p => p.status !== 'folded')

      if (eligible.length === 1) {
        dispatch({ type: 'AWARD_POT', payload: {
          winnerId: eligible[0].id,
          potAmount: pot.amount,
          potIndex: i,
        }})
        return
      }
    }
  }, [table?.pots, table?.showWinner, table?.pot])

  if (!table || !table.showWinner) return null

  const eligiblePlayers = table.players.filter(p => p.status !== 'folded')
  const autoWinner = eligiblePlayers.length === 1 ? eligiblePlayers[0] : null
  const allPotsAwarded = table.pot <= 0

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

  function handleAwardPot(winnerId, potAmount, potIndex) {
    dispatch({ type: 'AWARD_POT', payload: { winnerId, potAmount, potIndex } })
  }

  function toggleSplitMode(potIdx) {
    setSplitSelections(prev => {
      if (potIdx in prev) {
        const next = { ...prev }
        delete next[potIdx]
        return next
      }
      return { ...prev, [potIdx]: [] }
    })
  }

  function toggleSplitPlayer(potIdx, playerId) {
    setSplitSelections(prev => {
      const current = prev[potIdx] ?? []
      const next = current.includes(playerId)
        ? current.filter(id => id !== playerId)
        : [...current, playerId]
      return { ...prev, [potIdx]: next }
    })
  }

  function handleConfirmSplit(potIdx, potAmount) {
    const winnerIds = splitSelections[potIdx] ?? []
    if (winnerIds.length < 2) return
    dispatch({ type: 'SPLIT_POT', payload: { winnerIds, potAmount, potIndex: potIdx } })
    setSplitSelections(prev => {
      const next = { ...prev }
      delete next[potIdx]
      return next
    })
  }

  function handleNewHand() {
    dispatch({ type: 'NEW_HAND', payload: { now: Date.now() } })
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
                onClick={() => handleAwardPot(autoWinner.id, table.pot, 0)}
              >
                Award {table.pot.toLocaleString()} to {autoWinner.name}
              </button>
            </div>
          ) : (
            <div className="winner-pots-section">
              {potsToAward.map((pot, potIdx) => {
                const eligible = getEligibleForPot(pot)
                const isSplitMode = potIdx in splitSelections
                const selectedIds = splitSelections[potIdx] ?? []
                const splitCount = selectedIds.length
                const splitEach = splitCount >= 2 ? Math.floor(pot.amount / splitCount) : 0
                const splitRemainder = splitCount >= 2 ? pot.amount % splitCount : 0

                return (
                  <div key={potIdx} className="winner-pot-item">
                    <div className="winner-pot-header">
                      <span className="winner-pot-label">
                        {hasSidePots(potsToAward) ? (potIdx === 0 ? 'Main Pot' : `Side Pot ${potIdx}`) : 'Pot'}
                      </span>
                      <span className="winner-pot-amount">{pot.amount.toLocaleString()}</span>
                      {eligible.length >= 2 && (
                        <button
                          className={`winner-split-toggle${isSplitMode ? ' winner-split-toggle--active' : ''}`}
                          onClick={() => toggleSplitMode(potIdx)}
                        >
                          Split
                        </button>
                      )}
                    </div>

                    {isSplitMode ? (
                      <div className="winner-split-section">
                        <div className="winner-split-players">
                          {eligible.map((player, pIdx) => {
                            const isSelected = selectedIds.includes(player.id)
                            const playerShare = isSelected
                              ? splitEach + (splitCount >= 2 && selectedIds.indexOf(player.id) === 0 ? splitRemainder : 0)
                              : null
                            return (
                              <button
                                key={player.id}
                                className={`winner-split-player${isSelected ? ' winner-split-player--selected' : ''}`}
                                onClick={() => toggleSplitPlayer(potIdx, player.id)}
                              >
                                <span className="winner-split-check">{isSelected ? '✓' : ''}</span>
                                <span className="winner-split-name">{player.name}</span>
                                <span className="winner-split-chips">{player.chips.toLocaleString()}</span>
                                {isSelected && splitCount >= 2 && (
                                  <span className="winner-split-share">+{playerShare.toLocaleString()}</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                        {splitCount >= 2 && (
                          <button
                            className="btn-primary winner-split-confirm"
                            onClick={() => handleConfirmSplit(potIdx, pot.amount)}
                          >
                            {splitCount}-way split · {splitEach.toLocaleString()} each
                            {splitRemainder > 0 && ` (+${splitRemainder} odd chip)`}
                          </button>
                        )}
                        {splitCount < 2 && (
                          <p className="winner-split-hint">Select 2 or more winners</p>
                        )}
                      </div>
                    ) : (
                      <div className="winner-player-grid">
                        {eligible.map(player => (
                          <button
                            key={player.id}
                            className="winner-player-btn"
                            onClick={() => handleAwardPot(player.id, pot.amount, potIdx)}
                          >
                            <span className="winner-player-name">{player.name}</span>
                            <span className="winner-player-chips">{player.chips.toLocaleString()} chips</span>
                            <span className="winner-player-win-amount">+{pot.amount.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {allPotsAwarded && (
          <div className="winner-modal-footer">
            <p className="winner-chips-note">Chips have been distributed.</p>
            <button className="btn-primary winner-new-hand-btn" onClick={handleNewHand}>
              Play Next Hand
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
