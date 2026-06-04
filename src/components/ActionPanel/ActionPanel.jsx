import React, { useState, useEffect } from 'react'
import { useGame, useCurrentTable } from '../../store/gameStore.jsx'
import './ActionPanel.css'

export default function ActionPanel() {
  const { dispatch } = useGame()
  const table = useCurrentTable()
  const [betInput, setBetInput] = useState('')
  const [betError, setBetError] = useState('')

  const activePlayer = table?.players[table.activePlayerIndex]

  // Reset bet input when active player changes
  useEffect(() => {
    setBetInput('')
    setBetError('')
  }, [table?.activePlayerIndex])

  if (!table || !activePlayer || activePlayer.status !== 'active') {
    return null
  }

  const { currentBet, bigBlind } = table
  const toCall = currentBet - activePlayer.currentBet
  const canCheck = toCall === 0
  const canCall = toCall > 0 && activePlayer.chips > 0
  const callAmount = Math.min(toCall, activePlayer.chips)
  const isCallAllIn = callAmount >= activePlayer.chips

  // Minimum raise = current bet + big blind (or double current bet if > 0)
  const minRaise = currentBet > 0
    ? currentBet + Math.max(bigBlind, currentBet)
    : bigBlind

  const canBet = currentBet === 0 && activePlayer.chips > 0
  const canRaise = currentBet > 0 && activePlayer.chips > toCall

  function validateBet(value) {
    const amount = Number(value)
    if (!value || isNaN(amount)) return 'Enter a valid amount'
    if (amount <= 0) return 'Amount must be > 0'
    if (amount > activePlayer.chips) return `Max: ${activePlayer.chips}`
    return ''
  }

  function validateRaise(value) {
    const total = Number(value)
    if (!value || isNaN(total)) return 'Enter a valid amount'
    if (total <= currentBet) return `Must be > ${currentBet} (current bet)`
    const additional = total - activePlayer.currentBet
    if (additional > activePlayer.chips) return `Not enough chips (have ${activePlayer.chips})`
    return ''
  }

  function handleFold() {
    dispatch({ type: 'PLAYER_FOLD' })
  }

  function handleCheck() {
    // Check = bet 0 (when no current bet)
    // We treat it as a "call" of 0
    dispatch({ type: 'PLAYER_CALL' })
  }

  function handleCall() {
    dispatch({ type: 'PLAYER_CALL' })
  }

  function handleBet() {
    const err = validateBet(betInput)
    if (err) { setBetError(err); return }
    dispatch({ type: 'PLAYER_BET', payload: { amount: Number(betInput) } })
    setBetInput('')
    setBetError('')
  }

  function handleRaise() {
    const err = validateRaise(betInput)
    if (err) { setBetError(err); return }
    dispatch({ type: 'PLAYER_RAISE', payload: { amount: Number(betInput) } })
    setBetInput('')
    setBetError('')
  }

  function handleAllIn() {
    dispatch({ type: 'PLAYER_ALL_IN' })
  }

  function handleBetKeyDown(e) {
    if (e.key === 'Enter') {
      if (canBet) handleBet()
      else if (canRaise) handleRaise()
    }
  }

  function setQuickBet(amount) {
    setBetInput(String(Math.min(amount, activePlayer.chips)))
    setBetError('')
  }

  // Quick bet presets — stage-aware
  const potAmount = table.pot
  const isPreflop = table.stage === 'preflop'
  // For raises the input is total-bet, so pot-sized amounts include the call
  const potOffset = canRaise ? currentBet : 0

  const presets = isPreflop
    ? [
        { label: '2BB',   amount: bigBlind * 2 },
        { label: '3BB',   amount: bigBlind * 3 },
        { label: 'Pot',   amount: potAmount + potOffset },
      ]
    : [
        { label: 'Pot/3', amount: Math.floor(potAmount / 3) + potOffset },
        { label: 'Pot/2', amount: Math.floor(potAmount / 2) + potOffset },
        { label: 'Pot',   amount: potAmount + potOffset },
      ]

  const maxValid = activePlayer.chips + activePlayer.currentBet
  const minValid = canRaise ? currentBet : 0

  const quickBets = presets.filter(({ amount }, i, arr) =>
    amount > minValid &&
    amount > 0 &&
    amount <= maxValid &&
    arr.findIndex(p => p.amount === amount) === i
  )

  return (
    <div className="action-panel">
      <div className="action-panel-player-info">
        <span className="action-panel-name">{activePlayer.name}</span>
        <span className="action-panel-chips chip-badge">{activePlayer.chips.toLocaleString()}</span>
        {currentBet > 0 && (
          <span className="action-panel-to-call">
            {toCall > 0 ? `To call: ${callAmount}` : 'Checked'}
          </span>
        )}
      </div>

      {/* Bet/Raise input */}
      {(canBet || canRaise) && (
        <div className="action-bet-input-section">
          <div className="action-bet-input-row">
            <input
              type="number"
              className="action-bet-input"
              value={betInput}
              onChange={e => { setBetInput(e.target.value); setBetError('') }}
              onKeyDown={handleBetKeyDown}
              placeholder={canBet ? `Min: ${bigBlind}` : `Min raise to: ${minRaise}`}
              min={canBet ? 1 : minRaise}
              max={activePlayer.chips}
            />
            <button
              className="btn-primary action-bet-submit-btn"
              onClick={canBet ? handleBet : handleRaise}
              disabled={!betInput}
            >
              {canBet ? 'Bet' : 'Raise'}
            </button>
          </div>
          {betError && <span className="action-bet-error">{betError}</span>}

          {quickBets.length > 0 && (
            <div className="action-quick-bets">
              {quickBets.map(({ amount, label }) => (
                <button
                  key={label}
                  className="btn-ghost action-quick-bet-btn"
                  onClick={() => setQuickBet(amount)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="action-buttons">
        <button className="btn-danger action-btn action-fold" onClick={handleFold}>
          Fold
        </button>

        {canCheck && (
          <button className="btn-ghost action-btn action-check" onClick={handleCheck}>
            Check
          </button>
        )}

        {canCall && (
          <button className="btn-success action-btn action-call" onClick={handleCall}>
            {isCallAllIn ? 'Call (All-in)' : `Call ${callAmount}`}
          </button>
        )}

        <button
          className="btn-allin action-btn action-allin"
          onClick={handleAllIn}
          disabled={activePlayer.chips === 0}
        >
          All-in ({activePlayer.chips})
        </button>
      </div>
    </div>
  )
}
