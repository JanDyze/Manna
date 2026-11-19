import { useState, type FormEvent } from 'react'
import { useStore } from '../../lib/store'
import type { Goal } from '../../lib/types'
import { goalSaved, parseAmount, peso } from '../../lib/money'
import { addMonths, daysBetween, endOfMonth, shortDate, today } from '../../lib/dates'
import { DateField } from '../../components/DateField'
import { Bar, Tile } from '../../components/Bits'
import { Glyph } from '../../components/Glyph'
import { IconPicker } from '../../components/IconPicker'
import { Mascot } from '../../components/Mascot'
import { Sheet } from '../../components/Sheet'
import { MoneyField } from '../../components/Pickers'
import { useToast } from '../../components/Toast'

/** Savings goals: provision laid up wisely (Proverbs 21:20), like the golden pot of manna kept before the LORD (Exodus 16:33; Hebrews 9:4). */
export function GoalsTab() {
  const store = useStore()
  const { data } = store
  const [editing, setEditing] = useState<Goal | 'new' | null>(null)
  const [adding, setAdding] = useState<Goal | null>(null)
  const goals = data.goals.filter((g) => !g.closed_at)
  const done = data.goals.filter((g) => g.closed_at)
  const total = goals.reduce((s, g) => s + goalSaved(g, data.goal_entries), 0)

  return (
    <>
      {goals.length ? (
        <section className="row" style={{ alignItems: 'flex-end', gap: 4 }}>
          <Mascot action="idle" size={84} />
          <p className="card hand" style={{ fontSize: 21, lineHeight: 1.15, borderRadius: '18px 18px 18px 6px', padding: '10px 14px', marginBottom: 24 }}>
            Little by little: {peso(total)} kept so far.
          </p>
        </section>
      ) : (
        <div className="empty">
          <Mascot action="think" size={100} />
          <p>What are you saving for? An emergency fund, tuition, a trip. Each goal fills the golden jar on Today.</p>
        </div>
      )}

      <ul className="stack list" style={{ gap: 10 }}>
        {goals.map((g) => {
          const saved = goalSaved(g, data.goal_entries)
          const pct = (saved / g.target) * 100
          const left = Math.max(0, g.target - saved)
          let pace = ''
          if (g.target_on && left > 0) {
            const days = daysBetween(today(), g.target_on)
            pace = days > 0 ? ` · ${peso(Math.ceil(left / Math.max(1, days / 30.4)))} a month to make it` : ' · target date passed'
          }
          return (
            <li key={g.id} className="card">
              <button className="row" style={{ width: '100%', background: 'none', border: 0, padding: 0, textAlign: 'left' }} onClick={() => setEditing(g)} aria-label={`Edit ${g.name}`}>
                <Tile icon={g.icon} tone="gold" />
                <div className="grow">
                  <p className="item-title" style={{ fontWeight: 600 }}>{g.name}</p>
                  <p className="item-sub">{g.target_on ? `By ${shortDate(g.target_on)}` : 'No date set'}{pace}</p>
                </div>
                <span className={`pill${pct >= 100 ? ' good' : ' gold'}`}>{Math.min(100, Math.round(pct))}%</span>
              </button>
              <div style={{ margin: '12px 0 10px' }}>
                <Bar pct={pct} thick tone={pct >= 100 ? 'good' : 'gold'} label={`${g.name} progress`} />
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <p className="num">
                  <strong>{peso(saved)}</strong> <span className="muted">of {peso(g.target)}</span>
                </p>
                <button className="chip" onClick={() => setAdding(g)}>
                  <Glyph name="plus" size={16} />
                  Add money
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {done.length > 0 && <p className="small muted" style={{ padding: '0 4px' }}>Reached: {done.map((g) => g.name).join(', ')}</p>}

      <button className="btn soft block" onClick={() => setEditing('new')}>
        <Glyph name="plus" size={18} />
        New goal
      </button>

      <figure className="verse" style={{ margin: 0 }}>
        <p>“There is treasure to be desired and oil in the dwelling of the wise.”</p>
        <cite>Proverbs 21:20</cite>
      </figure>

      {editing && <GoalSheet goal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {adding && <AddMoneySheet goal={adding} onClose={() => setAdding(null)} />}
    </>
  )
}

function GoalSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [targetOn, setTargetOn] = useState(goal?.target_on ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? 'jar')
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(target)
    if (!name.trim()) return setError('Name the goal.')
    if (!v) return setError('Enter the amount you’re aiming for.')
    const row = { name: name.trim(), target: v, target_on: targetOn || null, icon }
    try {
      if (goal) await store.update('goals', goal.id, row)
      else await store.insert('goals', { ...row, closed_at: null })
      toast(goal ? 'Goal updated' : `${row.name}: let’s begin`, 'nod')
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  async function close() {
    if (!goal) return
    await store.update('goals', goal.id, { closed_at: new Date().toISOString() })
    toast(`${goal.name} marked done`, 'cheer')
    onClose()
  }
  async function remove() {
    if (!goal || !confirm(`Delete ${goal.name} and its history?`)) return
    await store.remove('goals', goal.id)
    toast('Goal deleted', 'nod')
    onClose()
  }

  return (
    <Sheet title={goal ? goal.name : 'New goal'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field">
          <label htmlFor="g-name">Saving for</label>
          <input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Emergency fund, tuition, a trip…" maxLength={60} required />
        </div>
        <MoneyField id="g-target" label="Target" value={target} onChange={setTarget} required />
        <DateField
          label="Reach it by"
          optional
          value={targetOn}
          onChange={setTargetOn}
          min={today()}
          presets={[
            { label: 'In 3 months', value: endOfMonth(addMonths(today(), 3)) },
            { label: 'In 6 months', value: endOfMonth(addMonths(today(), 6)) },
            { label: 'Year end', value: `${today().slice(0, 4)}-12-31` },
          ]}
        />
        <div>
          <p className="label" style={{ marginBottom: 8 }}>Icon</p>
          <IconPicker value={icon} onChange={setIcon} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block">Save</button>
        {goal && (
          <div className="grid-2">
            <button type="button" className="btn soft" onClick={close}>Mark done</button>
            <button type="button" className="btn danger" onClick={remove}>Delete</button>
          </div>
        )}
      </form>
    </Sheet>
  )
}

function AddMoneySheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [takeOut, setTakeOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saved = goalSaved(goal, store.data.goal_entries)

  async function save(e: FormEvent) {
    e.preventDefault()
    const v = parseAmount(amount)
    if (!v) return setError('Enter an amount.')
    if (takeOut && v > saved) return setError(`There’s only ${peso(saved)} in this goal.`)
    try {
      await store.insert('goal_entries', { goal_id: goal.id, amount: takeOut ? -v : v, occurred_on: today(), note: null })
      const now = saved + (takeOut ? -v : v)
      if (!takeOut && saved < goal.target && now >= goal.target) toast(`${goal.name} reached! Praise God!`, 'cheer')
      else toast(takeOut ? `Took out ${peso(v)}` : `Kept ${peso(v)} for ${goal.name}`, takeOut ? 'nod' : 'happy')
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet title={goal.name} onClose={onClose}>
      <form onSubmit={save}>
        <div className="seg" role="group" aria-label="Direction">
          <button type="button" aria-pressed={!takeOut} onClick={() => setTakeOut(false)}>Put in</button>
          <button type="button" aria-pressed={takeOut} onClick={() => setTakeOut(true)}>Take out</button>
        </div>
        <MoneyField id="ge-amt" label="Amount" value={amount} onChange={setAmount} required hint={`${peso(saved)} saved of ${peso(goal.target)}. This only tracks the goal; move the money between accounts with a transfer if you keep it somewhere separate.`} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block">{takeOut ? 'Take out' : 'Put in'}</button>
      </form>
    </Sheet>
  )
}
