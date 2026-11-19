import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLookups, useStore } from '../lib/store'
import type { Debt } from '../lib/types'
import { debtLeft, debtPaid, parseAmount, peso } from '../lib/money'
import { addDays, dayLabel, dueLabel, shortDate, today } from '../lib/dates'
import { DateField } from '../components/DateField'
import { forgiveDebt, recordPayment, reopenDebt } from '../lib/actions'
import { goBack } from '../lib/back'
import { Bar, TxAmount } from '../components/Bits'
import { Glyph } from '../components/Glyph'
import { Mascot } from '../components/Mascot'
import { useConfirm } from '../components/Confirm'
import { Sheet } from '../components/Sheet'
import { MoneyField } from '../components/Pickers'
import { useToast } from '../components/Toast'
import { DebtSheet } from './OwedPage'

export function DebtPage() {
  const { id } = useParams()
  const store = useStore()
  const { data } = store
  const look = useLookups()
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const debt = data.debts.find((d) => d.id === id)

  if (!debt) {
    return (
      <div className="page">
        <div className="empty">
          <Mascot action="think" size={96} />
          <p>That loan isn’t here anymore.</p>
          <Link to="/owed" className="btn soft">Back to Owed</Link>
        </div>
      </div>
    )
  }

  const name = look.person.get(debt.person_id)?.name ?? 'Someone'
  const toMe = debt.direction === 'owed_to_me'
  const left = debtLeft(debt, data.transactions)
  const paid = debtPaid(debt, data.transactions)
  const history = data.transactions.filter((t) => t.debt_id === debt.id).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
  const forgiven = debt.closed_at && left === 0 && paid < debt.principal
  const reminder = `Hi ${name}! Just a friendly reminder about the ${peso(left)} for the ${debt.title.toLowerCase()}. No rush, and thank you!`

  async function remind() {
    try {
      if (navigator.share) await navigator.share({ text: reminder })
      else {
        await navigator.clipboard.writeText(reminder)
        toast('Reminder copied', 'nod')
      }
    } catch {
      // share sheet closed: nothing to do
    }
  }
  async function forgive() {
    const ok = await ask({
      title: `Forgive the ${peso(left)} ${name} still owes?`,
      body: 'The loan closes as forgiven.',
      yes: 'Forgive',
      tone: 'gold',
    })
    if (!ok) return
    await forgiveDebt(store, debt!)
    toast('Forgiven. That’s grace.', 'give')
  }
  async function remove() {
    const ok = await ask({ title: 'Delete this loan?', body: 'Its payments are deleted too. This can’t be undone.' })
    if (!ok) return
    for (const t of history) await store.remove('transactions', t.id)
    await store.remove('debts', debt!.id)
    toast('Loan deleted', 'nod')
    goBack(nav, '/owed')
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => goBack(nav, '/owed')}>
          <Glyph name="back" size={24} />
        </button>
        <button className="icon-btn" aria-label="Edit" onClick={() => setEditing(true)}>
          <Glyph name="pen" size={20} />
        </button>
      </div>

      <section style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 26, fontWeight: 600 }}>{name}</h1>
        <p className="muted">{debt.title} · {toMe ? 'owes you' : 'you owe'}</p>
      </section>

      <section className="card" style={{ textAlign: 'center' }}>
        {debt.closed_at ? (
          <div className="stack" style={{ alignItems: 'center' }}>
            <Mascot action={forgiven ? 'give' : 'happy'} size={88} />
            <p className="mid-num">{forgiven ? 'Forgiven' : 'Settled'}</p>
            <p className="small muted">{peso(paid)} paid back of {peso(debt.principal)}</p>
          </div>
        ) : (
          <>
            <p className="eyebrow">{toMe ? 'Still to collect' : 'Still to pay'}</p>
            <p className={`big-num num ${toMe ? 'good' : 'bad'}`}>{peso(left)}</p>
            <div style={{ margin: '12px 0 8px' }}>
              <Bar pct={(paid / debt.principal) * 100} thick tone={toMe ? 'good' : undefined} label="Paid back" />
            </div>
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span className="muted num">{peso(paid)} paid back of {peso(debt.principal)}</span>
              {debt.due_on && <span className={`pill${debt.due_on < today() ? ' bad' : ''}`}>{shortDate(debt.due_on)} · {dueLabel(debt.due_on)}</span>}
            </div>
          </>
        )}
      </section>

      {!debt.closed_at ? (
        <div className="grid-2">
          <button className="btn" onClick={() => setPaying(true)}>
            <Glyph name={toMe ? 'down' : 'up'} size={18} />
            {toMe ? 'Got paid' : 'Pay back'}
          </button>
          {toMe ? (
            <button className="btn soft" onClick={remind}>
              <Glyph name="message" size={18} />
              Remind
            </button>
          ) : (
            <Link className="btn soft" to="/plan/bills">
              <Glyph name="calendar" size={18} />
              Plan it
            </Link>
          )}
        </div>
      ) : (
        <button className="btn soft" onClick={() => reopenDebt(store, debt)}>Reopen</button>
      )}

      {toMe && !debt.closed_at && (
        <section className="card quiet">
          <p className="eyebrow">Reminder, ready to send</p>
          <p style={{ marginTop: 6 }}>{reminder}</p>
        </section>
      )}

      <section className="card flush">
        <p className="eyebrow" style={{ paddingTop: 12 }}>History</p>
        <ul className="list">
          {history.map((t) => (
            <li key={t.id}>
              <Link to={`/add/${t.id}`} className="item">
                <span className={t.kind === 'debt_in' ? 'tile good' : 'tile'}>
                  <Glyph name={t.kind === 'debt_in' ? 'down' : 'up'} size={20} />
                </span>
                <div className="grow">
                  <p className="item-title">{t.kind === 'debt_out' ? (toMe ? 'Lent' : 'Paid back') : toMe ? 'Paid back' : 'Borrowed'}</p>
                  <p className="item-sub">{dayLabel(t.occurred_on)} · {look.account.get(t.account_id)?.name}</p>
                </div>
                <TxAmount tx={t} />
              </Link>
            </li>
          ))}
          {history.length === 0 && <li className="item muted small">Started {shortDate(debt.started_on)}; no money recorded yet.</li>}
        </ul>
      </section>

      {!debt.closed_at && toMe && (
        <button className="link" style={{ alignSelf: 'center' }} onClick={forgive}>
          Forgive the rest
        </button>
      )}
      <button className="link" style={{ alignSelf: 'center', color: 'var(--bad)' }} onClick={remove}>
        Delete loan
      </button>

      {paying && <PaymentSheet debt={debt} left={left} onClose={() => setPaying(false)} />}
      {editing && <DebtSheet debt={debt} onClose={() => setEditing(false)} />}
    </div>
  )
}

