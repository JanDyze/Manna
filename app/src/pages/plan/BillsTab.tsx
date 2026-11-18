import { useState, type FormEvent } from 'react'
import { useStore } from '../../lib/store'
import type { CategoryKind, Frequency, Recurring } from '../../lib/types'
import { frequencyLabel, parseAmount, peso, upcoming } from '../../lib/money'
import { addDays, daysBetween, dueLabel, endOfMonth, nextDayOfMonth, shortDate, today } from '../../lib/dates'
import { DateField } from '../../components/DateField'
import { payBill, skipBill } from '../../lib/actions'
import { Tile } from '../../components/Bits'
import { Glyph } from '../../components/Glyph'
import { Mascot } from '../../components/Mascot'
import { Sheet } from '../../components/Sheet'
import { MoneyField } from '../../components/Pickers'
import { useToast } from '../../components/Toast'

export function BillsTab() {
  const store = useStore()
  const { data } = store
  const toast = useToast()
  const [editing, setEditing] = useState<Recurring | 'new' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const t = today()

  const active = data.recurring.filter((r) => r.active).sort((a, b) => a.next_due.localeCompare(b.next_due))
  const paused = data.recurring.filter((r) => !r.active)
  const next30 = upcoming(data.recurring, 30, t)
  const due30 = next30.filter((r) => r.kind !== 'income').reduce((s, r) => s + r.amount, 0)
  const in30 = next30.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amount, 0)
  const cat = (id: string | null) => data.categories.find((c) => c.id === id)
  const acc = (id: string | null) => data.accounts.find((a) => a.id === id)

  async function pay(r: Recurring) {
    setBusy(r.id)
    try {
      await payBill(store, r)
      toast(r.kind === 'income' ? `${r.title} received · ${peso(r.amount)}` : `${r.title} paid · ${peso(r.amount)}`, r.kind === 'income' ? 'cheer' : r.kind === 'giving' ? 'give' : 'happy')
    } catch (e) {
      toast((e as Error).message, 'worry')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {active.length > 0 ? (
        <section className="card quiet row" style={{ background: 'var(--gold-soft)' }}>
          <div className="grow">
            <p className="eyebrow">Due in the next 30 days</p>
            <p className="mid-num num" style={{ marginTop: 2 }}>{peso(due30)}</p>
          </div>
          {in30 > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p className="tiny muted">Expected in</p>
              <p className="num good" style={{ fontWeight: 600 }}>{peso(in30)}</p>
            </div>
          )}
        </section>
      ) : (
        <div className="empty">
          <Mascot action="think" size={100} />
          <p>Add the bills that come back (rent, power, internet, subscriptions) and Manna will remind you before they’re due.</p>
        </div>
      )}

      <ul className="stack list" style={{ gap: 10 }}>
        {active.map((r) => {
          const days = daysBetween(t, r.next_due)
          const soon = days <= 3
          return (
            <li key={r.id} className="card" style={{ padding: 14 }}>
              <button className="row" style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setEditing(r)} aria-label={`Edit ${r.title}`}>
                <Tile icon={cat(r.category_id)?.icon ?? 'calendar'} tone={r.kind === 'income' ? 'good' : r.kind === 'giving' ? 'gold' : undefined} />
                <div className="grow">
                  <p className="item-title ellipsis">{r.title}</p>
                  <p className="item-sub ellipsis">{frequencyLabel(r)}{acc(r.account_id) ? ` · ${acc(r.account_id)!.name}` : ''}</p>
                </div>
                <span className={`amount${r.kind === 'income' ? ' in' : ''}`} style={{ fontSize: 17 }}>{peso(r.amount)}</span>
              </button>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <span className="row small" style={{ gap: 6 }}>
                  <Glyph name="calendar" size={16} className="faint" />
                  {shortDate(r.next_due)}
                  <span className={`pill${days < 0 ? ' bad' : soon ? ' gold' : ''}`}>{dueLabel(r.next_due)}</span>
                </span>
                <button className={`btn sm${soon ? '' : ' soft'}`} onClick={() => pay(r)} disabled={busy === r.id}>
                  <Glyph name="check" size={16} />
                  {r.kind === 'income' ? 'Received' : 'Mark paid'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {paused.length > 0 && <p className="small muted" style={{ padding: '0 4px' }}>Paused: {paused.map((p) => p.title).join(', ')}</p>}

      <button className="btn soft block" onClick={() => setEditing('new')}>
        <Glyph name="plus" size={18} />
        Add a bill
      </button>

      <figure className="verse" style={{ margin: 0 }}>
        <p>“Which of you, intending to build a tower, sitteth not down first, and counteth the cost?”</p>
        <cite>Luke 14:28</cite>
      </figure>

      {editing && <BillSheet bill={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function BillSheet({ bill, onClose }: { bill: Recurring | null; onClose: () => void }) {
  const store = useStore()
  const { data } = store
  const toast = useToast()
  const [title, setTitle] = useState(bill?.title ?? '')
  const [kind, setKind] = useState<CategoryKind>(bill?.kind ?? 'expense')
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [categoryId, setCategoryId] = useState(bill?.category_id ?? '')
  const [accountId, setAccountId] = useState(bill?.account_id ?? data.accounts[0]?.id ?? '')
  const [frequency, setFrequency] = useState<Frequency>(bill?.frequency ?? 'monthly')
  const [every, setEvery] = useState(String(bill?.every ?? 1))
  const [nextDue, setNextDue] = useState(bill?.next_due ?? today())
  const [active, setActive] = useState(bill?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const cats = data.categories.filter((c) => c.kind === kind && !c.archived)

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(amount)
    if (!title.trim()) return setError('Give it a name.')
    if (!v) return setError('Enter the amount.')
    const n = Math.max(1, Math.min(52, Math.round(Number(every) || 1)))
    const row = { title: title.trim(), kind, amount: v, category_id: categoryId || null, account_id: accountId || null, frequency, every: n, next_due: nextDue, active, note: null }
    setBusy(true)
    try {
      if (bill) await store.update('recurring', bill.id, row)
      else await store.insert('recurring', row)
      toast(bill ? 'Bill updated' : `${row.title} added`, 'nod')
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }
  async function skip() {
    if (!bill) return
    await skipBill(store, bill)
    toast(`Skipped this one`, 'nod')
    onClose()
  }
  async function remove() {
    if (!bill || !confirm(`Delete ${bill.title}? Past payments stay in Activity.`)) return
    await store.remove('recurring', bill.id)
    toast('Bill deleted', 'nod')
    onClose()
  }

  return (
    <Sheet title={bill ? bill.title : 'Add a bill'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="seg" role="group" aria-label="Kind">
          {(['expense', 'income', 'giving'] as const).map((k) => (
            <button type="button" key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setCategoryId('') }}>
              {k === 'expense' ? 'Bill' : k === 'income' ? 'Income' : 'Giving'}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="r-title">Name</label>
          <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'income' ? 'Salary' : kind === 'giving' ? 'Monthly missions support' : 'Meralco, rent, Netflix…'} maxLength={60} required />
        </div>
        <MoneyField id="r-amt" label="Amount" value={amount} onChange={setAmount} required />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="r-every">Every</label>
            <input id="r-every" inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="r-freq">&nbsp;</label>
            <select id="r-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option value="weekly">{Number(every) > 1 ? 'weeks' : 'week'}</option>
              <option value="monthly">{Number(every) > 1 ? 'months' : 'month'}</option>
              <option value="yearly">{Number(every) > 1 ? 'years' : 'year'}</option>
            </select>
          </div>
        </div>
        <DateField
          label="Next due"
          value={nextDue}
          onChange={(v) => setNextDue(v || today())}
          presets={[
            { label: 'Today', value: today() },
            { label: 'Tomorrow', value: addDays(today(), 1) },
            { label: 'The 15th', value: nextDayOfMonth(15) },
            { label: 'Month end', value: endOfMonth(today()) },
          ]}
        />
        <div className="grid-2">
          <div className="field">
            <label htmlFor="r-cat">Category</label>
            <select id="r-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="r-acc">{kind === 'income' ? 'Into' : 'Paid from'}</label>
            <select id="r-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {data.accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        {bill && (
          <label className="switch">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active (turn off to pause reminders)</span>
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" disabled={busy}>Save</button>
        {bill && (
          <div className="grid-2">
            <button type="button" className="btn soft" onClick={skip} disabled={busy}>Skip this one</button>
            <button type="button" className="btn danger" onClick={remove} disabled={busy}>Delete</button>
          </div>
        )}
      </form>
    </Sheet>
  )
}
