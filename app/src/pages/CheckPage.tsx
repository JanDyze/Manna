import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, type Data } from '../lib/store'
import { balances, budgetUse, monthTotals, parseAmount, peso } from '../lib/money'
import { fmtDate, monthLabel, shiftMonth, today } from '../lib/dates'
import { goBack } from '../lib/back'
import type { Tx } from '../lib/types'
import { Glyph } from '../components/Glyph'
import { Mascot } from '../components/Mascot'
import { AccountMark } from '../components/Bits'
import { useToast } from '../components/Toast'

/** The month a check closes: in the first week it's last month, otherwise this one. */
export function closingMonth(t = today()) {
  return Number(t.slice(8, 10)) <= 7 ? shiftMonth(t.slice(0, 7), -1) : t.slice(0, 7)
}

/** Time for a check: the last days of the month or the first of the next, and none done for that month yet. */
export function checkDue(data: Data, t = today()) {
  const day = Number(t.slice(8, 10))
  if (day < 26 && day > 5) return false
  return !data.balance_checks.some((c) => c.month === closingMonth(t))
}

type Fix = 'spent' | 'found' | 'leave'

/**
 * Month-end check: count what each account really holds and compare it with Manna's record. Any difference
 * can be recorded (as spending you forgot to log, or money you didn't log coming in) or left with a note.
 * Below it, the month's plan against what was actually spent, category by category.
 */
