// KATY's "voice": soft kalimba notes while her words type out, made on the fly with Web Audio
// (no sound files). Like a character in a game, she makes music rather than speech.
//
// Browsers only allow sound after the person taps something, so the first tap anywhere unlocks it.
// The choice to mute is remembered on this device.

const KEY = 'manna.sound'
let ctx: AudioContext | null = null
let out: GainNode | null = null

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* private mode: the toggle still works for this visit */
  }
  listeners.forEach((f) => f(on))
  if (on) unlock()
}

const listeners = new Set<(on: boolean) => void>()
export function onSoundChange(f: (on: boolean) => void) {
  listeners.add(f)
  return () => void listeners.delete(f)
}

/** Create or wake the audio engine; only works inside a tap. */
export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC()
      out = ctx.createGain()
      out.gain.value = 0.9
      // round off the edges so the blips sound soft, not beepy
      const soften = ctx.createBiquadFilter()
      soften.type = 'lowpass'
      soften.frequency.value = 5200
      out.connect(soften).connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

// the first tap anywhere in the app unlocks sound
if (typeof window !== 'undefined') {
  const first = () => {
    unlock()
    window.removeEventListener('pointerdown', first)
    window.removeEventListener('keydown', first)
  }
  window.addEventListener('pointerdown', first)
  window.addEventListener('keydown', first)
}

// a gentle five-note scale: whatever she says comes out as a little tune that never sounds wrong
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16]

/** One plucked kalimba note for one letter; the same letter always lands on the same note. */
export function blip(ch: string, voice = 1) {
  if (!ctx || !out || ctx.state !== 'running' || !soundOn()) return
  const t = ctx.currentTime
  const step = PENTA[((ch.toLowerCase().charCodeAt(0) * 7) % 13) % PENTA.length]
  const f = 523 * voice * Math.pow(2, step / 12)
  pluck(f, t, 0.2, 0.22)
  pluck(f * 2.01, t, 0.05, 0.08) // a faint overtone gives the metal-tine ring
}

function pluck(f: number, t: number, peak: number, decay: number) {
  const osc = ctx!.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f, t)
  const g = ctx!.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.003 + decay)
  osc.connect(g).connect(out!)
  osc.start(t)
  osc.stop(t + decay + 0.03)
}
