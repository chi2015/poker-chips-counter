/**
 * Calculate main pot and side pots when players are all-in with different amounts.
 * Returns array of { amount, eligiblePlayers[] } sorted from main pot to side pots.
 *
 * @param {Array} players - Array of player objects with { id, name, totalBet, status }
 * @returns {Array} - Array of pot objects { amount, eligiblePlayers }
 */
export function calculatePots(players) {
  // Only consider players who have put chips in the pot
  const contributors = players.filter(p => p.totalBet > 0)
  if (contributors.length === 0) return [{ amount: 0, eligiblePlayers: [] }]

  // Get unique bet levels sorted ascending
  const betLevels = [...new Set(contributors.map(p => p.totalBet))].sort((a, b) => a - b)

  const pots = []
  let previousLevel = 0

  for (const level of betLevels) {
    const increment = level - previousLevel
    if (increment <= 0) continue

    // Players eligible: those who contributed at least up to this level
    const eligiblePlayers = contributors
      .filter(p => p.totalBet >= level && p.status !== 'folded')
      .map(p => p.id)

    // Amount in this pot tier = increment * number of players who contributed at this level
    const numContributors = contributors.filter(p => p.totalBet >= level).length
    const potAmount = increment * numContributors

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayers,
      })
    }

    previousLevel = level
  }

  // If no pots were created but there are contributors, make a single pot
  if (pots.length === 0) {
    const totalAmount = contributors.reduce((sum, p) => sum + p.totalBet, 0)
    const eligiblePlayers = contributors
      .filter(p => p.status !== 'folded')
      .map(p => p.id)
    return [{ amount: totalAmount, eligiblePlayers }]
  }

  return pots
}

/**
 * Merge pots that have the same eligible players set.
 * @param {Array} pots
 * @returns {Array}
 */
export function mergePots(pots) {
  const merged = []

  for (const pot of pots) {
    const key = [...pot.eligiblePlayers].sort().join(',')
    const existing = merged.find(p => [...p.eligiblePlayers].sort().join(',') === key)
    if (existing) {
      existing.amount += pot.amount
    } else {
      merged.push({ ...pot, eligiblePlayers: [...pot.eligiblePlayers] })
    }
  }

  return merged
}

/**
 * Get total pot amount from pots array.
 * @param {Array} pots
 * @returns {number}
 */
export function getTotalPot(pots) {
  return pots.reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Check if there are side pots (more than one pot).
 * @param {Array} pots
 * @returns {boolean}
 */
export function hasSidePots(pots) {
  return pots.length > 1
}
