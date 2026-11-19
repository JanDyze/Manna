// Demo mode: open the app with ?mock (or ?mock=over, ?mock=new) to use made-up data that never
// touches the database. ?hour=21 pretends it's that hour, to see the scene at dawn, day, dusk or night.
import type { Account, BalanceCheck, Budget, Category, Debt, Goal, GoalEntry, Note, Person, Recurring, Tx } from './types'
import type { Data } from './store'
import { addDays, addMonths, endOfMonth, monthOf, shiftMonth, today } from './dates'

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
const pick = params.get('mock')

// remember the choice for the session, so links inside the app keep demo mode on
function scenario(): 'normal' | 'over' | 'new' | null {
  try {
    if (pick === 'off') {
      sessionStorage.removeItem('manna.mock')
      return null
    }
    if (pick !== null) sessionStorage.setItem('manna.mock', pick || 'normal')
    const s = sessionStorage.getItem('manna.mock')
    return s === 'over' || s === 'new' ? s : s ? 'normal' : null
  } catch {
    return pick === null || pick === 'off' ? null : pick === 'over' || pick === 'new' ? pick : 'normal'
  }
}
const s = scenario()
export const mock = s ? { scenario: s } : null

const h = params.get('hour')
export const demoHour = h !== null && /^\d{1,2}(\.\d+)?$/.test(h) ? Math.min(23.99, Number(h)) : null

let n = 0
const id = (p: string) => `${p}-${++n}`

