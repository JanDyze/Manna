import { useEffect, useRef, useState, type ReactNode } from 'react'

const HOLD_MS = 430
const SLOP = 9

/**
 * A list row that behaves like a phone app's: tap to open, press and hold to pick it (and start picking more).
 * It's a button, not a link, so holding never brings up the browser's "open in new tab" menu.
 * Right-click does what holding does, for a mouse.
 */
export function HoldRow({
  onTap,
  onHold,
  picked,
  picking,
  label,
  children,
}: {
  onTap: () => void
  onHold: () => void
  picked: boolean
  picking: boolean
  label: string
  children: ReactNode
}) {
  const timer = useRef(0)
  const from = useRef<{ x: number; y: number } | null>(null)
  const held = useRef(false)
  const [pressing, setPressing] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function cancel() {
    window.clearTimeout(timer.current)
    from.current = null
    setPressing(false)
  }

  return (
    <button
      type="button"
      className={`item hold-row${pressing ? ' is-pressing' : ''}${picked ? ' is-picked' : ''}`}
      aria-pressed={picking ? picked : undefined}
      aria-label={picking ? `${picked ? 'Unpick' : 'Pick'} ${label}` : undefined}
      onPointerDown={(e) => {
        held.current = false
        if (e.pointerType === 'mouse' && e.button !== 0) return
        from.current = { x: e.clientX, y: e.clientY }
        setPressing(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          held.current = true
          setPressing(false)
          from.current = null
          navigator.vibrate?.(14)
          onHold()
        }, HOLD_MS)
      }}
      onPointerMove={(e) => {
        const f = from.current
        if (f && Math.hypot(e.clientX - f.x, e.clientY - f.y) > SLOP) cancel()
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => {
        e.preventDefault()
        // a long touch fires this too, after our own timer already picked the row
        if (held.current) return
        cancel()
        held.current = true
        onHold()
      }}
      onClick={() => {
        if (held.current) {
          held.current = false
          return
        }
        onTap()
      }}
    >
      {children}
    </button>
  )
}