export function CheckPage() {
  const store = useStore()
  const { data } = store
  const nav = useNavigate()
  const toast = useToast()
  const t = today()
  const month = closingMonth(t)
  const accounts = data.accounts.filter((a) => !a.archived).sort((a, b) => a.sort - b.sort)
  const bal = useMemo(() => balances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const [actual, setActual] = useState<Record<string, string>>({})
  const [fix, setFix] = useState<Record<string, Fix>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const rows = accounts.map((a) => {
    const recorded = Math.round((bal.get(a.id) ?? 0) * 100) / 100
    const typed = actual[a.id]
    const real = typed === undefined || typed === '' ? null : parseAmount(typed) ?? null
    const diff = real === null ? null : Math.round((real - recorded) * 100) / 100
    return { a, recorded, real, diff, fix: fix[a.id] ?? (diff !== null && diff < 0 ? 'spent' : diff !== null && diff > 0 ? 'found' : 'leave') }
  })
  const counted = rows.filter((r) => r.real !== null)
  const allCounted = counted.length === rows.length && rows.length > 0
  const totalRecorded = rows.reduce((s, r) => s + r.recorded, 0)
  const totalReal = counted.reduce((s, r) => s + (r.real ?? 0), 0)
  const totalDiff = counted.reduce((s, r) => s + (r.diff ?? 0), 0)

  // plan against what was actually spent this month
  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month])
  const uses = budgetUse(data.budgets, data.categories, totals).sort((x, y) => y.spent - y.budget.amount - (x.spent - x.budget.amount))
  const planned = uses.reduce((s, u) => s + u.budget.amount, 0)
  const spentPlanned = uses.reduce((s, u) => s + u.spent, 0)
  const unplanned = Math.max(0, Math.round((totals.spent - spentPlanned) * 100) / 100)
  const past = useMemo(() => pastChecks(data), [data])

  async function save() {
    setBusy(true)
    const other = (kind: 'expense' | 'income') => data.categories.find((c) => c.kind === kind && c.name === 'Other' && !c.archived) ?? data.categories.find((c) => c.kind === kind && !c.archived)
    try {
      for (const r of counted) {
        let adjustment: Tx | null = null
        if (r.diff && r.fix !== 'leave') {
          const kind = r.fix === 'spent' ? 'expense' : 'income'
          adjustment = await store.insert('transactions', {
            kind,
            amount: Math.abs(r.diff),
            occurred_on: t,
            account_id: r.a.id,
            to_account_id: null,
            category_id: other(kind)?.id ?? null,
            debt_id: null,
            recurring_id: null,
            note: r.fix === 'spent' ? `Not logged (${monthLabel(month)} check)` : `Found (${monthLabel(month)} check)`,
          } as Partial<Tx>)
        }
        await store.insert('balance_checks', {
          checked_on: t,
          month,
          account_id: r.a.id,
          recorded: r.recorded,
          actual: r.real ?? r.recorded,
          adjustment_id: adjustment?.id ?? null,
          note: notes[r.a.id]?.trim() || null,
        })
      }
      toast(Math.abs(totalDiff) < 0.005 ? 'Everything matches. Well kept!' : 'Check saved. Your record matches what you have now.', Math.abs(totalDiff) < 0.005 ? 'cheer' : 'nod')
      nav('/', { replace: true })
    } catch (e) {
      toast(`Couldn’t save: ${(e as Error).message}`, 'worry')
      setBusy(false)
    }
  }

  return (
    <div className="page check-page" style={{ paddingBottom: 'calc(28px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => goBack(nav)}>
          <Glyph name="back" size={24} />
        </button>
        <p className="title-center">Month-end check</p>
        <span style={{ width: 44 }} />
      </div>

      <div className="talk check-intro">
        <span className="talk-mascot">
          <Mascot action="think" size={70} />
        </span>
        <p className="talk-bubble">
          Let’s close {monthLabel(month, false)}. Open each wallet and app, and type what’s really there. I’ll show where it differs from the record.
        </p>
      </div>

      <section>
        <p className="eyebrow" style={{ padding: '0 6px 8px' }}>What you actually have</p>
        <ul className="card flush list">
          {rows.map((r) => (
            <li key={r.a.id} className="item check-row">
              <AccountMark name={r.a.name} kind={r.a.kind} tile />
              <div className="grow" style={{ minWidth: 0 }}>
                <p className="item-title ellipsis">{r.a.name}</p>
                <p className="item-sub">On record {peso(r.recorded)}</p>
                {r.diff !== null && (
                  <p className={`pill ${Math.abs(r.diff) < 0.005 ? 'good' : r.diff < 0 ? 'bad' : 'gold'}`} style={{ marginTop: 6 }}>
                    {Math.abs(r.diff) < 0.005 ? (
                      <><Glyph name="check" size={13} stroke={2.4} /> Matches</>
                    ) : r.diff < 0 ? (
                      `${peso(-r.diff)} less than recorded`
                    ) : (
                      `${peso(r.diff)} more than recorded`
                    )}
                  </p>
                )}
              </div>
              <div className="check-input">
                <label className="onb-money">
                  <span>₱</span>
                  <input inputMode="decimal" placeholder="0" value={actual[r.a.id] ?? ''} onChange={(e) => setActual({ ...actual, [r.a.id]: e.target.value })} aria-label={`What ${r.a.name} actually has`} />
                </label>
                {r.real === null && (
                  <button type="button" className="link tiny" onClick={() => setActual({ ...actual, [r.a.id]: String(r.recorded) })}>
                    It matches
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {counted.length > 0 && (
        <section className="card">
          <div className="grid-3 check-sum">
            <div>
              <p className="tiny muted">On record</p>
              <p className="num" style={{ fontWeight: 600 }}>{peso(counted.reduce((s, r) => s + r.recorded, 0))}</p>
            </div>
            <div>
              <p className="tiny muted">Actually</p>
              <p className="num" style={{ fontWeight: 600 }}>{peso(totalReal)}</p>
            </div>
            <div>
              <p className="tiny muted">Difference</p>
              <p className={`num ${Math.abs(totalDiff) < 0.005 ? 'good' : totalDiff < 0 ? 'bad' : 'gold'}`} style={{ fontWeight: 700 }}>
                {Math.abs(totalDiff) < 0.005 ? '₱0' : `${totalDiff < 0 ? '−' : '+'}${peso(Math.abs(totalDiff))}`}
              </p>
            </div>
          </div>
          {!allCounted && <p className="tiny muted" style={{ marginTop: 8 }}>{rows.length - counted.length} more to count. On record in total: {peso(totalRecorded)}.</p>}

          {counted.some((r) => r.diff && Math.abs(r.diff) >= 0.005) && (
            <div className="check-fixes">
              <p className="small" style={{ fontWeight: 600, marginTop: 14 }}>What should I do with the difference?</p>
              {counted
                .filter((r) => r.diff && Math.abs(r.diff) >= 0.005)
                .map((r) => (
                  <div key={r.a.id} className="check-fix">
                    <p className="small">
                      <strong>{r.a.name}</strong> · {r.diff! < 0 ? `${peso(-r.diff!)} less` : `${peso(r.diff!)} more`}
                    </p>
                    <div className="chips">
                      {r.diff! < 0 ? (
                        <button type="button" className="chip" aria-pressed={r.fix === 'spent'} onClick={() => setFix({ ...fix, [r.a.id]: 'spent' })}>Spending I forgot to log</button>
                      ) : (
                        <button type="button" className="chip" aria-pressed={r.fix === 'found'} onClick={() => setFix({ ...fix, [r.a.id]: 'found' })}>Money in I forgot to log</button>
                      )}
                      <button type="button" className="chip" aria-pressed={r.fix === 'leave'} onClick={() => setFix({ ...fix, [r.a.id]: 'leave' })}>Leave it, just note it</button>
                    </div>
                    <input className="input check-note" placeholder="A note, like “probably snacks”" maxLength={200} value={notes[r.a.id] ?? ''} onChange={(e) => setNotes({ ...notes, [r.a.id]: e.target.value })} />
                  </div>
                ))}
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Recording it adds one entry (category Other) so the record matches what you have. Leaving it keeps the record as is and remembers the gap.
              </p>
            </div>
          )}

          <button className="btn block" style={{ marginTop: 14 }} disabled={!allCounted || busy} onClick={save}>
            {busy ? 'Saving…' : allCounted ? 'Close the month' : 'Count every account first'}
          </button>
        </section>
      )}

      <section className="card">
        <div className="card-head">
          <p className="eyebrow">{monthLabel(month)}: plan against actual</p>
        </div>
        {uses.length ? (
          <>
            <table className="var-table">
              <thead>
                <tr><th>Category</th><th>Plan</th><th>Spent</th><th>Difference</th></tr>
              </thead>
              <tbody>
                {uses.map((u) => {
                  const d = u.budget.amount - u.spent
                  return (
                    <tr key={u.budget.id}>
                      <td><Glyph name={u.category.icon} size={15} /> {u.category.name}</td>
                      <td className="num">{peso(u.budget.amount)}</td>
                      <td className="num">{peso(u.spent)}</td>
                      <td className={`num ${d < 0 ? 'bad' : 'good'}`}>{d < 0 ? `−${peso(-d)}` : `+${peso(d)}`}</td>
                    </tr>
                  )
                })}
                {unplanned > 0 && (
                  <tr>
                    <td className="muted">Not in the plan</td>
                    <td className="num muted">—</td>
                    <td className="num">{peso(unplanned)}</td>
                    <td className="num bad">−{peso(unplanned)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{peso(planned)}</td>
                  <td className="num">{peso(totals.spent)}</td>
                  <td className={`num ${planned - totals.spent < 0 ? 'bad' : 'good'}`}>{planned - totals.spent < 0 ? `−${peso(totals.spent - planned)}` : `+${peso(planned - totals.spent)}`}</td>
                </tr>
              </tfoot>
            </table>
            <p className="tiny muted" style={{ marginTop: 8 }}>+ is what you kept under plan; − is what went over. Money in this month: {peso(totals.income)} · given: {peso(totals.given)}.</p>
          </>
        ) : (
          <p className="small muted">No budget set for this month, so there’s nothing to compare yet. Spent: {peso(totals.spent)}.</p>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <p className="eyebrow" style={{ padding: '0 6px 8px' }}>Past checks</p>
          <ul className="card flush list">
            {past.map((p) => (
              <li key={p.month} className="item">
                <span className={`tile${Math.abs(p.diff) < 0.005 ? ' good' : ''}`}>
                  <Glyph name={Math.abs(p.diff) < 0.005 ? 'check' : 'info'} size={18} />
                </span>
                <div className="grow">
                  <p className="item-title">{monthLabel(p.month)}</p>
                  <p className="item-sub">Checked {fmtDate(p.on)}{p.note ? ` · ${p.note}` : ''}</p>
                </div>
                <span className={`amount ${Math.abs(p.diff) < 0.005 ? 'good' : p.diff < 0 ? 'bad' : ''}`}>
                  {Math.abs(p.diff) < 0.005 ? 'Matched' : `${p.diff < 0 ? '−' : '+'}${peso(Math.abs(p.diff))}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function pastChecks(data: Data) {
  const by = new Map<string, { month: string; on: string; diff: number; note: string | null }>()
  for (const c of data.balance_checks) {
    const p = by.get(c.month) ?? { month: c.month, on: c.checked_on, diff: 0, note: null }
    p.diff += c.actual - c.recorded
    if (c.checked_on > p.on) p.on = c.checked_on
    if (c.note && !p.note) p.note = c.note
    by.set(c.month, p)
  }
  return [...by.values()].sort((a, b) => b.month.localeCompare(a.month))
}
