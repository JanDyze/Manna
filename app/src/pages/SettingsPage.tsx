import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useAuth, fullName } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { applyTheme, getThemePref, type ThemePref } from '../lib/theme'
import { mock } from '../lib/mock'
import { goBack } from '../lib/back'
import type { Account, AccountKind, Category, CategoryKind } from '../lib/types'
import { balances, peso } from '../lib/money'
import { ACCOUNT_ICON, ACCOUNT_KIND_LABEL, AccountMark, Tile, initials } from '../components/Bits'
import { Glyph, PICKABLE } from '../components/Glyph'
import { Sheet } from '../components/Sheet'
import { MoneyField } from '../components/Pickers'
import { useToast } from '../components/Toast'
import { ConnectClaudeSheet } from '../components/ConnectClaude'
import { WhatsNewSheet } from '../components/WhatsNew'
import { APP_VERSION, RELEASES } from '../lib/version'

export function SettingsPage() {
  const store = useStore()
  const { data } = store
  const { session } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [account, setAccount] = useState<Account | 'new' | null>(null)
  const [catKind, setCatKind] = useState<CategoryKind | null>(null)
  const [claude, setClaude] = useState(false)
  const [news, setNews] = useState(false)
  const [theme, setTheme] = useState<ThemePref>(getThemePref())
  const [tithe, setTithe] = useState(String(data.settings.tithe_percent))
  const bal = useMemo(() => balances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const name = mock ? 'Demo' : fullName(session) || session?.user.email || ''

  async function saveTithe() {
    const v = Number(tithe)
    if (!Number.isFinite(v) || v < 0 || v > 100) return setTithe(String(data.settings.tithe_percent))
    if (v !== data.settings.tithe_percent) {
      await store.saveSettings({ tithe_percent: v })
      toast(`Tithe set to ${v}%`, 'give')
    }
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(28px + var(--safe-b))' }}>
      <div className="topbar">
        <button className="icon-btn" aria-label="Back" onClick={() => goBack(nav)}>
          <Glyph name="back" size={24} />
        </button>
        <p className="title-center">Settings</p>
        <span style={{ width: 44 }} />
      </div>

      <section className="card row">
        <span className="tile round" style={{ width: 48, height: 48 }}>{initials(name || '?')}</span>
        <div className="grow">
          <p style={{ fontWeight: 600 }} className="ellipsis">{name || 'Signed in'}</p>
          <p className="small muted">{mock ? 'Demo mode: nothing is saved' : 'Same sign-in as Might'}</p>
        </div>
      </section>

      <section id="accounts">
        <p className="eyebrow" style={{ padding: '0 6px 8px' }}>Accounts</p>
        <ul className="card flush list">
          {data.accounts.sort((a, b) => a.sort - b.sort).map((a) => (
            <li key={a.id}>
              <button className="item" onClick={() => setAccount(a)} style={a.archived ? { opacity: 0.55 } : undefined}>
                <AccountMark name={a.name} kind={a.kind} tile />
                <div className="grow">
                  <p className="item-title">{a.name}</p>
                  <p className="item-sub">{ACCOUNT_KIND_LABEL[a.kind]}{a.archived ? ' · hidden' : ''}</p>
                </div>
                <span className="amount">{peso(bal.get(a.id) ?? 0)}</span>
                <Glyph name="fwd" size={18} className="faint" />
              </button>
            </li>
          ))}
          <li>
            <button className="item gold" style={{ fontWeight: 600, justifyContent: 'center' }} onClick={() => setAccount('new')}>
              <Glyph name="plus" size={18} />
              Add an account
            </button>
          </li>
        </ul>
      </section>

      <section>
        <p className="eyebrow" style={{ padding: '0 6px 8px' }}>Giving</p>
        <div className="card row">
          <Tile icon="wheat" tone="gold" />
          <label htmlFor="tithe" className="grow">
            <span style={{ fontWeight: 500, display: 'block' }}>Tithe</span>
            <span className="small muted">Share of each month’s income to set apart</span>
          </label>
          <div style={{ position: 'relative', width: 88 }}>
            <input id="tithe" className="input" inputMode="decimal" value={tithe} onChange={(e) => setTithe(e.target.value)} onBlur={saveTithe} style={{ paddingRight: 30, textAlign: 'right' }} />
            <span className="muted" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>%</span>
          </div>
        </div>
      </section>

      <section>
        <p className="eyebrow" style={{ padding: '0 6px 8px' }}>Categories</p>
        <ul className="card flush list">
          {(['expense', 'income', 'giving'] as const).map((k) => (
            <li key={k}>
              <button className="item" onClick={() => setCatKind(k)}>
                <Tile icon={k === 'expense' ? 'bag' : k === 'income' ? 'briefcase' : 'wheat'} />
                <div className="grow">
                  <p className="item-title">{k === 'expense' ? 'Spending' : k === 'income' ? 'Income' : 'Giving'}</p>
                  <p className="item-sub ellipsis">{data.categories.filter((c) => c.kind === k && !c.archived).map((c) => c.name).join(', ')}</p>
                </div>
                <Glyph name="fwd" size={18} className="faint" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <p className="eyebrow" style={{ padding: '0 6px 8px' }}>Claude</p>
        <ul className="card flush list">
          <li>
            <button className="item" onClick={() => setClaude(true)}>
              <Tile icon="message" />
              <div className="grow">
                <p className="item-title">Connect to Claude</p>
                <p className="item-sub">Ask about your money or record entries from Claude</p>
              </div>
              <Glyph name="fwd" size={18} className="faint" />
            </button>
          </li>
        </ul>
      </section>

      <section>
        <p className="eyebrow" style={{ padding: '0 6px 8px' }}>Look</p>
        <div className="seg" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} aria-pressed={theme === t} onClick={() => { applyTheme(t); setTheme(t) }}>
              {t === 'system' ? 'Automatic' : t === 'light' ? 'Day' : 'Night'}
            </button>
          ))}
        </div>
      </section>

      <button className="btn soft" onClick={() => nav('/notes')}>
        <Glyph name="pen" size={18} />
        KATY’s notes
      </button>

      <button className="btn soft" onClick={() => nav('/check')}>
        <Glyph name="check" size={18} />
        Month-end balance check
      </button>

      <button className="btn soft" onClick={() => nav('/welcome')}>
        <Glyph name="spark" size={18} />
        Walk through setup again
      </button>

      {mock ? (
        <a className="btn soft" href="/?mock=off">Leave demo mode</a>
      ) : (
        <button className="btn soft" onClick={() => supabase.auth.signOut()}>
          <Glyph name="logout" size={18} />
          Sign out
        </button>
      )}
      <button className="version-line" onClick={() => setNews(true)}>
        <span className="tiny faint">Manna {APP_VERSION} · for faithful stewards of daily provision</span>
        <span className="tiny gold-link">What’s new</span>
      </button>

      {account && <AccountSheet account={account === 'new' ? null : account} onClose={() => setAccount(null)} />}
      {catKind && <CategoriesSheet kind={catKind} onClose={() => setCatKind(null)} />}
      {claude && <ConnectClaudeSheet onClose={() => setClaude(false)} />}
      {news && <WhatsNewSheet releases={RELEASES} onClose={() => setNews(false)} />}
    </div>
  )
}

