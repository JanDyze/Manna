// How an entry reads on screen: its title, the line under it, and what kind of entry it is.
import type { Account, Category, Debt, Person, Tx } from './types'

export type Look = {
  account: Map<string, Account>
  category: Map<string, Category>
  person: Map<string, Person>
  debt: Map<string, Debt>
}

export function entryTitle(t: Tx, look: Look): string {
  if (t.note) return t.note
  if (t.kind === 'transfer') return 'Transfer'
  if (t.debt_id) return look.debt.get(t.debt_id)?.title ?? 'Loan'
  return (t.category_id && look.category.get(t.category_id)?.name) || 'Entry'
}

/** "Lent to Ana", "Paid back by Ana", "Borrowed from Ana", "Paid back to Ana". */
export function loanLine(t: Tx, look: Look): string {
  const d = t.debt_id ? look.debt.get(t.debt_id) : undefined
  const who = d ? (look.person.get(d.person_id)?.name ?? '') : ''
  const lent = d?.direction === 'owed_to_me'
  const what = t.kind === 'debt_out' ? (lent ? 'Lent to' : 'Paid back to') : lent ? 'Paid back by' : 'Borrowed from'
  return `${what} ${who}`.trim()
}

export function entrySub(t: Tx, look: Look): string {
  const acc = look.account.get(t.account_id)?.name ?? ''
  if (t.kind === 'transfer') return `${acc} → ${(t.to_account_id && look.account.get(t.to_account_id)?.name) || ''}`
  if (t.debt_id) return `${loanLine(t, look)} · ${acc}`
  const cat = t.category_id ? look.category.get(t.category_id)?.name : ''
  return [cat, acc].filter(Boolean).join(' · ')
}

/** "Expense", "Income", "Giving", "Transfer", or the loan's own words. */
export function kindLabel(t: Tx, look: Look): string {
  if (t.kind === 'debt_in' || t.kind === 'debt_out') {
    const d = t.debt_id ? look.debt.get(t.debt_id) : undefined
    const lent = d?.direction === 'owed_to_me'
    if (t.kind === 'debt_out') return lent ? 'Lent out' : 'Paid back'
    return lent ? 'Paid back to you' : 'Borrowed'
  }
  return { expense: 'Expense', income: 'Income', giving: 'Giving', transfer: 'Transfer' }[t.kind]
}

/** Which way the money went, for the account line: "Paid from", "Received in", "Moved from". */
export function accountVerb(t: Tx): string {
  if (t.kind === 'income' || t.kind === 'debt_in') return 'Received in'
  if (t.kind === 'transfer') return 'From'
  return 'Paid from'
}

/** A copy of an entry, ready to insert: same money, same place, a new day. No receipt, no bill, no place in a day. */
export function copyOf(t: Tx, on: string): Partial<Tx> {
  return {
    kind: t.kind,
    amount: t.amount,
    occurred_on: on,
    account_id: t.account_id,
    to_account_id: t.to_account_id,
    category_id: t.category_id,
    debt_id: t.debt_id,
    recurring_id: null,
    note: t.note,
    receipt_path: null,
    affects_balance: true,
    day_order: null,
  }
}

/** Loan money can't simply be copied: paying a loan twice is done from the loan, so it stays tidy. */
export const canCopy = (t: Tx) => !t.debt_id