export function mockData(): Data {
  n = 0
  const t = today()
  const month = monthOf(t)
  const d = (offset: number) => addDays(t, offset)
  const dayOfMonth = Number(t.slice(8, 10))
  const inMonth = (day: number) => `${month}-${String(Math.min(day, dayOfMonth)).padStart(2, '0')}`

  const accounts: Account[] = [
    { id: id('acc'), name: 'Wallet', kind: 'cash', opening_balance: 1800, sort: 0, archived: false },
    { id: id('acc'), name: 'GCash', kind: 'ewallet', opening_balance: 4800, sort: 1, archived: false },
    { id: id('acc'), name: 'BDO', kind: 'bank', opening_balance: 9500, sort: 2, archived: false },
    { id: id('acc'), name: 'Atome', kind: 'card', opening_balance: -2000, sort: 3, archived: false, credit_limit: 8000 },
  ]
  const [wallet, gcash, bank, atome] = accounts
  // a brand-new user starts with the defaults and nothing in them yet
  // (like the real defaults: Wallet and GCash only; setup asks which bank)
  if (s === 'new') {
    accounts.splice(2)
    accounts.forEach((a) => (a.opening_balance = 0))
  }

  const cat = (kind: Category['kind'], name: string, icon: string, sort: number): Category => ({ id: id('cat'), kind, name, icon, sort, archived: false })
  const categories: Category[] = [
    cat('expense', 'Food', 'food', 0),
    cat('expense', 'Transport', 'transport', 1),
    cat('expense', 'Bills', 'bolt', 2),
    cat('expense', 'Rent', 'home', 3),
    cat('expense', 'Groceries', 'basket', 4),
    cat('expense', 'Health', 'heart', 5),
    cat('expense', 'Family', 'people', 6),
    cat('expense', 'Shopping', 'bag', 7),
    cat('expense', 'Fun', 'spark', 8),
    cat('expense', 'Subscriptions', 'repeat', 9),
    cat('expense', 'Other', 'dot', 10),
    cat('income', 'Salary', 'briefcase', 0),
    cat('income', 'Side work', 'tool', 1),
    cat('income', 'Gift', 'gift', 2),
    cat('income', 'Other', 'dot', 3),
    cat('giving', 'Tithe', 'wheat', 0),
    cat('giving', 'Offering', 'envelope', 1),
    cat('giving', 'Missions', 'globe', 2),
    cat('giving', 'Helping others', 'heart', 3),
  ]
  const c = (name: string, kind: Category['kind'] = 'expense') => categories.find((x) => x.name === name && x.kind === kind)!.id

  const empty: Data = {
    settings: { user_id: 'demo', currency: 'PHP', tithe_percent: 10, onboarded_at: s === 'new' ? null : '2026-10-01T00:00:00Z' },
    accounts,
    categories,
    budgets: [],
    people: [],
    debts: [],
    goals: [],
    goal_entries: [],
    recurring: [],
    transactions: [],
    notes: [],
    balance_checks: [],
  }
  if (s === 'new') return empty

  const over = s === 'over'
  const budgets: Budget[] = [
    ['Food', 6000],
    ['Transport', 2500],
    ['Groceries', 4000],
    ['Bills', 3500],
    ['Fun', 1500],
    ['Shopping', 2000],
    ['Subscriptions', 1200],
  ].map(([name, amount]) => ({ id: id('bud'), category_id: c(name as string), amount: amount as number }))

  const tx = (kind: Tx['kind'], amount: number, on: string, account: Account, category: string | null, note: string, extra: Partial<Tx> = {}): Tx => ({
    id: id('tx'),
    kind,
    amount,
    occurred_on: on,
    account_id: account.id,
    to_account_id: null,
    category_id: category,
    debt_id: null,
    recurring_id: null,
    note,
    created_at: `${on}T0${n % 10}:00:00Z`,
    ...extra,
  })

  const people: Person[] = [
    { id: id('p'), name: 'Ate Joy', note: null },
    { id: id('p'), name: 'Marco', note: null },
    { id: id('p'), name: 'Kuya Paolo', note: null },
  ]
  const debts: Debt[] = [
    { id: id('debt'), person_id: people[0].id, direction: 'owed_to_me', title: 'Tuition help', principal: 3000, started_on: d(-20), due_on: addDays(t, 27), note: null, closed_at: null },
    { id: id('debt'), person_id: people[1].id, direction: 'owed_to_me', title: 'Concert ticket', principal: 2500, started_on: d(-26), due_on: d(9), note: null, closed_at: null },
    { id: id('debt'), person_id: people[2].id, direction: 'i_owe', title: 'Phone repair', principal: 4000, started_on: d(-40), due_on: d(12), note: null, closed_at: null },
  ]

  const goals: Goal[] = [
    { id: id('goal'), name: 'Emergency fund', target: 50000, target_on: addMonths(t, 8), icon: 'shield', closed_at: null },
    { id: id('goal'), name: 'Christmas gifts', target: 6000, target_on: `${t.slice(0, 4)}-12-20`, icon: 'gift', closed_at: null },
    { id: id('goal'), name: 'New laptop', target: 45000, target_on: null, icon: 'laptop', closed_at: null },
  ]
  const goal_entries: GoalEntry[] = [
    { id: id('ge'), goal_id: goals[0].id, amount: 15000, occurred_on: d(-60), note: null },
    { id: id('ge'), goal_id: goals[0].id, amount: 6000, occurred_on: d(-10), note: null },
    { id: id('ge'), goal_id: goals[1].id, amount: 3500, occurred_on: d(-5), note: null },
    { id: id('ge'), goal_id: goals[2].id, amount: 9000, occurred_on: d(-30), note: null },
  ]

  const recurring: Recurring[] = [
    { id: id('rec'), title: 'Rent', kind: 'expense', amount: 8500, account_id: bank.id, category_id: c('Rent'), frequency: 'monthly', every: 1, next_due: d(2), active: true, note: null },
    { id: id('rec'), title: 'Meralco', kind: 'expense', amount: 1850, account_id: gcash.id, category_id: c('Bills'), frequency: 'monthly', every: 1, next_due: d(6), active: true, note: null },
    { id: id('rec'), title: 'Netflix', kind: 'expense', amount: 549, account_id: bank.id, category_id: c('Subscriptions'), frequency: 'monthly', every: 1, next_due: d(10), active: true, note: null },
    { id: id('rec'), title: 'PLDT Fiber', kind: 'expense', amount: 1699, account_id: bank.id, category_id: c('Bills'), frequency: 'monthly', every: 1, next_due: d(15), active: true, note: null },
    { id: id('rec'), title: 'Atome', kind: 'transfer', amount: 1000, account_id: gcash.id, to_account_id: atome.id, category_id: null, frequency: 'monthly', every: 1, next_due: d(4), active: true, note: null, payments_left: 2 },
    { id: id('rec'), title: 'Salary', kind: 'income', amount: 19000, account_id: bank.id, category_id: c('Salary', 'income'), frequency: 'monthly', every: 1, next_due: d(13), active: true, note: '15th and 30th' },
  ]

  const transactions: Tx[] = [
    tx('income', 19000, inMonth(1), bank, c('Salary', 'income'), 'Salary'),
    tx('income', 19000, inMonth(15), bank, c('Salary', 'income'), 'Salary'),
    tx('giving', 1900, inMonth(1), bank, c('Tithe', 'giving'), 'Tithe'),
    tx('giving', 1900, inMonth(15), bank, c('Tithe', 'giving'), 'Tithe'),
    tx('giving', 500, inMonth(9), wallet, c('Offering', 'giving'), 'Sunday offering'),
    tx('transfer', 3000, inMonth(2), bank, null, 'Load GCash', { to_account_id: gcash.id }),
    tx('expense', 8500, inMonth(2), bank, c('Rent'), 'Rent'),
    tx('expense', 1380, inMonth(4), bank, c('Groceries'), 'SM Hypermarket'),
    tx('expense', 1240, inMonth(11), gcash, c('Groceries'), 'Puregold'),
    tx('expense', 245, d(0), wallet, c('Food'), 'Lunch with the team'),
    tx('expense', 186, d(0), gcash, c('Transport'), 'Grab to the office'),
    tx('expense', 165, d(-1), wallet, c('Food'), 'Siomai rice'),
    tx('expense', 520, d(-2), gcash, c('Food'), 'Jollibee with family'),
    tx('expense', 1850, inMonth(6), gcash, c('Bills'), 'Meralco', { recurring_id: recurring[1].id }),
    tx('expense', 549, inMonth(7), bank, c('Subscriptions'), 'Netflix'),
    tx('expense', 899, inMonth(8), gcash, c('Fun'), 'Movie night'),
    tx('expense', over ? 3400 : 640, inMonth(10), gcash, c('Shopping'), over ? 'New shoes' : 'Shirt'),
    tx('expense', 420, inMonth(12), wallet, c('Transport'), 'Jeep and tricycle, week'),
    tx('expense', 1100, inMonth(5), wallet, c('Food'), 'Groceries for lunch packs'),
    tx('debt_out', 3000, debts[0].started_on, bank, null, 'Tuition help', { debt_id: debts[0].id }),
    tx('debt_out', 2500, debts[1].started_on, bank, null, 'Concert ticket', { debt_id: debts[1].id }),
    tx('debt_in', 1000, d(-9), gcash, null, 'Concert ticket', { debt_id: debts[1].id }),
    tx('debt_in', 4000, debts[2].started_on, wallet, null, 'Phone repair', { debt_id: debts[2].id }),
    tx('debt_out', 2000, d(-12), gcash, null, 'Phone repair', { debt_id: debts[2].id }),
  ]
  if (over) {
    transactions.push(
      tx('expense', 2600, inMonth(13), bank, c('Fun'), 'Weekend trip'),
      tx('expense', 5200, inMonth(14), bank, c('Food'), 'Birthday dinner'),
      tx('expense', 3900, inMonth(9), bank, c('Shopping'), 'Phone case and earbuds'),
    )
  }
  const notes: Note[] = [
    { id: id('note'), body: 'Jonathan asked if I could help with his father’s medicine. Not yet; pray and think about it first.', person: 'Jonathan', amount: null, remind_on: d(3), done_at: null, created_at: `${d(-1)}T09:00:00Z` },
    { id: id('note'), body: 'Promised Ate Joy I’d help with her son’s school project materials next payday.', person: 'Ate Joy', amount: 800, remind_on: null, done_at: null, created_at: `${d(-4)}T09:00:00Z` },
  ]
  // last month's check: everything matched except a little cash
  const lastMonth = shiftMonth(t.slice(0, 7), -1)
  const balance_checks: BalanceCheck[] = [
    { id: id('chk'), checked_on: endOfMonth(`${lastMonth}-01`), month: lastMonth, account_id: wallet.id, recorded: 2140, actual: 2020, adjustment_id: null, note: 'Probably snacks I forgot to log' },
    { id: id('chk'), checked_on: endOfMonth(`${lastMonth}-01`), month: lastMonth, account_id: gcash.id, recorded: 3315, actual: 3315, adjustment_id: null, note: null },
    { id: id('chk'), checked_on: endOfMonth(`${lastMonth}-01`), month: lastMonth, account_id: bank.id, recorded: 18200, actual: 18200, adjustment_id: null, note: null },
  ]
  return { ...empty, budgets, people, debts, goals, goal_entries, recurring, transactions, notes, balance_checks }
}
