import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useAuth, fullName } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { applyTheme, getThemePref, type ThemePref } from '../lib/theme'
import { mock } from '../lib/mock'
import { goBack } from '../lib/back'
import type { Account, AccountKind, Category, CategoryKind } from '../lib/types'
import { balances, cardStatus, monthTotals, peso } from '../lib/money'
import { thisMonth } from '../lib/dates'
import { ACCOUNT_ICON, ACCOUNT_KIND_LABEL, AccountMark, Tile, initials } from '../components/Bits'
import { Glyph } from '../components/Glyph'
import { useConfirm } from '../components/Confirm'
import { IconPicker } from '../components/IconPicker'
import { Sheet } from '../components/Sheet'
import { MoneyField } from '../components/Pickers'
import { useToast } from '../components/Toast'
import { ConnectClaudeSheet } from '../components/ConnectClaude'
import { WhatsNewSheet } from '../components/WhatsNew'
import { RemindersSheet, useReminderStatus } from '../components/Reminders'
import { turnOffPush } from '../lib/push'
import { APP_VERSION, RELEASES } from '../lib/version'

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'light', label: 'Day' },
  { value: 'dark', label: 'Night' },
]

const CAT_KINDS: { kind: CategoryKind; label: string; icon: string; tone?: string }[] = [
  { kind: 'expense', label: 'Spending', icon: 'bag' },
  { kind: 'income', label: 'Income', icon: 'briefcase', tone: 'good' },
  { kind: 'giving', label: 'Giving', icon: 'wheat', tone: 'gold' },
]

/** A titled group of settings. `aside` sits at the right of the title, for a count or a quick action. */
function Group({ id, title, aside, children }: { id?: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="set-group">
      <div className="set-head">
        <p className="eyebrow">{title}</p>
        {aside}
      </div>
      {children}
    </section>
  )
}

/** A row that opens something: a drawer or another page. */
function NavRow({ icon, tone, title, sub, end, onClick }: { icon: string; tone?: string; title: string; sub?: ReactNode; end?: ReactNode; onClick: () => void }) {
  return (
    <li>
      <button className="item" onClick={onClick}>
        <Tile icon={icon} tone={tone} />
        <div className="grow" style={{ minWidth: 0 }}>
          <p className="item-title">{title}</p>
          {sub && <p className="item-sub ellipsis">{sub}</p>}
        </div>
        {end}
        <Glyph name="fwd" size={18} className="faint" />
      </button>
    </li>
  )
}

