import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { useAuth, firstName } from '../lib/auth'
import { mock } from '../lib/mock'
import { parseAmount, peso } from '../lib/money'
import type { AccountKind, Category } from '../lib/types'
import { Mascot, type MascotAction } from '../components/Mascot'
import { LogoAnimated } from '../components/LogoAnimated'
import { Glyph, PICKABLE } from '../components/Glyph'
import { ACCOUNT_ICON, ACCOUNT_KIND_LABEL, AccountMark } from '../components/Bits'
import { BRANDS, brandFor } from '../lib/banks'
import { useToast } from '../components/Toast'
import { Speech } from '../components/Speech'
import { onSoundChange, setSoundOn, soundOn } from '../lib/chatter'
import { markVersionSeen } from '../lib/version'

/** Monthly amounts offered for the obvious categories; the person changes or clears them. */
const SUGGESTED: Record<string, number> = { Food: 6000, Transport: 2500, Bills: 3000, Groceries: 4000 }

const KINDS: AccountKind[] = ['cash', 'ewallet', 'bank', 'savings', 'card']

type AccountDraft = { id: string | null; name: string; kind: AccountKind; on: boolean; balance: string; picked?: boolean }
type CategoryDraft = { id: string | null; name: string; icon: string; on: boolean; budget: string }

/** Banks and e-wallets to tap in setup (GCash is already there by default); the account takes the brand's name. */
const BANKS = BRANDS.filter((b) => b.key !== 'gcash')

const STEPS = ['welcome', 'accounts', 'categories', 'budget', 'giving', 'done'] as const
type Step = (typeof STEPS)[number]

const MOOD: Record<Step, MascotAction> = { welcome: 'wave', accounts: 'nod', categories: 'think', budget: 'nod', giving: 'give', done: 'cheer' }

const money = (n: number) => (n ? String(Math.abs(n)) : '')

/**
 * First-run setup. Manna already made sensible defaults (Wallet, GCash and Bank; everyday categories;
 * a 10% tithe), so every step starts filled in and "Continue" alone gets you through. Running it again
 * from Settings edits what's there instead.
 */
