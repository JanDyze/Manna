// Dates are local calendar days as 'YYYY-MM-DD' strings, the same as Postgres `date`.

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const today = () => toISODate(new Date())

/** Parse 'YYYY-MM-DD' as a local date (new Date('2026-11-17') would be UTC midnight). */
export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = fromISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Add months, keeping the day but clamping to the month's end (Jan 31 + 1 month = Feb 28). */
export function addMonths(s: string, n: number): string {
  const d = fromISODate(s)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISODate(d)
}

export const daysBetween = (a: string, b: string) =>
  Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000)

/** 'YYYY-MM' for a date string. */
export const monthOf = (s: string) => s.slice(0, 7)

export const thisMonth = () => monthOf(today())

export function shiftMonth(month: string, n: number): string {
  return monthOf(addMonths(`${month}-01`, n))
}

export function monthLabel(month: string, withYear = true): string {
  return fromISODate(`${month}-01`).toLocaleDateString('en-PH', { month: 'long', ...(withYear && { year: 'numeric' }) })
}

/** Days left in the month, counting today. */
export function daysLeftInMonth(s = today()): number {
  const d = fromISODate(s)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1
}

/** Every date in the app is written one way: "Nov 12, 2026". Dates are days, never times. */
export function fmtDate(s: string): string {
  return fromISODate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "Today", "Yesterday", "Tomorrow", otherwise the date: "Nov 12, 2026". */
export function dayLabel(s: string): string {
  const diff = daysBetween(s, today())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  return fmtDate(s)
}

/** The normalized date, "Nov 12, 2026" (kept under its old name for the screens that use it). */
export const shortDate = fmtDate

/** The last day of the month a date is in. */
export function endOfMonth(s: string): string {
  const d = fromISODate(s)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/** The next time the month reaches this day (today counts), clamped to short months. */
export function nextDayOfMonth(day: number, from = today()): string {
  const d = fromISODate(from)
  const tryMonth = (y: number, m: number) => toISODate(new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate())))
  const here = tryMonth(d.getFullYear(), d.getMonth())
  return here >= from ? here : tryMonth(d.getFullYear(), d.getMonth() + 1)
}

/** "in 3 days", "today", "2 days late". */
export function dueLabel(s: string): string {
  const n = daysBetween(today(), s)
  if (n === 0) return 'due today'
  if (n === 1) return 'due tomorrow'
  if (n > 1) return `in ${n} days`
  return n === -1 ? '1 day late' : `${-n} days late`
}

export function greeting(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
