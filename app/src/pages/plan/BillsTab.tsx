import { useState, type FormEvent } from 'react'
import { useStore } from '../../lib/store'
import type { BillKind, Frequency, Recurring } from '../../lib/types'
import { frequencyLabel, parseAmount, paymentsLeftLabel, peso, upcoming } from '../../lib/money'
import { addDays, daysBetween, dueLabel, endOfMonth, nextDayOfMonth, shortDate, today } from '../../lib/dates'
import { DateField } from '../../components/DateField'
import { paidMessage, payBill, skipBill } from '../../lib/actions'
import { Tile } from '../../components/Bits'
import { Glyph } from '../../components/Glyph'
import { Mascot } from '../../components/Mascot'
import { useConfirm } from '../../components/Confirm'
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
  const finished = data.recurring.filter((r) => !r.active && r.payments_left === 0)
  const paused = data.recurring.filter((r) => !r.active && r.payments_left !== 0)
  const next30 = upcoming(data.recurring, 30, t)
  const due30 = next30.filter((r) => r.kind !== 'income').reduce((s, r) => s + r.amount, 0)
  const in30 = next30.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amount, 0)
  const cat = (id: string | null) => data.categories.find((c) => c.id === id)
  const acc = (id: string | null) => data.accounts.find((a) => a.id === id)

  // the next bill going out, for the line under the total
  const nextOut = active.filter((r) => r.kind !== 'income').sort((a, b) => a.next_due.localeCompare(b.next_due))[0]

  async function pay(r: Recurring) {
    setBusy(r.id)
    try {
      const { left } = await payBill(store, r)
      toast(paidMessage(r, r.amount, left), left === 0 || r.kind === 'income' ? 'cheer' : r.kind === 'giving' ? 'give' : 'happy')
    } catch (e) {
      toast((e as Error).message, 'worry')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      {active.length > 0 ? (
        <section className="hero hero-row">
          <div className="grow">
            <p className="eyebrow">Due in the next 30 days</p>
            <p className="hero-big num">{peso(due30)}</p>
            {nextOut && (
              <p className="hero-sub">
                Next: {nextOut.title} · {daysBetween(t, nextOut.next_due) <= 0 ? 'today' : `in ${daysBetween(t, nextOut.next_due)} ${daysBetween(t, nextOut.next_due) === 1 ? 'day' : 'days'}`}
              </p>
            )}
          </div>
          {in30 > 0 && (
            <div className="hero-side">
              <p className="eyebrow">Expected in</p>
              <p className="num hero-in">{peso(in30)}</p>
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
          const card = r.kind === 'transfer'
          const route = card ? `${acc(r.account_id)?.name ?? '?'} → ${acc(r.to_account_id ?? null)?.name ?? '?'}` : acc(r.account_id)?.name
          const left = paymentsLeftLabel(r)
          return (
            <li key={r.id} className="card" style={{ padding: 14 }}>
              <button className="row" style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setEditing(r)} aria-label={`Edit ${r.title}`}>
                <Tile icon={card ? 'card' : cat(r.category_id)?.icon ?? 'calendar'} tone={r.kind === 'income' ? 'good' : r.kind === 'giving' ? 'gold' : undefined} />
                <div className="grow">
                  <p className="item-title ellipsis">{r.title}</p>
                  <p className="item-sub ellipsis">{[frequencyLabel(r), route].filter(Boolean).join(' · ')}</p>
                </div>
                <span style={{ textAlign: 'right' }}>
                  <span className={`amount${r.kind === 'income' ? ' in' : ''}`} style={{ fontSize: 17, display: 'block' }}>{peso(r.amount)}</span>
                  {left && <span className="tiny muted" style={{ whiteSpace: 'nowrap' }}>{left}</span>}
                </span>
              </button>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                <span className="row small" style={{ gap: 6 }}>
                  <Glyph name="calendar" size={16} className="faint" />
                  {shortDate(r.next_due)}
                  <span className={`pill${days < 0 ? ' bad' : soon ? ' gold' : ''}`}>{dueLabel(r.next_due)}</span>
                </span>
                <button className={`btn sm${soon ? '' : ' soft'}`} onClick={() => pay(r)} disabled={busy === r.id}>
                  <Glyph name="check" size={16} />
                  {r.kind === 'income' ? 'Received' : r.payments_left === 1 ? 'Pay the last one' : 'Mark paid'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {paused.length > 0 && <p className="small muted" style={{ padding: '0 4px' }}>Paused: {paused.map((p) => p.title).join(', ')}</p>}
      {finished.length > 0 && (
        <p className="small muted" style={{ padding: '0 4px' }}>
          Fully paid:{' '}
          {finished.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <button type="button" className="link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit' }} onClick={() => setEditing(p)}>{p.title}</button>
            </span>
          ))}
        </p>
      )}

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
  const ask = useConfirm()
  const store = useStore()
  const { data } = store
  const toast = useToast()
  const [title, setTitle] = useState(bill?.title ?? '')
  const [kind, setKind] = useState<BillKind>(bill?.kind ?? 'expense')
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [categoryId, setCategoryId] = useState(bill?.category_id ?? '')
  const [accountId, setAccountId] = useState(bill?.account_id ?? data.accounts.find((a) => !a.archived && a.kind !== 'card')?.id ?? data.accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(bill?.to_account_id ?? '')
  const [left, setLeft] = useState(bill?.payments_left != null ? String(bill.payments_left) : '')
  const [frequency, setFrequency] = useState<Frequency>(bill?.frequency ?? 'monthly')
  const [every, setEvery] = useState(String(bill?.every ?? 1))
  const [nextDue, setNextDue] = useState(bill?.next_due ?? today())
  const [active, setActive] = useState(bill?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const card = kind === 'transfer'
  const cats = card ? [] : data.categories.filter((c) => c.kind === kind && !c.archived)
  const open = data.accounts.filter((a) => !a.archived)
  // card payments go to a card or pay-later account; show those first
  const targets = [...open.filter((a) => a.kind === 'card'), ...open.filter((a) => a.kind !== 'card')].filter((a) => a.id !== accountId)

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(amount)
    if (!title.trim()) return setError('Give it a name.')
    if (!v) return setError('Enter the amount.')
    const n = Math.max(1, Math.min(52, Math.round(Number(every) || 1)))
    if (card && !toAccountId) return setError('Pick the card or pay-later account this pays.')
    if (card && toAccountId === accountId) return setError('Pay from a different account than the card.')
    const count = left.trim() === '' ? null : Math.round(Number(left))
    if (count != null && (!Number.isFinite(count) || count < 0 || count > 999)) return setError('Payments left should be a number, or blank if it doesn’t end.')
    const row: Partial<Recurring> = {
      title: title.trim(),
      kind,
      amount: v,
      category_id: card ? null : categoryId || null,
      account_id: accountId || null,
      frequency,
      every: n,
      next_due: nextDue,
      // a finished bill given more payments starts reminding again
      active: count != null && count > 0 && bill?.payments_left === 0 ? true : count === 0 ? false : active,
      note: null,
      // only sent when used, so ordinary bills save the same way as before
      ...((card || bill?.to_account_id) && { to_account_id: card ? toAccountId : null }),
      ...((count != null || bill?.payments_left != null) && { payments_left: count }),
    }
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
    if (!bill || !(await ask({ title: `Delete ${bill.title}?`, body: 'Past payments stay in Activity.' }))) return
    await store.remove('recurring', bill.id)
    toast('Bill deleted', 'nod')
    onClose()
  }

  return (
    <Sheet title={bill ? bill.title : 'Add a bill'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="seg" role="group" aria-label="Kind">
          {(['expense', 'income', 'giving', 'transfer'] as const).map((k) => (
            <button type="button" key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setCategoryId('') }}>
              {k === 'expense' ? 'Bill' : k === 'income' ? 'Income' : k === 'giving' ? 'Giving' : 'Card'}
            </button>
          ))}
        </div>
        {card && <p className="small muted" style={{ margin: '-4px 4px 0' }}>A payment to a credit card or pay-later (Atome, SPayLater). Marking it paid moves the money to the card, so it isn’t counted as spending twice.</p>}
        <div className="field">
          <label htmlFor="r-title">Name</label>
          <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'income' ? 'Salary' : kind === 'giving' ? 'Monthly missions support' : card ? 'Atome, SPayLater…' : 'Meralco, rent, Netflix…'} maxLength={60} required />
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
          {card ? (
            <div className="field">
              <label htmlFor="r-to">Card</label>
              <select id="r-to" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
                <option value="">Choose…</option>
                {targets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="r-cat">Category</label>
              <select id="r-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">None</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="field">
            <label htmlFor="r-acc">{kind === 'income' ? 'Into' : 'Paid from'}</label>
            <select id="r-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {open.filter((a) => !card || a.id !== toAccountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        {card && !open.some((a) => a.kind === 'card') && (
          <p className="small muted" style={{ margin: '-4px 4px 0' }}>Tip: add Atome or SPayLater in Settings → Accounts as a “Card / pay later” account first.</p>
        )}
        <div className="field">
          <label htmlFor="r-left">Payments left <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <input id="r-left" inputMode="numeric" value={left} onChange={(e) => setLeft(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Leave blank if it doesn’t end" />
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
