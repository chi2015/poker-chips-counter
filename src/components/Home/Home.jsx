import React from 'react'
import { useGame } from '../../store/gameStore.jsx'
import './Home.css'

export default function Home() {
  const { state, dispatch } = useGame()

  function handleNewTable() {
    dispatch({ type: 'NAVIGATE', payload: 'tableSetup' })
  }

  function handleDeleteTable(e, tableId) {
    e.stopPropagation()
    if (window.confirm('Delete this table? This cannot be undone.')) {
      dispatch({ type: 'DELETE_TABLE', payload: tableId })
    }
  }

  function handleContinueTable(e, tableId) {
    e.stopPropagation()
    dispatch({ type: 'LOAD_TABLE', payload: tableId })
  }

  function handleSetupTable(e, tableId) {
    e.stopPropagation()
    // Set current table ID then navigate to player setup
    dispatch({ type: 'LOAD_TABLE', payload: tableId })
    dispatch({ type: 'NAVIGATE', payload: 'playerSetup' })
  }

  return (
    <div className="home-screen screen">
      <div className="home-header">
        <div className="home-logo">
          <span className="home-logo-icon">♠</span>
          <h1 className="home-title">Poker Chips</h1>
        </div>
        <button className="btn-primary home-new-btn" onClick={handleNewTable}>
          + New Table
        </button>
      </div>

      {state.tables.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty-icon">🃏</div>
          <p className="home-empty-text">No tables yet</p>
          <p className="home-empty-sub">Create a new table to get started</p>
          <button className="btn-primary home-empty-btn" onClick={handleNewTable}>
            Create Table
          </button>
        </div>
      ) : (
        <div className="home-tables">
          <h2 className="home-section-title">Saved Tables</h2>
          <div className="home-table-list">
            {state.tables.map(table => (
              <div key={table.id} className="home-table-card card">
                <div className="home-table-info">
                  <div className="home-table-name">{table.name}</div>
                  <div className="home-table-meta">
                    <span className="home-table-blinds">
                      Blinds: {table.smallBlind}/{table.bigBlind}
                    </span>
                    <span className="home-table-buyin">
                      Buy-in: {table.buyIn}
                    </span>
                    <span className="home-table-players">
                      {table.players.length} player{table.players.length !== 1 ? 's' : ''}
                    </span>
                    {table.gameStarted && (
                      <span className="home-table-stage">
                        {table.stage}
                      </span>
                    )}
                  </div>
                </div>
                <div className="home-table-actions">
                  {table.gameStarted ? (
                    <button
                      className="btn-primary home-table-btn"
                      onClick={(e) => handleContinueTable(e, table.id)}
                    >
                      Resume
                    </button>
                  ) : (
                    <button
                      className="btn-outline-gold home-table-btn"
                      onClick={(e) => handleSetupTable(e, table.id)}
                    >
                      Setup
                    </button>
                  )}
                  <button
                    className="btn-danger home-table-btn home-table-del"
                    onClick={(e) => handleDeleteTable(e, table.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
