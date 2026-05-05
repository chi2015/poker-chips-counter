# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

No test runner or linter is configured.

## Architecture

React + Vite SPA. No backend — fully client-side with localStorage persistence (`poker_chips_counter_state`).

**Navigation** is screen-based (not a router library). `App.jsx` renders one screen at a time based on `currentScreen` in global state: `home` → `tableSetup` → `playerSetup` → `game`.

**State management** lives entirely in [src/store/gameStore.jsx](src/store/gameStore.jsx) — a single React Context + `useReducer`. All game mutations go through dispatched actions (e.g. `PLAYER_BET`, `NEXT_STAGE`, `AWARD_POT`). Components call `useGame()` to access state and dispatch.

**State shape:**
```js
{
  tables: Table[],        // persisted across sessions
  currentTableId: string,
  currentScreen: string
}
```

**Table shape (key fields):**
- `players[]` — each has `chips`, `currentBet`, `totalBet`, `status` (`'active'|'folded'|'all-in'`), `isDealer`, `isActive`, `hasActed`
- `stage` — `'preflop'|'flop'|'turn'|'river'`
- `pot`, `currentBet`, `pots[]` — betting state; `pots` holds side pots for all-in scenarios
- `showWinner`, `gameStarted`, `roundComplete` — game lifecycle flags

**Pot calculation** is in [src/utils/potCalculator.js](src/utils/potCalculator.js). It builds main pot + side pots from players' `totalBet` values and their eligibility. Side pot logic is the most complex part of the codebase.

**Betting round completion** is determined inside the reducer: a round is complete when all active (non-folded, non-all-in) players have `hasActed === true` and `currentBet` matches the table's `currentBet`.

**Blind posting** happens at game start: the reducer finds dealer position and auto-posts small/big blind amounts, deducting from the relevant players' chip counts.
