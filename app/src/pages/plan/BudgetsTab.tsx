import { useMemo, useState, type FormEvent } from 'react'
import { useStore } from '../../lib/store'
import type { Budget } from '../../lib/types'
import { budgetUse, monthPlan, monthTotals, parseAmount, peso } from '../../lib/money'
import { daysLeftInMonth, fromISODate, thisMonth, today } from '../../lib/dates'
import { Bar, Tile, budgetTone } from '../../components/Bits'
import { Glyph } from '../../components/Glyph'
import { Mascot } from '../../components/Mascot'
import { Sheet } from '../../components/Sheet'
import { MoneyField } from '../../components/Pickers'
import { useToast } from '../../components/Toast'

export function BudgetsTab() {
  const store = useStore()
  const { data } = store
  const toast = useToast()
  const [editing, setEditing] = useState<Budget | 'new' | null>(null)

  const t = today()
  const totals = useMemo(() => monthTotals(data.transactions, thisMonth()), [data.transactions])
  const plan = monthPlan(data.budgets, totals, t)
  const uses = budgetUse(data.budgets, data.categories, totals)
  const budgeted = new Set(data.budgets.map((b) => b.category_id))
  const unbudgeted = data.categories
    .filter((c) => c.kind === 'expense' && !budgeted.has(c.id) && (totals.byCategory.get(c.id) ?? 0) > 0)
    .map((c) => ({ c, spent: totals.byCategory.get(c.id)! }))
  const day = fromISODate(t).getDate()
  const daysInMonth = day + daysLeftInMonth(t) - 1
  const pace = (plan.total * day) / daysInMonth
  const overs = uses.filter((u) => u.pct > 100)
  // how far through the month today is: the tick on each bar shows where an even pace would be
  const evenPct = (day / daysInMonth) * 100

  return (
    <>
      {data.budgets.length > 0 ? (
        <section className="hero">
          <p className="eyebrow">{fromISODate(t).toLocaleDateString('en-PH', { month: 'long' })} budget</p>
          <p className="hero-big num">
            {plan.left < 0 ? peso(-plan.left) : peso(plan.left)} <span className="hero-of">{plan.left < 0 ? 'over' : 'left'} of {peso(plan.total)}</span>
          </p>
          <div className="hero-meter">
            <Bar pct={plan.pct} thick tone={plan.left < 0 ? 'bad' : plan.pct > 85 ? 'gold' : undefined} mark={evenPct} label="Spent of this month's budget" />
          </div>
          <div className="hero-foot">
            <span>{plan.left > 0 ? `${peso(Math.floor(plan.perDay))} a day · ${plan.days} ${plan.days === 1 ? 'day' : 'days'} to go` : `Day ${day} of ${daysInMonth}`}</span>
            <span className={plan.spent <= pace ? 'is-ok' : 'is-warn'}>{plan.spent <= pace ? 'On track' : `${peso(Math.round(plan.spent - pace))} ahead of plan`}</span>
          </div>
        </section>
      ) : (
        <div className="empty">
          <Mascot action="think" size={100} />
          <p>Give each category a monthly limit. Manna shows what’s left as manna on the ground on Today.</p>
        </div>
      )}

      {overs.length > 0 && (
        <section className="card quiet row" style={{ background: 'var(--bad-soft)' }}>
          <Mascot action="worry" size={56} />
          <p className="small grow">
            Over in <strong>{overs.map((o) => o.category.name).join(', ')}</strong>. Go gently there until the month turns, or move some from another budget.
          </p>
        </section>
      )}

      {uses.length > 0 && (
        <ul className="card flush list">
          {uses.map((u) => (
            <li key={u.budget.id}>
              <button className="item" onClick={() => setEditing(u.budget)} aria-label={`${u.category.name} budget, ${peso(u.spent)} of ${peso(u.budget.amount)}`}>
                <Tile icon={u.category.icon} tone={u.pct > 100 ? 'bad' : undefined} />
                <div className="grow">
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <p className="item-title ellipsis">{u.category.name}</p>
                    <span className={`pill${u.pct > 100 ? ' bad' : u.pct >= 85 ? ' gold' : ''}`}>{Math.round(u.pct)}%</span>
                  </div>
                  <div style={{ margin: '7px 0 5px' }}>
                    <Bar pct={u.pct} tone={budgetTone(u.pct)} mark={evenPct} />
                  </div>
                  <p className="item-sub num">
                    {peso(u.spent)} of {peso(u.budget.amount)} ·{' '}
                    {u.left < 0 ? <span className="bad">{peso(-u.left)} over</span> : `${peso(u.left)} left`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {unbudgeted.length > 0 && (
        <div className="unbudgeted">
          <p className="eyebrow">Spent without a budget</p>
          <div className="chips">
            {unbudgeted.map((u) => (
              <span key={u.c.id} className="pill">
                <Glyph name={u.c.icon} size={14} />
                {u.c.name} <span className="num">{peso(u.spent)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <button className="btn soft block" onClick={() => setEditing('new')}>
        <Glyph name="plus" size={18} />
        Set a budget
      </button>

      {editing && <BudgetSheet budget={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={(m) => toast(m, 'nod')} store={store} />}
    </>
  )
}

function BudgetSheet({ budget, onClose, onSaved, store }: { budget: Budget | null; onClose: () => void; onSaved: (m: string) => void; store: ReturnType<typeof useStore> }) {
  const { data } = store
  const taken = new Set(data.budgets.map((b) => b.category_id))
  const options = data.categories.filter((c) => c.kind === 'expense' && !c.archived && (!taken.has(c.id) || c.id === budget?.category_id))
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? options[0]?.id ?? '')
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const name = data.categories.find((c) => c.id === categoryId)?.name ?? ''

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(amount)
    if (!v) return setError('Enter a monthly amount.')
    if (!categoryId) return setError('Pick a category.')
    setBusy(true)
    try {
      if (budget) await store.update('budgets', budget.id, { amount: v, category_id: categoryId })
      else await store.insert('budgets', { amount: v, category_id: categoryId })
      onSaved(`${name}: ${peso(v)} a month`)
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }
  async function remove() {
    if (!budget) return
    setBusy(true)
    try {
      await store.remove('budgets', budget.id)
      onSaved(`${name} budget removed`)
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={budget ? `${name} budget` : 'Set a budget'} onClose={onClose}>
      <form onSubmit={save}>
        {!budget && (
          <div className="field">
            <label htmlFor="b-cat">Category</label>
            <select id="b-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <MoneyField id="b-amt" label="Each month" value={amount} onChange={setAmount} required />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" disabled={busy}>Save</button>
        {budget && (
          <button type="button" className="btn danger block" onClick={remove} disabled={busy}>
            Remove this budget
          </button>
        )}
      </form>
    </Sheet>
  )
}
