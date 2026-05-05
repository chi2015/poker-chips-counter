const STORAGE_KEY = 'poker_chips_counter_state'

export function saveState(state) {
  try {
    const serialized = JSON.stringify(state)
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch (err) {
    console.error('Failed to save state to localStorage:', err)
  }
}

export function loadState() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY)
    if (!serialized) return undefined
    return JSON.parse(serialized)
  } catch (err) {
    console.error('Failed to load state from localStorage:', err)
    return undefined
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear state from localStorage:', err)
  }
}
