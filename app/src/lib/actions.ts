// Things that touch more than one row. Each takes the store so screens stay simple.
import type { useStore } from './store'
import type { Debt, Direction, Recurring, Tx } from './types'
import { debtLeft, nextDue, peso } from './money'
import { today } from './dates'

type Store = ReturnType<typeof useStore>

/**
 * Mark a bill paid: record the money and move the bill to its next due date. A card payment records a transfer to
 * the card. A bill with payments_left counts down, and the last payment finishes it (it stops reminding).
 */
export async function payBill(s: Store, bill: Recurring, opts: { accountId?: string; amount?: number; on?: string } = {}) {
  const accountId = opts.accountId ?? bill.account_id ?? s.data.accounts.find((a) => !a.archived && a.id !== bill.to_account_id)?.id
  if (!accountId) throw new Error('Add an account first, so Manna knows where the money came from.')
  const card = bill.kind === 'transfer'
  if (card && (!bill.to_account_id || bill.to_account_id === accountId)) throw new Error('Pick the card this payment goes to, and a different account to pay from.')
  const tx = await s.insert('transactions', {
    kind: bill.kind,
    amount: opts.amount ?? bill.amount,
    occurred_on: opts.on ?? today(),
    account_id: accountId,
    to_account_id: card ? bill.to_account_id : null,
    category_id: card ? null : bill.category_id,
    recurring_id: bill.id,
    note: bill.title,
  } as Partial<Tx>)
  const left = bill.payments_left == null ? null : Math.max(0, bill.payments_left - 1)
  await s.update('recurring', bill.id, {
    next_due: nextDue(bill),
    ...(left != null && { payments_left: left }),
    ...(left === 0 && { active: false }),
  })
  return { tx, left, finished: left === 0 }
}

/** What to say after a bill is marked paid. */
export function paidMessage(bill: Recurring, amount: number, left: number | null): string {
  if (left === 0) return `${bill.title}: all paid! No more payments.`
  const base = bill.kind === 'income' ? `${bill.title} received · ${peso(amount)}` : `${bill.title} paid · ${peso(amount)}`
  return left == null ? base : `${base} · ${left === 1 ? '1 to go' : `${left} to go`}`
}

export async function skipBill(s: Store, bill: Recurring) {
  await s.update('recurring', bill.id, { next_due: nextDue(bill) })
}

/** A new loan either way. Finds or adds the person, and records the money changing hands if asked. */
export async function addDebt(
  s: Store,
  input: { personName: string; direction: Direction; title: string; principal: number; startedOn: string; dueOn: string | null; note: string | null; accountId: string | null },
) {
  const name = input.personName.trim()
  let person = s.data.people.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (!person) person = await s.insert('people', { name, note: null })
  const debt = await s.insert('debts', {
    person_id: person.id,
    direction: input.direction,
    title: input.title.trim(),
    principal: input.principal,
    started_on: input.startedOn,
    due_on: input.dueOn,
    note: input.note,
    closed_at: null,
  })
  if (input.accountId) {
    // lending is money out of my account; borrowing is money in
    await s.insert('transactions', {
      kind: input.direction === 'owed_to_me' ? 'debt_out' : 'debt_in',
      amount: input.principal,
      occurred_on: input.startedOn,
      account_id: input.accountId,
      debt_id: debt.id,
      note: input.title.trim(),
    } as Partial<Tx>)
  }
  return debt
}

/** Money paid back on a loan (to me, or by me). Closes the loan when nothing is left. */
export async function recordPayment(s: Store, debt: Debt, amount: number, accountId: string, on: string) {
  await s.insert('transactions', {
    kind: debt.direction === 'owed_to_me' ? 'debt_in' : 'debt_out',
    amount,
    occurred_on: on,
    account_id: accountId,
    debt_id: debt.id,
    note: debt.title,
  } as Partial<Tx>)
  // the store has the new transaction once insert resolves; check what's left against it
  const left = Math.max(0, debt.principal - amount - paidSoFar(s, debt))
  if (left <= 0.005) await s.update('debts', debt.id, { closed_at: new Date().toISOString() })
}

function paidSoFar(s: Store, debt: Debt) {
  // s.data here is the snapshot from before the insert above
  return debt.principal - debtLeft(debt, s.data.transactions)
}

export async function forgiveDebt(s: Store, debt: Debt) {
  const note = [debt.note, `Forgiven on ${today()}`].filter(Boolean).join(' · ')
  await s.update('debts', debt.id, { closed_at: new Date().toISOString(), note })
}

export async function reopenDebt(s: Store, debt: Debt) {
  await s.update('debts', debt.id, { closed_at: null })
}
