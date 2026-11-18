import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { mock } from '../lib/mock'
import { ask, save, type Entry, type Turn } from '../lib/assistant'
import { peso } from '../lib/money'
import { addDays, dayLabel, today } from '../lib/dates'
import { DateField } from './DateField'
import { Mascot, type MascotAction } from './Mascot'
import { Speech as Typed } from './Speech'
import { Glyph } from './Glyph'
import { useToast } from './Toast'
import { PickPhoto, Thumb } from './Photo'
import type { Photo } from '../lib/photos'

const TRIES = ['Lunch 180 GCash', 'Sweldo 25k to BDO', 'Tithe 2,500', 'Lent 500 to Ana', 'Take note: Jonathan asked if I could help with his father’s meds, not yet', 'What notes do I have?']

const KIND_LABEL: Record<Entry['kind'], string> = { expense: 'Spent', income: 'Received', giving: 'Gave', transfer: 'Moved', lend: 'Lent', borrow: 'Borrowed', note: 'Note' }
const KIND_ICON: Partial<Record<Entry['kind'], string>> = { transfer: 'swap', lend: 'up', borrow: 'down', note: 'pen' }

type Card = Entry & { key: string; state: 'open' | 'saving' | 'saved' | 'dropped' }
type Line = { role: 'user' | 'assistant'; text: string; photo?: Photo; cards?: Card[] }

// the browser's own speech-to-text, where there is one
type Recognition = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void }
const Speech = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition

/**
 * Talk to the mascot: say what happened in plain words and it fills in the entries. Each one shows as a card
 * to check, change and save. Nothing is saved without a tap.
 */
