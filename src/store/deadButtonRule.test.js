/**
 * Dead Button Rule unit tests.
 * Run with: npx vitest run src/store/deadButtonRule.test.js
 * (add vitest as dev dep: npm i -D vitest)
 *
 * Alternatively run as a plain Node script:
 *   node --input-type=module < src/store/deadButtonRule.test.js
 * (The function is reimplemented inline below to avoid React import overhead.)
 */

// ─── Inline copy of computeMTTNextHandRoles (no React deps) ──────────────────
// Keep in sync with src/store/gameStore.jsx
function computeMTTNextHandRoles(allPlayers, eligiblePlayers) {
  const N = allPlayers.length

  function nextActiveSeat(fromIdx) {
    for (let i = 1; i <= N; i++) {
      const idx = (fromIdx + i) % N
      if (allPlayers[idx].chips > 0) return idx
    }
    return -1
  }

  function toEligIdx(allIdx) {
    return eligiblePlayers.findIndex(p => p.id === allPlayers[allIdx].id)
  }

  const prevBBAllIdx = allPlayers.findIndex(p => p.isBigBlind)
  const effectivePrevBBIdx = prevBBAllIdx !== -1 ? prevBBAllIdx : N - 1

  const newBBAllIdx = nextActiveSeat(effectivePrevBBIdx)
  if (newBBAllIdx === -1) return { dealerIdx: 0, sbIdx: -1, bbIdx: 1 }

  if (eligiblePlayers.length === 2) {
    const otherAllIdx = nextActiveSeat(newBBAllIdx)
    return {
      dealerIdx: toEligIdx(otherAllIdx),
      sbIdx: toEligIdx(otherAllIdx),
      bbIdx: toEligIdx(newBBAllIdx),
    }
  }

  const newSBAllIdx = (newBBAllIdx - 1 + N) % N
  const sbIsActive = allPlayers[newSBAllIdx].chips > 0

  const newDealerAllIdx = (newSBAllIdx - 1 + N) % N
  const dealerIsActive = allPlayers[newDealerAllIdx].chips > 0

  let dealerEligIdx
  if (dealerIsActive) {
    dealerEligIdx = toEligIdx(newDealerAllIdx)
  } else {
    let found = false
    for (let i = 1; i < N; i++) {
      const checkIdx = (newDealerAllIdx - i + N) % N
      if (allPlayers[checkIdx].chips > 0) {
        dealerEligIdx = toEligIdx(checkIdx)
        found = true
        break
      }
    }
    if (!found) dealerEligIdx = toEligIdx(newBBAllIdx)
  }

  return {
    dealerIdx: dealerEligIdx,
    sbIdx: sbIsActive ? toEligIdx(newSBAllIdx) : -1,
    bbIdx: toEligIdx(newBBAllIdx),
  }
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${e.message}`)
    failed++
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected)
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new Error(`expected ${b}, got ${a}`)
    },
  }
}

/** Build a minimal player object. chips=0 means busted. */
function p(id, { chips = 1000, isDealer = false, isSmallBlind = false, isBigBlind = false } = {}) {
  return { id, chips, isDealer, isSmallBlind, isBigBlind, name: `P${id}` }
}

// ─── Scenario A: BB busts ──────────────────────────────────────────────────

console.log('\nScenario A — BB busts (4-player table, player at seat 2 was BB and busted)\n')

test('BB advances to next active seat after the busted BB seat', () => {
  // Seats: 0(D), 1(SB), 2(BB,BUSTED), 3
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true }),
    p('s2', { isBigBlind: true, chips: 0 }), // busted as BB
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0) // [s0, s1, s3]

  const result = computeMTTNextHandRoles(all, elig)

  // New BB = next active after seat 2 = seat 3 → elig index 2
  expect(result.bbIdx).toBe(elig.findIndex(p => p.id === 's3'))
})

test('SB seat is the empty seat 2 → dead SB (sbIdx = -1)', () => {
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true }),
    p('s2', { isBigBlind: true, chips: 0 }),
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // SB should be one step back from new BB (seat 3) = seat 2 (dead)
  expect(result.sbIdx).toBe(-1)
})

test('Dealer advances to seat 1 (active, one step back from dead SB seat)', () => {
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true }),
    p('s2', { isBigBlind: true, chips: 0 }),
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // Dealer = one step back from dead SB (seat 2) = seat 1 (active)
  expect(result.dealerIdx).toBe(elig.findIndex(p => p.id === 's1'))
})

// ─── Scenario B: SB busts ─────────────────────────────────────────────────

console.log('\nScenario B — SB busts (4-player table, player at seat 1 was SB and busted)\n')

test('BB advances to next active seat after seat 2', () => {
  // Seats: 0(D), 1(SB,BUSTED), 2(BB), 3
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true, chips: 0 }), // busted as SB
    p('s2', { isBigBlind: true }),
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0) // [s0, s2, s3]
  const result = computeMTTNextHandRoles(all, elig)

  // New BB = next active after seat 2 = seat 3
  expect(result.bbIdx).toBe(elig.findIndex(p => p.id === 's3'))
})

test('SB = seat 2 (active, one step back from new BB seat 3)', () => {
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true, chips: 0 }),
    p('s2', { isBigBlind: true }),
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // SB = one step back from seat 3 = seat 2 (active)
  expect(result.sbIdx).toBe(elig.findIndex(p => p.id === 's2'))
})

test('Dead button: seat 1 (busted) holds dead button, isDealer falls on last active before it', () => {
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true, chips: 0 }),
    p('s2', { isBigBlind: true }),
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // Dealer pos = one step back from SB (seat 2) = seat 1 (dead)
  // Falls back to seat 0 (nearest active counter-clockwise from seat 1)
  expect(result.dealerIdx).toBe(elig.findIndex(p => p.id === 's0'))
})

// ─── Scenario C: Multiple consecutive empty seats ─────────────────────────

console.log('\nScenario C — Two consecutive busted seats (both SB and dealer seats empty)\n')

test('BB still advances correctly past two consecutive dead seats', () => {
  // 6-player table. Seats 3 and 4 both bust.
  // Previous hand: D=1, SB=2, BB=3 (but 3 busted after the hand)
  // Then seat 4 also busted (perhaps they busted before the previous hand)
  // Current allPlayers has seats 3,4 both busted.
  const all = [
    p('s0'),
    p('s1', { isDealer: true }),
    p('s2', { isSmallBlind: true }),
    p('s3', { isBigBlind: true, chips: 0 }), // busted as BB
    p('s4', { chips: 0 }),                   // also busted
    p('s5'),
  ]
  const elig = all.filter(p => p.chips > 0) // [s0, s1, s2, s5]
  const result = computeMTTNextHandRoles(all, elig)

  // New BB = next active after seat 3 = seat 5
  expect(result.bbIdx).toBe(elig.findIndex(p => p.id === 's5'))
})

test('SB = seat 4 (dead) → sbIdx = -1', () => {
  const all = [
    p('s0'),
    p('s1', { isDealer: true }),
    p('s2', { isSmallBlind: true }),
    p('s3', { isBigBlind: true, chips: 0 }),
    p('s4', { chips: 0 }),
    p('s5'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // SB = one step back from seat 5 = seat 4 (dead)
  expect(result.sbIdx).toBe(-1)
})

test('Dealer = seat 3 (dead) → isDealer assigned to nearest active (seat 2)', () => {
  const all = [
    p('s0'),
    p('s1', { isDealer: true }),
    p('s2', { isSmallBlind: true }),
    p('s3', { isBigBlind: true, chips: 0 }),
    p('s4', { chips: 0 }),
    p('s5'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // Dealer = one step back from SB pos (seat 4) = seat 3 (dead)
  // Falls back to nearest active counter-clockwise = seat 2
  expect(result.dealerIdx).toBe(elig.findIndex(p => p.id === 's2'))
})

// ─── Return to normal rotation ─────────────────────────────────────────────

console.log('\nReturn to normal — no busted players, regular 4-player rotation\n')

test('Normal rotation: D=0→1, SB=1→2, BB=2→3', () => {
  const all = [
    p('s0', { isDealer: true }),
    p('s1', { isSmallBlind: true }),
    p('s2', { isBigBlind: true }),
    p('s3'),
  ]
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  expect(result.dealerIdx).toBe(elig.findIndex(p => p.id === 's1'))
  expect(result.sbIdx).toBe(elig.findIndex(p => p.id === 's2'))
  expect(result.bbIdx).toBe(elig.findIndex(p => p.id === 's3'))
})

test('Normal rotation wraps around: D=2, SB=3, BB=0', () => {
  const all = [
    p('s0'),
    p('s1'),
    p('s2', { isDealer: true }),
    p('s3', { isSmallBlind: true }),
    // BB was s0 in the previous hand (simulated by having s3 as SB and s0 as the wraparound BB)
  ]
  // Put isBigBlind on s0 to simulate the wrap
  all[0].isBigBlind = true
  all[3].isSmallBlind = true
  all[2].isBigBlind = false // clear accidental flag
  const elig = all.filter(p => p.chips > 0)
  const result = computeMTTNextHandRoles(all, elig)

  // New BB = next active after seat 0 = seat 1
  expect(result.bbIdx).toBe(elig.findIndex(p => p.id === 's1'))
  expect(result.sbIdx).toBe(elig.findIndex(p => p.id === 's0'))
  expect(result.dealerIdx).toBe(elig.findIndex(p => p.id === 's3'))
})

test('Heads-up: dealer/SB = player who did NOT have BB, BB = the other', () => {
  const all = [
    p('s0', { isDealer: true, isSmallBlind: true }),
    p('s1', { isBigBlind: true }),
  ]
  const elig = [...all]
  const result = computeMTTNextHandRoles(all, elig)

  // s1 had BB → now s0 gets BB; s1 gets dealer+SB
  expect(result.bbIdx).toBe(elig.findIndex(p => p.id === 's0'))
  expect(result.sbIdx).toBe(elig.findIndex(p => p.id === 's1'))
  expect(result.dealerIdx).toBe(elig.findIndex(p => p.id === 's1'))
})

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
