// Swiping sideways through tabs and steps, like a phone app: swipe left for the next one, right to go back.
import { useRef, type TouchEvent } from 'react'

const MIN_PX = 56 // how far the finger must travel sideways
const SLANT = 1.6 // and how much more sideways than up or down
const MAX_MS = 700 // a slow drag is reading or scrolling, not a swipe
const EDGE_PX = 22 // the screen's edges belong to the phone's own back gesture

// the innermost swipe area claims a touch, so a picker inside a page doesn't also turn the page
const claimed = new WeakSet<Event>()

/** Places a swipe shouldn't start: fields, things that scroll sideways themselves, a drawer over this area. */
function blocked(target: Element, area: Element): boolean {
  if (target.closest('input, textarea, select, [contenteditable="true"], [data-noswipe]')) return true
  if (target.closest('.sheet') !== area.closest('.sheet')) return true
  for (let el: Element | null = target; el && el !== area; el = el.parentElement) {
    const { overflowX } = getComputedStyle(el)
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true
  }
  return false
}

/**
 * Touch handlers to spread on the element that should answer swipes. Either side can be left out (or the
 * whole thing turned off) where there is nowhere to go.
 */
export function useSwipe(onNext?: () => void, onPrev?: () => void, enabled = true) {
  const from = useRef<{ x: number; y: number; t: number } | null>(null)
  return {
    onTouchStart(e: TouchEvent<HTMLElement>) {
      from.current = null
      if (!enabled || e.touches.length !== 1 || claimed.has(e.nativeEvent)) return
      const t = e.touches[0]
      if (t.clientX < EDGE_PX || t.clientX > window.innerWidth - EDGE_PX) return
      if (blocked(e.target as Element, e.currentTarget)) return
      claimed.add(e.nativeEvent)
      from.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    },
    onTouchEnd(e: TouchEvent<HTMLElement>) {
      const f = from.current
      from.current = null
      if (!f) return
      const t = e.changedTouches[0]
      const dx = t.clientX - f.x
      const dy = t.clientY - f.y
      if (Date.now() - f.t > MAX_MS || Math.abs(dx) < MIN_PX || Math.abs(dx) < Math.abs(dy) * SLANT) return
      if (window.getSelection()?.toString()) return
      if (dx < 0) onNext?.()
      else onPrev?.()
    },
    onTouchCancel() {
      from.current = null
    },
  }
}
