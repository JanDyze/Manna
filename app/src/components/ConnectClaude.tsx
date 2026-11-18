// Settings → Claude: make a private link that lets Claude read and record this person's Manna through the
// `manna-mcp` Edge Function (MigraineTracker/supabase/functions/manna-mcp). The link's key is shown once; only its
// hash is stored (manna.connector_keys), and a link can be revoked here any time.
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { mock } from '../lib/mock'
import { fmtDate } from '../lib/dates'
import { Sheet } from './Sheet'
import { Glyph } from './Glyph'
import { Tile } from './Bits'
import { useToast } from './Toast'

type Link = { id: string; label: string; key_hint: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

const BASE = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').replace(/\/+$/, '')
const LOCAL = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/.test(BASE)
const linkFor = (key: string) => `${BASE}/functions/v1/manna-mcp/${key}`
const day = (iso: string) => fmtDate(iso.slice(0, 10))

export function ConnectClaudeSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [links, setLinks] = useState<Link[] | null>(mock ? [] : null)
  const [label, setLabel] = useState('Claude')
  const [fresh, setFresh] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const { data, error } = await supabase
      .from('connector_keys')
      .select('id, label, key_hint, created_at, last_used_at, revoked_at')
      .order('created_at', { ascending: false })
    if (error) return setError(error.message)
    setLinks(data as Link[])
  }
  useEffect(() => {
    if (!mock) void load()
  }, [])

  async function make(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('create_connector_key', { p_label: label.trim() || 'Claude' })
    setBusy(false)
    if (error) return setError(error.message.replace(/^manna: /, ''))
    setFresh(linkFor(data as string))
    void load()
  }

  async function revoke(l: Link) {
    if (!confirm(`Revoke “${l.label}”? Claude stops reaching your Manna through it within a minute.`)) return
    const { error } = await supabase.from('connector_keys').update({ revoked_at: new Date().toISOString() }).eq('id', l.id)
    if (error) return setError(error.message)
    toast('Link revoked', 'nod')
    void load()
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast('Link copied', 'nod')
    } catch {
      setError('Couldn’t copy. Select the link and copy it by hand.')
    }
  }

  const active = (links ?? []).filter((l) => !l.revoked_at)

  return (
    <Sheet title="Connect to Claude" onClose={onClose}>
      <div className="stack">
        <p className="small muted">
          Ask Claude about your money (“how much is left for food?”, “who still owes me?”) or tell it what happened
          (“paid Meralco 1,850 from BDO”). Claude can do anything you can do in Manna through a private link, deleting included; it asks before it deletes.
        </p>

        {mock ? (
          <p className="hint">Demo mode has no account to connect. Sign in to make a link.</p>
        ) : fresh ? (
          <div className="card stack">
            <p style={{ fontWeight: 600 }}>Your link</p>
            <input className="input" readOnly value={fresh} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 13 }} aria-label="Connector link" />
            <button type="button" className="btn block" onClick={() => copy(fresh)}>
              <Glyph name="check" size={18} />
              Copy link
            </button>
            <p className="hint">
              This is the only time it’s shown. Anyone with it can read and add to your Manna, so keep it to yourself; revoke it here if it gets out.
            </p>
            {LOCAL && (
              <p className="hint">
                This link points at your local database, which Claude on the web can’t reach. Use it with the MCP Inspector or Claude Desktop (through
                mcp-remote), or make the link from the deployed app.
              </p>
            )}
            <ol className="small" style={{ paddingLeft: 18, display: 'grid', gap: 4 }}>
              <li>In Claude, open Settings → Connectors.</li>
              <li>Choose Add custom connector, name it “Manna” and paste the link.</li>
              <li>In a chat, turn on Manna from the tools menu and ask away.</li>
            </ol>
            <button type="button" className="btn soft block" onClick={() => setFresh(null)}>Done</button>
          </div>
        ) : (
          <form onSubmit={make} className="stack">
            <div className="field">
              <label htmlFor="cc-label">Name this link</label>
              <input id="cc-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Claude, Claude on my laptop…" />
            </div>
            <button className="btn block" disabled={busy || active.length >= 5}>
              <Glyph name="message" size={18} />
              {busy ? 'Making it…' : 'Make a link for Claude'}
            </button>
            {active.length >= 5 && <p className="hint">You have 5 links. Revoke one to make another.</p>}
          </form>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {!mock && links && links.length > 0 && (
          <>
            <p className="eyebrow" style={{ padding: '6px 6px 0' }}>Your links</p>
            <ul className="card flush list">
              {links.map((l) => (
                <li key={l.id} className="item" style={l.revoked_at ? { opacity: 0.55 } : undefined}>
                  <Tile icon={l.revoked_at ? 'close' : 'message'} />
                  <div className="grow">
                    <p className="item-title">{l.label} <span className="faint">…{l.key_hint}</span></p>
                    <p className="item-sub">
                      {l.revoked_at
                        ? `Revoked ${day(l.revoked_at)}`
                        : `Made ${day(l.created_at)} · ${l.last_used_at ? `last used ${day(l.last_used_at)}` : 'not used yet'}`}
                    </p>
                  </div>
                  {!l.revoked_at && (
                    <button type="button" className="chip" onClick={() => revoke(l)}>Revoke</button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Sheet>
  )
}
