import React from 'react'
import { hasSidePots } from '../../utils/potCalculator.js'
import './PotDisplay.css'

export default function PotDisplay({ pot, pots, players }) {
  const showSidePots = pots && hasSidePots(pots)

  function getPlayerName(playerId) {
    const player = players?.find(p => p.id === playerId)
    return player ? player.name : 'Unknown'
  }

  return (
    <div className="pot-display">
      <div className="pot-main">
        <span className="pot-label">POT</span>
        <span className="pot-amount">{pot.toLocaleString()}</span>
      </div>

      {showSidePots && (
        <div className="pot-side-pots">
          {pots.map((sidePot, idx) => (
            <div key={idx} className="side-pot">
              <span className="side-pot-label">
                {idx === 0 ? 'Main' : `Side ${idx}`}
              </span>
              <span className="side-pot-amount">{sidePot.amount.toLocaleString()}</span>
              <span className="side-pot-eligible">
                {sidePot.eligiblePlayers.map(id => getPlayerName(id)).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
