/**
 * The add button opens into New entry: where the browser has View Transitions, the page grows out of the
 * button as a widening circle and, on close, shrinks back into it. Elsewhere the page simply rises in.
 */
let settle: (() => void) | null = null
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function morph(dir: 'open' | 'close', go: () => void, from?: Element | null) {
  const root = document.documentElement
  if (from) {
    const r = from.getBoundingClientRect()
    root.style.setProperty('--add-x', `${Math.round(r.left + r.width / 2)}px`)
    root.style.setProperty('--add-y', `${Math.round(r.top + r.height / 2)}px`)
  }
  if (typeof document.startViewTransition !== 'function' || reduced()) return go()
  const cls = `vt-add-${dir}`
  root.classList.add(cls)
  const vt = document.startViewTransition(
    () =>
      new Promise<void>((done) => {
        settle = done
        go()
        window.setTimeout(done, 400) // never hold the screen if the page doesn't report in
      }),
  )
  vt.ready.catch(() => {})
  vt.finished.finally(() => root.classList.remove(cls))
}

/** The destination page has rendered: let the transition run. */
export function settled() {
  settle?.()
  settle = null
}

/** True while the add page is opening out of the button (so it skips its own entrance). */
export const morphing = () => document.documentElement.classList.contains('vt-add-open')
