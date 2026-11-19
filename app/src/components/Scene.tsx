import { useEffect, useMemo, useRef, type ReactNode } from 'react'

export type Phase = 'dawn' | 'day' | 'dusk' | 'night'

export function phaseFor(hour: number): Phase {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 19.5) return 'dusk'
  return 'night'
}

// ---------- colour over the day: keyframes by hour, blended smoothly between them ----------
type Rgb = [number, number, number]
const hex = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as Rgb
const css = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`
/** relative brightness 0–1 of an rgb() string from css() */
const lum = (c: string) => {
  const [r, g, b] = c.match(/\d+/g)!.map(Number)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// sky top, middle, horizon; then far hills, near hills, sand light, sand shade
const KEYS: [number, string[]][] = [
  [0, ['#0b1324', '#14203a', '#24314f', '#1b2440', '#222c49', '#2c3654', '#232c47']],
  [4.6, ['#111b33', '#222c4c', '#3a3e5c', '#262a46', '#2d3150', '#3a3d58', '#2d3049']],
  [5.6, ['#2c3b69', '#8b6f8e', '#e8a383', '#7c6378', '#9a7680', '#d6a98c', '#b58873']],
  [6.6, ['#4d6da3', '#e6b294', '#fbdcaa', '#b58f8a', '#cfa48c', '#efd2a6', '#d7b088']],
  [8.2, ['#7db4de', '#c2e0ee', '#f6e8ca', '#c8a98c', '#dcbc94', '#f3dcb0', '#dcbb8f']],
  [12, ['#6cb0e2', '#b3dbf0', '#f2ead3', '#c9ad90', '#dfc199', '#f4e0b6', '#dfc093']],
  [16, ['#78afda', '#cde0e5', '#f6dfb4', '#c8a68a', '#dcb991', '#f2d8a9', '#d9b588']],
  [17.6, ['#5b70a7', '#e49c78', '#f8c27f', '#a77e7c', '#c2907c', '#e8bd8b', '#c79a74']],
  [18.6, ['#2f3b6b', '#9c5f7b', '#e98b65', '#6d5068', '#86606c', '#c99377', '#a37462']],
  [19.6, ['#18254a', '#2e3662', '#4b4b6f', '#2b2f4c', '#333855', '#45485f', '#363950']],
  [21, ['#0d162a', '#19253f', '#29365a', '#1d2642', '#242e4b', '#2f3956', '#262f49']],
  [24, ['#0b1324', '#14203a', '#24314f', '#1b2440', '#222c49', '#2c3654', '#232c47']],
]
function palette(hour: number): string[] {
  const h = ((hour % 24) + 24) % 24
  let i = KEYS.findIndex(([k]) => k > h)
  if (i <= 0) i = 1
  const [h0, a] = KEYS[i - 1]
  const [h1, b] = KEYS[i]
  const t = (h - h0) / (h1 - h0)
  const ease = t * t * (3 - 2 * t)
  return a.map((c, j) => css(mix(hex(c), hex(b[j]), ease)))
}

/** How much daylight: 0 at night, 1 at midday. */
function daylight(hour: number) {
  if (hour <= 5 || hour >= 20) return 0
  if (hour < 7.5) return (hour - 5) / 2.5
  if (hour > 17.5) return (20 - hour) / 2.5
  return 1
}

// ---------- the same scatter every time, so the manna doesn't jump around between visits ----------
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
}
const FLAKES = (() => {
  const r = rng(7)
  const out: { x: number; y: number; s: number; d: number }[] = []
  while (out.length < 64) {
    const x = 6 + r() * 388
    const y = 236 + r() * 52
    if (x > 40 && x < 170 && y < 276) continue // where the mascot stands
    if (x > 296 && x < 350 && y < 270) continue // the jar
    out.push({ x, y, s: 1.6 + r() * 1.6 + (y - 236) / 30, d: r() * 4 })
  }
  return out
})()
const STARS = (() => {
  const r = rng(11)
  return Array.from({ length: 34 }, () => ({ x: r() * 400, y: r() * 150, s: 0.5 + r() * 1.1, d: r() * 5 }))
})()

const STAR = 'M0 -13 Q2 -2 11 0 Q2 2 0 13 Q-2 2 -11 0 Q-2 -2 0 -13 Z'

const TENT = 'M-17 0 L-15 -10 Q-8 -14 -1 -11 Q7 -15 15 -10 L17 0 Z'
const FLAME = 'M0 0 C -11 -1 -13 -12 -7 -20 C -6 -13 -2 -14 0 -30 C 5 -19 13 -15 9 -6 C 8 -2 5 0 0 0 Z'
const SPARKS = [
  [-3, 0, 2.6, 1.1],
  [4, 0.9, 3.1, 0.9],
  [0, 1.7, 2.8, 1.2],
  [-6, 2.4, 3.4, 0.8],
  [7, 3.1, 2.5, 1],
]

/**
 * Night in the camp, close up: the sand around a fire, a tent with its door lit, and the hills dark behind.
 * It sits on the right, beside the greeting (the art is pinned to the right edge, so it stays there at any width),
 * with KATY resting on the right of the fire and the tent on its left.
 * After midnight it burns low.
 */
function Campfire({ far, near, sand, shade, low }: { far: string; near: string; sand: string; shade: string; low: boolean }) {
  return (
    // drawn at a fixed 1:1 scale, pinned to the right edge, so KATY (placed in CSS) always lands beside the fire;
    // the hills run 120 units further left to fill the widest layout
    <svg className={`campfire${low ? ' is-low' : ''}`} viewBox="-120 0 520 110" width="520" height="110" aria-hidden="true">
      <defs>
        <radialGradient id="cf-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffb357" stopOpacity=".55" />
          <stop offset=".45" stopColor="#f08a3c" stopOpacity=".16" />
          <stop offset="1" stopColor="#f08a3c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cf-pool" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffc46b" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffc46b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cf-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sand} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        {/* the fire's side of the tent catches its light */}
        <linearGradient id="cf-tentlit" x1="0" y1="0" x2="1" y2="0">
          <stop offset=".3" stopColor="#f2a04a" stopOpacity="0" />
          <stop offset="1" stopColor="#f2a04a" stopOpacity=".5" />
        </linearGradient>
      </defs>

      {/* hills behind */}
      <path d="M-120 58 C -80 52 -40 60 0 62 C 34 54 62 40 96 42 C 128 44 146 60 178 58 C 212 56 236 34 272 32 C 306 30 332 52 362 54 C 382 55 394 50 400 48 V110 H-120 Z" fill={far} />
      <path d="M-120 72 C -70 68 -30 70 0 74 C 60 64 120 66 190 70 S 330 66 400 62 V110 H-120 Z" fill={near} opacity=".9" />

      {/* kept inside the layer's top edge, so the light doesn't end in a line across the sky */}
      <ellipse className="cf-glow" cx="300" cy="98" rx="120" ry="56" fill="url(#cf-glow)" />

      {/* the sand the camp sits on, warm where the fire reaches */}
      <path d="M-120 80 C -70 76 -30 78 0 82 C 80 74 150 76 220 80 S 340 76 400 72 V110 H-120 Z" fill="url(#cf-ground)" />
      <ellipse className="cf-pool" cx="300" cy="98" rx="70" ry="11" fill="url(#cf-pool)" />

      {/* the tent near the fire */}
      <g transform="translate(226 94) scale(1.3)">
        <ellipse cx="0" cy=".6" rx="19" ry="1.6" fill="#000" opacity=".25" />
        <path d={TENT} fill="#262c42" />
        <path d={TENT} fill="url(#cf-tentlit)" />
        <path d="M-15 -10 L-19 -3 M15 -10 L19 -3" stroke="#262c42" strokeWidth=".5" />
        {/* the door: lamplight in a pointed opening, its flap tied back toward the fire */}
        <path d="M-2.6 0 Q-1.6 -5.4 .6 -8.6 Q2.6 -5.2 3.4 0 Z" fill="#f2b04f" className="sc-tent-glow" />
        <path d="M.6 -8.6 Q3.2 -5 3.4 0 L6.4 0 Q5.4 -5.2 .6 -8.6 Z" fill="#3a3f57" />
      </g>

      {/* the fire: a ring of stones, crossed logs, three flames and sparks going up */}
      <g transform="translate(296 98) scale(.9)">
        <g className="cf-flames">
          <g transform="scale(1.15)"><path className="cf-flame f1" d={FLAME} fill="#e8702f" /></g>
          <g transform="scale(.82)"><path className="cf-flame f2" d={FLAME} fill="#f6a93f" /></g>
          <g transform="scale(.45)"><path className="cf-flame f3" d={FLAME} fill="#fff0b3" /></g>
        </g>
        <g className="cf-sparks" fill="#ffd27a">
          {SPARKS.map(([x, d, dur, r], i) => (
            <circle key={i} cx={x} cy="-16" r={r} style={{ animationDelay: `${d}s`, animationDuration: `${dur}s` }} />
          ))}
        </g>
        <path d="M-15 2 L13 -4" stroke="#5a3a26" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M-13 -4 L15 2" stroke="#6b4630" strokeWidth="4.2" strokeLinecap="round" />
        <g fill="#4a4f63">
          <ellipse cx="-18" cy="3" rx="5" ry="3.2" />
          <ellipse cx="-8" cy="5" rx="5.5" ry="3" />
          <ellipse cx="4" cy="5.2" rx="5.5" ry="3" />
          <ellipse cx="15" cy="3.4" rx="5" ry="3.2" />
        </g>
        <g fill="#f2a04a" opacity=".55">
          <ellipse cx="-8" cy="3.6" rx="4" ry="1.2" />
          <ellipse cx="4" cy="3.8" rx="4" ry="1.2" />
        </g>
      </g>
    </svg>
  )
}

export type SceneProps = {
  /** the hour of the day, with fractions: 6.5 is half past six */
  hour: number
  /** share of the month's budget still unspent, 0–1; null when no budget is set */
  manna: number | null
  /** spending has gone past the budget */
  dry: boolean
  /** how far spending runs ahead of plan, 0 (on track) to 1 (far ahead): brings clouds */
  pace?: number
  /** savings goals progress, 0–1; null hides the jar */
  jar: number | null
  /** income arrived in the last few days: quail fly over */
  quail: boolean
  /** December: a parol hangs on a tent */
  festive?: boolean
  onJar?: () => void
  /** folded down to a slim strip: just the sky and the greeting */
  collapsed?: boolean
  children?: ReactNode
}

/**
 * Morning in the wilderness camp (Exodus 16), drawn live. The sky follows the clock minute by minute and the
 * sun crosses on an arc. Manna on the sand is what's left of the month's budget, and fresh manna falls with
 * the dew at dawn. Clouds gather as spending runs ahead of plan; past the budget the ground is bare and the
 * sun burns. The golden pot of manna (Hebrews 9:4), laid up to remember God's provision (Exodus 16:32-34), stands for
 * savings: provision laid up wisely (Proverbs 21:20). Quail come in at evening after payday (Exodus 16:13).
 * The palms are Elim's (Exodus 15:27). Layers drift apart a little as the page scrolls.
 */
export function Scene({ hour, manna, dry, pace = 0, jar, quail, festive, onJar, collapsed = false, children }: SceneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [s0, s1, s2, far, near, sand, shade] = useMemo(() => palette(hour), [hour])
  const light = daylight(hour)
  const night = light < 0.25
  const phase = phaseFor(hour)
  // light lettering whenever the sky behind the greeting is dark
  const darkSky = (lum(s0) + lum(s1)) / 2 < 0.42

  // the sun's arc from 6:00 to 18:00; the moon's from 18:30 to 5:30
  const sunT = (hour - 6) / 12
  const sun = sunT > -0.05 && sunT < 1.05 ? { x: 30 + sunT * 340, y: 212 - Math.sin(Math.PI * Math.max(0, Math.min(1, sunT))) * 96 } : null
  const moonH = hour >= 18.5 ? hour - 18.5 : hour + 5.5
  const moonT = moonH / 11
  const moon = hour >= 18.5 || hour < 5.5 ? { x: 40 + moonT * 320, y: 200 - Math.sin(Math.PI * moonT) * 84 } : null

  const shown = dry || manna === null ? 0 : Math.round(Math.max(0, Math.min(1, manna)) * FLAKES.length)
  const jarLevel = jar === null ? 0 : Math.max(0, Math.min(1, jar))
  const clouds = dry ? 3 : pace > 0.5 ? 3 : pace > 0.15 ? 2 : 1
  // the manna came down with the dew in the night (Numbers 11:9) and lay on the ground in the morning (Exodus 16:13-14)
  const dawnFall = (hour >= 2 && hour < 5.5) && !dry

  // a little depth as the page scrolls: far layers move slower than near ones
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => el.style.setProperty('--sy', String(Math.min(window.scrollY, 400))))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // folded at night, the camp's ground comes up into view around a fire, with KATY beside it
  const campfire = collapsed && phase === 'night'

  const tentColour = night ? '#2a2f45' : '#5a4636'
  const palmColour = night ? '#1c2438' : '#5e5a3c'

  return (
    <div
      ref={ref}
      className={`scene scene-${phase}${darkSky ? ' scene-darksky' : ''}${dry ? ' is-dry' : ''}${collapsed ? ' is-collapsed' : ''}${campfire ? ' is-campfire' : ''}`}
    >
      <svg className="scene-art" viewBox="0 0 400 300" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s0} />
            <stop offset=".55" stopColor={s1} />
            <stop offset=".86" stopColor={s2} />
          </linearGradient>
          <radialGradient id="sc-sunglow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor={dry ? '#ffb15e' : '#fff1c4'} stopOpacity={dry ? 0.95 : 0.85} />
            <stop offset=".35" stopColor={dry ? '#ffa04a' : '#ffe2a0'} stopOpacity={dry ? 0.45 : 0.3} />
            <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sc-glow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#fff3cf" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-dune1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={sand} />
            <stop offset="1" stopColor={shade} />
          </linearGradient>
          <linearGradient id="sc-dune2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sand} />
            <stop offset=".7" stopColor={shade} />
          </linearGradient>
          <linearGradient id="sc-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s2} stopOpacity="0" />
            <stop offset="1" stopColor={s2} stopOpacity=".7" />
          </linearGradient>
          <filter id="sc-soft" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        <rect width="400" height="300" fill="url(#sc-sky)" />

        {/* stars fade in as the light goes */}
        <g className="sc-stars" opacity={Math.max(0, 1 - light * 2.2)}>
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#f4ead2" style={{ animationDelay: `${s.d}s` }} />
          ))}
        </g>

        {/* the morning star: the logo's star, low in the dawn sky */}
        {hour >= 4.6 && hour < 7.6 && (
          <g className="sc-morning-star" transform="translate(322 112)" opacity={1 - Math.max(0, hour - 6.4) / 1.2}>
            <circle r="16" fill="url(#sc-glow)" />
            <path d={STAR} transform="scale(.8)" fill="#fff7e2" />
          </g>
        )}

        {sun && (
          <g className={`sc-sun${dry ? ' is-hot' : ''}`} transform={`translate(${sun.x.toFixed(1)} ${sun.y.toFixed(1)})`}>
            <circle r={dry ? 60 : 46} fill="url(#sc-sunglow)" className="sc-halo" />
            <circle r={dry ? 17 : 14} fill={dry ? '#f59a47' : sunT < 0.12 || sunT > 0.88 ? '#ffc97a' : '#fff0c2'} />
          </g>
        )}
        {moon && night && (
          <g className="sc-moon" transform={`translate(${moon.x.toFixed(1)} ${moon.y.toFixed(1)})`}>
            <circle r="22" fill="url(#sc-glow)" opacity=".35" />
            <circle r="11" fill="#f4ead2" />
            <circle cx="5" cy="-4" r="9.5" fill={s0} />
          </g>
        )}

        {/* clouds: more of them as spending runs ahead of plan */}
        <g className="sc-clouds" filter="url(#sc-soft)" fill={night ? '#3a4566' : '#ffffff'} opacity={night ? 0.45 : dry ? 0.5 : 0.8}>
          {[
            [40, 62, 1],
            [230, 40, 0.8],
            [320, 96, 0.65],
          ]
            .slice(0, clouds)
            .map(([x, y, k], i) => (
              <g key={i} className="sc-cloud" style={{ animationDuration: `${90 + i * 35}s`, animationDelay: `${-i * 30}s` }}>
                <g transform={`translate(${x} ${y}) scale(${k})`}>
                  <ellipse cx="0" cy="0" rx="26" ry="9" />
                  <ellipse cx="-12" cy="-5" rx="13" ry="9" />
                  <ellipse cx="9" cy="-8" rx="15" ry="11" />
                  <ellipse cx="22" cy="-2" rx="12" ry="7" />
                </g>
              </g>
            ))}
        </g>

        {/* quail coming in at evening (Exodus 16:13): a loose flock, each bird flapping its own way */}
        {/* quail came up at evening (Exodus 16:13) */}
        {quail && hour >= 16 && hour < 19.5 && (
          <g className="sc-flock">
            {[
              [0, 0, 0],
              [16, 7, 0.13],
              [29, -3, 0.29],
              [-13, 9, 0.21],
              [42, 10, 0.07],
            ].map(([dx, dy, ph], i) => (
              <g key={i} transform={`translate(${dx} ${dy})`}>
                <g className="sc-bird" style={{ animationDelay: `${-ph * 7}s`, animationDuration: `${2.8 + (i % 2) * 0.9}s` }}>
                  <g className="sc-wings" style={{ animationDelay: `${-ph}s`, animationDuration: `${2.3 + (i % 3) * 0.35}s` }}>
                    <path d="M-6.5 -.6 Q-3.4 -4.4 0 0 Q3.4 -4.4 6.5 -.6" fill="none" stroke={light > 0.6 ? '#4b4033' : '#2c2638'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <ellipse rx="1.6" ry="1.1" fill={light > 0.6 ? '#4b4033' : '#2c2638'} />
                </g>
              </g>
            ))}
          </g>
        )}

        {/* mountains far off, softened by the air */}
        <g className="sc-far">
          <path d="M0 196 C 30 186 48 160 70 158 C 92 156 104 182 130 180 C 160 178 176 140 206 136 C 236 132 252 170 282 172 C 310 174 326 152 352 150 C 376 148 390 166 400 172 V230 H0 Z" fill={far} />
          <rect y="150" width="400" height="80" fill="url(#sc-haze)" />
        </g>

        {/* Elim's palms and the camp */}
        <g className="sc-mid">
          <path d="M0 214 C 50 200 110 204 170 210 S 300 206 400 198 V240 H0 Z" fill={near} />
          {[
            [34, 204, 1],
            [372, 199, 0.85],
            [392, 203, 0.7],
          ].map(([x, y, k], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${k})`} className="sc-palm" style={{ animationDelay: `${-i * 1.7}s` }}>
              <path d="M0 0 C 1 -12 -1 -24 3 -36" fill="none" stroke={palmColour} strokeWidth="2.6" strokeLinecap="round" />
              <g fill={palmColour} transform="translate(3 -36)">
                <path d="M0 0 C -6 -6 -14 -6 -20 -1 C -13 -3 -7 -2 0 0 Z" />
                <path d="M0 0 C 6 -7 14 -7 20 -2 C 13 -4 7 -3 0 0 Z" />
                <path d="M0 0 C -4 -9 -9 -13 -14 -12 C -8 -10 -4 -6 0 0 Z" />
                <path d="M0 0 C 4 -9 9 -13 14 -12 C 8 -10 4 -6 0 0 Z" />
                <path d="M0 0 C -8 1 -14 6 -16 11 C -11 6 -6 3 0 0 Z" />
                <path d="M0 0 C 8 1 14 6 16 11 C 11 6 6 3 0 0 Z" />
              </g>
            </g>
          ))}
          {/* goat-hair tents, low and wide; their doors glow at night */}
          {[
            [70, 210, 1],
            [104, 206, 0.75],
            [262, 210, 0.95],
            [300, 205, 0.7],
          ].map(([x, y, k], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
              <path d="M-17 0 L-15 -10 Q-8 -14 -1 -11 Q7 -15 15 -10 L17 0 Z" fill={tentColour} />
              <path d="M-15 -10 L-19 -3 M15 -10 L19 -3" stroke={tentColour} strokeWidth="1" />
              <path d="M-3 0 V-7 H4 V0 Z" fill={night ? '#f2b04f' : '#2d231c'} className={night ? 'sc-tent-glow' : undefined} opacity={night ? 1 : 0.6} />
              {festive && i === 2 && (
                <g transform="translate(14 -12)">
                  <path d="M0 -10 V-4" stroke={tentColour} strokeWidth=".8" />
                  <path className="sc-parol" d="M0 -4 L1.6 -.6 5 0 1.6 .6 0 4 -1.6 .6 -5 0 -1.6 -.6 Z" fill="#f6c25b" />
                </g>
              )}
            </g>
          ))}
        </g>

        {/* the sand, in two soft dunes lit from the sun's side */}
        <g className="sc-near">
          <path d="M0 226 C 70 214 150 218 230 226 S 360 222 400 216 V300 H0 Z" fill="url(#sc-dune1)" />
          <path d="M0 256 C 90 244 180 250 270 258 S 370 252 400 248 V300 H0 Z" fill="url(#sc-dune2)" />
          {dry && (
            <g fill="none" stroke={night ? '#56607e' : '#c39e72'} strokeWidth="1.2" strokeLinecap="round" opacity=".8">
              <path d="M30 266 l14 -5 l9 7 l15 -3" />
              <path d="M232 276 l11 -7 l13 4 l9 -6" />
              <path d="M300 288 l17 -4 l8 5" />
              <path d="M58 290 l10 -6 l15 2" />
            </g>
          )}

          {/* manna on the ground: what's left of the month's budget */}
          <g className={`sc-manna${hour >= 5 && hour < 9 ? ' is-dew' : ''}`}>
            {FLAKES.map((f, i) => (
              <g key={i} className={i < shown ? 'flake' : 'flake is-gathered'} style={{ animationDelay: `${f.d}s` }}>
                <ellipse cx={f.x} cy={f.y + 0.8} rx={f.s * 1.1} ry={f.s * 0.35} fill="#000" opacity=".08" />
                <ellipse cx={f.x} cy={f.y} rx={f.s} ry={f.s * 0.6} fill={night ? '#e3dccb' : '#fffdf5'} />
              </g>
            ))}
          </g>

          {/* the golden pot of manna laid up before the LORD (Exodus 16:33; Hebrews 9:4): savings */}
          {jar !== null && (
            <g className="sc-jar" transform="translate(322 268)" onClick={onJar}>
              <ellipse cx="0" cy="10" rx="22" ry="3.6" fill="#000" opacity=".12" />
              <clipPath id="sc-jar-in">
                <path d="M-14 -24 C -22 -16 -20 4 -11 9 H11 C 20 4 22 -16 14 -24 Z" />
              </clipPath>
              <path d="M-14 -24 C -22 -16 -20 4 -11 9 H11 C 20 4 22 -16 14 -24 Z" fill={night ? '#2c3654' : '#f7ebd2'} />
              <rect className="sc-jar-fill" x="-24" y={9 - 33 * jarLevel} width="48" height="40" fill="#fff6dd" clipPath="url(#sc-jar-in)" />
              <path d="M-14 -24 C -22 -16 -20 4 -11 9 H11 C 20 4 22 -16 14 -24 Z" fill="none" stroke="#e0a544" strokeWidth="3" strokeLinejoin="round" />
              <rect x="-16" y="-30" width="32" height="6.5" rx="3.2" fill="#e0a544" />
              <path d="M-8 -11 h16" stroke="#c88a2e" strokeWidth="1.3" opacity=".55" />
            </g>
          )}
        </g>

        {/* manna falling with the dew in the night, before dawn (Numbers 11:9) */}
        {dawnFall && (
          <g className="sc-falling" fill="#fffdf5">
            {[30, 78, 140, 196, 248, 300, 352, 112, 330].map((x, i) => (
              <ellipse key={i} cx={x} cy="-6" rx="1.7" ry="1.1" style={{ animationDelay: `${i * 0.9}s`, animationDuration: `${7 + (i % 3) * 1.6}s` }} />
            ))}
          </g>
        )}
      </svg>
      {campfire && <Campfire far={far} near={near} sand={sand} shade={shade} low={hour < 5} />}
      {/* folded, there is no room for the sun or moon to travel their arc behind the words: they rest on the right */}
      {collapsed && (moon && night ? <span className="scene-orb is-moon" aria-hidden="true" /> : sun ? <span className={`scene-orb is-sun${dry ? ' is-hot' : ''}`} aria-hidden="true" /> : null)}
      <div className="scene-stage">{children}</div>
    </div>
  )
}
