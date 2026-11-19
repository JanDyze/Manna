// Money maths and formatting. Everything works on the in-memory rows from the store.
import type { Account, Budget, Category, Debt, Goal, GoalEntry, Recurring, Tx } from './types'
import { addMonths, addDays, daysLeftInMonth, fromISODate, monthOf, today } from './dates'

const fmt0 = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 })
const fmt2 = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ₱1,250 or ₱1,250.50: decimals only when there are centavos (or when asked). */
export function peso(n: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const abs = Math.abs(n)
  const hasCents = Math.round(abs * 100) % 100 !== 0
  const body = (opts.cents || hasCents ? fmt2 : fmt0).format(abs)
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : ''
  return `${sign}₱${body}`
}

/** Short form for tight spots: ₱12.4k */
export function pesoShort(n: number): string {
  const abs = Math.abs(n)
  if (abs < 10_000) return peso(n)
  const k = abs / 1000
  return `${n < 0 ? '−' : ''}₱${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`
}

/** Parse what someone typed into an amount field: "1,250.5" → 1250.5; null if not a positive number. */
export function parseAmount(s: string): number | null {
  const n = Number(s.replace(/[,\s₱]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** A card's standing: what's owed on it and, with a limit, what's left to spend. */
export function cardStatus(a: Pick<Account, 'credit_limit'>, balance: number) {
  const owed = round2(Math.max(0, -balance))
  const limit = a.credit_limit ?? null
  return { owed, limit, left: limit == null ? null : round2(Math.max(0, limit - owed)) }
}

/**
 * The honest picture: money in your accounts (everything except what's owed on cards), what's owed on cards,
 * and what's free to use (the first less the second). Card debt is real, so "free" never hides it.
 */
export function moneyPicture(accounts: Account[], bal: Map<string, number>) {
  let have = 0
  let owed = 0
  for (const a of accounts) {
    const b = bal.get(a.id) ?? 0
    if (a.kind === 'card' && b < 0) owed -= b
    else have += b
  }
  return { have: round2(have), owed: round2(owed), free: round2(have - owed) }
}

/** How each kind of transaction moves an account's balance. */
/** Whether an entry moves money in an account. History-only entries (affects_balance = false) don't. */
export const movesBalance = (t: Pick<Tx, 'affects_balance'>) => t.affects_balance !== false

export function balances(accounts: Account[], txs: Tx[]): Map<string, number> {
  const bal = new Map(accounts.map((a) => [a.id, Number(a.opening_balance)]))
  const add = (id: string | null, n: number) => {
    if (id && bal.has(id)) bal.set(id, round2(bal.get(id)! + n))
  }
  for (const t of txs) {
    if (!movesBalance(t)) continue
    switch (t.kind) {
      case 'income':
      case 'debt_in':
        add(t.account_id, t.amount)
        break
      case 'expense':
      case 'giving':
      case 'debt_out':
        add(t.account_id, -t.amount)
        break
      case 'transfer':
        add(t.account_id, -t.amount)
        add(t.to_account_id, t.amount)
        break
    }
  }
  return bal
}

export type MonthTotals = { income: number; spent: number; given: number; byCategory: Map<string, number> }

export function monthTotals(txs: Tx[], month: string): MonthTotals {
  const out: MonthTotals = { income: 0, spent: 0, given: 0, byCategory: new Map() }
  for (const t of txs) {
    if (monthOf(t.occurred_on) !== month) continue
    if (t.kind === 'income') out.income += t.amount
    else if (t.kind === 'expense') out.spent += t.amount
    else if (t.kind === 'giving') out.given += t.amount
    else continue
    if (t.category_id) out.byCategory.set(t.category_id, (out.byCategory.get(t.category_id) ?? 0) + t.amount)
  }
  out.income = round2(out.income)
  out.spent = round2(out.spent)
  out.given = round2(out.given)
  return out
}

export type BudgetUse = { budget: Budget; category: Category; spent: number; left: number; pct: number }

export function budgetUse(budgets: Budget[], categories: Category[], totals: MonthTotals): BudgetUse[] {
  const cat = new Map(categories.map((c) => [c.id, c]))
  return budgets
    .filter((b) => cat.has(b.category_id))
    .map((b) => {
      const spent = totals.byCategory.get(b.category_id) ?? 0
      return { budget: b, category: cat.get(b.category_id)!, spent, left: round2(b.amount - spent), pct: (spent / b.amount) * 100 }
    })
    .sort((a, b) => a.category.sort - b.category.sort)
}

/** The month's spending plan: budget total, spent against budgeted categories, and a daily allowance. */
export function monthPlan(budgets: Budget[], totals: MonthTotals, on = today()) {
  const total = round2(budgets.reduce((s, b) => s + b.amount, 0))
  const spent = totals.spent
  const left = round2(total - spent)
  const days = daysLeftInMonth(on)
  return { total, spent, left, days, perDay: left > 0 ? left / days : 0, pct: total > 0 ? (spent / total) * 100 : 0 }
}

export function debtPaid(debt: Debt, txs: Tx[]): number {
  const back = debt.direction === 'owed_to_me' ? 'debt_in' : 'debt_out'
  return round2(txs.filter((t) => t.debt_id === debt.id && t.kind === back).reduce((s, t) => s + t.amount, 0))
}

export const debtLeft = (debt: Debt, txs: Tx[]) => (debt.closed_at ? 0 : Math.max(0, round2(debt.principal - debtPaid(debt, txs))))

export const goalSaved = (goal: Goal, entries: GoalEntry[]) =>
  round2(entries.filter((e) => e.goal_id === goal.id).reduce((s, e) => s + e.amount, 0))

/** The date after this one for a recurring bill. */
export function nextDue(r: Pick<Recurring, 'next_due' | 'frequency' | 'every'>): string {
  if (r.frequency === 'weekly') return addDays(r.next_due, 7 * r.every)
  if (r.frequency === 'yearly') return addMonths(r.next_due, 12 * r.every)
  return addMonths(r.next_due, r.every)
}

export function frequencyLabel(r: Pick<Recurring, 'frequency' | 'every'>): string {
  const unit = { weekly: 'week', monthly: 'month', yearly: 'year' }[r.frequency]
  return r.every === 1 ? `Every ${unit}` : `Every ${r.every} ${unit}s`
}

/** "3 payments left", "Last payment", "Finished", or '' for a bill that doesn't end. */
export function paymentsLeftLabel(r: Pick<Recurring, 'payments_left'>): string {
  const n = r.payments_left
  if (n == null) return ''
  if (n <= 0) return 'Finished'
  return n === 1 ? 'Last payment' : `${n} payments left`
}

/** Active bills due within `days` (late ones included), soonest first. */
export function upcoming(recurring: Recurring[], days = 30, on = today()): Recurring[] {
  const until = addDays(on, days)
  return recurring.filter((r) => r.active && r.next_due <= until).sort((a, b) => a.next_due.localeCompare(b.next_due))
}

/** Tithe: a share of this month's income, compared with what was given in a "Tithe" category (or all giving if none). */
export function tithe(txs: Tx[], categories: Category[], month: string, percent: number) {
  const totals = monthTotals(txs, month)
  const titheCats = new Set(categories.filter((c) => c.kind === 'giving' && /tithe/i.test(c.name)).map((c) => c.id))
  const given = titheCats.size
    ? round2(txs.filter((t) => t.kind === 'giving' && monthOf(t.occurred_on) === month && t.category_id && titheCats.has(t.category_id)).reduce((s, t) => s + t.amount, 0))
    : totals.given
  const due = round2((totals.income * percent) / 100)
  return { income: totals.income, due, given, done: due > 0 && given >= due - 0.005, otherGiving: round2(totals.given - given) }
}

/** Day groups for a list of transactions, newest first. */
/** Order inside one day: entries never arranged come first (newest first), then the arranged ones in their set order. */
export function withinDay(a: Tx, b: Tx): number {
  const ao = a.day_order ?? null
  const bo = b.day_order ?? null
  if (ao === null && bo === null) return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  if (ao === null) return -1
  if (bo === null) return 1
  return ao - bo || (b.created_at ?? '').localeCompare(a.created_at ?? '')
}

export function byDay(txs: Tx[]): { day: string; txs: Tx[] }[] {
  const groups = new Map<string, Tx[]>()
  for (const t of [...txs].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || withinDay(a, b))) {
    if (!groups.has(t.occurred_on)) groups.set(t.occurred_on, [])
    groups.get(t.occurred_on)!.push(t)
  }
  return [...groups].map(([day, txs]) => ({ day, txs }))
}

/** The signed effect of a transaction on "my money" (transfers are neutral). */
export function signed(t: Tx): number {
  if (t.kind === 'income' || t.kind === 'debt_in') return t.amount
  if (t.kind === 'transfer') return 0
  return -t.amount
}

export const isSameMonth = (a: string, b: string) => monthOf(a) === monthOf(b)
export { fromISODate }
