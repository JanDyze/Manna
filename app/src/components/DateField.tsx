import { useId, useMemo, useState } from 'react'
import { addMonths, fmtDate, fromISODate, toISODate, today } from '../lib/dates'
import { Glyph } from './Glyph'

export type DatePreset = { label: string; value: string }

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Picking a day, the friendly way: the common choices are one tap (Today, Yesterday, In a week…), and anything
 * else opens a calendar right under the field. The date always reads "Nov 12, 2026"; there are no times.
 * With `optional`, an empty value means "no date" and the first chip clears it.
 */
export function DateField({
  label,
  value,
  onChange,
  presets = [],
  optional = false,
  emptyLabel = 'No date',
  min,
  max,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  presets?: DatePreset[]
  optional?: boolean
  emptyLabel?: string
  min?: string
  max?: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const preset = presets.find((p) => p.value === value)
  const custom = !!value && !preset

  return (
    <div className="field date-field">
      <span className="label" id={`${id}-l`}>{label}</span>
      <div className="chips" role="group" aria-labelledby={`${id}-l`}>
        {optional && (
          <button type="button" className="chip" aria-pressed={!value} onClick={() => (onChange(''), setOpen(false))}>
            {emptyLabel}
          </button>
        )}
        {presets.map((p) => (
          <button type="button" key={p.label} className="chip" aria-pressed={value === p.value} onClick={() => (onChange(p.value), setOpen(false))}>
            {p.label}
          </button>
        ))}
        <button type="button" className={`chip date-chip${open ? ' is-open' : ''}`} aria-pressed={custom} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <Glyph name="calendar" size={16} />
          {custom ? fmtDate(value) : 'Pick a date'}
        </button>
      </div>
      {value && preset && <p className="tiny muted date-said">{fmtDate(value)}</p>}
      {open && (
        <Calendar
          value={value}
          min={min}
          max={max}
          onPick={(v) => {
            onChange(v)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

/** A month at a glance. Today has a ring; the picked day is filled; days outside min/max can't be picked. */
export function Calendar({ value, onPick, min, max }: { value: string; onPick: (v: string) => void; min?: string; max?: string }) {
  // opens on the picked day's month, or this month (or the first allowed one) when nothing is picked yet
  const [month, setMonth] = useState((value || (min && min > today() ? min : today())).slice(0, 7))
  const t = today()
  const cells = useMemo(() => {
    const first = fromISODate(`${month}-01`)
    const lead = first.getDay()
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const out: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= days; d++) out.push(toISODate(new Date(first.getFullYear(), first.getMonth(), d)))
    return out
  }, [month])
  const title = fromISODate(`${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const prevOk = !min || addMonths(`${month}-01`, -1).slice(0, 7) >= min.slice(0, 7)
  const nextOk = !max || addMonths(`${month}-01`, 1).slice(0, 7) <= max.slice(0, 7)

  return (
    <div className="calendar" role="dialog" aria-label={`Pick a date, ${title}`}>
      <div className="cal-head">
        <button type="button" className="icon-btn" aria-label="Previous month" disabled={!prevOk} onClick={() => setMonth(addMonths(`${month}-01`, -1).slice(0, 7))}>
          <Glyph name="back" size={20} />
        </button>
        <p className="cal-title">{title}</p>
        <button type="button" className="icon-btn" aria-label="Next month" disabled={!nextOk} onClick={() => setMonth(addMonths(`${month}-01`, 1).slice(0, 7))}>
          <Glyph name="fwd" size={20} />
        </button>
      </div>
      <div className="cal-grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="cal-wd" aria-hidden="true">{w}</span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              type="button"
              key={d}
              className={`cal-day${d === t ? ' is-today' : ''}${d === value ? ' is-picked' : ''}`}
              disabled={(!!min && d < min) || (!!max && d > max)}
              aria-pressed={d === value}
              aria-label={fmtDate(d)}
              onClick={() => onPick(d)}
            >
              {Number(d.slice(8))}
            </button>
          ) : (
            <span key={`x${i}`} />
          ),
        )}
      </div>
      {month !== t.slice(0, 7) && (
        <button type="button" className="link cal-today" onClick={() => setMonth(t.slice(0, 7))}>
          Back to this month
        </button>
      )}
    </div>
  )
}
