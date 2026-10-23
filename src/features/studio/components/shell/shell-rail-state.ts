/**
 * SPIKE (task 174): the shell rail's shared state. Every tool gets its own rail (Studio remounts the
 * active tool's layout), so the compact choice and the link to focus after a tool change live
 * outside React and each rail subscribes.
 */

const STORAGE_KEY = 'currawong:studio:rail'

type RailChoice = 'compact' | 'expanded' | null

let choice: RailChoice | undefined
const listeners = new Set<() => void>()

function read(): RailChoice {
  if (choice !== undefined) return choice
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    choice = stored === 'compact' || stored === 'expanded' ? stored : null
  } catch {
    choice = null
  }
  return choice
}

export function subscribeRail(notify: () => void): () => void {
  listeners.add(notify)
  return () => {
    listeners.delete(notify)
  }
}

/** The editor's saved choice, or null to follow the screen width. */
export const readRailChoice = read

export function writeRailChoice(next: 'compact' | 'expanded'): void {
  choice = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // The choice then lasts until the page reloads.
  }
  for (const notify of listeners) notify()
}

/** The rail link the editor just used, so the next tool's rail can take focus back. */
let pendingFocus: string | null = null

export function requestFocusAfterNavigation(key: string): void {
  pendingFocus = key
}

export function takePendingFocus(key: string): boolean {
  if (pendingFocus !== key) return false
  pendingFocus = null
  return true
}
