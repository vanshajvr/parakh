/** The how-to-play tour opens by itself on a player's first game, and from "How to play" after that. */
const TOUR_KEY = 'parakh.tour.v1'

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === 'done'
  } catch {
    return true
  }
}

export function markTourSeen() {
  try {
    localStorage.setItem(TOUR_KEY, 'done')
  } catch {
    // Without storage the tour may show again next visit, which is harmless.
  }
}
