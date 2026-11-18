import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLookups, useStore } from '../lib/store'
import type { Tx } from '../lib/types'
import { byDay, monthTotals, peso, signed } from '../lib/money'
import { dayLabel, monthLabel, monthOf, shiftMonth, thisMonth } from '../lib/dates'
import { Glyph } from '../components/Glyph'
import { Mascot } from '../components/Mascot'
import { TxAmount, txIcon, txTile } from '../components/Bits'
import { Reorder } from '../components/Reorder'
import { useToast } from '../components/Toast'

const FILTERS: { key: string; label: string; test: (t: Tx) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'spent', label: 'Spent', test: (t) => t.kind === 'expense' },
  { key: 'in', label: 'Received', test: (t) => t.kind === 'income' },
  { key: 'given', label: 'Given', test: (t) => t.kind === 'giving' },
  { key: 'moves', label: 'Transfers', test: (t) => t.kind === 'transfer' },
  { key: 'loans', label: 'Loans', test: (t) => t.kind === 'debt_in' || t.kind === 'debt_out' },
]

export function ActivityPage() {
  const { data, update } = useStore()
  const look = useLookups()
  const toast = useToast()
  const [month, setMonth] = useState(thisMonth())
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  /** the day being arranged by dragging */
  const [arranging, setArranging] = useState<string | null>(null)

  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month])
  const q = query.trim().toLowerCase()
  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)!.test
    return data.transactions.filter((t) => {
      if (q) {
        // searching looks across every month
        const cat = t.category_id ? look.category.get(t.category_id)?.name : ''
        const acc = look.account.get(t.account_id)?.name
        const hay = `${t.note ?? ''} ${cat ?? ''} ${acc ?? ''} ${t.amount}`.toLowerCase()
        if (!hay.includes(q)) return false
      } else if (monthOf(t.occurred_on) !== month) return false
      return test(t)
    })
  }, [data.transactions, month, filter, q, look])
  const days = byDay(shown)
  const isNow = month === thisMonth()
  // a day can only be arranged as a whole: not while searching or filtering
  const canArrange = !q && filter === 'all'

  /** Save a day's new order: 1 is the top. Only rows whose place changed are written. */
  async function saveOrder(ids: string[]) {
    const byId = new Map(data.transactions.map((t) => [t.id, t]))
    try {
      await Promise.all(ids.map((id, i) => (byId.get(id)?.day_order === i + 1 ? null : update('transactions', id, { day_order: i + 1 }))))
    } catch {
      toast("Couldn't save the new order. Try again.", 'worry')
    }
  }

  function content(t: Tx) {
    return (
      <>
        <span className={txTile(t)}>
          <Glyph name={txIcon(t, t.category_id ? look.category.get(t.category_id) : undefined)} size={20} />
        </span>
        <div className="grow">
          <p className="item-title ellipsis">{title(t)}</p>
          <p className="item-sub ellipsis">
            {t.receipt_path && (
              <span className="has-receipt" style={{ marginLeft: 0, marginRight: 4 }} aria-label="Has a receipt">
                <Glyph name="receipt" size={13} />
              </span>
            )}
            {sub(t)}
            {t.affects_balance === false && ' · history only'}
          </p>
        </div>
        <TxAmount tx={t} />
      </>
    )
  }

  function title(t: Tx) {
    if (t.note) return t.note
    if (t.kind === 'transfer') return 'Transfer'
    if (t.debt_id) return look.debt.get(t.debt_id)?.title ?? 'Loan'
    return (t.category_id && look.category.get(t.category_id)?.name) || 'Entry'
  }
  function sub(t: Tx) {
    const acc = look.account.get(t.account_id)?.name ?? ''
    if (t.kind === 'transfer') return `${acc} → ${(t.to_account_id && look.account.get(t.to_account_id)?.name) || ''}`
    if (t.debt_id) {
      const d = look.debt.get(t.debt_id)
      const who = d ? look.person.get(d.person_id)?.name : ''
      const lent = d?.direction === 'owed_to_me'
      const what = t.kind === 'debt_out' ? (lent ? 'Lent to' : 'Paid back to') : lent ? 'Paid back by' : 'Borrowed from'
      return `${what} ${who} · ${acc}`
    }
    const cat = t.category_id ? look.category.get(t.category_id)?.name : ''
    return [cat, acc].filter(Boolean).join(' · ')
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>Activity</h1>
        <button className="icon-btn" aria-label={searching ? 'Close search' : 'Search'} onClick={() => { setSearching(!searching); setQuery('') }}>
          <Glyph name={searching ? 'close' : 'search'} size={22} />
        </button>
      </div>

      {searching ? (
        <input className="input" type="search" placeholder="Search notes, categories, amounts" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Search" />
      ) : (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="icon-btn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            <Glyph name="back" size={22} />
          </button>
          <p style={{ fontWeight: 600, fontSize: 17 }}>{monthLabel(month)}</p>
          <button className="icon-btn" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isNow} style={isNow ? { opacity: 0.3 } : undefined}>
            <Glyph name="fwd" size={22} />
          </button>
        </div>
      )}

      {!q && (
        <section className="card grid-3" style={{ padding: 14 }}>
          <div>
            <p className="tiny muted">Received</p>
            <p className="num good" style={{ fontWeight: 600 }}>{peso(totals.income)}</p>
          </div>
          <div>
            <p className="tiny muted">Spent</p>
            <p className="num" style={{ fontWeight: 600 }}>{peso(totals.spent)}</p>
          </div>
          <div>
            <p className="tiny muted">Given</p>
            <p className="num gold" style={{ fontWeight: 600 }}>{peso(totals.given)}</p>
          </div>
        </section>
      )}

      <div className="chips scroll" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.key} className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="empty">
          <Mascot action="think" size={96} />
          <p>{q ? 'Nothing matches that.' : isNow ? 'Nothing here yet this month. Tap + to add your first entry.' : 'Nothing recorded this month.'}</p>
        </div>
      ) : (
        days.map((g) => {
          const net = g.txs.reduce((s, t) => s + signed(t), 0)
          const open = canArrange && arranging === g.day
          return (
            <section key={g.day}>
              <div className="day-head">
                <p className="eyebrow">{dayLabel(g.day)}</p>
                <span className="day-tools">
                  {!open && <span className="small muted num">{net === 0 ? '' : peso(net, { sign: true })}</span>}
                  {canArrange && g.txs.length > 1 && (
                    <button
                      type="button"
                      className={`arrange-btn${open ? ' on' : ''}`}
                      aria-pressed={open}
                      aria-label={open ? `Done arranging ${dayLabel(g.day)}` : `Arrange ${dayLabel(g.day)}`}
                      onClick={() => setArranging(open ? null : g.day)}
                    >
                      {open ? 'Done' : <Glyph name="grip" size={16} />}
                    </button>
                  )}
                </span>
              </div>
              {open ? (
                <Reorder items={g.txs} render={content} label={title} onReorder={saveOrder} />
              ) : (
                <ul className="card flush list" style={{ marginTop: 6 }}>
                  {g.txs.map((t) => (
                    <li key={t.id}>
                      <Link to={t.debt_id ? `/owed/${t.debt_id}` : `/add/${t.id}`} className="item">
                        {content(t)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