function PaymentSheet({ debt, left, onClose }: { debt: Debt; left: number; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const toMe = debt.direction === 'owed_to_me'
  const [amount, setAmount] = useState(String(left))
  const [accountId, setAccountId] = useState(store.data.accounts.find((a) => !a.archived)?.id ?? '')
  const [on, setOn] = useState(today())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(amount)
    if (!v) return setError('Enter the amount.')
    if (v > left + 0.005) return setError(`Only ${peso(left)} is left on this loan.`)
    setBusy(true)
    try {
      await recordPayment(store, debt, v, accountId, on)
      const done = v >= left - 0.005
      toast(done ? (toMe ? 'Paid in full!' : 'Debt cleared! Praise God!') : `${peso(v)} ${toMe ? 'received' : 'paid'}`, done ? 'cheer' : 'happy')
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={toMe ? 'Got paid back' : 'Pay back'} onClose={onClose}>
      <form onSubmit={save}>
        <MoneyField id="p-amt" label="Amount" value={amount} onChange={setAmount} required hint={`${peso(left)} left`} />
        <div className="field">
          <label htmlFor="p-acc">{toMe ? 'Into' : 'From'}</label>
          <select id="p-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {store.data.accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <DateField label="On" value={on} onChange={(v) => setOn(v || today())} max={today()} presets={[{ label: 'Today', value: today() }, { label: 'Yesterday', value: addDays(today(), -1) }]} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" disabled={busy}>Save</button>
      </form>
    </Sheet>
  )
}
