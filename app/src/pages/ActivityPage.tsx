import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLookups, useStore } from '../lib/store'
import type { Tx } from '../lib/types'
import { byDay, monthTotals, peso, pesoShort, signed } from '../lib/money'
import { fromISODate, monthLabel, monthOf, shiftMonth, thisMonth, today, daysBetween } from '../lib/dates'
import { canCopy, copyOf, entrySub, entryTitle } from '../lib/entry'
import { removePhoto } from '../lib/photos'
import { Glyph } from '../components/Glyph'
import { Mascot } from '../components/Mascot'
import { TxAmount, txIcon, txTile } from '../components/Bits'
import { Reorder } from '../components/Reorder'
import { HoldRow } from '../components/HoldRow'
import { EntrySheet } from '../components/EntrySheet'
import { useToast } from '../components/Toast'

type FilterKey = 'all' | 'spent' | 'in' | 'given' | 'moves' | 'loans'
const FILTERS: { key: FilterKey; label: string; dot: string; test: (t: Tx) => boolean }[] = [
  { key: 'all', label: 'All', dot: '', test: () => true },
  { key: 'spent', label: 'Spent', dot: 'out', test: (t) => t.kind === 'expense' },
  { key: 'in', label: 'Received', dot: 'in', test: (t) => t.kind === 'income' },
  { key: 'given', label: 'Given', dot: 'give', test: (t) => t.kind === 'giving' },
  { key: 'moves', label: 'Transfers', dot: 'move', test: (t) => t.kind === 'transfer' },
  { key: 'loans', label: 'Loans', dot: 'loan', test: (t) => t.kind === 'debt_in' || t.kind === 'debt_out' },
]
/** what the month's little chart counts, for each filter */
const CHART_LABEL: Record<FilterKey, string> = { all: 'Out each day', spent: 'Spent each day', in: 'Received each day', given: 'Given each day', moves: 'Moved each day', loans: 'Loans each day' }
const chartCounts = (f: FilterKey, t: Tx) => (f === 'all' ? t.kind === 'expense' || t.kind === 'giving' : FILTERS.find((x) => x.key === f)!.test(t))

const weekday = (s: string) => fromISODate(s).toLocaleDateString('en-US', { weekday: 'long' })
const monthDay = (s: string, year = false) => fromISODate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year && { year: 'numeric' }) })

// where the list was, so coming back from Edit lands in the same place
let memo = { key: '', top: 0 }

/**
 * Activity: everything that came in, went out, was given or moved, one month at a time. The header stays put
 * and only the list scrolls. Tap an entry to see it; press and hold to pick entries and act on several at once.
 */
