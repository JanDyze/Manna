import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useLookups, useStore } from '../lib/store'
import type { Tx } from '../lib/types'
import { debtLeft, monthTotals, peso } from '../lib/money'
import { fromISODate, monthLabel, monthOf, today } from '../lib/dates'
import { accountVerb, canCopy, copyOf, entryTitle, kindLabel, type Look } from '../lib/entry'
import { removePhoto } from '../lib/photos'
import { Glyph } from './Glyph'
import { Mascot, type MascotAction } from './Mascot'
import { Thumb } from './Photo'
import { AccountMark, TxAmount, txIcon, txTile } from './Bits'
import { useToast } from './Toast'

const longDate = (s: string) => fromISODate(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

/**
 * One entry, read-only, as a little paper receipt in a bottom sheet. Editing is a deliberate tap on Edit.
 * Drag the top down, tap outside, or press Escape to put it away.
 */
export function EntrySheet({ id, onClose }: { id: string; onClose: () => void }) {
  const store = useStore()
  const { data } = store
  const look = useLookups()
  const nav = useNavigate()
  const toast = useToast()
  const t = data.transactions.find((x) => x.id === id)
  const [leaving, setLeaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(0)
  const dragFrom = useRef<number | null>(null)
  const sheet = useRef<HTMLDivElement>(null)

  /** slide away, then let the page forget it */
  function close() {
    if (leaving) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    setLeaving(true)
    window.setTimeout(onClose, 200)
  }

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', key)
    sheet.current?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', key)
      prev?.focus?.({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "tap again to delete" quietly takes itself back
  useEffect(() => {
    if (!confirm) return
    const tm = window.setTimeout(() => setConfirm(false), 3200)
    return () => window.clearTimeout(tm)
  }, [confirm])

  if (!t) return null

  async function again() {
    if (!t) return
    setBusy(true)
    try {
      await store.insert('transactions', copyOf(t, today()))
      toast(`Added again for today · ${peso(t.amount)}`, 'happy')
      close()
    } catch (e) {
      toast((e as Error).message, 'worry')
      setBusy(false)
    }
  }

  async function del() {
    if (!t) return
    if (!confirm) return setConfirm(true)
    setBusy(true)
    try {
      await store.remove('transactions', t.id)
      void removePhoto(t.receipt_path)
      toast('Deleted', 'nod')
      close()
    } catch (e) {
      toast((e as Error).message, 'worry')
      setBusy(false)
    }
  }

  // drag the top of the sheet down to put it away
  function down(e: RPointerEvent<HTMLDivElement>) {
    dragFrom.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function move(e: RPointerEvent<HTMLDivElement>) {
    if (dragFrom.current == null) return
    setDrag(Math.max(0, e.clientY - dragFrom.current))
  }
  function up() {
    if (dragFrom.current == null) return
    dragFrom.current = null
    if (drag > 90) close()
    else setDrag(0)
  }

  const cat = t.category_id ? look.category.get(t.category_id) : undefined
  const acc = look.account.get(t.account_id)
  const to = t.to_account_id ? look.account.get(t.to_account_id) : undefined
  const debt = t.debt_id ? look.debt.get(t.debt_id) : undefined
  const person = debt ? look.person.get(debt.person_id) : undefined
  const bill = t.recurring_id ? data.recurring.find((r) => r.id === t.recurring_id) : undefined
  const history = t.affects_balance === false
  const note = insight(t, data, look)

  return createPortal(
    <>
      <div className={`sheet-backdrop${leaving ? ' is-leaving' : ''}`} onClick={close} />
      <div
        ref={sheet}
        tabIndex={-1}
        className={`sheet entry-sheet${leaving ? ' is-leaving' : ''}${drag ? ' is-dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${entryTitle(t, look)} details`}
        style={drag ? { transform: `translate(-50%, ${drag}px)` } : undefined}
      >
        <div className="sheet-drag" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="sheet-grip" />
        </div>

        <div className="ticket-wrap">
          <article className={`ticket ticket-${t.kind}`}>
            <div className="ticket-top">
              <span className={`${txTile(t)} ticket-tile`}>
                <Glyph name={txIcon(t, cat)} size={26} />
              </span>
              <span className="ticket-pills">
                <span className={`pill ${t.kind === 'income' || t.kind === 'debt_in' ? 'good' : t.kind === 'giving' ? 'gold' : ''}`}>{kindLabel(t, look)}</span>
                {history && <span className="pill">History only</span>}
              </span>
              <button type="button" className="icon-btn ticket-x" aria-label="Close" onClick={close}>
                <Glyph name="close" size={20} />
              </button>
            </div>

            <h2 className="ticket-title">{entryTitle(t, look)}</h2>
            <p className="ticket-amt num">
              <TxAmount tx={t} />
            </p>
            <p className="ticket-date">{longDate(t.occurred_on)}</p>

            <div className="ticket-tear" aria-hidden="true" />

            <dl className="ticket-rows">
              {cat && (
                <div>
                  <dt>Category</dt>
                  <dd>
                    <Glyph name={cat.icon} size={16} /> {cat.name}
                  </dd>
                </div>
              )}
              {acc && (
                <div>
                  <dt>{accountVerb(t)}</dt>
                  <dd>
                    <AccountMark name={acc.name} kind={acc.kind} size={18} /> {acc.name}
                  </dd>
                </div>
              )}
              {to && (
                <div>
                  <dt>To</dt>
                  <dd>
                    <AccountMark name={to.name} kind={to.kind} size={18} /> {to.name}
                  </dd>
                </div>
              )}
              {debt && (
                <div>
                  <dt>Loan</dt>
                  <dd>
                    <Link to={`/owed/${debt.id}`} className="ticket-link">
                      {debt.title}
                      {person && <span className="faint"> · {person.name}</span>}
                      <Glyph name="fwd" size={14} />
                    </Link>
                  </dd>
                </div>
              )}
              {bill && (
                <div>
                  <dt>Bill</dt>
                  <dd>
                    <Link to="/plan/bills" className="ticket-link">
                      <Glyph name="repeat" size={14} /> {bill.title}
                      <Glyph name="fwd" size={14} />
                    </Link>
                  </dd>
                </div>
              )}
              {history && (
                <div>
                  <dt>Balances</dt>
                  <dd className="muted">Counted in totals, not in balances</dd>
                </div>
              )}
              {t.receipt_path && (
                <div className="ticket-receipt">
                  <dt>Receipt</dt>
                  <dd>
                    <Thumb path={t.receipt_path} size={64} />
                  </dd>
                </div>
              )}
            </dl>

            {note && (
              <div className="ticket-katy">
                <Mascot action={note.mood} size={40} label="" />
                <p className="hand">{note.text}</p>
              </div>
            )}
          </article>
        </div>

        <div className="entry-actions">
          <button type="button" className={`btn danger${confirm ? ' is-armed' : ''}`} onClick={del} disabled={busy} aria-label={confirm ? 'Tap again to delete' : 'Delete'}>
            <Glyph name="trash" size={18} />
            {confirm && <span>Tap again</span>}
          </button>
          {canCopy(t) && (
            <button type="button" className="btn soft" onClick={again} disabled={busy}>
              <Glyph name="repeat" size={18} /> Again today
            </button>
          )}
          <button type="button" className="btn grow-btn" onClick={() => nav(`/add/${t.id}`)} disabled={busy}>
            <Glyph name="pen" size={18} /> Edit
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}

/** A line from KATY that puts the entry in context: the budget it came out of, the tithe on it, a loan's progress. */
function insight(t: Tx, data: ReturnType<typeof useStore>['data'], look: Look): { text: string; mood: MascotAction } | null {
  const month = monthOf(t.occurred_on)
  const mName = monthLabel(month, false)
  if (t.kind === 'expense' && t.category_id) {
    const cat = look.category.get(t.category_id)
    const spent = monthTotals(data.transactions, month).byCategory.get(t.category_id) ?? 0
    const b = data.budgets.find((x) => x.category_id === t.category_id)
    if (b && cat) {
      const left = b.amount - spent
      return left >= 0
        ? { text: `${cat.name}: ${peso(left)} left of ${peso(b.amount)} for ${mName}.`, mood: left / b.amount < 0.15 ? 'alert' : 'nod' }
        : { text: `${cat.name} went ${peso(-left)} over its ${peso(b.amount)} for ${mName}.`, mood: 'worry' }
    }
    const n = data.transactions.filter((x) => x.kind === 'expense' && x.category_id === t.category_id && monthOf(x.occurred_on) === month).length
    if (cat && n > 1) return { text: `${n} ${cat.name} entries in ${mName}, ${peso(spent)} in all.`, mood: 'think' }
    return null
  }
  if (t.kind === 'income' && data.settings.tithe_percent > 0)
    return { text: `The ${data.settings.tithe_percent}% tithe on this is ${peso((t.amount * data.settings.tithe_percent) / 100)}.`, mood: 'give' }
  if (t.kind === 'giving') return { text: `${peso(monthTotals(data.transactions, month).given)} given in ${mName}. God loves a cheerful giver.`, mood: 'happy' }
  if (t.debt_id) {
    const d = look.debt.get(t.debt_id)
    if (!d) return null
    const left = debtLeft(d, data.transactions)
    return left > 0 ? { text: `${peso(left)} still to go on this loan.`, mood: 'think' } : { text: 'This loan is all settled.', mood: 'cheer' }
  }
  return null
}
