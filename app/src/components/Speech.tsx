import { useEffect, useRef, useState } from 'react'
import { blip } from '../lib/chatter'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** How long to wait after a character before the next one: a beat at commas, a breath at full stops. */
function pause(ch: string) {
  if ('.!?'.includes(ch)) return 260
  if (',;:'.includes(ch)) return 140
  if (ch === '—') return 180
  return 28
}

/**
 * Words that type themselves out with the mascot's babble. The whole text is laid out from the start (the
 * untyped part is just invisible), so nothing jumps around while it types. Tap to finish at once.
 */
export function Speech({ text, delay = 250, onTalking, className = '' }: { text: string; delay?: number; onTalking?: (talking: boolean) => void; className?: string }) {
  const [shown, setShown] = useState(() => (reduced() ? text.length : 0))
  const timer = useRef<number | undefined>(undefined)
  const talking = useRef(false)
  const setTalking = (v: boolean) => {
    if (talking.current !== v) {
      talking.current = v
      onTalking?.(v)
    }
  }

  useEffect(() => {
    if (reduced()) return setShown(text.length)
    let i = 0
    setShown(0)
    const step = () => {
      if (i >= text.length) return setTalking(false)
      const ch = text[i]
      i++
      setShown(i)
      // a blip on every other letter keeps it lively without getting shrill
      if (/[a-z0-9]/i.test(ch) && i % 2 === 1) blip(ch)
      setTalking(true)
      timer.current = window.setTimeout(step, pause(ch))
    }
    timer.current = window.setTimeout(step, delay)
    return () => {
      window.clearTimeout(timer.current)
      setTalking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay])

  const finish = () => {
    window.clearTimeout(timer.current)
    setShown(text.length)
    setTalking(false)
  }

  return (
    <p className={`speech ${className}`} onClick={finish}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        <span className="speech-rest">{text.slice(shown)}</span>
      </span>
    </p>
  )
}
