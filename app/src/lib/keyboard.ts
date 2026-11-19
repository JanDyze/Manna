// The on-screen keyboard: whatever you're typing in stays above it, in a drawer or on a full page.
//
// Phones put the keyboard over the bottom of the screen without moving things pinned there, so a drawer's
// lower fields end up under it. This measures how much of the screen the keyboard takes (from the visual
// viewport) and publishes it as CSS variables:
//   --kb   how far the keyboard reaches up from the bottom; drawers sit on top of it
//   --vvh  the height still visible; drawers shrink to fit it
// and, while a text field has focus, puts html.is-typing on so the tab bar can step aside.
// Then it scrolls the focused field into the part of the screen you can still see.

const NOT_TYPED = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden'])

function isField(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement) return !NOT_TYPED.has(el.type)
  return el instanceof HTMLTextAreaElement || el.isContentEditable
}

/** The nearest box that scrolls this element: a drawer, Activity's list, or the page itself. */
function scrollerOf(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p)
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement
}

const GAP = 16

export function watchKeyboard() {
  const vv = window.visualViewport
  const root = document.documentElement
  let timer = 0

  function measure() {
    if (!vv) return
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    root.style.setProperty('--kb', `${kb}px`)
    root.style.setProperty('--vvh', `${Math.round(vv.height)}px`)
  }

  /** Bring the focused field into the visible band, keeping its top in view if it's taller than the band. */
  function reveal() {
    const el = document.activeElement
    if (!isField(el)) return
    const top = (vv?.offsetTop ?? 0) + GAP
    const bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - GAP
    const r = el.getBoundingClientRect()
    let dy = 0
    if (r.bottom > bottom) dy = Math.min(r.bottom - bottom, r.top - top)
    else if (r.top < top) dy = r.top - top
    if (Math.abs(dy) < 2) return
    scrollerOf(el).scrollBy({ top: dy, behavior: 'smooth' })
  }

  function later() {
    window.clearTimeout(timer)
    // the keyboard slides in over about a quarter second; look again once it has settled
    timer = window.setTimeout(() => {
      measure()
      reveal()
    }, 320)
  }

  vv?.addEventListener('resize', () => {
    measure()
    later()
  })
  vv?.addEventListener('scroll', measure)

  document.addEventListener('focusin', (e) => {
    if (!isField(e.target as Element)) return
    root.classList.add('is-typing')
    later()
  })
  document.addEventListener('focusout', () => {
    // moving from one field to the next keeps typing on
    window.setTimeout(() => {
      if (!isField(document.activeElement)) root.classList.remove('is-typing')
    }, 0)
  })

  measure()
}
