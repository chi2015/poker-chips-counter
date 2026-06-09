import React from 'react'
import './PotDisplay.css'

export default function PotDisplay({ pot }) {
  return (
    <div className="pot-display">
      <div className="pot-main">
        <span className="pot-label">POT</span>
        <span className="pot-amount">{pot.toLocaleString()}</span>
      </div>
    </div>
  )
}