export function ActivityPage() {
  const store = useStore()
  const { data, update } = store
  const look = useLookups()
  const toast = useToast()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()

  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '') ? params.get('m')! : thisMonth()
  const filter = (FILTERS.some((f) => f.key === params.get('f')) ? params.get('f') : 'all') as FilterKey
  const openId = params.get('e')
  const setParam = (k: string, v: string | null, push = false) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v == null) n.delete(k)
        else n.set(k, v)
        return n
      },
      { replace: !push },
    )
  const setMonth = (m: string) => {
    setParam('m', m === thisMonth() ? null : m)
    setPeek(null)
    listRef.current?.scrollTo({ top: 0 })
  }

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [arranging, setArranging] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const picking = picked.size > 0
  const [compact, setCompact] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // whether this page put the open entry in the history (so closing goes back instead of replacing)
  const pushed = useRef(false)

  const q = query.trim().toLowerCase()
  const scope = useMemo(
    () =>
      data.transactions.filter((t) => {
        if (!q) return monthOf(t.occurred_on) === month
        // searching looks across every month
        const cat = t.category_id ? look.category.get(t.category_id)?.name : ''
        const acc = look.account.get(t.account_id)?.name
        const who = t.debt_id ? look.person.get(look.debt.get(t.debt_id)?.person_id ?? '')?.name : ''
        return `${t.note ?? ''} ${cat ?? ''} ${acc ?? ''} ${who ?? ''} ${t.amount}`.toLowerCase().includes(q)
      }),
    [data.transactions, month, q, look],
  )
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, scope.filter(f.test).length])), [scope])
  const shown = useMemo(() => scope.filter(FILTERS.find((f) => f.key === filter)!.test), [scope, filter])
  const days = byDay(shown)
  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month])
  const kept = totals.income - totals.spent - totals.given
  const isNow = month === thisMonth()
  const canArrange = !q && filter === 'all' && !picking

  // the open entry was deleted (or the link is old): drop it from the address quietly
  useEffect(() => {
    if (openId && !data.transactions.some((t) => t.id === openId)) setParam('e', null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, data.transactions])

  // back where we were in the list
  const memoKey = `${month}|${filter}`
  useLayoutEffect(() => {
    if (memo.key === memoKey && listRef.current) listRef.current.scrollTop = memo.top
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape lets go of everything picked
  useEffect(() => {
    if (!picking) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !openId && setPicked(new Set())
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [picking, openId])

  function onScroll() {
    const el = listRef.current
    if (!el) return
    memo = { key: memoKey, top: el.scrollTop }
    // the summary folds into a slim strip once the list is on its way
    if (!compact && el.scrollTop > 36) setCompact(true)
    else if (compact && el.scrollTop < 6) setCompact(false)
  }

  function open(t: Tx) {
    pushed.current = true
    setParam('e', t.id, true)
  }
  function closeEntry() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (pushed.current && idx > 0) nav(-1)
    else setParam('e', null)
    pushed.current = false
  }

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  /** jump the list to a day (from the chart) and make it glow for a moment */
  function goToDay(day: string) {
    setPeek(day)
    const el = listRef.current?.querySelector<HTMLElement>(`#d-${day}`)
    if (!el || !listRef.current) return
    listRef.current.scrollTo({ top: el.offsetTop - 2, behavior: 'smooth' })
    setFlash(day)
    window.setTimeout(() => setFlash((f) => (f === day ? null : f)), 1400)
  }

  /** Save a day's new order: 1 is the top. Only rows whose place changed are written. */
  async function saveOrder(ids: string[]) {
    const byId = new Map(data.transactions.map((t) => [t.id, t]))
    try {
      await Promise.all(ids.map((id, i) => (byId.get(id)?.day_order === i + 1 ? null : update('transactions', id, { day_order: i + 1 }))))
    } catch {
      toast("Couldn't save the new order. Try again.", 'worry')
    }
  }

  function content(t: Tx, isPicked = false) {
    return (
      <>
        <span className={`${txTile(t)} flip-tile${isPicked ? ' is-on' : ''}`}>
          <span className="flip-face">
            <Glyph name={txIcon(t, t.category_id ? look.category.get(t.category_id) : undefined)} size={20} />
          </span>
          <span className="flip-back" aria-hidden="true">
            <Glyph name="check" size={20} stroke={2.6} />
          </span>
        </span>
        <span className="grow">
          <span className="item-title ellipsis">{entryTitle(t, look)}</span>
          <span className="item-sub ellipsis">
            {t.receipt_path && (
              <span className="has-receipt" aria-label="Has a receipt">
                <Glyph name="receipt" size={13} />
              </span>
            )}
            {entrySub(t, look)}
          </span>
        </span>
        <span className="row-end">
          <TxAmount tx={t} />
          {t.affects_balance === false && <span className="row-tag">history</span>}
        </span>
      </>
    )
  }

  return (
    <div className={`act${picking ? ' is-picking' : ''}`}>
      <header className={`act-head${compact ? ' is-compact' : ''}`}>
        {picking ? (
          <div className="act-top">
            <button className="icon-btn" aria-label="Stop picking" onClick={() => setPicked(new Set())}>
              <Glyph name="close" size={22} />
            </button>
            <p className="act-picked" aria-live="polite">
              {picked.size} picked
            </p>
            <button className="link" onClick={() => setPicked(picked.size === shown.length ? new Set() : new Set(shown.map((t) => t.id)))}>
              {picked.size === shown.length ? 'None' : 'All'}
            </button>
          </div>
        ) : searching ? (
          <div className="act-top act-search">
            <span className="act-search-box">
              <Glyph name="search" size={18} />
              <input type="search" placeholder="Notes, categories, people, amounts" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Search every month" />
            </span>
            <button className="link" onClick={() => (setSearching(false), setQuery(''))}>
              Done
            </button>
          </div>
        ) : (
          <div className="act-top">
            <div className="act-month">
              <p className="eyebrow">Activity</p>
              <div className="act-month-row">
                <button className="icon-btn act-step" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
                  <Glyph name="back" size={20} />
                </button>
                <h1 key={month} className="act-month-name">
                  {monthLabel(month, false)}
                  {month.slice(0, 4) !== thisMonth().slice(0, 4) && <span className="faint"> {month.slice(0, 4)}</span>}
                </h1>
                <button className="icon-btn act-step" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isNow}>
                  <Glyph name="fwd" size={20} />
                </button>
              </div>
            </div>
            <div className="act-top-tools">
              {!isNow && (
                <button className="chip act-now" onClick={() => setMonth(thisMonth())}>
                  This month
                </button>
              )}
              <button className="icon-btn" aria-label="Search" onClick={() => setSearching(true)}>
                <Glyph name="search" size={22} />
              </button>
            </div>
          </div>
        )}

        {q ? (
          <p className="act-found small muted">
            {shown.length === 0 ? 'Nothing found yet' : `${shown.length} ${shown.length === 1 ? 'entry' : 'entries'} across every month`}
            {shown.length > 0 && <span className="num"> · {peso(shown.reduce((s, t) => s + signed(t), 0), { sign: true })}</span>}
          </p>
        ) : (
          <MonthCard
            month={month}
            filter={filter}
            txs={scope}
            totals={totals}
            kept={kept}
            compact={compact}
            peek={peek}
            onDay={goToDay}
            onExpand={() => {
              setCompact(false)
              listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )}

        <div className="chips scroll act-chips" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className="chip"
              aria-pressed={filter === f.key}
              onClick={() => {
                setParam('f', f.key === 'all' ? null : f.key)
                setPeek(null)
                listRef.current?.scrollTo({ top: 0 })
              }}
            >
              {f.dot && <span className={`kind-dot ${f.dot}`} />}
              {f.label}
              {counts[f.key] > 0 && <span className="chip-count">{counts[f.key]}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="act-list" ref={listRef} onScroll={onScroll} data-scroller>
        <div className="act-list-inner">
          {days.length === 0 ? (
            <div className="empty">
              <Mascot action="think" size={96} />
              <p>
                {q
                  ? 'Nothing matches that.'
                  : filter !== 'all'
                    ? `No ${FILTERS.find((f) => f.key === filter)!.label.toLowerCase()} entries in ${monthLabel(month, false)}.`
                    : isNow
                      ? 'Nothing here yet this month. Tap the star to add your first entry.'
                      : 'Nothing recorded this month.'}
              </p>
            </div>
          ) : (
            days.map((g) => {
              const net = g.txs.reduce((s, t) => s + signed(t), 0)
              const arrange = canArrange && arranging === g.day
              const diff = daysBetween(g.day, today())
              const name = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : weekday(g.day)
              return (
                <section key={g.day} id={`d-${g.day}`} className={`act-day${flash === g.day ? ' is-flash' : ''}`}>
                  <div className="act-day-head">
                    <span className={`act-day-num${diff === 0 ? ' is-today' : ''}`}>{Number(g.day.slice(8, 10))}</span>
                    <span className="act-day-name">
                      <b>{name}</b>
                      <small>
                        {monthDay(g.day, !!q)} · {g.txs.length} {g.txs.length === 1 ? 'entry' : 'entries'}
                      </small>
                    </span>
                    <span className="day-tools">
                      {!arrange && net !== 0 && <span className={`act-day-net num${net > 0 ? ' good' : ''}`}>{peso(net, { sign: true })}</span>}
                      {canArrange && g.txs.length > 1 && (
                        <button
                          type="button"
                          className={`arrange-btn${arrange ? ' on' : ''}`}
                          aria-pressed={arrange}
                          aria-label={arrange ? `Done arranging ${name}` : `Arrange ${name}`}
                          onClick={() => setArranging(arrange ? null : g.day)}
                        >
                          {arrange ? 'Done' : <Glyph name="grip" size={16} />}
                        </button>
                      )}
                    </span>
                  </div>
                  {arrange ? (
                    <Reorder items={g.txs} render={(t) => content(t)} label={(t) => entryTitle(t, look)} onReorder={saveOrder} />
                  ) : (
                    <ul className="card flush list act-rows">
                      {g.txs.map((t) => {
                        const on = picked.has(t.id)
                        return (
                          <li key={t.id} className={`kind-${t.kind}`}>
                            <HoldRow
                              label={entryTitle(t, look)}
                              picked={on}
                              picking={picking}
                              onTap={() => (picking ? toggle(t.id) : open(t))}
                              onHold={() => toggle(t.id)}
                            >
                              {content(t, on)}
                            </HoldRow>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })
          )}
          {days.length > 0 && !q && (
            <p className="act-end">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.5Q13.3 10.7 21.5 12Q13.3 13.3 12 21.5Q10.7 13.3 2.5 12Q10.7 10.7 12 2.5Z" />
              </svg>
              <span className="hand">
                That’s all of {monthLabel(month, false)} · {shown.length} {shown.length === 1 ? 'entry' : 'entries'}
              </span>
            </p>
          )}
          {!picking && days.length > 0 && !q && <p className="act-tip tiny faint">Tip: press and hold an entry to pick several.</p>}
        </div>
      </div>

      {picking && (
        <PickBar
          txs={data.transactions.filter((t) => picked.has(t.id))}
          onDone={() => setPicked(new Set())}
          onEdit={(id) => {
            setPicked(new Set())
            nav(`/add/${id}`)
          }}
          onOpen={(t) => {
            setPicked(new Set())
            open(t)
          }}
          store={store}
        />
      )}

      {openId && <EntrySheet key={openId} id={openId} onClose={closeEntry} />}
    </div>
  )
}

/** The month at a glance: in, out, given, what's kept, and a little bar for every day of the month. */
function MonthCard({
  month,
  filter,
  txs,
  totals,
  kept,
  compact,
  peek,
  onDay,
  onExpand,
}: {
  month: string
  filter: FilterKey
  txs: Tx[]
  totals: ReturnType<typeof monthTotals>
  kept: number
  compact: boolean
  peek: string | null
  onDay: (day: string) => void
  onExpand: () => void
}) {
  const [y, m] = month.split('-').map(Number)
  const len = new Date(y, m, 0).getDate()
  const now = today()
  const bars = useMemo(() => {
    const out = Array.from({ length: len }, (_, i) => ({ day: `${month}-${String(i + 1).padStart(2, '0')}`, v: 0, income: false, any: false }))
    for (const t of txs) {
      const b = out[Number(t.occurred_on.slice(8, 10)) - 1]
      if (!b) continue
      b.any = true
      if (t.kind === 'income') b.income = true
      if (chartCounts(filter, t)) b.v += t.amount
    }
    return out
  }, [txs, filter, month, len])
  const max = Math.max(1, ...bars.map((b) => b.v))
  const counted = bars.filter((b) => b.day <= now)
  const sum = bars.reduce((s, b) => s + b.v, 0)
  const avg = counted.length ? sum / counted.length : 0
  const peekBar = peek ? bars.find((b) => b.day === peek) : undefined

  return (
    <section className={`month-card${compact ? ' is-compact' : ''}`} aria-label={`${monthLabel(month)} at a glance`} onClick={compact ? onExpand : undefined}>
      <svg className="month-flakes" viewBox="0 0 160 120" aria-hidden="true">
        <ellipse cx="118" cy="7" rx="3.4" ry="2.2" transform="rotate(-20 118 7)" />
        <ellipse cx="96" cy="4" rx="2" ry="1.4" />
        <path className="month-star" d="M150 8q.9 5.1 6 6-5.1.9-6 6-.9-5.1-6-6 5.1-.9 6-6z" />
      </svg>
      <div className="month-stats">
        <div>
          <span className="flow-ic in">
            <Glyph name="down" size={14} />
          </span>
          <span>
            <span className="flow-label">In</span>
            <span className="flow-val num">{pesoShort(totals.income)}</span>
          </span>
        </div>
        <div>
          <span className="flow-ic out">
            <Glyph name="up" size={14} />
          </span>
          <span>
            <span className="flow-label">Spent</span>
            <span className="flow-val num">{pesoShort(totals.spent)}</span>
          </span>
        </div>
        <div>
          <span className="flow-ic give">
            <Glyph name="heart" size={14} />
          </span>
          <span>
            <span className="flow-label">Given</span>
            <span className="flow-val num">{pesoShort(totals.given)}</span>
          </span>
        </div>
      </div>

      <div className="month-more" aria-hidden={compact}>
        <div className="month-more-in">
          <div className="month-cap">
            <span className="flow-label">{peekBar ? monthDay(peekBar.day) : CHART_LABEL[filter]}</span>
            <span className="month-cap-val num">{peekBar ? (peekBar.v ? peso(peekBar.v) : peekBar.any ? 'none of these' : 'nothing') : filter === 'all' || filter === 'spent' ? `about ${pesoShort(Math.round(avg))} a day` : `${peso(sum)} in all`}</span>
          </div>
          <div className="rhythm" role="group" aria-label={CHART_LABEL[filter]}>
            {bars.map((b) => {
              const future = b.day > now
              return (
                <button
                  key={b.day}
                  type="button"
                  tabIndex={compact ? -1 : 0}
                  className={`rhythm-day${b.day === now ? ' is-today' : ''}${future ? ' is-future' : ''}${peek === b.day ? ' is-peek' : ''}`}
                  aria-label={`${monthDay(b.day)}: ${b.v ? peso(b.v) : 'nothing'}`}
                  disabled={future}
                  onClick={() => onDay(b.day)}
                >
                  <span className="rhythm-bar" style={{ height: b.v ? `${Math.max(10, Math.sqrt(b.v / max) * 100)}%` : undefined }} />
                  {filter === 'all' && b.income && <span className="rhythm-in" />}
                </button>
              )
            })}
          </div>
          <p className={`month-kept${kept < 0 ? ' is-short' : ''}`}>
            <span className="hand">{kept >= 0 ? `${peso(kept)} kept so far` : `${peso(-kept)} more out than in`}</span>
            {filter === 'all' && <span className="month-legend tiny"><span className="rhythm-in" /> payday</span>}
          </p>
        </div>
      </div>
      {compact && (
        <button type="button" className="month-unfold" aria-label="Show the month's chart">
          <Glyph name="down-chevron" size={16} />
        </button>
      )}
    </section>
  )
}

/** Replaces the tab bar while entries are picked: their sum, and what can be done to all of them. */
function PickBar({
  txs,
  onDone,
  onEdit,
  onOpen,
  store,
}: {
  txs: Tx[]
  onDone: () => void
  onEdit: (id: string) => void
  onOpen: (t: Tx) => void
  store: ReturnType<typeof useStore>
}) {
  const toast = useToast()
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!armed) return
    const tm = window.setTimeout(() => setArmed(false), 3200)
    return () => window.clearTimeout(tm)
  }, [armed])
  // picking more (or fewer) takes the delete back to safe
  const n = txs.length
  const [armedFor, setArmedFor] = useState(n)
  if (armedFor !== n) {
    setArmedFor(n)
    setArmed(false)
  }

  const net = txs.reduce((s, t) => s + signed(t), 0)
  const copyable = txs.filter(canCopy)
  const one = n === 1 ? txs[0] : null

  async function again() {
    setBusy(true)
    try {
      for (const t of copyable) await store.insert('transactions', copyOf(t, today()))
      toast(copyable.length === 1 ? `Added again for today · ${peso(copyable[0].amount)}` : `${copyable.length} entries added again for today`, 'happy')
      onDone()
    } catch (e) {
      toast((e as Error).message, 'worry')
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    if (!armed) return setArmed(true)
    setBusy(true)
    try {
      for (const t of txs) {
        await store.remove('transactions', t.id)
        void removePhoto(t.receipt_path)
      }
      toast(n === 1 ? 'Deleted' : `${n} entries deleted`, 'nod')
      onDone()
    } catch (e) {
      toast((e as Error).message, 'worry')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="pick-bar" role="toolbar" aria-label={`${n} picked`}>
      <div className="pick-sum">
        <span className="flow-label">{n === 1 ? '1 entry' : `${n} entries`}</span>
        <span className="num pick-net">{net === 0 ? peso(txs.reduce((s, t) => s + t.amount, 0)) : peso(net, { sign: true })}</span>
      </div>
      <div className="pick-actions">
        {one && (
          <button type="button" onClick={() => onOpen(one)} disabled={busy}>
            <Glyph name="eye" size={20} />
            <span>View</span>
          </button>
        )}
        {one && (
          <button type="button" onClick={() => onEdit(one.id)} disabled={busy}>
            <Glyph name="pen" size={20} />
            <span>Edit</span>
          </button>
        )}
        {copyable.length > 0 && (
          <button type="button" onClick={again} disabled={busy}>
            <Glyph name="repeat" size={20} />
            <span>Again</span>
          </button>
        )}
        <button type="button" className={`is-danger${armed ? ' is-armed' : ''}`} onClick={del} disabled={busy}>
          <Glyph name="trash" size={20} />
          <span>{armed ? 'Sure?' : 'Delete'}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
