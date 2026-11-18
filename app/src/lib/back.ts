import type { NavigateFunction } from 'react-router-dom'

/** Go back if there's an in-app page to go back to; otherwise to a sensible place (e.g. opened from a link). */
export function goBack(nav: NavigateFunction, fallback = '/') {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
  if (idx > 0) nav(-1)
  else nav(fallback, { replace: true })
}
