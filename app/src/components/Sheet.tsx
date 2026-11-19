import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent as RPointerEvent, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'

export type SheetHandle = { /** slide the sheet away, then call onClose */ close: () => void }

type Props = {
  /** shown as the sheet's heading, and its name for screen readers */
  title?: string
  /** the name for screen readers when there's no title */
  label?: string
  /** a header of its own in place of the plain title; it stays put while the body scrolls */
  head?: ReactNode
  /** pinned under the body, e.g. a message box or the main buttons */
  foot?: ReactNode
  className?: string
  bodyProps?: HTMLAttributes<HTMLDivElement>
  /** what gets focus on opening: the first field or button in it (default), or the sheet itself */
  focus?: 'field' | 'sheet'
  onClose: () => void
  ref?: Ref<SheetHandle>
  children?: ReactNode
}

const SLOP = 6 // px a finger moves before a press on the top becomes a drag
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A bottom sheet (drawer). The top (grip and heading) stays put and only the body scrolls.
 * Drag the top up for full screen, down to bring it back to size, and further down to put it away.
 * Tapping the grip toggles full screen. Escape or a tap outside closes it.
 */
export function Sheet({ title, label, head, foot, className, bodyProps, focus = 'field', onClose, ref, children }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // height only animates while snapping between sizes, so the keyboard coming up doesn't make it lag behind
  const [snapping, setSnapping] = useState(false)
  const snapTimer = useRef(0)
  function snap(toFull?: boolean) {
    setSnapping(true)
    window.clearTimeout(snapTimer.current)
    snapTimer.current = window.setTimeout(() => setSnapping(false), 340)
    if (toFull != null) setFull(toFull)
  }
  // while dragging: how far down (dy > 0) it has moved, or how tall it has grown when pulled up from its own size
  const [drag, setDrag] = useState<{ dy: number; h: number; height?: number } | null>(null)
  const from = useRef<{ y: number; h: number; moved: boolean; id: number; last: { y: number; t: number }[] } | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const leavingRef = useRef(false)
  const dragged = useRef(-Infinity) // when the last drag ended, so its stray click doesn't also toggle full screen

  function close() {
    if (leavingRef.current) return
    leavingRef.current = true
    if (reduced()) return closeRef.current()
    setLeaving(true)
    window.setTimeout(() => closeRef.current(), 220)
  }
  useImperativeHandle(ref, () => ({ close }))

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', key)
    const el = box.current
    if (focus === 'sheet') el?.focus({ preventScroll: true })
    else el?.querySelector<HTMLElement>('.sheet-body input, .sheet-body select, .sheet-body textarea, .sheet-body button, .sheet-foot input, .sheet-foot button')?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', key)
      prev?.focus?.({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- dragging the top ----
  function down(e: RPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !box.current) return
    // the fields and buttons in a header keep working as they are
    if ((e.target as Element).closest('input, select, textarea, a, button:not(.sheet-grip)')) return
    from.current = { y: e.clientY, h: box.current.getBoundingClientRect().height, moved: false, id: e.pointerId, last: [{ y: e.clientY, t: e.timeStamp }] }
    // follow the pointer wherever it goes (a mouse soon leaves the top); a plain tap still reaches the grip's click
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return
      stop()
      up(ev)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }
  function move(e: PointerEvent) {
    const f = from.current
    if (!f || e.pointerId !== f.id) return
    const dy = e.clientY - f.y
    if (!f.moved) {
      if (Math.abs(dy) < SLOP) return
      f.moved = true
    }
    f.last = [...f.last.slice(-4), { y: e.clientY, t: e.timeStamp }]
    if (dy >= 0) setDrag({ dy, h: f.h })
    else if (!full) setDrag({ dy: 0, h: f.h, height: Math.min(fullHeight(), f.h - dy) })
    else setDrag({ dy: 0, h: f.h })
  }
  function up(e: PointerEvent) {
    const f = from.current
    if (!f || e.pointerId !== f.id) return
    from.current = null
    if (!f.moved) return // a plain tap: the grip's own click handles it
    dragged.current = e.timeStamp
    const dy = e.clientY - f.y
    const a = f.last[0]
    const b = f.last[f.last.length - 1]
    const v = b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0 // px per ms, + is down
    setDrag(null)
    if (dy < 0) {
      // pulled up: full screen once it's gone a little way, or with a flick; otherwise back to its size
      snap(full || -dy > 60 || v < -0.4)
      return
    }
    if (full) {
      // from full screen: a long pull or a hard flick puts it away, a shorter one brings it back to size
      if (dy > f.h * 0.6 || (v > 1.4 && dy > 120)) close()
      else snap(!(dy > 60 || v > 0.4))
      return
    }
    if (dy > Math.min(140, f.h * 0.3) || v > 0.6) close()
    else snap()
  }
  useEffect(() => () => window.clearTimeout(snapTimer.current), [])

  const style: CSSProperties | undefined = drag
    ? { transform: `translate(-50%, ${drag.dy}px)`, ...(drag.height ? { height: drag.height, maxHeight: 'none' } : {}) }
    : undefined
  const fade = drag && drag.dy > 0 ? Math.max(0.2, 1 - drag.dy / (drag.h || 1)) : undefined

  return createPortal(
    <>
      <div className={`sheet-backdrop${leaving ? ' is-leaving' : ''}`} style={fade != null ? { opacity: fade } : undefined} onClick={close} />
      <div
        ref={box}
        tabIndex={-1}
        className={`sheet${className ? ` ${className}` : ''}${full ? ' is-full' : ''}${snapping ? ' is-snapping' : ''}${drag ? ' is-dragging' : ''}${leaving ? ' is-leaving' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? label}
        style={style}
      >
        <div className="sheet-top" onPointerDown={down}>
          <button type="button" className="sheet-grip" aria-label={full ? 'Shrink' : 'Full screen'} onClick={(e) => e.timeStamp - dragged.current > 300 && snap(!full)} />
          {head ?? (title && <h2>{title}</h2>)}
        </div>
        <div {...bodyProps} className={`sheet-body${bodyProps?.className ? ` ${bodyProps.className}` : ''}`}>
          {children}
        </div>
        {foot && <div className="sheet-foot">{foot}</div>}
      </div>
    </>,
    document.body,
  )
}

/** the most a sheet can be: everything above the keyboard */
function fullHeight() {
  return window.visualViewport?.height ?? window.innerHeight
}
