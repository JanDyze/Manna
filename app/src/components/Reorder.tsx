import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { Glyph } from './Glyph'

type Props<T extends { id: string }> = {
  items: T[]
  /** the row's content; the grip is added after it */
  render: (item: T) => ReactNode
  /** read out on the grip: "Move <label>" */
  label: (item: T) => string
  /** the new order, top first, after a drop or an arrow-key move */
  onReorder: (ids: string[]) => void
}

type Drag = { id: string; from: number; to: number; dy: number }

/**
 * A list you rearrange by dragging each row's grip (touch, pen or mouse), or with the arrow keys on a focused grip.
 * Rows stay where they were dropped while the save catches up; a new set of rows starts over from `items`.
 */
export function Reorder<T extends { id: string }>({ items, render, label, onReorder }: Props<T>) {
  const ids = items.map((i) => i.id)
  const setKey = [...ids].sort().join()
  const [order, setOrder] = useState(ids)
  const [seen, setSeen] = useState(setKey)
  if (seen !== setKey) {
    setSeen(setKey)
    setOrder(ids)
  }

  const [drag, setDrag] = useState<Drag | null>(null)
  const rows = useRef(new Map<string, HTMLLIElement>())
  const grips = useRef(new Map<string, HTMLButtonElement>())
  const start = useRef<{ y: number; mids: number[]; h: number } | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  // keep the keyboard on the grip that just moved
  useEffect(() => {
    if (focusId) grips.current.get(focusId)?.focus()
  }, [order, focusId])

  const byId = new Map(items.map((i) => [i.id, i]))

  function move(from: number, to: number) {
    if (from === to) return
    const next = [...order]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    setOrder(next)
    onReorder(next)
  }

  function down(e: PointerEvent<HTMLButtonElement>, id: string, i: number) {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rects = order.map((x) => rows.current.get(x)!.getBoundingClientRect())
    start.current = { y: e.clientY, mids: rects.map((r) => r.top + r.height / 2), h: rects[i].height }
    setDrag({ id, from: i, to: i, dy: 0 })
    navigator.vibrate?.(8)
  }

  function moveTo(e: PointerEvent<HTMLButtonElement>) {
    const s = start.current
    if (!drag || !s) return
    const dy = e.clientY - s.y
    const center = s.mids[drag.from] + dy
    let to = drag.from
    for (let j = drag.from + 1; j < s.mids.length; j++) if (center > s.mids[j]) to = j
    for (let j = drag.from - 1; j >= 0; j--) if (center < s.mids[j]) to = j
    setDrag({ ...drag, to, dy })
  }

  function up() {
    if (drag) move(drag.from, drag.to)
    setDrag(null)
    start.current = null
  }

  function key(e: KeyboardEvent<HTMLButtonElement>, id: string, i: number) {
    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : -1
    if (to < 0 || to >= order.length) return
    e.preventDefault()
    setFocusId(id)
    move(i, to)
  }

  function shift(j: number): number {
    if (!drag || !start.current) return 0
    if (j === drag.from) return drag.dy
    if (drag.from < j && j <= drag.to) return -start.current.h
    if (drag.to <= j && j < drag.from) return start.current.h
    return 0
  }

  return (
    <ul className={`card flush list reorder${drag ? ' is-dragging' : ''}`} style={{ marginTop: 6 }}>
      {order.map((id, j) => {
        const it = byId.get(id)
        if (!it) return null
        const dy = shift(j)
        return (
          <li
            key={id}
            ref={(el) => {
              if (el) rows.current.set(id, el)
              else rows.current.delete(id)
            }}
            className={drag?.id === id ? 'lifted' : undefined}
            style={dy ? { transform: `translateY(${dy}px)` } : undefined}
          >
            <div className="item">
              {render(it)}
              <button
                type="button"
                className="grip"
                aria-label={`Move ${label(it)}. Use the up and down arrow keys.`}
                ref={(el) => {
                  if (el) grips.current.set(id, el)
                  else grips.current.delete(id)
                }}
                onPointerDown={(e) => down(e, id, j)}
                onPointerMove={moveTo}
                onPointerUp={up}
                onPointerCancel={up}
                onKeyDown={(e) => key(e, id, j)}
                onBlur={() => setFocusId(null)}
              >
                <Glyph name="grip" size={20} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
