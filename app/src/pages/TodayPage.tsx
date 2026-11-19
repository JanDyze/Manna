import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useAuth, firstName } from '../lib/auth'
import { balances, debtLeft, goalSaved, monthPlan, monthTotals, peso, tithe, upcoming } from '../lib/money'
import { daysBetween, dueLabel, fmtDate, fromISODate, greeting, monthLabel, shortDate, thisMonth, today } from '../lib/dates'
import { demoHour, mock } from '../lib/mock'
import { mood, verseOfTheDay } from '../lib/words'
import { paidMessage, payBill } from '../lib/actions'
import { Scene } from '../components/Scene'
import { Mascot } from '../components/Mascot'
import { EyeToggle, Secret } from '../components/Secret'
import { MascotChat } from '../components/MascotChat'
import { NoteRow, NoteSheet, sortNotes } from './NotesPage'
import { checkDue, closingMonth } from './CheckPage'
import type { Note } from '../lib/types'
import { Glyph } from '../components/Glyph'
import { Brand } from '../components/Logo'
import { AccountMark, Tile } from '../components/Bits'
import type { Account } from '../lib/types'
import { useToast } from '../components/Toast'
import { PickPhoto } from '../components/Photo'
import type { Photo } from '../lib/photos'

export function TodayPage() {
  const store = useStore()
  const { data } = store
  const { session } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [paying, setPaying] = useState<string | null>(null)

  const t = today()
  const month = thisMonth()
  // the scene follows the clock; it updates every minute
  const [talk, setTalk] = useState(false)
  // a receipt snapped from the camp goes straight to KATY
  const [snap, setSnap] = useState<Photo | undefined>()
  // the camp banner can be folded away to a slim strip; remembered on this device
  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem('manna.scene-folded') === '1'
    } catch {
      return false
    }
  })
  const fold = () =>
    setFolded((f) => {
      try {
        localStorage.setItem('manna.scene-folded', f ? '0' : '1')
      } catch {
        /* private mode */
      }
      return !f
    })
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const hour = demoHour ?? now.getHours()
  const hourExact = demoHour ?? now.getHours() + now.getMinutes() / 60
  const name = mock ? 'Jan' : firstName(session)

  const bal = useMemo(() => balances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const accounts = data.accounts.filter((a) => !a.archived).sort((a, b) => a.sort - b.sort)
  const available = accounts.reduce((s, a) => s + (bal.get(a.id) ?? 0), 0)
  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month])
  const plan = monthPlan(data.budgets, totals, t)
  const over = plan.total > 0 && plan.left < 0
  const ti = tithe(data.transactions, data.categories, month, data.settings.tithe_percent)
  const bills = upcoming(data.recurring, 14, t).filter((r) => r.kind !== 'income')
  const soon = bills[0] ? { title: bills[0].title, days: daysBetween(t, bills[0].next_due) } : null
  const openDebts = data.debts.filter((d) => !d.closed_at)
  const owedToMe = openDebts.filter((d) => d.direction === 'owed_to_me').reduce((s, d) => s + debtLeft(d, data.transactions), 0)
  const iOwe = openDebts.filter((d) => d.direction === 'i_owe').reduce((s, d) => s + debtLeft(d, data.transactions), 0)
  const goals = data.goals.filter((g) => !g.closed_at)
  const goalTarget = goals.reduce((s, g) => s + g.target, 0)
  const goalSavedSum = goals.reduce((s, g) => s + Math.min(g.target, goalSaved(g, data.goal_entries)), 0)
  const recentIncome = data.transactions.some((x) => x.kind === 'income' && daysBetween(x.occurred_on, t) <= 3 && daysBetween(x.occurred_on, t) >= 0)
  const incomeToday = data.transactions.some((x) => x.kind === 'income' && x.occurred_on === t)

  const m = mood({
    hour,
    name,
    overBudget: over,
    hasBudget: plan.total > 0,
    billSoon: soon,
    titheDone: ti.done,
    titheDue: Math.max(0, ti.due - ti.given),
    incomeToday,
    firstRun: data.transactions.length === 0 && data.budgets.length === 0,
    noteToday: data.notes.find((n) => !n.done_at && n.remind_on && n.remind_on <= t) ?? null,
    checkDue: checkDue(data, t),
  })
  const verse = verseOfTheDay(t)
  const openNotes = sortNotes(data.notes.filter((n) => !n.done_at))
  const [noteOpen, setNoteOpen] = useState<Note | null>(null)
    const mannaShare = plan.total > 0 ? Math.max(0, plan.left) / plan.total : null
  // how far spending runs ahead of an even pace through the month (brings clouds to the scene)
  const dayOfMonth = Number(t.slice(8, 10))
  const expected = plan.total * (dayOfMonth / (dayOfMonth + plan.days - 1))
  const pace = plan.total > 0 ? Math.max(0, Math.min(1, (plan.spent - expected) / Math.max(plan.total * 0.25, 1))) : 0

  async function markPaid(id: string) {
    const bill = data.recurring.find((r) => r.id === id)
    if (!bill) return
    setPaying(id)
    try {
      const { left } = await payBill(store, bill)
      toast(paidMessage(bill, bill.amount, left), left === 0 ? 'cheer' : 'happy')
    } catch (e) {
      toast((e as Error).message, 'worry')
    } finally {
      setPaying(null)
    }
  }

  return (
    <>
      <Scene hour={hourExact} manna={mannaShare} dry={over} pace={pace} festive={t.slice(5, 7) === '12'} jar={goals.length ? goalSavedSum / Math.max(goalTarget, 1) : null} quail={recentIncome} onJar={() => nav('/plan/goals')} collapsed={folded}>
        <div className="scene-top">
          <div className="scene-greet">
            <Brand size={24} />
            <h1 style={{ marginTop: 14 }}>{hour >= 22 || hour < 5 ? 'Good night' : greeting(new Date(new Date().setHours(hour)))}{name ? `, ${name}` : ''}</h1>
            <p>{fromISODate(t).toLocaleDateString('en-US', { weekday: 'long' })} · {fmtDate(t)}</p>
          </div>
          <Link to="/settings" className="icon-btn on-scene settings-btn ic-play" aria-label="Settings">
            <Glyph name="gear" size={22} />
          </Link>
        </div>
        <button className="mascot-talk scene-katy" aria-label="Talk to KATY" onClick={() => setTalk(true)}>
          <Mascot action={m.action} size={124} repeatEvery={16000} />
        </button>
        <p className="bubble">{m.line}</p>
        <div className="scene-actions">
          <button className="talk-pill" onClick={() => setTalk(true)}>
            <Glyph name="spark" size={16} />
            Tell KATY
          </button>
          <PickPhoto className="snap-pill" label="Snap a receipt" onPick={(p) => (setSnap(p), setTalk(true))} onError={(m) => toast(m, 'worry')}>
            <Glyph name="camera" size={18} />
          </PickPhoto>
        </div>
        <button className="scene-fold" onClick={fold} aria-expanded={!folded} aria-label={folded ? 'Show the camp' : 'Fold the camp away'} />
      </Scene>

      <div className="page" style={{ paddingTop: 0 }}>
        <Link to="/plan/budgets" className="scene-legend small" style={{ textDecoration: 'none', color: 'inherit' }}>
          {plan.total > 0 ? (
            over ? (
              <span className="bad">The ground is bare: {peso(-plan.left)} over budget</span>
            ) : (
              <>
                <span className="muted">Manna left this month</span>
                <span className="num">
                  <strong>{peso(plan.left)}</strong> <span className="muted">· {peso(Math.floor(plan.perDay))}/day</span>
                </span>
              </>
            )
          ) : (
            <span className="muted">Set a budget to see manna on the ground →</span>
          )}
        </Link>

        <Wallet available={available} accounts={accounts} bal={bal} />

        <Link to="/plan/budgets" className="card card-link spend-card">
          {plan.total > 0 ? (
            <div className="spend-top">
              <Ring pct={plan.pct} tone={over ? 'bad' : plan.pct > 85 ? 'gold' : 'good'} />
              <div className="grow" style={{ minWidth: 0 }}>
                <p className="eyebrow">{fromISODate(t).toLocaleDateString('en-US', { month: 'long' })} spending</p>
                <p className="num" style={{ marginTop: 2 }}>
                  <span className="mid-num">{peso(plan.spent)}</span> <span className="muted small">of {peso(plan.total)}</span>
                </p>
                <p className={`small ${over || plan.spent > expected ? 'bad' : 'muted'}`}>
                  {over ? `Over by ${peso(-plan.left)}` : plan.spent > expected ? `${peso(Math.round(plan.spent - expected))} ahead of an even pace` : 'On pace'}
                </p>
              </div>
              <Glyph name="fwd" size={18} className="faint" />
            </div>
          ) : (
            <div className="spend-top">
              <div className="grow">
                <p className="eyebrow">{fromISODate(t).toLocaleDateString('en-US', { month: 'long' })} spending</p>
                <p className="num" style={{ marginTop: 2 }}><span className="mid-num">{peso(totals.spent)}</span></p>
                <p className="small muted">Set a budget in Plan to see what’s left.</p>
              </div>
              <Glyph name="fwd" size={18} className="faint" />
            </div>
          )}
        </Link>

        {checkDue(data, t) && (
          <Link to="/check" className="card card-link check-card row">
            <span className="tile gold"><Glyph name="check" size={20} /></span>
            <div className="grow">
              <p style={{ fontWeight: 600 }}>Close {monthLabel(closingMonth(t), false)}</p>
              <p className="small muted">Count what you really have and see if it matches the record.</p>
            </div>
            <span className="btn sm gold">Start</span>
          </Link>
        )}

        {openNotes.length > 0 && (
          <section className="card flush notes-card">
            <div className="card-head" style={{ margin: '12px 0 0' }}>
              <p className="eyebrow">KATY remembers</p>
              <Link to="/notes" className="link">{openNotes.length > 1 ? `${openNotes.length - 1} more` : 'All notes'}</Link>
            </div>
            <ul className="list">
              {openNotes.slice(0, 1).map((n) => (
                <NoteRow key={n.id} n={n} onOpen={() => setNoteOpen(n)} onDone={() => store.update('notes', n.id, { done_at: new Date().toISOString() }).then(() => toast('Done. I’ll stop bringing it up.', 'nod'))} />
              ))}
            </ul>
          </section>
        )}

        <section className={`card${ti.done ? ' quiet' : ''}`} style={ti.done ? { background: 'var(--gold-soft)' } : undefined}>
          <div className="row">
            <Tile icon="wheat" tone="gold" />
            <div className="grow">
              <p style={{ fontWeight: 600 }}>{ti.done ? 'Tithe set apart' : ti.income > 0 ? 'Tithe to give' : 'Tithe'}</p>
              <p className="small muted">
                {ti.income > 0 ? `${data.settings.tithe_percent}% of ${peso(ti.income)} received this month` : 'Nothing received yet this month'}
              </p>
            </div>
            {ti.done ? (
              <span className="pill good"><Glyph name="check" size={14} stroke={2.4} />{peso(ti.given)}</span>
            ) : ti.due > 0 ? (
              <Link to="/add?kind=giving" className="btn sm gold">Give {peso(Math.max(0, ti.due - ti.given))}</Link>
            ) : null}
          </div>
        </section>

        <section className="card flush">
          <div className="card-head" style={{ margin: '12px 0 0' }}>
            <p className="eyebrow">Coming up</p>
            <Link to="/plan/bills" className="link">All bills</Link>
          </div>
          {bills.length ? (
            <ul className="list">
              {bills.slice(0, 2).map((b, i) => {
                const days = daysBetween(t, b.next_due)
                return (
                  <li key={b.id} className="item">
                    <Tile icon={b.kind === 'transfer' ? 'card' : data.categories.find((c) => c.id === b.category_id)?.icon ?? 'calendar'} tone={days <= 0 ? 'bad' : undefined} />
                    <div className="grow">
                      <p className="item-title ellipsis">{b.title}</p>
                      <p className={`item-sub${days < 0 ? ' bad' : ''}`}>{shortDate(b.next_due)} · {dueLabel(b.next_due)}</p>
                    </div>
                    <span className="amount">{peso(b.amount)}</span>
                    {i === 0 && days <= 3 && (
                      <button className="chip" onClick={() => markPaid(b.id)} disabled={paying === b.id}>
                        <Glyph name="check" size={16} />
                        Paid
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted small" style={{ padding: '6px 0 14px' }}>No bills in the next two weeks.</p>
          )}
        </section>

        <Link to="/owed" className="card card-link row">
          <Tile icon="people" />
          <div className="grow grid-2">
            <div>
              <p className="tiny muted">Owed to you</p>
              <p className="num good" style={{ fontWeight: 600 }}>{peso(owedToMe)}</p>
            </div>
            <div>
              <p className="tiny muted">You owe</p>
              <p className="num bad" style={{ fontWeight: 600 }}>{peso(iOwe)}</p>
            </div>
          </div>
          <Glyph name="fwd" size={18} className="faint" />
        </Link>

        <figure className="verse" style={{ margin: '4px 0 0' }}>
          <p>“{verse.text}”</p>
          <cite>{verse.ref}</cite>
        </figure>
      </div>
      {talk && <MascotChat photo={snap} onClose={() => (setTalk(false), setSnap(undefined))} />}
      {noteOpen && <NoteSheet note={noteOpen} onClose={() => setNoteOpen(null)} />}
    </>
  )
}

/** Amounts can be hidden on this device, for checking the app in public. */
const HIDE_KEY = 'manna.hide-amounts'
function useHidden(): [boolean, () => void] {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggle = () =>
    setHidden((h) => {
      try {
        localStorage.setItem(HIDE_KEY, h ? '0' : '1')
      } catch {
        /* private mode: only for this visit */
      }
      return !h
    })
  return [hidden, toggle]
}

/** Counts up to a number when it first appears, so the balance feels alive. */
function useCountUp(value: number, ms = 700) {
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [shown, setShown] = useState(() => (still() ? value : 0))
  useEffect(() => {
    if (still()) return setShown(value)
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms)
      setShown(value * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

/**
 * The main card: everything you have right now, and in which accounts. Navy and gold like the logo; kept
 * quiet on purpose (adding is the gold + below, the month's numbers are in the spending card).
 */
function Wallet({ available, accounts, bal }: { available: number; accounts: Account[]; bal: Map<string, number> }) {
  const [hidden, toggle] = useHidden()
  const [showAll, setShowAll] = useState(false)
  const shown = useCountUp(available)
  const acc = (a: Account, i: number) => (
    <Link key={a.id} to="/settings#accounts" className="wallet-acc" style={{ '--n': i % 3, '--row': Math.floor(i / 3) - 1 } as CSSProperties}>
      <span className="wallet-acc-name">
        <span className="wallet-mark"><AccountMark name={a.name} kind={a.kind} size={18} /></span>
        <span className="ellipsis">{a.name}</span>
      </span>
      <span className="wallet-acc-amt num"><Secret hidden={hidden} text={peso(bal.get(a.id) ?? 0)} flakes={4} delay={180 + Math.min(i, 5) * 70} /></span>
    </Link>
  )
  return (
    <section className="wallet" aria-label="Available now">
      <svg className="wallet-flakes" viewBox="200 0 160 150" aria-hidden="true" preserveAspectRatio="xMaxYMin meet">
        {[[300, 22, 1.8], [344, 60, 1.5], [296, 56, 1.1], [350, 14, 1.2]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r * 1.5} ry={r} />
        ))}
        <path className="wallet-star" d="M326 16 Q328 28 339 33 Q326 33 322 45 Q319 35 307 33 Q322 30 326 16Z" />
      </svg>
      <div className="wallet-head">
        <p className="eyebrow">Available now</p>
        <EyeToggle className="wallet-eye" hidden={hidden} onToggle={toggle} />
      </div>
      <p className="wallet-total num">
        <Secret hidden={hidden} text={peso(Math.round(shown * 100) / 100)} centsClass="wallet-cents" flakes={6} />
      </p>
      <div className="wallet-accounts">{accounts.slice(0, 3).map(acc)}</div>
      {accounts.length > 3 && (
        <>
          {/* the rest of the accounts unfold smoothly (grid rows 0fr → 1fr), each one rising in after the last */}
          <div className={`wallet-extra${showAll ? ' is-open' : ''}`} inert={!showAll}>
            <div className="wallet-extra-inner">
              <div className="wallet-accounts is-extra">{accounts.slice(3).map((a, i) => acc(a, i + 3))}</div>
            </div>
          </div>
          <button className="wallet-more" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            <span className="wallet-more-label" key={showAll ? 'less' : 'all'}>{showAll ? 'Show less' : `All ${accounts.length} accounts`}</span>
            <Glyph name="down-chevron" size={14} stroke={2.4} />
          </button>
        </>
      )}

    </section>
  )
}

/** A small ring showing how much of the month's budget is used. */
function Ring({ pct, tone }: { pct: number; tone: 'good' | 'gold' | 'bad' }) {
  const r = 21
  const c = 2 * Math.PI * r
  const v = Math.min(100, Math.max(0, pct))
  return (
    <span className={`ring ${tone}`} role="img" aria-label={`${Math.round(pct)}% of the budget used`}>
      <svg viewBox="0 0 52 52" width="52" height="52">
        <circle cx="26" cy="26" r={r} className="ring-track" />
        <circle cx="26" cy="26" r={r} className="ring-fill" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 26 26)" />
      </svg>
      <span className="ring-pct num">{Math.round(pct)}%</span>
    </span>
  )
}
