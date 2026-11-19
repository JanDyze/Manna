// Which version this is, what changed in each one, and noticing when a newer copy has been deployed.
import { useEffect, useState } from 'react'

export const APP_VERSION = __APP_VERSION__
export const APP_BUILD = __APP_BUILD__

export type Release = {
  version: string
  date: string
  /** a line in KATY's voice to open the release */
  title: string
  notes: { icon: string; text: string }[]
}

/**
 * Newest first. When you bump "version" in package.json, add its release here; the first entry should
 * match the package version, and anyone who last saw an older one is shown what's new once.
 */
export const RELEASES: Release[] = [
  {
    version: '0.2.0',
    date: '2026-11-19',
    title: 'Activity got a fresh coat',
    notes: [
      { icon: 'list', text: 'Activity keeps the month at the top while your entries scroll, with a bar for each day’s spending.' },
      { icon: 'receipt', text: 'Tap an entry to see it as a little receipt. Press and hold to pick several and view, edit, copy or delete them together.' },
      { icon: 'repeat', text: 'Drag entries to put them in order within a day.' },
      { icon: 'card', text: 'Card payment bills remind you before each installment, and bills can end after their last payment.' },
      { icon: 'check', text: '“Already in my balance” records past entries for the history without changing your balances.' },
      { icon: 'message', text: 'Claude can now do everything the app can, from entries to bills and goals.' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-19',
    title: 'Manna begins',
    notes: [{ icon: 'spark', text: 'A money journal for faithful stewards: entries, budgets, the tithe, bills, loans and goals.' }],
  },
]

/** -1, 0 or 1, comparing "0.10.2" with "0.9.0" the way people mean it. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d) return d > 0 ? 1 : -1
  }
  return 0
}

/** The releases after `seen`, up to and including this one. */
export function releasesSince(seen: string): Release[] {
  return RELEASES.filter((r) => compareVersions(r.version, seen) > 0 && compareVersions(r.version, APP_VERSION) <= 0)
}

const SEEN_KEY = 'manna.seenVersion'

/** The version whose news this device has already shown, or null on a first visit. */
export function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

export function markVersionSeen() {
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION)
  } catch {
    // storage blocked: the news may show again next time, which is harmless
  }
}

/**
 * The last version before Manna kept track of what each device had seen. Someone already using the app with no
 * record was on this one; someone new is marked up to date when they finish setup (OnboardingPage).
 */
const BEFORE_TRACKING = '0.1.0'

/** What's new that this device hasn't been shown yet. */
export function unseenReleases(): Release[] {
  const seen = getSeenVersion() ?? BEFORE_TRACKING
  return compareVersions(APP_VERSION, seen) > 0 ? releasesSince(seen) : []
}

const CHECK_EVERY_MS = 30 * 60 * 1000

/**
 * True once a newer copy of Manna has been deployed than the one running. Checks when the app comes back to
 * the front and every half hour while it's open. Only in a production build, where version.json exists.
 */
export function useUpdateReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!import.meta.env.PROD || ready) return
    let stopped = false
    async function check() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      try {
        const res = await fetch('/version.json', { cache: 'no-store' })
        if (!res.ok) return
        const { build } = (await res.json()) as { build?: string }
        if (!stopped && build && build !== APP_BUILD) setReady(true)
      } catch {
        // offline or between deploys: try again later
      }
    }
    check()
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      stopped = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [ready])
  return ready
}