function AccountSheet({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'ewallet')
  const [opening, setOpening] = useState(account ? String(account.opening_balance) : '')
  const [archived, setArchived] = useState(account?.archived ?? false)
  const [error, setError] = useState<string | null>(null)
  const used = account ? store.data.transactions.some((t) => t.account_id === account.id || t.to_account_id === account.id) : false

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Name the account.')
    const raw = opening.replace(/[,\s₱]/g, '')
    const ob = raw === '' ? 0 : Number(raw)
    if (!Number.isFinite(ob)) return setError('Starting balance should be a number (negative for card debt).')
    const row = { name: name.trim(), kind, opening_balance: Math.round(ob * 100) / 100, archived }
    try {
      if (account) await store.update('accounts', account.id, row)
      else await store.insert('accounts', { ...row, sort: store.data.accounts.length })
      toast(account ? 'Account saved' : `${row.name} added`, 'nod')
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }
  async function remove() {
    if (!account || !confirm(`Delete ${account.name}?`)) return
    try {
      await store.remove('accounts', account.id)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Sheet title={account ? account.name : 'Add an account'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="field">
          <label htmlFor="a-name">Name</label>
          <input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wallet, GCash, BPI…" maxLength={60} required />
        </div>
        <div className="chips" role="group" aria-label="Type">
          {(Object.keys(ACCOUNT_KIND_LABEL) as AccountKind[]).map((k) => (
            <button type="button" key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>
              <Glyph name={ACCOUNT_ICON[k]} size={16} />
              {ACCOUNT_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <MoneyField id="a-open" label="Balance when you started tracking" value={opening} onChange={setOpening} hint="Use a minus sign for what you owe on a credit card." />
        {account && (
          <label className="switch">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
            <span>Hide this account (keeps its history)</span>
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block">Save</button>
        {account && !used && (
          <button type="button" className="btn danger block" onClick={remove}>Delete account</button>
        )}
      </form>
    </Sheet>
  )
}

function CategoriesSheet({ kind, onClose }: { kind: CategoryKind; onClose: () => void }) {
  const store = useStore()
  const cats = store.data.categories.filter((c) => c.kind === kind).sort((a, b) => a.sort - b.sort)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('dot')
  const [error, setError] = useState<string | null>(null)

  function open(c: Category | 'new') {
    setEditing(c)
    setName(c === 'new' ? '' : c.name)
    setIcon(c === 'new' ? 'dot' : c.icon)
    setError(null)
  }
  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Name it.')
    if (cats.some((c) => c.name.toLowerCase() === name.trim().toLowerCase() && (editing === 'new' || c.id !== editing?.id))) return setError('You already have that one.')
    try {
      if (editing === 'new') await store.insert('categories', { kind, name: name.trim(), icon, sort: cats.length, archived: false })
      else if (editing) await store.update('categories', editing.id, { name: name.trim(), icon })
      setEditing(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }
  async function toggle(c: Category) {
    await store.update('categories', c.id, { archived: !c.archived })
  }

  return (
    <Sheet title={kind === 'expense' ? 'Spending categories' : kind === 'income' ? 'Income categories' : 'Giving categories'} onClose={onClose}>
      {editing ? (
        <form onSubmit={save}>
          <div className="field">
            <label htmlFor="c-name">Name</label>
            <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          </div>
          <div className="chips" role="group" aria-label="Icon">
            {PICKABLE.map((p) => (
              <button type="button" key={p} className="chip" style={{ padding: '0 10px' }} aria-pressed={icon === p} aria-label={p} onClick={() => setIcon(p)}>
                <Glyph name={p} size={18} />
              </button>
            ))}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="grid-2">
            <button type="button" className="btn soft" onClick={() => setEditing(null)}>Back</button>
            <button className="btn">Save</button>
          </div>
        </form>
      ) : (
        <div className="stack">
          <ul className="card flush list">
            {cats.map((c) => (
              <li key={c.id} className="item" style={c.archived ? { opacity: 0.5 } : undefined}>
                <Tile icon={c.icon} />
                <button className="grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: '10px 0' }} onClick={() => open(c)}>
                  {c.name}
                </button>
                <button className="chip" onClick={() => toggle(c)}>{c.archived ? 'Show' : 'Hide'}</button>
              </li>
            ))}
          </ul>
          <button className="btn soft block" onClick={() => open('new')}>
            <Glyph name="plus" size={18} />
            Add a category
          </button>
          <p className="hint">Hidden categories keep their history but don’t show when adding entries.</p>
        </div>
      )}
    </Sheet>
  )
}

