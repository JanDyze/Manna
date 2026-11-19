import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLookups, useStore } from '../lib/store'
import type { Debt, Direction } from '../lib/types'
import { debtLeft, parseAmount, peso } from '../lib/money'
import { addDays, addMonths, dueLabel, shortDate, today } from '../lib/dates'
import { DateField } from '../components/DateField'
import { addDebt } from '../lib/actions'
import { Bar, initials } from '../components/Bits'
import { Glyph } from '../components/Glyph'
import { Mascot } from '../components/Mascot'
import { Sheet } from '../components/Sheet'
import { MoneyField } from '../components/Pickers'
import { useToast } from '../components/Toast'

export function OwedPage() {
  const { data } = useStore()
  const look = useLookups()
  const [adding, setAdding] = useState(false)
  const [showSettled, setShowSettled] = useState(false)

  const open = data.debts.filter((d) => !d.closed_at)
  const settled = data.debts.filter((d) => d.closed_at)
  const toMe = open.filter((d) => d.direction === 'owed_to_me')
  const byMe = open.filter((d) => d.direction === 'i_owe')
  const sum = (ds: Debt[]) => ds.reduce((s, d) => s + debtLeft(d, data.transactions), 0)
  const people = (ds: Debt[]) => new Set(ds.map((d) => d.person_id)).size
  const inSum = sum(toMe)
  const outSum = sum(byMe)

  const row = (d: Debt) => {
    const left = debtLeft(d, data.transactions)
    const paidPct = d.closed_at ? 100 : ((d.principal - left) / d.principal) * 100
    const name = look.person.get(d.person_id)?.name ?? '—'
    const late = !d.closed_at && d.due_on && d.due_on < today()
    return (
      <li key={d.id}>
        <Link to={`/owed/${d.id}`} className="item">
          <span className="tile round">{initials(name)}</span>
          <div className="grow">
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <p className="item-title ellipsis">{name}</p>
              <span className={`amount ${d.closed_at ? 'move' : d.direction === 'owed_to_me' ? 'in' : 'bad'}`}>{d.closed_at ? 'Settled' : peso(left)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
              <p className="item-sub ellipsis">{d.title}</p>
              <p className={`tiny${late ? ' bad' : ' muted'}`} style={{ whiteSpace: 'nowrap' }}>{d.closed_at ? '' : d.due_on ? `${shortDate(d.due_on)} · ${dueLabel(d.due_on)}` : 'No due date'}</p>
            </div>
            <div style={{ marginTop: 7 }}>
              <Bar pct={paidPct} tone={d.direction === 'owed_to_me' ? 'good' : undefined} label={`${Math.round(paidPct)}% paid back`} />
            </div>
          </div>
        </Link>
      </li>
    )
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Owed</h1>
        <button className="icon-btn" aria-label="Add a loan" onClick={() => setAdding(true)}>
          <Glyph name="plus" size={24} />
        </button>
      </div>

      <section className="hero owed-hero">
        <div className="owed-cols">
          <div>
            <p className="eyebrow">Owed to you</p>
            <p className="hero-mid num is-in">{peso(inSum)}</p>
            <p className="hero-sub">{people(toMe)} {people(toMe) === 1 ? 'person' : 'people'}</p>
          </div>
          <div className="owed-right">
            <p className="eyebrow">You owe</p>
            <p className="hero-mid num is-out">{peso(outSum)}</p>
            <p className="hero-sub">{people(byMe)} {people(byMe) === 1 ? 'person' : 'people'}</p>
          </div>
        </div>
        {inSum + outSum > 0 && (
          <>
            <div className="owed-split" aria-hidden="true">
              <span className="in" style={{ flexGrow: inSum }} />
              <span className="out" style={{ flexGrow: outSum }} />
            </div>
            <p className="hero-foot">
              {inSum === outSum ? 'It evens out.' : inSum > outSum ? `${peso(inSum - outSum)} more is coming back to you than you owe` : `You owe ${peso(outSum - inSum)} more than is owed to you`}
            </p>
          </>
        )}
      </section>

      {open.length === 0 && (
        <div className="empty">
          <Mascot action={settled.length ? 'happy' : 'idle'} size={100} />
          <p>{settled.length ? 'All square. No one owes anyone right now.' : 'Lent money to someone, or borrowed some? Add it here so neither of you forgets.'}</p>
        </div>
      )}

      {toMe.length > 0 && (
        <section className="card flush">
          <p className="eyebrow" style={{ paddingTop: 12 }}>They owe you</p>
          <ul className="list">{toMe.map(row)}</ul>
        </section>
      )}
      {byMe.length > 0 && (
        <section className="card flush">
          <p className="eyebrow" style={{ paddingTop: 12 }}>You owe</p>
          <ul className="list">{byMe.map(row)}</ul>
        </section>
      )}

      <button className="btn soft block" onClick={() => setAdding(true)}>
        <Glyph name="plus" size={18} />
        Add a loan
      </button>

      {settled.length > 0 && (
        <>
          <button className="link" style={{ alignSelf: 'center' }} onClick={() => setShowSettled(!showSettled)}>
            {showSettled ? 'Hide' : 'Show'} settled ({settled.length})
          </button>
          {showSettled && <ul className="card flush list">{settled.map(row)}</ul>}
        </>
      )}

      <figure className="verse" style={{ margin: 0 }}>
        <p>“Owe no man any thing, but to love one another.”</p>
        <cite>Romans 13:8</cite>
      </figure>

      {adding && <DebtSheet onClose={() => setAdding(false)} />}
    </div>
  )
}

export function DebtSheet({ onClose, debt }: { onClose: () => void; debt?: Debt }) {
  const store = useStore()
  const { data } = store
  const toast = useToast()
  const person = debt ? data.people.find((p) => p.id === debt.person_id) : undefined
  const [direction, setDirection] = useState<Direction>(debt?.direction ?? 'owed_to_me')
  const [name, setName] = useState(person?.name ?? '')
  const [title, setTitle] = useState(debt?.title ?? '')
  const [amount, setAmount] = useState(debt ? String(debt.principal) : '')
  const [startedOn, setStartedOn] = useState(debt?.started_on ?? today())
  const [dueOn, setDueOn] = useState(debt?.due_on ?? '')
  const [record, setRecord] = useState(true)
  const [accountId, setAccountId] = useState(data.accounts.find((a) => !a.archived)?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(amount)
    if (!name.trim()) return setError('Who is it with?')
    if (!title.trim()) return setError('What was it for?')
    if (!v) return setError('Enter the amount.')
    setBusy(true)
    try {
      if (debt) {
        if (person && person.name !== name.trim()) await store.update('people', person.id, { name: name.trim() })
        await store.update('debts', debt.id, { title: title.trim(), principal: v, started_on: startedOn, due_on: dueOn || null })
        toast('Loan updated', 'nod')
      } else {
        await addDebt(store, { personName: name, direction, title, principal: v, startedOn, dueOn: dueOn || null, note: null, accountId: record ? accountId : null })
        toast(direction === 'owed_to_me' ? `${name.trim()} owes you ${peso(v)}` : `You owe ${name.trim()} ${peso(v)}`, 'nod')
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet title={debt ? 'Edit loan' : 'Add a loan'} onClose={onClose}>
      <form onSubmit={save}>
        {!debt && (
          <div className="seg" role="group" aria-label="Which way">
            <button type="button" aria-pressed={direction === 'owed_to_me'} onClick={() => setDirection('owed_to_me')}>I lent money</button>
            <button type="button" aria-pressed={direction === 'i_owe'} onClick={() => setDirection('i_owe')}>I borrowed</button>
          </div>
        )}
        <div className="field">
          <label htmlFor="d-name">{direction === 'owed_to_me' ? 'Lent to' : 'Borrowed from'}</label>
          <input id="d-name" list="d-people" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={60} required />
          <datalist id="d-people">
            {data.people.map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="d-title">For</label>
          <input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tuition, concert ticket, lunch…" maxLength={80} required />
        </div>
        <MoneyField id="d-amt" label="Amount" value={amount} onChange={setAmount} required />
        <DateField label="On" value={startedOn} onChange={(v) => setStartedOn(v || today())} max={today()} presets={[{ label: 'Today', value: today() }, { label: 'Yesterday', value: addDays(today(), -1) }]} />
        <DateField
          label="Pay back by"
          optional
          value={dueOn}
          onChange={setDueOn}
          min={startedOn}
          presets={[
            { label: 'In a week', value: addDays(today(), 7) },
            { label: 'In 2 weeks', value: addDays(today(), 14) },
            { label: 'In a month', value: addMonths(today(), 1) },
          ]}
        />
        {!debt && (
          <>
            <label className="switch">
              <input type="checkbox" checked={record} onChange={(e) => setRecord(e.target.checked)} />
              <span className="grow">
                {direction === 'owed_to_me' ? 'Take it out of an account' : 'Put it into an account'}
                <span className="hint" style={{ display: 'block' }}>Turn off for an old loan that’s already reflected in your balances</span>
              </span>
            </label>
            {record && (
              <div className="field">
                <label htmlFor="d-acc">{direction === 'owed_to_me' ? 'From' : 'Into'}</label>
                <select id="d-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {data.accounts.filter((a) => !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" disabled={busy}>Save</button>
      </form>
    </Sheet>
  )
}
