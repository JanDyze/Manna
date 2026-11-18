import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { addDays, dayLabel, fmtDate, today } from '../lib/dates'
import { parseAmount, peso } from '../lib/money'
import { goBack } from '../lib/back'
import type { Note } from '../lib/types'
import { Glyph } from '../components/Glyph'
import { Sheet } from '../components/Sheet'
import { DateField } from '../components/DateField'
import { useToast } from '../components/Toast'
import { amountIn, keepPhoto, personIn } from '../lib/assistant'
import { PickPhoto, Thumb } from '../components/Photo'
import { removePhoto, type Photo } from '../lib/photos'

/** Open notes first: the ones due to be brought up, then the newest. */
export function sortNotes(notes: Note[]) {
  const t = today()
  const due = (n: Note) => !!n.remind_on && n.remind_on <= t
  return [...notes].sort((a, b) => Number(due(b)) - Number(due(a)) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}

/** One note as a row: what it says, who it's about, and when KATY will bring it up. */
export function NoteRow({ n, onOpen, onDone }: { n: Note; onOpen: () => void; onDone?: () => void }) {
  const due = !n.done_at && !!n.remind_on && n.remind_on <= today()
  return (
    <li className={`item note-row${n.done_at ? ' is-done' : ''}`}>
      <button className="note-open" onClick={onOpen}>
        <span className={`tile${due ? ' gold' : ''}`}>
          <Glyph name={due ? 'bell' : 'pen'} size={18} />
        </span>
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="note-text">
            {n.body}
            {n.image_path && (
              <span className="has-receipt" aria-label="Has a photo">
                <Glyph name="image" size={14} />
              </span>
            )}
          </span>
          <span className={`item-sub${due ? ' gold' : ''}`}>
            {[n.person, n.amount ? peso(n.amount) : null, n.done_at ? 'Done' : n.remind_on ? `Remind ${dayLabel(n.remind_on)}` : n.created_at ? `Noted ${fmtDate(n.created_at.slice(0, 10))}` : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      </button>
      {onDone && !n.done_at && (
        <button className="chip note-done" onClick={onDone} aria-label={`Mark done: ${n.body}`}>
          <Glyph name="check" size={16} />
        </button>
      )}
    </li>
  )
}

/** Everything KATY keeps for you: add, edit, tick off. */
export function NotesPage() {
  const store = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const [editing, setEditing] = useState<Note | 'new' | null>(() => (params.get('new') ? 'new' : null))
  const [showDone, setShowDone] = useState(false)
  const open = sortNotes(store.data.notes.filter((n) => !n.done_at))
  const done = store.data.notes.filter((n) => n.done_at).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))

  async function markDone(n: Note) {
    await store.update('notes', n.id, { done_at: new Date().toISOString() })
    toast('Done. I’ll stop bringing it up.', 'nod')
  }

  return (
    <div className="page">
      <header className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => goBack(nav, '/')}>
          <Glyph name="back" size={24} />
        </button>
        <p className="title-center">KATY’s notes</p>
        <button className="icon-btn" aria-label="Add a note" onClick={() => setEditing('new')}>
          <Glyph name="plus" size={22} />
        </button>
      </header>
      <p className="small muted" style={{ padding: '0 4px' }}>
        Things you asked KATY to remember: requests, promises, things to pray about. She brings them up on the day you choose, and remembers them when you ask.
      </p>

      {open.length ? (
        <ul className="card flush list">
          {open.map((n) => (
            <NoteRow key={n.id} n={n} onOpen={() => setEditing(n)} onDone={() => markDone(n)} />
          ))}
        </ul>
      ) : (
        <div className="card quiet small muted">No open notes. Tell KATY “take note…” or tap + to add one.</div>
      )}

      {done.length > 0 && (
        <>
          <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Hide done' : `Show done (${done.length})`}
          </button>
          {showDone && (
            <ul className="card flush list">
              {done.map((n) => (
                <NoteRow key={n.id} n={n} onOpen={() => setEditing(n)} />
              ))}
            </ul>
          )}
        </>
      )}

      {editing && <NoteSheet note={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/** Money in a note only when it clearly is money: ₱500, 2,000, 5k, or 500 pesos (not "Nov 21"). */
function noteAmount(text: string): number | null {
  const m = text.match(/₱\s*\d[\d,]*(\.\d+)?|\b\d{1,3}(,\d{3})+(\.\d+)?\b|\b\d+(\.\d+)?\s*k\b|\b\d+(\.\d+)?\s*(pesos?|php)\b/i)
  return m ? amountIn(m[0])?.amount ?? null : null
}

/** A tag under the note: what KATY picked out of the text. Tap to change it, ✕ to drop it. */
function Tag({ icon, value, placeholder, onChange, inputMode }: { icon: string; value: string; placeholder: string; onChange: (v: string | null) => void; inputMode?: 'decimal' }) {
  const [editing, setEditing] = useState(false)
  if (editing)
    return (
      <span className="note-tag is-editing">
        <Glyph name={icon} size={14} />
        <input autoFocus defaultValue={value} placeholder={placeholder} inputMode={inputMode} maxLength={60} aria-label={placeholder}
          onBlur={(e) => (onChange(e.target.value.trim() || null), setEditing(false))}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), (e.target as HTMLInputElement).blur())} />
      </span>
    )
  return (
    <span className="note-tag">
      <button type="button" onClick={() => setEditing(true)} aria-label={`Change ${placeholder}`}>
        <Glyph name={icon} size={14} />
        {value}
      </button>
      <button type="button" className="note-tag-x" aria-label={`Remove ${placeholder}`} onClick={() => onChange(null)}>
        <Glyph name="close" size={12} stroke={2.4} />
      </button>
    </span>
  )
}

/**
 * Add or edit a note: just the words and when to bring it up. Who it's about and any amount are picked out of
 * the text as you type and shown as tags; tap a tag to change it, ✕ to drop it.
 */
export function NoteSheet({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [body, setBody] = useState(note?.body ?? '')
  // undefined: follow the text; null: removed; a value: set by hand
  const [person, setPerson] = useState<string | null | undefined>(note ? note.person : undefined)
  const [amount, setAmount] = useState<number | null | undefined>(note ? note.amount : undefined)
  const [remind, setRemind] = useState(note?.remind_on ?? '')
  const [busy, setBusy] = useState(false)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [keptPath, setKeptPath] = useState<string | null>(note?.image_path ?? null)
  const autoPerson = person === undefined ? personIn(body, store.data) : person
  const autoAmount = amount === undefined ? noteAmount(body) : amount

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try {
      const image_path = photo ? await keepPhoto(store.data.settings.user_id, photo) : keptPath
      const row = { body: body.trim(), person: autoPerson?.trim() || null, amount: autoAmount && autoAmount > 0 ? autoAmount : null, remind_on: remind || null, image_path }
      if (note) {
        await store.update('notes', note.id, row)
        if (note.image_path && note.image_path !== image_path) void removePhoto(note.image_path)
      } else await store.insert('notes', { ...row, done_at: null })
      toast(note ? 'Note updated' : 'I’ll remember that', 'nod')
      onClose()
    } catch (err) {
      toast((err as Error).message, 'worry')
      setBusy(false)
    }
  }

  return (
    <Sheet title={note ? 'Note' : 'New note'} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <textarea className="note-plain" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={4} aria-label="What should KATY remember?"
          placeholder="What should I remember? Like: Jonathan asked if I could help with his father’s medicine. Not yet." required />
        {(autoPerson || autoAmount) && (
          <div className="note-tags">
            {autoPerson && <Tag icon="user" value={autoPerson} placeholder="who" onChange={(v) => setPerson(v)} />}
            {autoAmount ? <Tag icon="tag" value={peso(autoAmount)} placeholder="amount" inputMode="decimal" onChange={(v) => setAmount(v ? parseAmount(v) ?? null : null)} /> : null}
          </div>
        )}
        {photo || keptPath ? (
          <div className="entry-photo">
            <Thumb src={photo?.url} path={photo ? null : keptPath} size={64} label="Photo" onRemove={() => (setPhoto(null), setKeptPath(null))} />
            <PickPhoto className="link small" onPick={setPhoto} onError={(m) => toast(m, 'worry')}>Replace photo</PickPhoto>
          </div>
        ) : (
          <PickPhoto className="note-tag-add" onPick={setPhoto} onError={(m) => toast(m, 'worry')}>
            <Glyph name="camera" size={15} /> Add a photo
          </PickPhoto>
        )}
        <DateField
          label="Remind me"
          optional
          emptyLabel="No reminder"
          value={remind}
          onChange={setRemind}
          min={today()}
          presets={[
            { label: 'Tomorrow', value: addDays(today(), 1) },
            { label: 'Next week', value: addDays(today(), 7) },
          ]}
        />
        <button className="btn block" disabled={busy || !body.trim()}>{note ? 'Save' : 'Keep this note'}</button>
        {note && (
          <div className="row">
            {!note.done_at ? (
              <button type="button" className="btn soft sm grow" onClick={async () => (await store.update('notes', note.id, { done_at: new Date().toISOString() }), onClose())}>
                <Glyph name="check" size={16} /> Mark done
              </button>
            ) : (
              <button type="button" className="btn soft sm grow" onClick={async () => (await store.update('notes', note.id, { done_at: null }), onClose())}>
                Open again
              </button>
            )}
            <button type="button" className="btn soft sm grow danger" onClick={async () => (await store.remove('notes', note.id), void removePhoto(note.image_path), toast('Note deleted', 'nod'), onClose())}>
              <Glyph name="trash" size={16} /> Delete
            </button>
          </div>
        )}
      </form>
    </Sheet>
  )
}
