import { useState, type CSSProperties } from 'react'

/*
 * Hiding and showing amounts, the Manna way: when you hide them, little flakes of manna fall and settle
 * over the numbers (with one gold star twinkling on top). When you show them again the flakes lift off
 * like the morning dew (Exodus 16:14) and the digits rise back up one by one with a gold glint.
 * The first render is always still; the animation only plays once the state actually changes.
 */

const TILT = [-12, 18, -6, 24, -18, 8]
const SIZE = [1, 0.82, 0.95, 0.78, 1.05, 0.88]
const DRIFT = [-0.3, 0.25, -0.15, 0.35, -0.25, 0.2]

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** Keeps the first value and reports true once it has changed, so mounting never animates. */
function useLive(value: boolean) {
  const [first] = useState(value)
  const [live, setLive] = useState(false)
  if (!live && value !== first) setLive(true)
  return live
}

/**
 * A peso amount that can be veiled. `text` is what peso() returns (e.g. "−₱1,250.50"); `delay` (ms) lets
 * several amounts ripple one after another; `flakes` is how many flakes cover it (the count never depends
 * on the amount, so the veil gives nothing away).
 */
export function Secret({ hidden, text, flakes = 6, delay = 0, centsClass = 'cents' }: { hidden: boolean; text: string; flakes?: number; delay?: number; centsClass?: string }) {
  const live = useLive(hidden)
  const at = text.indexOf('₱')
  const sign = at > 0 ? text.slice(0, at) : ''
  const body = at >= 0 ? text.slice(at + 1) : text
  const dot = body.indexOf('.')
  return (
    <span className={`secret${live ? ' is-live' : ''}`} data-hidden={hidden} style={{ '--d': `${delay}ms` } as Vars}>
      {sign && (
        <span className="secret-ch secret-sign" style={{ '--i': 0 } as Vars} aria-hidden={hidden || undefined}>
          {sign}
        </span>
      )}
      {at >= 0 && '₱'}
      <span className="secret-body">
        <span aria-hidden={hidden || undefined}>
          {[...body].map((c, i) => (
            <span key={i} className={dot >= 0 && i >= dot ? `secret-ch ${centsClass}` : 'secret-ch'} style={{ '--i': i } as Vars}>
              {c}
            </span>
          ))}
        </span>
        <span className="secret-veil" aria-hidden="true">
          {Array.from({ length: flakes }, (_, i) =>
            i === flakes - 1 ? (
              <svg key={i} className="flake flake-star" viewBox="0 0 24 24" style={{ '--i': i, '--x': `${DRIFT[i % 6]}em` } as Vars}>
                <path d="M12 1Q13.3 10.7 23 12Q13.3 13.3 12 23Q10.7 13.3 1 12Q10.7 10.7 12 1Z" />
              </svg>
            ) : (
              <span key={i} className="flake" style={{ '--i': i, '--r': `${TILT[i % 6]}deg`, '--s': SIZE[i % 6], '--x': `${DRIFT[i % 6]}em` } as Vars} />
            ),
          )}
        </span>
      </span>
      {hidden && <span className="sr-only">hidden</span>}
    </span>
  )
}

/** The eye that hides amounts: it closes (lashes and all) to hide, and opens with a quick glance to show. */
export function EyeToggle({ hidden, onToggle, className }: { hidden: boolean; onToggle: () => void; className?: string }) {
  const [glances, setGlances] = useState(0)
  return (
    <button
      type="button"
      className={`eye-toggle${className ? ` ${className}` : ''}`}
      data-hidden={hidden}
      onClick={() => {
        setGlances((n) => n + 1)
        try {
          navigator.vibrate?.(8)
        } catch {
          /* no haptics here */
        }
        onToggle()
      }}
      aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
      aria-pressed={hidden}
    >
      <svg className="ic eye-ic" width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
        <g className="eye-open">
          <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle key={glances} className={glances ? 'eye-pupil is-glancing' : 'eye-pupil'} cx="12" cy="12" r="2.9" />
        </g>
        <g className="eye-shut">
          <path d="M3 10.5c2.6 3.6 5.6 5.4 9 5.4s6.4-1.8 9-5.4" />
          <path d="M12 16v2.6M7.2 14.6l-1.3 2.1M16.8 14.6l1.3 2.1M3.9 12.4l-1.7 1.4M20.1 12.4l1.7 1.4" />
        </g>
      </svg>
    </button>
  )
}
