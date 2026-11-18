import { useEffect, useId, useMemo, useRef } from 'react'
import raw from '../assets/manna-mascot.svg?raw'

export type MascotAction = 'idle' | 'wave' | 'happy' | 'cheer' | 'give' | 'alert' | 'think' | 'worry' | 'nod' | 'sleep'

/**
 * Gestures play once and then the mascot settles back into idle; how long one take lasts, in ms.
 * States (idle, think, worry, sleep) are calm enough to keep going.
 */
const GESTURE_MS: Partial<Record<MascotAction, number>> = {
  wave: 2400,
  happy: 1800,
  cheer: 2200,
  give: 2200,
  alert: 2400,
  nod: 1600,
}

type Props = {
  action?: MascotAction
  size?: number
  label?: string
  className?: string
  /** replay a gesture now and then, roughly every this many ms (with some randomness); off by default */
  repeatEvery?: number
}

/**
 * The mascot, inlined so `action` can switch what it does (the SVG's own CSS does the animating).
 * Each instance gets its own clip-path ids so several can share a page.
 */
export function Mascot({ action = 'idle', size = 120, label = 'KATY', className, repeatEvery }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ref = useRef<HTMLSpanElement>(null)
  const html = useMemo(
    () =>
      raw
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/id="mm-/g, `id="m${uid}-`)
        .replace(/url\(#mm-/g, `url(#m${uid}-`)
        .replace(/width="230" height="230"/, `width="${size}" height="${size}"`)
        .replace(/aria-label="Manna mascot"/, `aria-label="${label}"`),
    [uid, size, label],
  )

  useEffect(() => {
    const svg = ref.current?.querySelector('svg')
    if (!svg) return
    const take = GESTURE_MS[action]
    if (!take) {
      svg.setAttribute('data-action', action)
      return
    }
    let timer = 0
    const play = () => {
      svg.setAttribute('data-action', action)
      timer = window.setTimeout(() => {
        svg.setAttribute('data-action', 'idle')
        if (repeatEvery) timer = window.setTimeout(play, repeatEvery * (0.75 + Math.random() * 0.5))
      }, take)
    }
    play()
    return () => window.clearTimeout(timer)
  }, [action, html, repeatEvery])

  return <span ref={ref} className={`mascot ${className ?? ''}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: html }} />
}
