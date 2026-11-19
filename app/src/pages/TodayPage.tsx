import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useAuth, firstName } from '../lib/auth'
import { balances, cardStatus, debtLeft, goalSaved, moneyPicture, monthPlan, monthTotals, peso, tithe, upcoming } from '../lib/money'
import { daysBetween, dueLabel, endOfMonth, fmtDate, fromISODate, greeting, monthLabel, monthOf, shortDate, thisMonth, today } from '../lib/dates'
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
  const picture = moneyPicture(accounts, bal)
  const available = picture.free
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
  const tone: Tone = over ? 'bad' : plan.pct > 85 ? 'gold' : 'good'
  // each day's spending this month, for the chart; and the three categories it went to most
  const daily = new Array<number>(Number(endOfMonth(t).slice(8, 10))).fill(0)
  for (const x of data.transactions) if (x.kind === 'expense' && monthOf(x.occurred_on) === month) daily[Number(x.occurred_on.slice(8, 10)) - 1] += x.amount
  const top = data.categories
    .filter((c) => c.kind === 'expense' && (totals.byCategory.get(c.id) ?? 0) > 0)
    .map((c) => ({ c, amt: totals.byCategory.get(c.id)! }))
    .sort((a, b) => b.amt - a.amt)
    .slice(0, 3)

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
      <Scene hour={hourExact} manna={mannaShare} dry={over} pace={pace} festive={t.slice(5, 7) === '12'} jar={goals.length ? goalSavedSum / Math.max(goalTarget, 1) : null} quail={recentIncome} onJar={() => nav('/plan/goals')} collapsed>
        <div className="scene-top">
          <div className="scene-greet">
            <Brand size={24} />
            <h1 style={{ marginTop: 14 }}>{hour >= 22 || hour < 5 ? 'Good night' : greeting(new Date(new Date().setHours(hour)))}{name ? `, ${name}` : ''}</h1>
            <p>{fromISODate(t).toLocaleDateString('en-US', { weekday: 'long' })} · {fmtDate(t)}</p>
            {/* what KATY has to say, in her hand; tapping it (or her) is how you answer */}
            <button className="scene-say" onClick={() => setTalk(true)} aria-label={`KATY says: ${m.line} Tap to talk to her.`}>
              {m.line}
            </button>
          </div>
          <Link to="/settings" className="icon-btn on-scene settings-btn ic-play" aria-label="Settings">
            <Glyph name="gear" size={22} />
          </Link>
        </div>
        <button className="mascot-talk scene-katy" aria-label="Talk to KATY" onClick={() => setTalk(true)}>
          <Mascot action={m.action} size={124} repeatEvery={16000} />
        </button>
      </Scene>

      <div className="page" style={{ paddingTop: 0 }}>
        {/* the manna on the ground, in numbers: what's left of the month's budget and what that makes each day */}
        <Link to="/plan/budgets" className={`manna-strip${over ? ' is-over' : ''}`}>
          <span className="manna-strip-icon" aria-hidden="true"><Glyph name={over ? 'sun' : 'wheat'} size={18} /></span>
          {plan.total > 0 ? (
            over ? (
              <span className="grow">The ground is bare: <strong className="num">{peso(-plan.left)}</strong> over budget</span>
            ) : (
              <>
                <span className="grow manna-strip-label">Manna left this month</span>
                <span className="num manna-strip-amt">
                  <strong>{peso(plan.left)}</strong>
                  <small>{peso(Math.floor(plan.perDay))} a day</small>
                </span>
              </>
            )
          ) : (
            <span className="grow manna-strip-label">Set a budget to see manna on the ground</span>
          )}
          <Glyph name="fwd" size={16} className="faint" />
          {plan.total > 0 && !over && <span className="manna-strip-meter" style={{ '--k': mannaShare ?? 0 } as CSSProperties} aria-hidden="true" />}
        </Link>

        <Wallet available={available} have={picture.have} owed={picture.owed} accounts={accounts} bal={bal} />

        <QuickActions onKaty={() => setTalk(true)} />

        <Link to="/plan/budgets" className="card card-link spend-card">
          {plan.total > 0 ? (
            <div className="spend-top">
              <Ring pct={plan.pct} tone={tone} />
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
          {totals.spent > 0 && <SpendChart daily={daily} today={dayOfMonth} budget={plan.total} tone={plan.total > 0 ? tone : 'good'} month={t} />}
          {top.length > 0 && (
            <ul className="top-spend" aria-label="Where it went">
              {top.map(({ c, amt }) => (
                <li key={c.id}>
                  <span className="top-spend-ic"><Glyph name={c.icon} size={16} /></span>
                  <span className="top-spend-name ellipsis">{c.name}</span>
                  <span className="top-spend-bar" aria-hidden="true"><span style={{ width: `${(amt / top[0].amt) * 100}%` }} /></span>
                  <span className="top-spend-amt num">{peso(Math.round(amt))}</span>
                  <span className="top-spend-pct num">{Math.round((amt / totals.spent) * 100)}%</span>
                </li>
              ))}
            </ul>
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
          {!ti.done && ti.due > 0 && (
            <div className="tithe-progress">
              <div className="bar"><span className="gold" style={{ width: `${Math.min(100, (ti.given / ti.due) * 100)}%` }} /></div>
              <p className="tiny muted num">{peso(ti.given)} of {peso(ti.due)} set apart</p>
            </div>
          )}
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

        {/* two small cards side by side: what's being saved, and who owes whom */}
        <div className="glance">
          <Link to="/plan/goals" className="card card-link glance-card">
            <span className="glance-head">
              <span className="glance-ic good"><Glyph name="jar" size={18} /></span>
              <span className="eyebrow">Goals</span>
            </span>
            {goals.length ? (
              <>
                <p className="glance-num num">{peso(Math.round(goalSavedSum))}</p>
                <p className="tiny muted num ellipsis">of {peso(goalTarget)}{goals.length > 1 ? ` · ${goals.length} goals` : ''}</p>
                <div className="bar"><span className="good" style={{ width: `${Math.min(100, (goalSavedSum / Math.max(goalTarget, 1)) * 100)}%` }} /></div>
              </>
            ) : (
              <p className="small muted">Name something to save for.</p>
            )}
          </Link>
          <Link to="/owed" className="card card-link glance-card">
            <span className="glance-head">
              <span className="glance-ic"><Glyph name="people" size={18} /></span>
              <span className="eyebrow">Owed</span>
            </span>
            <p className="glance-line"><span className="tiny muted">To you</span><strong className="num good">{peso(owedToMe)}</strong></p>
            <p className="glance-line"><span className="tiny muted">You owe</span><strong className="num bad">{peso(iOwe)}</strong></p>
          </Link>
        </div>

        <figure className="verse" style={{ margin: '4px 0 0' }}>
          <p>“{verse.text}”</p>
          <cite>{verse.ref}</cite>
        </figure>
      </div>
      {talk && <MascotChat onClose={() => setTalk(false)} />}
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
function Wallet({ available, have, owed, accounts, bal }: { available: number; have: number; owed: number; accounts: Account[]; bal: Map<string, number> }) {
  const [hidden, toggle] = useHidden()
  const [showAll, setShowAll] = useState(false)
  const shown = useCountUp(available)
  const acc = (a: Account, i: number) => (
    <Link key={a.id} to="/settings#accounts" className="wallet-acc" style={{ '--n': i % 3, '--row': Math.floor(i / 3) - 1 } as CSSProperties}>
      <span className="wallet-acc-name">
        <span className="wallet-mark"><AccountMark name={a.name} kind={a.kind} size={18} /></span>
        <span className="ellipsis">{a.name}</span>
      </span>
      {a.kind === 'card' && (bal.get(a.id) ?? 0) < 0 ? (
        // a card shows what's owed on it, not a minus sign
        <span className="wallet-acc-amt num owed">
          <Secret hidden={hidden} text={peso(cardStatus(a, bal.get(a.id) ?? 0).owed)} flakes={4} delay={180 + Math.min(i, 5) * 70} />
          <span className="wallet-owed"> owed</span>
        </span>
      ) : (
        <span className="wallet-acc-amt num"><Secret hidden={hidden} text={peso(bal.get(a.id) ?? 0)} flakes={4} delay={180 + Math.min(i, 5) * 70} /></span>
      )}
    </Link>
  )
  return (
    <section className="wallet" aria-label="Available now">
      <svg className="wallet-flakes" viewBox="200 0 160 150" aria-hidden="true" preserveAspectRatio="xMaxYMin meet">
        {[[300, 22, 1.8], [344, 60, 1.5], [296, 56, 1.1], [350, 14, 1.2]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={r * 1.5} ry={r} />
        ))}
        <path className="wallet-star" d="M323 16 Q325.2 28.8 338 31 Q325.2 33.2 323 46 Q320.8 33.2 308 31 Q320.8 28.8 323 16Z" />
      </svg>
      <div className="wallet-head">
        <p className="eyebrow">{owed > 0 ? 'Free to use' : 'Available now'}</p>
        <EyeToggle className="wallet-eye" hidden={hidden} onToggle={toggle} />
      </div>
      <p className="wallet-total num">
        <Secret hidden={hidden} text={peso(Math.round(shown * 100) / 100)} centsClass="wallet-cents" flakes={6} />
      </p>
      {owed > 0 && (
        <p className="wallet-sub num">
          <Secret hidden={hidden} text={peso(have)} flakes={3} /> in your accounts · <Secret hidden={hidden} text={peso(owed)} flakes={3} /> owed on cards
        </p>
      )}
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

type Tone = 'good' | 'gold' | 'bad'

/** The kinds the gold + doesn't start on, one tap away; and KATY. */
function QuickActions({ onKaty }: { onKaty: () => void }) {
  return (
    <nav className="quick" aria-label="Quick actions">
      <Link to="/add?kind=income" className="quick-btn">
        <span className="quick-ic good"><Glyph name="wallet" size={22} /></span>
        Received
      </Link>
      <Link to="/add?kind=transfer" className="quick-btn">
        <span className="quick-ic"><Glyph name="swap" size={22} /></span>
        Transfer
      </Link>
      <Link to="/add?kind=giving" className="quick-btn">
        <span className="quick-ic gold"><Glyph name="hands" size={22} /></span>
        Give
      </Link>
      <button type="button" className="quick-btn" onClick={onKaty}>
        <span className="quick-ic cape"><Glyph name="chat" size={22} /></span>
        Ask KATY
      </button>
    </nav>
  )
}

/**
 * The month so far as a line: spending adding up day by day, against the budget (dashed across the top)
 * and an even pace toward it (the faint diagonal). Above the diagonal means ahead of pace.
 */
function SpendChart({ daily, today: day, budget, tone, month }: { daily: number[]; today: number; budget: number; tone: Tone; month: string }) {
  const W = 300
  const H = 76
  const n = daily.length
  const cum: number[] = [0]
  for (let d = 0; d < day; d++) cum.push(cum[d] + daily[d])
  const spent = cum[day]
  const top = Math.max(budget, spent) * 1.12 || 1
  const x = (d: number) => (d / n) * W
  const y = (v: number) => H - (v / top) * (H - 4)
  const line = cum.map((v, d) => `${d ? 'L' : 'M'}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(day).toFixed(1)} ${H} L0 ${H}Z`
  const mon = fromISODate(month).toLocaleDateString('en-US', { month: 'short' })
  return (
    <div className={`spend-chart ${tone}`} role="img" aria-label={`Spent ${peso(spent)} so far this month${budget > 0 ? ` of a ${peso(budget)} budget` : ''}`}>
      <div className="spend-chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity=".28" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {budget > 0 && (
            <>
              <line className="spend-chart-pace" x1="0" y1={H} x2={W} y2={y(budget)} vectorEffect="non-scaling-stroke" />
              <line className="spend-chart-budget" x1="0" y1={y(budget)} x2={W} y2={y(budget)} vectorEffect="non-scaling-stroke" />
            </>
          )}
          <path d={area} fill="url(#spend-fill)" />
          <path className="spend-chart-line" d={line} vectorEffect="non-scaling-stroke" />
        </svg>
        {/* the dot is HTML so the stretched SVG doesn't squash it */}
        <span className="spend-chart-dot" style={{ left: `${(x(day) / W) * 100}%`, top: `${(y(spent) / H) * 100}%` }} />
        {budget > 0 && (
          <span className="spend-chart-tag num" style={{ top: `${(y(budget) / H) * 100}%` }}>
            Budget {peso(budget)}
          </span>
        )}
      </div>
      <div className="spend-chart-axis tiny">
        <span>{mon} 1</span>
        {day / n > 0.16 && day / n < 0.84 && <span style={{ left: `${(day / n) * 100}%` }} className="spend-chart-today">Today</span>}
        <span>{mon} {n}</span>
      </div>
    </div>
  )
}

/** A small ring showing how much of the month's budget is used. */
function Ring({ pct, tone }: { pct: number; tone: Tone }) {
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