export function SettingsPage() {
  const store = useStore()
  const { data } = store
  const { session } = useAuth()
  const nav = useNavigate()
  const { hash } = useLocation()
  const toast = useToast()
  const [account, setAccount] = useState<Account | 'new' | null>(null)
  const [catKind, setCatKind] = useState<CategoryKind | null>(null)
  const [claude, setClaude] = useState(false)
  const [news, setNews] = useState(false)
  const [reminders, setReminders] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const reminderLine = useReminderStatus()
  const [theme, setTheme] = useState<ThemePref>(getThemePref())
  const [titheText, setTitheText] = useState(String(data.settings.tithe_percent))
  const bal = useMemo(() => balances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const income = useMemo(() => monthTotals(data.transactions, thisMonth()).income, [data.transactions])

  // copy before sorting: the store's own array must keep its order
  const accounts = useMemo(() => [...data.accounts].sort((a, b) => a.sort - b.sort), [data.accounts])
  const shown = accounts.filter((a) => !a.archived)
  const hidden = accounts.filter((a) => a.archived)

  const email = session?.user.email ?? ''
  const name = mock ? 'Demo' : fullName(session) || email
  const signInLine = mock ? 'Demo mode: nothing is saved' : name !== email && email ? email : 'Same sign-in as Might'

  // Today's wallet links here as /settings#accounts; the router doesn't scroll to a hash by itself
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash])

  const titheDraft = Number(titheText)
  const tithePct = titheText.trim() !== '' && Number.isFinite(titheDraft) && titheDraft >= 0 && titheDraft <= 100 ? titheDraft : data.settings.tithe_percent
  const titheLine = income > 0 && tithePct > 0
    ? `${peso(Math.round(income * tithePct) / 100)} this month`
    : 'Share of each month’s income to set apart'

  async function saveTithe() {
    const v = Number(titheText)
    if (titheText.trim() === '' || !Number.isFinite(v) || v < 0 || v > 100) return setTitheText(String(data.settings.tithe_percent))
    if (v !== data.settings.tithe_percent) {
      await store.saveSettings({ tithe_percent: v })
      toast(`Tithe set to ${v}%`, 'give')
    }
  }

  function pickTheme(t: ThemePref) {
    applyTheme(t)
    setTheme(t)
  }

  async function signOut() {
    // a shared phone shouldn't keep getting this person's summaries
    await turnOffPush().catch(() => {})
    await supabase.auth.signOut()
  }

  function accountRow(a: Account) {
    const b = bal.get(a.id) ?? 0
    const card = a.kind === 'card' ? cardStatus(a, b) : null
    return (
      <li key={a.id}>
        <button className="item" onClick={() => setAccount(a)} style={a.archived ? { opacity: 0.55 } : undefined}>
          <AccountMark name={a.name} kind={a.kind} tile />
          <div className="grow" style={{ minWidth: 0 }}>
            <p className="item-title ellipsis">{a.name}</p>
            <p className="item-sub ellipsis">
              {card?.left != null ? `${peso(card.left)} left of ${peso(card.limit!)}` : ACCOUNT_KIND_LABEL[a.kind]}
            </p>
          </div>
          {card && b < 0 ? (
            <span className="row-end">
              <span className="amount">{peso(card.owed)}</span>
              <span className="tiny muted">owed</span>
            </span>
          ) : (
            <span className="amount">{peso(b)}</span>
          )}
          <Glyph name="fwd" size={18} className="faint" />
        </button>
      </li>
    )
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

      <section className="hero set-hero">
        <div className="row">
          <span className="set-avatar" aria-hidden="true">{initials(name || '?')}</span>
          <div className="grow" style={{ minWidth: 0, paddingRight: 24 }}>
            <p className="set-name ellipsis">{name || 'Signed in'}</p>
            <p className="hero-sub ellipsis">{signInLine}</p>
          </div>
        </div>
        <dl className="set-stats">
          <div><dt>Accounts</dt><dd>{shown.length}</dd></div>
          <div><dt>Entries</dt><dd>{data.transactions.length.toLocaleString()}</dd></div>
          <div><dt>Tithe</dt><dd>{data.settings.tithe_percent}%</dd></div>
        </dl>
      </section>

      <Group
        id="accounts"
        title="Accounts"
        aside={
          <button className="set-add" onClick={() => setAccount('new')}>
            <Glyph name="plus" size={16} />
            Add
          </button>
        }
      >
        <ul className="card flush list">
          {shown.map(accountRow)}
          {shown.length === 0 && (
            <li>
              <button className="item gold" style={{ fontWeight: 600, justifyContent: 'center' }} onClick={() => setAccount('new')}>
                <Glyph name="plus" size={18} />
                Add your first account
              </button>
            </li>
          )}
          {hidden.length > 0 && (
            <li>
              <button className="item set-more" aria-expanded={showHidden} onClick={() => setShowHidden((v) => !v)}>
                <Glyph name={showHidden ? 'eye-off' : 'eye'} size={18} />
                {showHidden ? 'Hide' : 'Show'} {hidden.length} hidden {hidden.length === 1 ? 'account' : 'accounts'}
              </button>
            </li>
          )}
          {showHidden && hidden.map(accountRow)}
        </ul>
      </Group>

      <Group title="Giving and categories">
        <ul className="card flush list">
          <li className="item">
            <Tile icon="wheat" tone="gold" />
            <label htmlFor="tithe" className="grow" style={{ minWidth: 0 }}>
              <span className="item-title" style={{ display: 'block' }}>Tithe</span>
              <span className="item-sub ellipsis" style={{ display: 'block' }}>{titheLine}</span>
            </label>
            <div className="set-pct">
              <input
                id="tithe"
                className="input"
                inputMode="decimal"
                enterKeyHint="done"
                value={titheText}
                onChange={(e) => setTitheText(e.target.value)}
                onBlur={saveTithe}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <span className="muted">%</span>
            </div>
          </li>
          {CAT_KINDS.map(({ kind, label, icon, tone }) => {
            const live = data.categories.filter((c) => c.kind === kind && !c.archived)
            return (
              <NavRow
                key={kind}
                icon={icon}
                tone={tone}
                title={`${label} categories`}
                sub={live.map((c) => c.name).join(', ') || 'None yet'}
                end={<span className="pill">{live.length}</span>}
                onClick={() => setCatKind(kind)}
              />
            )
          })}
        </ul>
      </Group>

      <Group title="Look">
        <div className="card set-themes" role="group" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.value} aria-pressed={theme === t.value} onClick={() => pickTheme(t.value)}>
              <span className={`set-swatch ${t.value}`} aria-hidden="true">
                <i />
                <i />
                {theme === t.value && <b><Glyph name="check" size={12} /></b>}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="KATY and Claude">
        <ul className="card flush list">
          <NavRow icon="bell" title="Reminders" sub={reminderLine} onClick={() => setReminders(true)} />
          <NavRow icon="message" title="Connect to Claude" sub="Ask about your money or record entries from Claude" onClick={() => setClaude(true)} />
        </ul>
      </Group>

      <Group title="Tools">
        <ul className="card flush list">
          <NavRow icon="pen" title="KATY’s notes" sub="Things to remember, without moving money" onClick={() => nav('/notes')} />
          <NavRow icon="paid" title="Month-end balance check" sub="Count what you have and compare it with the record" onClick={() => nav('/check')} />
          <NavRow icon="sparkles" title="Walk through setup again" sub="Accounts, categories, budgets and the tithe" onClick={() => nav('/welcome')} />
        </ul>
      </Group>

      <Group title="About">
        <ul className="card flush list">
          <NavRow icon="megaphone" title="What’s new" sub="What changed in each version" end={<span className="pill gold">{APP_VERSION}</span>} onClick={() => setNews(true)} />
          <li>
            {mock ? (
              <a className="item item-danger" href="/?mock=off">
                <Tile icon="logout" tone="bad" />
                <span className="grow item-title">Leave demo mode</span>
              </a>
            ) : (
              <button className="item item-danger" onClick={signOut}>
                <Tile icon="logout" tone="bad" />
                <span className="grow item-title">Sign out</span>
              </button>
            )}
          </li>
        </ul>
      </Group>

      <p className="tiny faint" style={{ textAlign: 'center' }}>Manna {APP_VERSION} · for faithful stewards of daily provision</p>

      {account && <AccountSheet account={account === 'new' ? null : account} onClose={() => setAccount(null)} />}
      {catKind && <CategoriesSheet kind={catKind} onClose={() => setCatKind(null)} />}
      {claude && <ConnectClaudeSheet onClose={() => setClaude(false)} />}
      {news && <WhatsNewSheet releases={RELEASES} onClose={() => setNews(false)} />}
      {reminders && <RemindersSheet onClose={() => setReminders(false)} />}
    </div>
  )
}

