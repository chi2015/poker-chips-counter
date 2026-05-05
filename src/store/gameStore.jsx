import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { saveState, loadState } from '../utils/localStorage.js'
import { calculatePots, mergePots } from '../utils/potCalculator.js'

// ─── Initial State ───────────────────────────────────────────────────────────

function createInitialState() {
  return {
    tables: [],
    currentTableId: null,
    currentScreen: 'home', // 'home' | 'tableSetup' | 'playerSetup' | 'game'
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function createPlayer(name, chips) {
  return {
    id: generateId(),
    name,
    chips,
    currentBet: 0,
    totalBet: 0,
    status: 'active', // 'active' | 'folded' | 'all-in'
    isDealer: false,
    isActive: false,
    hasActed: false, // tracks if player has taken an action this betting round
  }
}

function createTable({ name, smallBlind, bigBlind, buyIn }) {
  return {
    id: generateId(),
    name,
    smallBlind: Number(smallBlind),
    bigBlind: Number(bigBlind),
    buyIn: Number(buyIn),
    players: [],
    stage: 'preflop',
    pot: 0,
    currentBet: 0,
    activePlayerIndex: 0,
    handHistory: [],
    pots: [],
    showWinner: false,
    gameStarted: false,
    roundComplete: false,
  }
}

/**
 * Find the next player index that is active (not folded, not all-in).
 * Returns -1 if no such player exists.
 */
function findNextActivePlayer(players, fromIndex) {
  const total = players.length
  for (let i = 1; i <= total; i++) {
    const idx = (fromIndex + i) % total
    if (players[idx].status === 'active') return idx
  }
  return -1
}

/**
 * Count players still in hand (not folded).
 */
function countPlayersInHand(players) {
  return players.filter(p => p.status !== 'folded').length
}

/**
 * Count players who can still act (active, not all-in, not folded).
 */
function countActivePlayers(players) {
  return players.filter(p => p.status === 'active').length
}

/**
 * Check if the betting round is complete:
 * - All active players have matched the current bet (or are all-in/folded)
 * - AND every active player has had a chance to act this round (hasActed = true)
 */
function isBettingRoundComplete(players, currentBet) {
  const inHand = players.filter(p => p.status !== 'folded')
  const canAct = inHand.filter(p => p.status === 'active')

  // If nobody can act, round is complete
  if (canAct.length === 0) return true

  // All active players must have acted at least once
  const allHaveActed = canAct.every(p => p.hasActed)
  if (!allHaveActed) return false

  // All active players must have matched the current bet (or be all-in)
  const allMatched = canAct.every(p => p.currentBet >= currentBet)
  if (!allMatched) return false

  return true
}

/**
 * Recompute pots from the current players' totalBet values.
 */
function recomputePots(players, existingPot) {
  const pots = mergePots(calculatePots(players))
  return pots
}

/**
 * Post blinds for a new hand. Assumes dealer is set.
 */
function postBlinds(table) {
  const players = table.players.map(p => ({ ...p }))
  const total = players.length

  const dealerIdx = players.findIndex(p => p.isDealer)

  // Small blind is next after dealer
  let sbIdx = (dealerIdx + 1) % total
  // Big blind is next after small blind
  let bbIdx = (dealerIdx + 2) % total

  // In heads-up, dealer posts small blind
  if (total === 2) {
    sbIdx = dealerIdx
    bbIdx = (dealerIdx + 1) % total
  }

  const sbAmount = Math.min(table.smallBlind, players[sbIdx].chips)
  const bbAmount = Math.min(table.bigBlind, players[bbIdx].chips)

  players[sbIdx].currentBet = sbAmount
  players[sbIdx].totalBet = sbAmount
  players[sbIdx].chips -= sbAmount
  if (players[sbIdx].chips === 0) players[sbIdx].status = 'all-in'

  players[bbIdx].currentBet = bbAmount
  players[bbIdx].totalBet = bbAmount
  players[bbIdx].chips -= bbAmount
  if (players[bbIdx].chips === 0) players[bbIdx].status = 'all-in'

  // First to act preflop is after big blind
  let firstToActIdx = (bbIdx + 1) % total
  // Skip folded/all-in
  let safetyCounter = 0
  while (players[firstToActIdx].status !== 'active' && safetyCounter < total) {
    firstToActIdx = (firstToActIdx + 1) % total
    safetyCounter++
  }

  players.forEach((p, i) => {
    p.isActive = i === firstToActIdx
  })

  const pot = sbAmount + bbAmount
  const currentBet = bbAmount

  return { players, pot, currentBet, activePlayerIndex: firstToActIdx }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function gameReducer(state, action) {
  switch (action.type) {

    // ── Table Management ──────────────────────────────────────────────────

    case 'CREATE_TABLE': {
      const table = createTable(action.payload)
      return {
        ...state,
        tables: [...state.tables, table],
        currentTableId: table.id,
        currentScreen: 'playerSetup',
      }
    }

    case 'DELETE_TABLE': {
      const tables = state.tables.filter(t => t.id !== action.payload)
      return {
        ...state,
        tables,
        currentTableId: state.currentTableId === action.payload ? null : state.currentTableId,
        currentScreen: state.currentTableId === action.payload ? 'home' : state.currentScreen,
      }
    }

    case 'LOAD_TABLE': {
      return {
        ...state,
        currentTableId: action.payload,
        currentScreen: 'game',
      }
    }

    case 'NAVIGATE': {
      return {
        ...state,
        currentScreen: action.payload,
      }
    }

    // ── Player Management ─────────────────────────────────────────────────

    case 'ADD_PLAYER': {
      const { tableId, name, chips } = action.payload
      const player = createPlayer(name, Number(chips))
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === tableId
            ? { ...t, players: [...t.players, player] }
            : t
        ),
      }
    }

    case 'REMOVE_PLAYER': {
      const { tableId, playerId } = action.payload
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === tableId
            ? { ...t, players: t.players.filter(p => p.id !== playerId) }
            : t
        ),
      }
    }

    case 'UPDATE_PLAYER_NAME': {
      const { tableId, playerId, name } = action.payload
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === tableId
            ? {
                ...t,
                players: t.players.map(p =>
                  p.id === playerId ? { ...p, name } : p
                ),
              }
            : t
        ),
      }
    }

    // ── Game Flow ─────────────────────────────────────────────────────────

    case 'START_GAME': {
      const { tableId } = action.payload
      const tableIdx = state.tables.findIndex(t => t.id === tableId)
      if (tableIdx === -1) return state

      const table = state.tables[tableIdx]
      if (table.players.length < 2) return state

      // Assign dealer to first player
      let players = table.players.map((p, i) => ({
        ...p,
        isDealer: i === 0,
        isActive: false,
        status: 'active',
        currentBet: 0,
        totalBet: 0,
        hasActed: false,
      }))

      const newTable = {
        ...table,
        players,
        stage: 'preflop',
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        pots: [],
        showWinner: false,
        gameStarted: true,
        roundComplete: false,
      }

      const { players: playersWithBlinds, pot, currentBet, activePlayerIndex } = postBlinds(newTable)

      const finalTable = {
        ...newTable,
        players: playersWithBlinds,
        pot,
        currentBet,
        activePlayerIndex,
        pots: recomputePots(playersWithBlinds, pot),
        roundComplete: isBettingRoundComplete(playersWithBlinds, currentBet),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable

      return {
        ...state,
        tables: updatedTables,
        currentScreen: 'game',
      }
    }

    case 'NEXT_STAGE': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const stages = ['preflop', 'flop', 'turn', 'river']
      const currentStageIdx = stages.indexOf(table.stage)

      if (currentStageIdx === stages.length - 1) {
        // At river — show winner
        const finalTable = {
          ...table,
          showWinner: true,
          roundComplete: false,
        }
        const updatedTables = [...state.tables]
        updatedTables[tableIdx] = finalTable
        return { ...state, tables: updatedTables }
      }

      const nextStage = stages[currentStageIdx + 1]

      // Reset current bets and hasActed for new stage, find first active player after dealer
      const players = table.players.map(p => ({
        ...p,
        currentBet: 0,
        isActive: false,
        hasActed: false,
      }))

      // First to act post-flop: first active player after dealer
      const dealerIdx = players.findIndex(p => p.isDealer)
      let firstToActIdx = findNextActivePlayer(players, dealerIdx)
      if (firstToActIdx === -1) firstToActIdx = 0

      players.forEach((p, i) => {
        p.isActive = i === firstToActIdx
      })

      const finalTable = {
        ...table,
        players,
        stage: nextStage,
        currentBet: 0,
        activePlayerIndex: firstToActIdx,
        roundComplete: isBettingRoundComplete(players, 0),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'NEW_HAND': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      // Remove busted players (0 chips)
      const eligiblePlayers = table.players.filter(p => p.chips > 0)
      if (eligiblePlayers.length < 2) {
        // Not enough players to continue — go home
        return {
          ...state,
          currentScreen: 'home',
        }
      }

      // Rotate dealer
      const dealerIdx = eligiblePlayers.findIndex(p => p.isDealer)
      const nextDealerIdx = (dealerIdx + 1) % eligiblePlayers.length

      const players = eligiblePlayers.map((p, i) => ({
        ...p,
        isDealer: i === nextDealerIdx,
        isActive: false,
        status: 'active',
        currentBet: 0,
        totalBet: 0,
        hasActed: false,
      }))

      const newTable = {
        ...table,
        players,
        stage: 'preflop',
        pot: 0,
        currentBet: 0,
        activePlayerIndex: 0,
        pots: [],
        showWinner: false,
        roundComplete: false,
      }

      const { players: playersWithBlinds, pot, currentBet, activePlayerIndex } = postBlinds(newTable)

      const finalTable = {
        ...newTable,
        players: playersWithBlinds,
        pot,
        currentBet,
        activePlayerIndex,
        pots: recomputePots(playersWithBlinds, pot),
        roundComplete: isBettingRoundComplete(playersWithBlinds, currentBet),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    // ── Player Actions ────────────────────────────────────────────────────

    case 'PLAYER_FOLD': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      let players = table.players.map((p, i) =>
        i === table.activePlayerIndex
          ? { ...p, status: 'folded', isActive: false, hasActed: true }
          : p
      )

      // Check if only one player remains
      const inHand = players.filter(p => p.status !== 'folded')
      if (inHand.length === 1) {
        // Auto-show winner
        const finalTable = {
          ...table,
          players,
          showWinner: true,
          roundComplete: false,
          pots: recomputePots(players, table.pot),
        }
        const updatedTables = [...state.tables]
        updatedTables[tableIdx] = finalTable
        return { ...state, tables: updatedTables }
      }

      // Advance to next player
      const nextIdx = findNextActivePlayer(players, table.activePlayerIndex)
      players = players.map((p, i) => ({ ...p, isActive: i === nextIdx }))

      const roundComplete = isBettingRoundComplete(players, table.currentBet)

      const finalTable = {
        ...table,
        players,
        activePlayerIndex: nextIdx,
        roundComplete,
        pots: recomputePots(players, table.pot),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'PLAYER_CALL': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const player = table.players[table.activePlayerIndex]
      const toCall = table.currentBet - player.currentBet
      const actualCall = Math.min(toCall, player.chips)
      const isAllIn = actualCall >= player.chips

      let players = table.players.map((p, i) => {
        if (i !== table.activePlayerIndex) return p
        return {
          ...p,
          chips: p.chips - actualCall,
          currentBet: p.currentBet + actualCall,
          totalBet: p.totalBet + actualCall,
          status: isAllIn ? 'all-in' : p.status,
          isActive: false,
          hasActed: true,
        }
      })

      const newPot = table.pot + actualCall
      const nextIdx = findNextActivePlayer(players, table.activePlayerIndex)
      players = players.map((p, i) => ({ ...p, isActive: i === nextIdx }))

      const roundComplete = isBettingRoundComplete(players, table.currentBet)

      const finalTable = {
        ...table,
        players,
        pot: newPot,
        activePlayerIndex: nextIdx === -1 ? table.activePlayerIndex : nextIdx,
        roundComplete,
        pots: recomputePots(players, newPot),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'PLAYER_BET': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const { amount } = action.payload
      const betAmount = Number(amount)
      const player = table.players[table.activePlayerIndex]

      if (betAmount <= 0 || betAmount > player.chips) return state

      const isAllIn = betAmount >= player.chips

      // Bet opens action — reset hasActed for all OTHER active players
      let players = table.players.map((p, i) => {
        if (i === table.activePlayerIndex) {
          return {
            ...p,
            chips: p.chips - betAmount,
            currentBet: p.currentBet + betAmount,
            totalBet: p.totalBet + betAmount,
            status: isAllIn ? 'all-in' : p.status,
            isActive: false,
            hasActed: true,
          }
        }
        // Other active players need to act again
        return p.status === 'active' ? { ...p, hasActed: false } : p
      })

      const newCurrentBet = Math.max(table.currentBet, players[table.activePlayerIndex].currentBet)
      const newPot = table.pot + betAmount
      const nextIdx = findNextActivePlayer(players, table.activePlayerIndex)
      players = players.map((p, i) => ({ ...p, isActive: i === nextIdx }))

      const roundComplete = isBettingRoundComplete(players, newCurrentBet)

      const finalTable = {
        ...table,
        players,
        pot: newPot,
        currentBet: newCurrentBet,
        activePlayerIndex: nextIdx === -1 ? table.activePlayerIndex : nextIdx,
        roundComplete,
        pots: recomputePots(players, newPot),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'PLAYER_RAISE': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const { amount } = action.payload
      const raiseTotal = Number(amount) // total bet this player wants to have
      const player = table.players[table.activePlayerIndex]

      const additionalChips = raiseTotal - player.currentBet
      if (additionalChips <= 0 || additionalChips > player.chips) return state

      const isAllIn = additionalChips >= player.chips

      // Raise reopens action — reset hasActed for all OTHER active players
      let players = table.players.map((p, i) => {
        if (i === table.activePlayerIndex) {
          return {
            ...p,
            chips: p.chips - additionalChips,
            currentBet: raiseTotal,
            totalBet: p.totalBet + additionalChips,
            status: isAllIn ? 'all-in' : p.status,
            isActive: false,
            hasActed: true,
          }
        }
        // Other active players need to call or re-raise
        return p.status === 'active' ? { ...p, hasActed: false } : p
      })

      const newCurrentBet = raiseTotal
      const newPot = table.pot + additionalChips
      const nextIdx = findNextActivePlayer(players, table.activePlayerIndex)
      players = players.map((p, i) => ({ ...p, isActive: i === nextIdx }))

      const roundComplete = isBettingRoundComplete(players, newCurrentBet)

      const finalTable = {
        ...table,
        players,
        pot: newPot,
        currentBet: newCurrentBet,
        activePlayerIndex: nextIdx === -1 ? table.activePlayerIndex : nextIdx,
        roundComplete,
        pots: recomputePots(players, newPot),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'PLAYER_ALL_IN': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const player = table.players[table.activePlayerIndex]
      const allInAmount = player.chips

      if (allInAmount === 0) return state

      const allInTotal = player.currentBet + allInAmount
      const isRaise = allInTotal > table.currentBet

      // If the all-in is a raise, reset hasActed for other active players
      let players = table.players.map((p, i) => {
        if (i === table.activePlayerIndex) {
          return {
            ...p,
            chips: 0,
            currentBet: allInTotal,
            totalBet: p.totalBet + allInAmount,
            status: 'all-in',
            isActive: false,
            hasActed: true,
          }
        }
        if (isRaise && p.status === 'active') return { ...p, hasActed: false }
        return p
      })

      const newCurrentBet = Math.max(table.currentBet, allInTotal)
      const newPot = table.pot + allInAmount

      let nextIdx = findNextActivePlayer(players, table.activePlayerIndex)
      players = players.map((p, i) => ({ ...p, isActive: i === nextIdx }))

      // Check if all remaining players are all-in or folded → show winner
      const inHandCount = players.filter(p => p.status !== 'folded').length
      const activeCount = players.filter(p => p.status === 'active').length

      let showWinner = false
      if (inHandCount === 1) showWinner = true

      const roundComplete = isBettingRoundComplete(players, newCurrentBet) || activeCount === 0

      const finalTable = {
        ...table,
        players,
        pot: newPot,
        currentBet: newCurrentBet,
        activePlayerIndex: nextIdx === -1 ? table.activePlayerIndex : nextIdx,
        roundComplete,
        showWinner,
        pots: recomputePots(players, newPot),
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'AWARD_POT': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const { winnerId, potAmount } = action.payload

      const players = table.players.map(p =>
        p.id === winnerId ? { ...p, chips: p.chips + potAmount } : p
      )

      const newPot = table.pot - potAmount
      const allAwarded = newPot <= 0

      // Remove the awarded pot from side pots list
      const newPots = table.pots.filter(p => p.amount !== potAmount || !p.eligiblePlayers.includes(winnerId))

      const finalTable = {
        ...table,
        players,
        pot: Math.max(0, newPot),
        pots: allAwarded ? [] : newPots,
        showWinner: true, // keep modal open until NEW_HAND is explicitly dispatched
      }

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = finalTable
      return { ...state, tables: updatedTables }
    }

    case 'UPDATE_BLINDS': {
      const { smallBlind, bigBlind } = action.payload
      return {
        ...state,
        tables: state.tables.map(t =>
          t.id === state.currentTableId
            ? { ...t, smallBlind: Number(smallBlind), bigBlind: Number(bigBlind) }
            : t
        ),
      }
    }

    case 'ADVANCE_ACTIVE_PLAYER': {
      const tableIdx = state.tables.findIndex(t => t.id === state.currentTableId)
      if (tableIdx === -1) return state
      const table = state.tables[tableIdx]

      const nextIdx = findNextActivePlayer(table.players, table.activePlayerIndex)
      if (nextIdx === -1) return state

      const players = table.players.map((p, i) => ({
        ...p,
        isActive: i === nextIdx,
      }))

      const roundComplete = isBettingRoundComplete(players, table.currentBet)

      const updatedTables = [...state.tables]
      updatedTables[tableIdx] = { ...table, players, activePlayerIndex: nextIdx, roundComplete }
      return { ...state, tables: updatedTables }
    }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const persisted = loadState()
  const [state, dispatch] = useReducer(gameReducer, persisted || createInitialState())

  useEffect(() => {
    saveState(state)
  }, [state])

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

export function useCurrentTable() {
  const { state } = useGame()
  return state.tables.find(t => t.id === state.currentTableId) || null
}