export function OnboardingPage({ again = false }: { again?: boolean }) {
  const store = useStore()
  const { data } = store
  const { session } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const name = mock ? 'Jan' : firstName(session)

  const [step, setStep] = useState<Step>('welcome')
  const [sound, setSound] = useState(soundOn)
  useEffect(() => onSoundChange(setSound), [])
  const [saving, setSaving] = useState(false)

  const [accounts, setAccounts] = useState<AccountDraft[]>(() =>
    [...data.accounts]
      .sort((a, b) => a.sort - b.sort)
      .map((a) => ({ id: a.id, name: a.name, kind: a.kind, on: !a.archived, balance: money(a.opening_balance) })),
  )
  const [ownBank, setOwnBank] = useState<string | null>(null)
  const isPicked = (n: string) => accounts.some((a) => a.picked && a.name.toLowerCase() === n.toLowerCase())
  const togglePick = (b: { name: string; kind: AccountKind }) =>
    setAccounts((xs) =>
      isPicked(b.name)
        ? xs.filter((a) => !(a.picked && a.name.toLowerCase() === b.name.toLowerCase()))
        : xs.some((a) => !a.picked && a.name.toLowerCase() === b.name.toLowerCase())
          ? xs.map((a) => (a.name.toLowerCase() === b.name.toLowerCase() ? { ...a, on: true } : a))
          : [...xs, { id: null, name: b.name, kind: b.kind, on: true, balance: '', picked: true }],
    )
  function addOwnBank() {
    const n = ownBank?.trim()
    if (n && !isPicked(n)) togglePick({ name: n, kind: 'bank' })
    setOwnBank(null)
  }
  const [newAccount, setNewAccount] = useState<{ name: string; kind: AccountKind } | null>(null)

  const noBudgets = data.budgets.length === 0
  const [cats, setCats] = useState<CategoryDraft[]>(() =>
    data.categories
      .filter((c) => c.kind === 'expense')
      .sort((a, b) => a.sort - b.sort)
      .map((c) => {
        const b = data.budgets.find((x) => x.category_id === c.id)
        return { id: c.id, name: c.name, icon: c.icon, on: !c.archived, budget: b ? String(b.amount) : noBudgets && SUGGESTED[c.name] ? String(SUGGESTED[c.name]) : '' }
      }),
  )
  const [newCat, setNewCat] = useState<{ name: string; icon: string } | null>(null)
  const [tithe, setTithe] = useState(String(data.settings.tithe_percent))

  const index = STEPS.indexOf(step)
  const go = (d: 1 | -1) => setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, index + d))])

  const budgetTotal = useMemo(() => cats.filter((c) => c.on).reduce((s, c) => s + (parseAmount(c.budget) ?? 0), 0), [cats])
  const others = (kind: Category['kind']) => data.categories.filter((c) => c.kind === kind && !c.archived).map((c) => c.name)

  const removeAcc = (i: number) => setAccounts((xs) => xs.filter((_, j) => j !== i))
  const removeCat = (i: number) => setCats((xs) => xs.filter((_, j) => j !== i))
  const setAcc = (i: number, patch: Partial<AccountDraft>) => setAccounts((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const setCat = (i: number, patch: Partial<CategoryDraft>) => setCats((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  function addAccount() {
    if (!newAccount?.name.trim()) return setNewAccount(null)
    setAccounts((xs) => [...xs, { id: null, name: newAccount.name.trim(), kind: newAccount.kind, on: true, balance: '' }])
    setNewAccount(null)
  }
  function addCategory() {
    const n = newCat?.name.trim()
    if (!n || cats.some((c) => c.name.toLowerCase() === n.toLowerCase())) return setNewCat(null)
    setCats((xs) => [...xs, { id: null, name: n, icon: newCat!.icon, on: true, budget: '' }])
    setNewCat(null)
  }

  async function finish(skip = false) {
    setSaving(true)
    try {
      if (!skip) {
        // accounts: starting balances, hide the unticked ones, add the new ones
        for (const [i, a] of accounts.entries()) {
          const amount = parseAmount(a.balance) ?? 0
          const opening_balance = a.kind === 'card' ? -Math.abs(amount) : amount
          if (a.id) {
            const old = data.accounts.find((x) => x.id === a.id)!
            if (old.opening_balance !== opening_balance || old.archived === a.on) await store.update('accounts', a.id, { opening_balance, archived: !a.on })
          } else if (a.on) {
            await store.insert('accounts', { name: a.name, kind: a.kind, opening_balance, sort: i, archived: false })
          }
        }
        // categories and their monthly budgets
        for (const [i, c] of cats.entries()) {
          let id = c.id
          if (id) {
            const old = data.categories.find((x) => x.id === id)!
            if (old.archived === c.on) await store.update('categories', id, { archived: !c.on })
          } else if (c.on) {
            id = (await store.insert('categories', { name: c.name, kind: 'expense', icon: c.icon, sort: i, archived: false })).id
          }
          if (!id) continue
          const want = c.on ? parseAmount(c.budget) ?? 0 : 0
          const have = data.budgets.find((b) => b.category_id === id)
          if (have && want <= 0) await store.remove('budgets', have.id)
          else if (have && want !== have.amount) await store.update('budgets', have.id, { amount: want })
          else if (!have && want > 0) await store.insert('budgets', { category_id: id, amount: want })
        }
      }
      const pct = Number(tithe)
      await store.saveSettings({
        ...(!skip && Number.isFinite(pct) && pct >= 0 && pct <= 100 ? { tithe_percent: pct } : {}),
        onboarded_at: data.settings.onboarded_at ?? new Date().toISOString(),
      })
      // someone just starting has nothing to compare against: no "what's new" for them
      if (!data.settings.onboarded_at) markVersionSeen()
      if (again) {
        toast('Setup saved', 'happy')
        nav('/settings', { replace: true })
      } else nav('/', { replace: true })
    } catch (e) {
      toast(`Couldn’t save: ${(e as Error).message}`, 'worry')
      setSaving(false)
    }
  }

  return (
    <div className={`onb onb-${step}`}>
      <header className="onb-top">
        {index > 0 && step !== 'done' ? (
          <button className="icon-btn" aria-label="Back" onClick={() => go(-1)}>
            <Glyph name="back" size={24} />
          </button>
        ) : again ? (
          <button className="icon-btn" aria-label="Close" onClick={() => nav('/settings')}>
            <Glyph name="back" size={24} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
        <ol className="onb-dots" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <li key={s} className={i < index ? 'done' : i === index ? 'now' : undefined} />
          ))}
        </ol>
        <div className="onb-actions">
          <button className="icon-btn onb-sound" aria-label={sound ? 'Mute KATY' : 'Let KATY talk'} aria-pressed={sound} onClick={() => setSoundOn(!sound)}>
            <Glyph name={sound ? 'sound' : 'mute'} size={20} />
          </button>
          {step !== 'done' && step !== 'welcome' && !again && (
            <button className="onb-skip" onClick={() => finish(true)} disabled={saving}>
              Skip
            </button>
          )}
        </div>
      </header>

      <main className="onb-body" key={step}>
        {step === 'welcome' && (
          <>
            <div className="onb-hero">
              <LogoAnimated width={190} />
            </div>
            <h1>{again ? 'Let’s tidy things up' : `Welcome${name ? `, ${name}` : ''}`}</h1>
            <Talk
              mood="wave"
              size={110}
              delay={1700}
              text={
                again
                  ? 'Let’s go through your setup again. Change anything you like; the rest stays as it is.'
                  : `Hi${name ? ` ${name}` : ''}! I’m KATY, your Keeper of All Thy Yield. I’ll help you look after everything God provides. Let’s set you up together. It only takes a minute, and I’ve already filled in the usual things for you.`
              }
            />
            <blockquote className="onb-verse">
              “Moreover it is required in stewards, that a man be found faithful.”
              <cite>1 Corinthians 4:2</cite>
            </blockquote>
          </>
        )}

        {step === 'accounts' && (
          <>
            <StepHead mood={MOOD[step]} title="Where is your money?" lead="First things first: where do you keep your money? Tick each place and tell me what’s in it now. A guess is perfectly fine." />
            <ul className="onb-list">
              {accounts.map((a, i) => (
                <li key={a.id ?? `new-${i}`} className={a.on ? undefined : 'off'}>
                  <label className="onb-tick">
                    {a.id ? (
                      <input type="checkbox" checked={a.on} onChange={(e) => setAcc(i, { on: e.target.checked })} />
                    ) : (
                      // added just now: nothing to keep, so it can simply go
                      <button type="button" className="onb-remove-row" aria-label={`Remove ${a.name}`} onClick={(e) => { e.preventDefault(); removeAcc(i) }}>
                        <Glyph name="close" size={14} stroke={2.4} />
                      </button>
                    )}
                    <AccountMark name={a.name} kind={a.kind} tile />
                    <span className="grow">
                      <span className="item-title">{a.name}</span>
                      <span className="item-sub">{ACCOUNT_KIND_LABEL[a.kind]}</span>
                    </span>
                  </label>
                  {a.on && (
                    <div className="onb-money">
                      <span>₱</span>
                      <input
                        inputMode="decimal"
                        placeholder="0"
                        aria-label={a.kind === 'card' ? `What you owe on ${a.name}` : `What’s in ${a.name} now`}
                        value={a.balance}
                        onChange={(e) => setAcc(i, { balance: e.target.value })}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {accounts.some((a) => a.on && a.kind === 'card') && <p className="small muted">For a credit card, type what you owe on it.</p>}
            <div className="onb-banks">
              <p className="onb-sub">Which banks or e-wallets do you use? <span className="muted">Tap any that apply.</span></p>
              <div className="chips" role="group" aria-label="Banks">
                {BANKS.map((b) => (
                  <button type="button" key={b.name} className="chip brand-chip" aria-pressed={isPicked(b.name) || accounts.some((a) => !a.picked && a.on && brandFor(a.name)?.key === b.key)} onClick={() => togglePick(b)}>
                    <img src={b.logo} alt="" width={20} height={20} />
                    {b.name}
                  </button>
                ))}
                {accounts
                  .filter((a) => a.picked && !BANKS.some((b) => b.name.toLowerCase() === a.name.toLowerCase()))
                  .map((a) => (
                    <button type="button" key={a.name} className="chip" aria-pressed onClick={() => togglePick(a)}>
                      {a.name}
                    </button>
                  ))}
                {ownBank === null ? (
                  <button type="button" className="chip onb-chip-add" onClick={() => setOwnBank('')}>
                    <Glyph name="plus" size={14} /> Another
                  </button>
                ) : (
                  <span className="onb-chip-input">
                    <input autoFocus placeholder="Bank name" value={ownBank} maxLength={40} onChange={(e) => setOwnBank(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOwnBank()} onBlur={addOwnBank} aria-label="Your bank's name" />
                  </span>
                )}
              </div>
            </div>
            {newAccount ? (
              <div className="card stack">
                <input className="input" autoFocus placeholder="Name, like BPI Visa or Emergency fund" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addAccount()} maxLength={60} />
                <div className="chips" role="group" aria-label="Kind">
                  {KINDS.map((k) => (
                    <button type="button" key={k} className="chip" aria-pressed={newAccount.kind === k} onClick={() => setNewAccount({ ...newAccount, kind: k })}>
                      <Glyph name={ACCOUNT_ICON[k]} size={16} />
                      {ACCOUNT_KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <button className="btn soft sm grow" onClick={() => setNewAccount(null)}>Cancel</button>
                  <button className="btn sm grow" onClick={addAccount} disabled={!newAccount.name.trim()}>Add</button>
                </div>
              </div>
            ) : (
              <button className="onb-add" onClick={() => setNewAccount({ name: '', kind: 'ewallet' })}>
                <Glyph name="plus" size={18} /> Add another, like a credit card or savings
              </button>
            )}
          </>
        )}

        {step === 'categories' && (
          <>
            <StepHead mood={MOOD[step]} title="What do you spend on?" lead="I ticked the usual ones for you. Untick anything you never spend on, or add your own." />
            <div className="cat-grid onb-cats" role="group" aria-label="Spending categories">
              {cats.map((c, i) =>
                c.id ? (
                  <button type="button" key={c.id} className="cat-btn" aria-pressed={c.on} onClick={() => setCat(i, { on: !c.on })}>
                    <Glyph name={c.icon} size={22} />
                    <span>{c.name}</span>
                    <i className="onb-check" aria-hidden="true">
                      <Glyph name="check" size={12} stroke={2.6} />
                    </i>
                  </button>
                ) : (
                  // one you just added: remove it outright instead of unticking
                  <div key={`new-${i}`} className="cat-btn is-new">
                    <Glyph name={c.icon} size={22} />
                    <span>{c.name}</span>
                    <button type="button" className="onb-remove" aria-label={`Remove ${c.name}`} onClick={() => removeCat(i)}>
                      <Glyph name="close" size={11} stroke={2.6} />
                    </button>
                  </div>
                ),
              )}
              {!newCat && (
                <button type="button" className="cat-btn onb-new" onClick={() => setNewCat({ name: '', icon: 'dot' })}>
                  <Glyph name="plus" size={22} />
                  <span>Your own</span>
                </button>
              )}
            </div>
            {newCat && (
              <div className="card stack">
                <input className="input" autoFocus placeholder="Name, like Pets or School" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addCategory()} maxLength={40} />
                <div className="onb-icons" role="group" aria-label="Icon">
                  {PICKABLE.map((ic) => (
                    <button type="button" key={ic} className="chip" aria-pressed={newCat.icon === ic} aria-label={ic} onClick={() => setNewCat({ ...newCat, icon: ic })}>
                      <Glyph name={ic} size={18} />
                    </button>
                  ))}
                </div>
                <div className="row">
                  <button className="btn soft sm grow" onClick={() => setNewCat(null)}>Cancel</button>
                  <button className="btn sm grow" onClick={addCategory} disabled={!newCat.name.trim()}>Add</button>
                </div>
              </div>
            )}
            <div className="card quiet small">
              <p><b>Money in:</b> {others('income').join(', ')}</p>
              <p style={{ marginTop: 4 }}><b>Giving:</b> {others('giving').join(', ')}</p>
              <p className="muted" style={{ marginTop: 6 }}>You can rename or add these any time in Settings.</p>
            </div>
          </>
        )}

        {step === 'budget' && (
          <>
            <StepHead mood={MOOD[step]} title="A plan for the month" lead="Now a little plan for the month. How much can each one use? I filled in a few to start; change them, or clear any you’d rather not limit." />
            <ul className="onb-list">
              {cats.map((c, i) =>
                c.on ? (
                  <li key={c.id ?? `new-${i}`}>
                    <span className="tile">
                      <Glyph name={c.icon} size={20} />
                    </span>
                    <span className="grow item-title">{c.name}</span>
                    <div className="onb-money">
                      <span>₱</span>
                      <input inputMode="decimal" placeholder="no limit" aria-label={`Monthly budget for ${c.name}`} value={c.budget} onChange={(e) => setCat(i, { budget: e.target.value })} />
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
            <p className="onb-total">
              <span>Each month</span>
              <b className="num">{budgetTotal > 0 ? peso(budgetTotal) : 'No limits yet'}</b>
            </p>
            <p className="small muted">This becomes the manna on your Today screen: what’s left for the month, shown as manna on the sand.</p>
          </>
        )}

        {step === 'giving' && (
          <>
            <StepHead mood={MOOD[step]} title="Giving first" lead="Giving comes first. What share of what comes in would you like to set apart? I’ll work it out each month and remind you, gently." />
            <div className="seg onb-tithe" role="group" aria-label="Tithe">
              {['0', '5', '10', '15'].map((v) => (
                <button key={v} aria-pressed={tithe === v} onClick={() => setTithe(v)}>
                  {v === '0' ? 'Off' : `${v}%`}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="onb-tithe">Or type your own</label>
              <div className="onb-money wide">
                <input id="onb-tithe" inputMode="decimal" value={tithe} onChange={(e) => setTithe(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} />
                <span>%</span>
              </div>
            </div>
            <blockquote className="onb-verse">
              “Every man according as he purposeth in his heart, so let him give; not grudgingly, or of necessity: for God loveth a cheerful giver.”
              <cite>2 Corinthians 9:7</cite>
            </blockquote>
          </>
        )}

        {step === 'done' && (
          <>
            <h1>You’re all set</h1>
            <Talk
              mood="cheer"
              size={120}
              text={`All set! ${accounts.filter((a) => a.on).length} accounts, ${cats.filter((c) => c.on).length} categories${budgetTotal > 0 ? `, and ${peso(budgetTotal)} planned for the month` : ''}. Whenever you spend or receive something, just tell me. I’ve got you.`}
            />
            <ul className="onb-tips">
              <li><Glyph name="plus" size={18} /> Tap the gold button to add what you spend or receive.</li>
              <li><Glyph name="repeat" size={18} /> Add rent and bills under Plan so Manna reminds you.</li>
              <li><Glyph name="people" size={18} /> Keep track of loans, both ways, under Owed.</li>
            </ul>
          </>
        )}
      </main>

      <footer className="onb-foot">
        {step === 'done' ? (
          <button className="btn gold block" onClick={() => finish()} disabled={saving}>
            {saving ? 'Saving…' : again ? 'Save' : 'Start'}
          </button>
        ) : (
          <button className="btn block" onClick={() => go(1)} disabled={step === 'accounts' && !accounts.some((a) => a.on)}>
            {step === 'welcome' ? 'Let’s begin' : 'Continue'}
          </button>
        )}
      </footer>
    </div>
  )
}

function StepHead({ mood, title, lead }: { mood: MascotAction; title: string; lead: string }) {
  return (
    <div className="onb-head">
      <h1>{title}</h1>
      <Talk mood={mood} size={78} text={lead} />
    </div>
  )
}

/** The mascot saying something: its words type out in a bubble, and it bobs along while it talks. */
/** KATY saying something: her words type out in a bubble beside her, and her mouth moves as she talks. */
function Talk({ mood, size, text, delay }: { mood: MascotAction; size: number; text: string; delay?: number }) {
  const [talking, setTalking] = useState(false)
  return (
    <div className={`talk${talking ? ' is-talking' : ''}`}>
      <span className="talk-mascot">
        <Mascot action={mood} size={size} />
      </span>
      <Speech className="talk-bubble" text={text} delay={delay} onTalking={setTalking} />
    </div>
  )
}