function AccountSheet({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const store = useStore()
  const toast = useToast()
  const ask = useConfirm()
  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'ewallet')
  // a card's starting balance is entered as what was owed (a positive number); it's kept as a negative balance
  const [opening, setOpening] = useState(account ? String(account.kind === 'card' ? -account.opening_balance : account.opening_balance) : '')
  const [limit, setLimit] = useState(account?.credit_limit != null ? String(account.credit_limit) : '')
  const card = kind === 'card'
  function pickKind(k: AccountKind) {
    // switching to or from a card flips what the number means (owed ↔ held)
    if ((k === 'card') !== card && opening.trim() && Number(opening.replace(/[,\s₱]/g, ''))) setOpening(String(-Number(opening.replace(/[,\s₱]/g, ''))))
    setKind(k)
  }
  const [archived, setArchived] = useState(account?.archived ?? false)
  const [error, setError] = useState<string | null>(null)
  const used = account ? store.data.transactions.some((t) => t.account_id === account.id || t.to_account_id === account.id) : false

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Name the account.')
    const raw = opening.replace(/[,\s₱]/g, '')
    const ob = raw === '' ? 0 : Number(raw)
    if (!Number.isFinite(ob)) return setError(card ? 'What you owed should be a number.' : 'Starting balance should be a number.')
    const rawLimit = limit.replace(/[,\s₱]/g, '')
    const lim = card && rawLimit !== '' ? Number(rawLimit) : null
    if (lim != null && (!Number.isFinite(lim) || lim <= 0)) return setError('The limit should be more than zero, or left blank.')
    const row: Partial<Account> = {
      name: name.trim(),
      kind,
      opening_balance: Math.round((card ? -ob : ob) * 100) / 100,
      archived,
      // only sent when used, so other accounts save the same way as before
      ...((lim != null || account?.credit_limit != null) && { credit_limit: lim == null ? null : Math.round(lim * 100) / 100 }),
    }
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
    if (!account || !(await ask({ title: `Delete ${account.name}?`, body: 'It has no entries, so nothing else changes.' }))) return
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
            <button type="button" key={k} className="chip" aria-pressed={kind === k} onClick={() => pickKind(k)}>
              <Glyph name={ACCOUNT_ICON[k]} size={16} />
              {ACCOUNT_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        {card ? (
          <>
            <MoneyField id="a-open" label="Owed when you started tracking" value={opening} onChange={setOpening} hint="What the app said you owed then. Purchases add to it and payments bring it down." />
            <MoneyField id="a-limit" label="Credit limit (optional)" value={limit} onChange={setLimit} hint="Your total limit in the card's app, so Manna can show what's left to spend." />
          </>
        ) : (
          <MoneyField id="a-open" label="Balance when you started tracking" value={opening} onChange={setOpening} />
        )}
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
          <IconPicker value={icon} onChange={setIcon} />
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

