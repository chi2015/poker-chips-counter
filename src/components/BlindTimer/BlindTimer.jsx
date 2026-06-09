import React, { useState, useEffect } from 'react'
import { useGame, useCurrentTable, getNextMTTBlinds } from '../../store/gameStore.jsx'
import './BlindTimer.css'

export default function BlindTimer() {
  const { dispatch } = useGame()
  const table = useCurrentTable()
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!table?.levelDurationMinutes || !table?.levelStartTime || table?.blindsUpPending) {
      setRemaining(null)
      return
    }

    const totalMs = table.levelDurationMinutes * 60 * 1000
    let fired = false

    const id = setInterval(() => {
      const elapsed = Date.now() - table.levelStartTime
      const rem = Math.max(0, totalMs - elapsed)
      setRemaining(rem)
      if (rem === 0 && !fired) {
        fired = true
        clearInterval(id)
        dispatch({ type: 'BLINDS_UP_PENDING' })
      }
    }, 1000)

    // Initial tick — also handles the case where app was closed and level already expired
    const initElapsed = Date.now() - table.levelStartTime
    const initRem = Math.max(0, totalMs - initElapsed)
    setRemaining(initRem)
    if (initRem === 0 && !fired) {
      fired = true
      clearInterval(id)
      dispatch({ type: 'BLINDS_UP_PENDING' })
    }

    return () => clearInterval(id)
  }, [table?.levelStartTime, table?.levelDurationMinutes, table?.blindsUpPending])

  if (!table?.gameStarted || !table?.levelDurationMinutes) return null

  const level = table.currentLevel ?? 1
  const [nextSB, nextBB] = getNextMTTBlinds(table.bigBlind)

  if (table.blindsUpPending) {
    return (
      <div className="blind-timer-bar blind-timer-bar--pending">
        Level {level} complete — Blinds will increase on the next hand ({nextSB}/{nextBB})
      </div>
    )
  }

  if (!table.levelStartTime || remaining === null) return null

  const totalSeconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const isWarning = remaining < 60000

  return (
    <div className={`blind-timer-bar${isWarning ? ' blind-timer-bar--warning' : ''}`}>
      Level {level} · {minutes}:{String(seconds).padStart(2, '0')} ({table.smallBlind}/{table.bigBlind})
    </div>
  )
}
