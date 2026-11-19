// Row shapes of the `manna` schema (supabase/migrations). Money is a plain number of pesos.

export type AccountKind = 'cash' | 'bank' | 'ewallet' | 'card' | 'savings'
export type CategoryKind = 'expense' | 'income' | 'giving'
export type TxKind = CategoryKind | 'transfer' | 'debt_out' | 'debt_in'
export type Frequency = 'weekly' | 'monthly' | 'yearly'
/** A bill's kind: a category kind, or 'transfer' for a card payment (bank or e-wallet → card / pay-later account) */
export type BillKind = CategoryKind | 'transfer'
export type Direction = 'owed_to_me' | 'i_owe'

export type Settings = { user_id: string; currency: string; tithe_percent: number; onboarded_at: string | null }

export type Account = {
  id: string
  name: string
  kind: AccountKind
  opening_balance: number
  sort: number
  archived: boolean
  /** cards: the spending limit, to show what's left to spend; null = not set */
  credit_limit?: number | null
}

export type Category = { id: string; name: string; kind: CategoryKind; icon: string; sort: number; archived: boolean }

export type Budget = { id: string; category_id: string; amount: number }

export type Person = { id: string; name: string; note: string | null }

export type Debt = {
  id: string
  person_id: string
  direction: Direction
  title: string
  principal: number
  started_on: string
  due_on: string | null
  note: string | null
  closed_at: string | null
}

export type Goal = { id: string; name: string; target: number; target_on: string | null; icon: string; closed_at: string | null }

export type GoalEntry = { id: string; goal_id: string; amount: number; occurred_on: string; note: string | null }

export type Recurring = {
  id: string
  title: string
  kind: BillKind
  amount: number
  account_id: string | null
  /** card payments: the card or pay-later account the money goes to */
  to_account_id?: string | null
  category_id: string | null
  frequency: Frequency
  every: number
  next_due: string
  active: boolean
  note: string | null
  /** payments still to make; counts down when paid and the bill finishes at 0. null = it doesn't end */
  payments_left?: number | null
}

export type Tx = {
  id: string
  kind: TxKind
  amount: number
  occurred_on: string
  account_id: string
  to_account_id: string | null
  category_id: string | null
  debt_id: string | null
  recurring_id: string | null
  note: string | null
  /** a receipt photo in the private bucket */
  receipt_path?: string | null
  /** false = history only: a past entry the balances already reflect. Counted in totals, budgets and the tithe, not in balances. */
  affects_balance?: boolean
  /** where it sits within its day once arranged in Activity (1 = top); null = never arranged, shown first, newest first */
  day_order?: number | null
  created_at?: string
}

/** Something the person asked KATY to remember (a request, a promise, a thing to think about). */
export type Note = {
  id: string
  body: string
  person: string | null
  amount: number | null
  remind_on: string | null
  done_at: string | null
  /** a photo kept with the note */
  image_path?: string | null
  created_at?: string
}

/** One account on one month-end check: what Manna had on record, and what was really there. */
export type BalanceCheck = {
  id: string
  checked_on: string
  month: string
  account_id: string
  recorded: number
  actual: number
  adjustment_id: string | null
  note: string | null
  created_at?: string
}

/** Every table the app reads and writes, with its row type. */
export type Tables = {
  accounts: Account
  categories: Category
  budgets: Budget
  people: Person
  debts: Debt
  goals: Goal
  goal_entries: GoalEntry
  recurring: Recurring
  transactions: Tx
  notes: Note
  balance_checks: BalanceCheck
}

export type TableName = keyof Tables
export type Input<T extends TableName> = Omit<Tables[T], 'id' | 'created_at'>
