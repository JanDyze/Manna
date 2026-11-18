import { useLayoutEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import type { CategoryKind, Tx, TxKind } from '../lib/types'
import { balances, monthTotals, parseAmount, peso } from '../lib/money'
import { addDays, addMonths, monthOf, today } from '../lib/dates'
import { DateField } from '../components/DateField'
import { Glyph } from '../components/Glyph'
import { goBack } from '../lib/back'
import { AccountChips, CategoryGrid } from '../components/Pickers'
import { useToast } from '../components/Toast'
import { PickPhoto, Thumb } from '../components/Photo'
import { removePhoto, type Photo } from '../lib/photos'
import { ask, keepPhoto } from '../lib/assistant'
import { mock } from '../lib/mock'
import { morph, morphing, settled } from '../lib/morph'

const KINDS: { kind: TxKind; label: string }[] = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'income', label: 'Income' },
  { kind: 'giving', label: 'Giving' },
  { kind: 'transfer', label: 'Transfer' },
]
const SAVE_LABEL: Partial<Record<TxKind, string>> = { expense: 'Save expense', income: 'Save income', giving: 'Save giving', transfer: 'Save transfer' }

/** The form comes one step at a time: how much, then what for, then where from and when. */
type Step = 'amount' | 'what' | 'where'

/** Add or edit one entry, in three short steps. Loan payments are edited here too, but their kind stays fixed. */
export function AddPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const toast = useToast()
  const editing = id ? data.transactions.find((t) => t.id === id) : undefined

  const accounts = data.accounts.filter((a) => !a.archived || a.id === editing?.account_id || a.id === editing?.to_account_id).sort((a, b) => a.sort - b.sort)
  const startKind = (editing?.kind ?? (params.get('kind') as TxKind | null) ?? 'expense') as TxKind
  const [kind, setKind] = useState<TxKind>(startKind)
  const [amount, setAmount] = useState(editing ? String(editing.amount) : (params.get('amount') ?? ''))
  const [note, setNote] = useState(editing?.note ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(editing?.category_id ?? null)
  const [accountId, setAccountId] = useState<string | null>(editing?.account_id ?? accounts[0]?.id ?? null)
  const [toAccountId, setToAccountId] = useState<string | null>(editing?.to_account_id ?? accounts[1]?.id ?? null)
  const [date, setDate] = useState(editing?.occurred_on ?? today())
  const [repeat, setRepeat] = useState(false)
  // history only: a past entry the balances already include (counts in totals, leaves balances alone)
  const [history, setHistory] = useState(editing?.affects_balance === false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // the receipt: a new photo picked here, or the one already kept with the entry
  const [receipt, setReceipt] = useState<Photo | null>(null)
  const [keptPath, setKeptPath] = useState<string | null>(editing?.receipt_path ?? null)
  const [reading, setReading] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)

  const isLoan = kind === 'debt_in' || kind === 'debt_out'
  const catKind = (kind === 'income' || kind === 'giving' ? kind : 'expense') as CategoryKind
  const cats = data.categories.filter((c) => c.kind === catKind && (!c.archived || c.id === categoryId)).sort((a, b) => a.sort - b.sort)
  const bal = useMemo(() => balances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const value = parseAmount(amount)

  // steps: loan payments have no category, so they skip "what"
  const steps: Step[] = isLoan ? ['amount', 'where'] : ['amount', 'what', 'where']
  const [stepIx, setStepIx] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const step = steps[Math.min(stepIx, steps.length - 1)]
  const last = stepIx >= steps.length - 1
  const stepLabel = (s: Step) => (s === 'amount' ? 'Amount' : s === 'what' ? (kind === 'transfer' ? 'Accounts' : 'Category') : 'Details')
  // rise in on its own, unless it's already growing out of the add button
  const [rise] = useState(() => !morphing())
  useLayoutEffect(() => settled(), [])
  const close = () => morph('close', () => goBack(nav))

  /** What's still missing on a step, if anything. */
  function missing(s: Step): string | null {
    if (s === 'amount') return value ? null : 'Enter an amount.'
    if (s === 'what') {
      if (kind !== 'transfer') return categoryId ? null : 'Pick a category.'
      if (!accountId) return 'Pick an account.'
      return !toAccountId || toAccountId === accountId ? 'Pick a different account to move the money to.' : null
    }
    return kind !== 'transfer' && !accountId ? 'Pick an account.' : null
  }

  /** Move to a step. Going forward, each step on the way must be filled in first. */
  function goTo(i: number) {
    for (let k = stepIx; k < i; k++) {
      const m = missing(steps[k])
      if (m) {
        setError(m)
        if (k !== stepIx) (setDir(1), setStepIx(k))
        return
      }
    }
    setError(null)
    setDir(i >= stepIx ? 1 : -1)
    setStepIx(i)
    window.scrollTo({ top: 0 })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (last) void save()
    else goTo(stepIx + 1)
  }

  // "Food: ₱1,390 left this month after this"
  const budgetHint = useMemo(() => {
    if (kind !== 'expense' || !categoryId) return null
    const b = data.budgets.find((x) => x.category_id === categoryId)
    if (!b) return null
    const totals = monthTotals(data.transactions.filter((t) => t.id !== editing?.id), monthOf(date))
    const left = b.amount - (totals.byCategory.get(categoryId) ?? 0) - (value ?? 0)
    const name = data.categories.find((c) => c.id === categoryId)?.name
    return { name, left }
  }, [kind, categoryId, data.budgets, data.transactions, data.categories, date, value, editing?.id])

  function pickKind(k: TxKind) {
    setKind(k)
    if (data.categories.find((c) => c.id === categoryId)?.kind !== k) setCategoryId(null)
  }

  /** A receipt was picked. On a new, empty entry KATY reads it and fills the form in. */
  async function gotReceipt(p: Photo, read: boolean) {
    setReceipt(p)
    setError(null)
    setHeard(null)
    if (!read) return
    if (mock) return setHeard('In the demo I can’t read receipts yet. I kept the photo; type the total.')
    setReading(true)
    try {
      const out = await ask('', [], data, p)
      const e = out.entries.find((x) => x.kind === 'expense' || x.kind === 'income' || x.kind === 'giving')
      if (!e) return setHeard(out.reply || 'I couldn’t make out the total. Type it in and I’ll keep the photo.')
      setKind(e.kind as TxKind)
      setAmount(String(e.amount))
      if (e.note) setNote(e.note)
      if (e.category_id) setCategoryId(e.category_id)
      if (e.account_id) setAccountId(e.account_id)
      if (e.occurred_on) setDate(e.occurred_on)
      setHeard(out.reply || 'Filled in from the receipt. Check it before saving.')
    } catch (err) {
      setHeard((err as Error).message)
    } finally {
      setReading(false)
    }
  }

  async function save() {
    setError(null)
    // anything missing: go back to the step it belongs to
    for (let k = 0; k < steps.length; k++) {
      const m = missing(steps[k])
      if (m) {
        setError(m)
        if (k !== stepIx) (setDir(k > stepIx ? 1 : -1), setStepIx(k))
        return
      }
    }
    if (!value || !accountId) return
    const row: Partial<Tx> = {
      kind,
      amount: value,
      occurred_on: date,
      account_id: accountId,
      to_account_id: kind === 'transfer' ? toAccountId : null,
      category_id: kind === 'transfer' || isLoan ? null : categoryId,
      note: note.trim() || null,
      // only sent when it matters, so rows keep the database default
      ...((history || editing?.affects_balance === false) && { affects_balance: !history }),
    }
    setBusy(true)
    try {
      row.receipt_path = receipt ? await keepPhoto(data.settings.user_id, receipt) : keptPath
      if (editing) {
        await store.update('transactions', editing.id, row)
        if (editing.receipt_path && editing.receipt_path !== row.receipt_path) void removePhoto(editing.receipt_path)
      } else {
        await store.insert('transactions', { ...row, debt_id: null, recurring_id: null })
        if (repeat && kind !== 'transfer') {
          await store.insert('recurring', {
            title: note.trim() || data.categories.find((c) => c.id === categoryId)?.name || 'Bill',
            kind: kind as CategoryKind,
            amount: value,
            account_id: accountId,
            category_id: categoryId,
            frequency: 'monthly',
            every: 1,
            next_due: addMonths(date, 1),
            active: true,
            note: null,
          })
        }
      }
      const reaction = kind === 'income' ? 'cheer' : kind === 'giving' ? 'give' : 'nod'
      toast(editing ? 'Updated' : history ? `Kept for the record · ${peso(value)}` : kind === 'giving' ? `Given · ${peso(value)}` : `Saved · ${peso(value)}`, reaction)
      close()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function remove() {
    if (!editing || !confirm('Delete this entry?')) return
    setBusy(true)
    try {
      await store.remove('transactions', editing.id)
      void removePhoto(editing.receipt_path)
      toast('Deleted', 'nod')
      close()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (id && !editing) {
    return (
      <div className="page">
        <p className="muted">That entry isn’t here anymore.</p>
        <Link to="/activity" className="btn soft">Back to Activity</Link>
      </div>
    )
  }

  const kindLabel = KINDS.find((k) => k.kind === kind)?.label ?? 'Loan payment'
  const catName = data.categories.find((c) => c.id === categoryId)?.name
  const noteLabel = kind === 'income' ? 'From' : kind === 'transfer' ? 'Note' : 'What for?'
  const hint = budgetHint && (
    <p className="small muted" style={{ textAlign: 'center' }}>
      {budgetHint.name}:{' '}
      <strong className={budgetHint.left < 0 ? 'bad' : undefined} style={budgetHint.left < 0 ? undefined : { color: 'var(--ink)' }}>
        {budgetHint.left < 0 ? `${peso(-budgetHint.left)} over` : `${peso(budgetHint.left)} left`}
      </strong>{' '}
      this month after this
    </p>
  )
  const noteField = (
    <div className="field">
      <label htmlFor="note">
        {noteLabel} <span className="faint">(optional)</span>
      </label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'income' ? 'Salary, sideline, gift…' : kind === 'giving' ? 'Sunday tithe, missions…' : kind === 'transfer' ? 'Load GCash…' : 'Lunch, jeep fare…'} maxLength={120} />
    </div>
  )

  return (
    <form className={`page add-flow${rise ? ' rise' : ''}`} onSubmit={submit}>
      <div className="topbar">
        {stepIx > 0 ? (
          <button type="button" className="icon-btn" aria-label="Back" onClick={() => goTo(stepIx - 1)}>
            <Glyph name="back" size={24} />
          </button>
        ) : (
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <Glyph name="close" size={24} />
          </button>
        )}
        <p className="title-center">{editing ? (isLoan ? 'Loan payment' : 'Edit entry') : 'New entry'}</p>
        {editing ? (
          <button type="button" className="icon-btn" aria-label="Delete" onClick={remove}>
            <Glyph name="trash" size={20} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <ol className="add-steps" style={{ '--n': steps.length } as CSSProperties} aria-label={`Step ${stepIx + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <li key={s} className={i < stepIx ? 'done' : i === stepIx ? 'now' : undefined}>
            <button type="button" onClick={() => goTo(i)} aria-current={i === stepIx ? 'step' : undefined}>
              <i aria-hidden="true" />
              <span>{stepLabel(s)}</span>
            </button>
          </li>
        ))}
      </ol>

      {stepIx > 0 && (
        <button type="button" className="add-recap" onClick={() => goTo(0)} aria-label="Change the amount">
          {kindLabel} · <strong className="num">{peso(value ?? 0)}</strong>
          {step === 'where' && kind !== 'transfer' && catName ? ` · ${catName}` : ''}
          <Glyph name="pen" size={14} />
        </button>
      )}

      <div className={`add-step${dir < 0 ? ' back' : ''}`} key={step}>
        {step === 'amount' && (
          <>
            {!isLoan && (
              <div className="seg" role="group" aria-label="Kind">
                {KINDS.map((k) => (
                  <button type="button" key={k.kind} aria-pressed={kind === k.kind} onClick={() => pickKind(k.kind)}>
                    {k.label}
                  </button>
                ))}
              </div>
            )}
            <div className="amount-entry">
              <label htmlFor="amount" className="eyebrow">How much?</label>
              <div className="row">
                <span className="cur">₱</span>
                <input id="amount" inputMode="decimal" enterKeyHint="next" autoComplete="off" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={!editing} style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }} />
              </div>
              {hint}
            </div>
            {!editing && !isLoan && (
              <div className="scan-row">
                <PickPhoto className="scan-btn" onPick={(p) => gotReceipt(p, !amount.trim())} onError={setError}>
                  <Glyph name="camera" size={18} /> Scan a receipt
                </PickPhoto>
                <Link to="/notes?new=1" replace className="add-note-link">
                  <Glyph name="pen" size={16} /> Not money yet? Add a note
                </Link>
              </div>
            )}
            {(reading || heard) && (
              <p className="small muted" role="status" aria-live="polite">
                {reading ? (
                  <span className="reading">KATY is reading the receipt <i /><i /><i /></span>
                ) : (
                  heard
                )}
              </p>
            )}
          </>
        )}

        {step === 'what' && kind !== 'transfer' && (
          <>
            <section>
              <p className="label" style={{ marginBottom: 8 }}>{kind === 'income' ? 'What came in?' : kind === 'giving' ? 'What are you giving to?' : 'What did you spend on?'}</p>
              <CategoryGrid categories={cats} value={categoryId} onChange={(c) => (setCategoryId(c), setError(null))} />
            </section>
            {hint}
            {noteField}
          </>
        )}

        {step === 'what' && kind === 'transfer' && (
          <>
            <section>
              <p className="label" style={{ marginBottom: 8 }}>From</p>
              <AccountChips accounts={accounts} value={accountId} onChange={setAccountId} balances={bal} label="Account" />
            </section>
            <section>
              <p className="label" style={{ marginBottom: 8 }}>To</p>
              <AccountChips accounts={accounts.filter((a) => a.id !== accountId)} value={toAccountId} onChange={setToAccountId} balances={bal} label="To account" />
            </section>
            {noteField}
          </>
        )}

        {step === 'where' && (
          <>
            {kind !== 'transfer' && (
              <section>
                <p className="label" style={{ marginBottom: 8 }}>{kind === 'income' || kind === 'debt_in' ? 'Into' : 'From'}</p>
                <AccountChips accounts={accounts} value={accountId} onChange={setAccountId} balances={bal} label="Account" />
              </section>
            )}

            <DateField label="Date" value={date} onChange={(v) => setDate(v || today())} max={addMonths(today(), 12)} presets={[{ label: 'Today', value: today() }, { label: 'Yesterday', value: addDays(today(), -1) }]} />

            <label className="switch">
              <input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />
              <span className="grow">
                Already in my balance
                <span className="hint" style={{ display: 'block' }}>For past entries: counts in this month’s totals, but won’t change the account’s balance</span>
              </span>
            </label>

            {!editing && kind !== 'transfer' && !isLoan && (
              <label className="switch">
                <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
                <span className="grow">
                  Repeat every month
                  <span className="hint" style={{ display: 'block' }}>Adds it to Bills so Manna reminds you next time</span>
                </span>
              </label>
            )}

            {!isLoan && (
              <div className="receipt-field">
                {receipt || keptPath ? (
                  <Thumb src={receipt?.url} path={receipt ? null : keptPath} size={52} />
                ) : (
                  <span className="tile">
                    <Glyph name="receipt" size={20} />
                  </span>
                )}
                <div className="grow">
                  <p className="label">Receipt</p>
                  <p className="tiny muted">{receipt || keptPath ? 'Tap the photo to see it' : 'Keep a photo with this entry'}</p>
                </div>
                <PickPhoto className="btn soft sm" onPick={(p) => gotReceipt(p, false)} onError={setError}>
                  {receipt || keptPath ? 'Replace' : 'Add photo'}
                </PickPhoto>
                {(receipt || keptPath) && (
                  <button type="button" className="icon-btn" aria-label="Remove the receipt" onClick={() => (setReceipt(null), setKeptPath(null))}>
                    <Glyph name="trash" size={18} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="add-foot">
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          {editing && !last && (
            <button type="button" className="btn soft" disabled={busy} onClick={() => void save()}>
              Save
            </button>
          )}
          <button className="btn" disabled={busy}>
            {last ? (editing ? 'Save changes' : (SAVE_LABEL[kind] ?? 'Save')) : 'Continue'}
          </button>
        </div>
      </div>
    </form>
  )
}