export function MascotChat({ onClose, photo: startPhoto }: { onClose: () => void; /** a receipt picked before the chat opened */ photo?: Photo }) {
  const store = useStore()
  const { data } = store
  const toast = useToast()
  const [talking, setTalking] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [mood, setMood] = useState<MascotAction>('wave')
  const [listening, setListening] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const rec = useRef<Recognition | null>(null)
  const started = useRef(false)

  // opened from "Snap a receipt": send the photo straight away
  useEffect(() => {
    if (!startPhoto || started.current) return
    started.current = true
    void send('', startPhoto)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPhoto])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lines, busy])
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    input.current?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', key)
      document.body.style.overflow = ''
      rec.current?.stop()
    }
  }, [onClose])

  async function send(message: string, photo?: Photo) {
    const m = message.trim()
    if ((!m && !photo) || busy) return
    setText('')
    const history: Turn[] = lines.map((l) => ({ role: l.role, text: l.text || (l.photo ? '(sent a photo)' : '') }))
    setLines((ls) => [...ls, { role: 'user', text: m, photo }])
    setBusy(true)
    setMood('think')
    try {
      const out = await ask(m, history, data, photo)
      const cards = out.entries.map((e, i) => ({ ...e, key: `${Date.now()}-${i}`, state: 'open' as const }))
      setLines((ls) => [...ls, { role: 'assistant', text: out.reply, cards }])
      setMood(cards.length ? 'happy' : 'nod')
    } catch (e) {
      setLines((ls) => [...ls, { role: 'assistant', text: (e as Error).message }])
      setMood('worry')
    } finally {
      setBusy(false)
    }
  }

  const patch = (key: string, p: Partial<Card>) =>
    setLines((ls) => ls.map((l) => (l.cards ? { ...l, cards: l.cards.map((c) => (c.key === key ? { ...c, ...p } : c)) } : l)))

  async function keep(c: Card) {
    patch(c.key, { state: 'saving' })
    try {
      await save(store, c)
      patch(c.key, { state: 'saved' })
      setMood(c.kind === 'giving' ? 'give' : 'happy')
      return true
    } catch (e) {
      patch(c.key, { state: 'open' })
      toast(`Couldn’t save: ${(e as Error).message}`, 'worry')
      return false
    }
  }
  async function keepAll(cards: Card[]) {
    let n = 0
    for (const c of cards) if (c.state === 'open' && (await keep(c))) n++
    if (n) {
      setMood('cheer')
      toast(n === 1 ? 'Saved' : `Saved ${n} entries`, 'cheer')
    }
  }

  function listen() {
    if (!Speech) return
    if (listening) return rec.current?.stop()
    const r = new Speech()
    r.lang = 'en-PH'
    r.interimResults = false
    r.onresult = (e) => {
      const said = e.results[0][0].transcript
      setText(said)
      void send(said)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    setListening(true)
    r.start()
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    void send(text)
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet chat" role="dialog" aria-modal="true" aria-label="Talk to KATY">
        <div className="sheet-grip" />
        <header className={`chat-head${talking ? ' is-talking' : ''}`}>
          <Mascot action={mood} size={64} />
          <div className="grow">
            <h2>Tell KATY what happened</h2>
            <p className="small muted">{mock ? 'Demo: a simple reader stands in for Claude.' : 'I’ll fill it in. You check it before it’s saved.'}</p>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <Glyph name="close" size={22} />
          </button>
        </header>

        <div className="chat-log" aria-live="polite">
          {lines.length === 0 && (
            <div className="chat-empty">
              <p className="small muted">Say it the way you would to a friend. Some ideas:</p>
              <div className="chips">
                {TRIES.map((t) => (
                  <button key={t} type="button" className="chip" onClick={() => send(t)}>
                    {t}
                  </button>
                ))}
                <PickPhoto className="chip chip-photo" onPick={(p) => send(text, p)} onError={(m) => toast(m, 'worry')}>
                  <Glyph name="camera" size={16} /> Snap a receipt
                </PickPhoto>
              </div>
            </div>
          )}
          {lines.map((l, i) => (
            <div key={i} className={`chat-line ${l.role}`}>
              {l.photo && (
                <span className="chat-photo">
                  <Thumb src={l.photo.url} size={120} />
                </span>
              )}
              {l.text &&
                (l.role === 'assistant' && i === lines.length - 1 ? (
                  // KATY's newest reply types out, with her voice and moving mouth
                  <Typed className="chat-bubble" text={l.text} delay={80} onTalking={setTalking} />
                ) : (
                  <p className="chat-bubble">{l.text}</p>
                ))}
              {l.cards && l.cards.length > 0 && (
                <div className="chat-cards">
                  {l.cards.map((c) => (
                    <EntryCard key={c.key} card={c} onChange={(p) => patch(c.key, p)} onSave={() => keep(c)} />
                  ))}
                  {l.cards.filter((c) => c.state === 'open').length > 1 && (
                    <button className="btn gold sm" onClick={() => keepAll(l.cards!)}>
                      Save all {l.cards.filter((c) => c.state === 'open').length}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="chat-line assistant">
              <p className="chat-bubble chat-typing" aria-label="Thinking">
                <i />
                <i />
                <i />
              </p>
            </div>
          )}
          <div ref={end} />
        </div>

        <form className="chat-input" onSubmit={submit}>
          <PickPhoto className="icon-btn" label="Send a receipt photo" onPick={(p) => send(text, p)} onError={(m) => toast(m, 'worry')}>
            <Glyph name="camera" size={20} />
          </PickPhoto>
          <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? 'Listening…' : 'Lunch 180 GCash…'} aria-label="Message" maxLength={1000} enterKeyHint="send" />
          {Speech && (
            <button type="button" className={`icon-btn${listening ? ' is-on' : ''}`} aria-label={listening ? 'Stop listening' : 'Speak'} aria-pressed={listening} onClick={listen}>
              <Glyph name="mic" size={20} />
            </button>
          )}
          <button className="icon-btn send" aria-label="Send" disabled={!text.trim() || busy}>
            <Glyph name="send" size={20} />
          </button>
        </form>
      </div>
    </>
  )
}

function EntryCard({ card: c, onChange, onSave }: { card: Card; onChange: (p: Partial<Card>) => void; onSave: () => void }) {
  const { data } = useStore()
  const accounts = data.accounts.filter((a) => !a.archived)
  const cats = data.categories.filter((x) => x.kind === c.kind && !x.archived)
  const cat = data.categories.find((x) => x.id === c.category_id)
  const icon = KIND_ICON[c.kind] ?? cat?.icon ?? 'dot'
  const title = c.note || (c.kind === 'lend' || c.kind === 'borrow' ? c.person : cat?.name) || KIND_LABEL[c.kind]
  const when = dayLabel(c.occurred_on)
  const tone = c.kind === 'income' || c.kind === 'borrow' ? 'in' : c.kind === 'giving' ? 'give' : c.kind === 'transfer' ? 'move' : ''

  if (c.state === 'dropped') return null
  if (c.kind === 'note') return <NoteCard card={c} onChange={onChange} onSave={onSave} />
  if (c.state === 'saved')
    return (
      <div className="entry-card is-saved">
        <Glyph name="check" size={16} stroke={2.4} />
        <span className="grow ellipsis">{title}</span>
        {c.photo && <Glyph name="receipt" size={15} className="faint" />}
        <span className={`amount ${tone}`}>{peso(c.amount)}</span>
      </div>
    )

  return (
    <div className="entry-card">
      <div className="row">
        <span className={c.kind === 'income' || c.kind === 'borrow' ? 'tile good' : c.kind === 'giving' ? 'tile gold' : 'tile'}>
          <Glyph name={icon} size={20} />
        </span>
        <div className="grow">
          <p className="eyebrow">{KIND_LABEL[c.kind]} · {when}</p>
          <input className="entry-title" value={title} onChange={(e) => onChange({ note: e.target.value })} aria-label="What it was" />
        </div>
        <label className={`entry-amount amount ${tone}`}>
          <span>₱</span>
          <input inputMode="decimal" value={c.amount ? String(c.amount) : ''} placeholder="0" autoFocus={!c.amount} onChange={(e) => onChange({ amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} aria-label="Amount" />
        </label>
      </div>
      {c.photo && (
        <div className="entry-photo">
          <Thumb src={c.photo.url} size={44} onRemove={() => onChange({ photo: undefined })} />
          <span className="tiny muted">Receipt kept with this entry</span>
        </div>
      )}
      <div className="entry-fields">
        {cats.length > 0 && (
          <select value={c.category_id ?? ''} onChange={(e) => onChange({ category_id: e.target.value })} aria-label="Category">
            {cats.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        )}
        <select value={c.account_id} onChange={(e) => onChange({ account_id: e.target.value })} aria-label={c.kind === 'transfer' ? 'From' : 'Account'}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{c.kind === 'transfer' ? `From ${a.name}` : a.name}</option>
          ))}
        </select>
        {c.kind === 'transfer' && (
          <select value={c.to_account_id ?? ''} onChange={(e) => onChange({ to_account_id: e.target.value })} aria-label="To">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>To {a.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="row">
        <button className="btn soft sm" onClick={() => onChange({ state: 'dropped' })}>Not this</button>
        <button className="btn sm grow" onClick={onSave} disabled={c.state === 'saving' || !(c.amount > 0) || (c.kind === 'transfer' && c.to_account_id === c.account_id)}>
          {c.state === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/** A note for KATY to keep: what to remember, who it's about, any amount, and when to bring it up. */
function NoteCard({ card: c, onChange, onSave }: { card: Card; onChange: (p: Partial<Card>) => void; onSave: () => void }) {
  if (c.state === 'saved')
    return (
      <div className="entry-card is-saved">
        <Glyph name="check" size={16} stroke={2.4} />
        <span className="grow ellipsis">Noted{c.person ? ` · ${c.person}` : ''}</span>
        {c.remind_on && <span className="tiny">{dayLabel(c.remind_on)}</span>}
      </div>
    )
  return (
    <div className="entry-card note-card">
      <div className="row">
        <span className="tile gold">
          <Glyph name="pen" size={20} />
        </span>
        <div className="grow">
          <p className="eyebrow">For KATY to remember</p>
          <p className="small muted">{c.person ? `About ${c.person}` : 'A note'}{c.amount > 0 ? ` · ${peso(c.amount)}` : ''}</p>
        </div>
      </div>
      {c.photo && (
        <div className="entry-photo">
          <Thumb src={c.photo.url} size={44} label="Photo" onRemove={() => onChange({ photo: undefined })} />
          <span className="tiny muted">Photo kept with this note</span>
        </div>
      )}
      <textarea className="note-body" value={c.note ?? ''} onChange={(e) => onChange({ note: e.target.value })} rows={3} maxLength={500} aria-label="The note" />
      <div className="entry-fields">
        <input className="note-person" value={c.person ?? ''} onChange={(e) => onChange({ person: e.target.value })} placeholder="Who (optional)" maxLength={60} aria-label="Who it's about" />
      </div>
      <DateField
        label="Remind me"
        optional
        emptyLabel="No reminder"
        value={c.remind_on ?? ''}
        onChange={(v) => onChange({ remind_on: v || null })}
        min={today()}
        presets={[
          { label: 'Tomorrow', value: addDays(today(), 1) },
          { label: 'Next week', value: addDays(today(), 7) },
        ]}
      />
      <div className="row">
        <button className="btn soft sm" onClick={() => onChange({ state: 'dropped' })}>Not this</button>
        <button className="btn sm grow" onClick={onSave} disabled={c.state === 'saving' || !(c.note ?? '').trim()}>
          {c.state === 'saving' ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </div>
  )
}
