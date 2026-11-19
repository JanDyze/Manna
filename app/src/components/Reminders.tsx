// Settings → Reminders: turn on push notifications for this device, and choose what KATY sends to every device and
// by email: the evening summary (day, week, month) and alerts when something needs the person.
import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { mock } from '../lib/mock'
import {
  DEFAULT_NOTIFY, type NotifyPrefs, type PushState,
  loadNotifyPrefs, notifyConfig, pushState, saveNotifyPrefs, sendTest, turnOffPush, turnOnPush,
} from '../lib/push'
import { Sheet } from './Sheet'
import { Glyph } from './Glyph'
import { Tile } from './Bits'
import { useToast } from './Toast'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** Evening hours to choose from; a summary of the day needs the day to be mostly done. */
const HOURS = [17, 18, 19, 20, 21, 22, 23]
const hourLabel = (h: number) => (h === 12 ? '12 noon' : h < 12 ? `${h} AM` : `${h - 12} PM`)

/** One line on the Settings row: is this device on? */
export function useReminderStatus(): string {
  const [line, setLine] = useState('Evening summaries and alerts')
  useEffect(() => {
    let alive = true
    pushState().then((s) => alive && s === 'on' && setLine('On for this device'), () => {})
    return () => {
      alive = false
    }
  }, [])
  return line
}

const STATE_LINE: Record<PushState, string> = {
  on: 'Reminders come to this device.',
  off: 'Off on this device.',
  blocked: 'Notifications are blocked for Manna on this device.',
  install: 'Add Manna to your Home Screen first.',
  dev: 'Not on the dev server.',
  unsupported: 'This browser can’t show notifications.',
}

export function RemindersSheet({ onClose }: { onClose: () => void }) {
  const { data } = useStore()
  const { session } = useAuth()
  const toast = useToast()
  const [state, setState] = useState<PushState | null>(null)
  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null)
  const [email, setEmail] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const userId = session?.user.id ?? data.settings.user_id

  useEffect(() => {
    pushState().then(setState, () => setState('unsupported'))
    loadNotifyPrefs().then(setPrefs, (e: Error) => {
      setPrefs({ ...DEFAULT_NOTIFY })
      setError(e.message)
    })
    notifyConfig().then((c) => setEmail(c.email), () => {})
  }, [])

  async function change(patch: Partial<NotifyPrefs>) {
    if (!prefs) return
    const before = prefs
    setPrefs({ ...prefs, ...patch })
    setError(null)
    try {
      await saveNotifyPrefs(userId, patch)
    } catch (e) {
      setPrefs(before)
      setError((e as Error).message)
    }
  }

  async function run(what: string, job: () => Promise<void>) {
    setBusy(what)
    setError(null)
    try {
      await job()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
      pushState().then(setState, () => {})
    }
  }

  const on = () =>
    run('on', async () => {
      await turnOnPush()
      toast('Reminders on for this device', 'wave')
    })
  const off = () =>
    run('off', async () => {
      await turnOffPush()
      toast('Reminders off here', 'nod')
    })
  const test = (channel: 'push' | 'email') =>
    run(channel, async () => {
      const r = await sendTest(channel)
      toast(channel === 'email' ? `Sent to ${r.to}` : r.sent === 1 ? 'Sent. It should arrive in a moment' : `Sent to ${r.sent} devices`, 'nod')
    })

  const p = prefs ?? DEFAULT_NOTIFY
  const toggle = (k: keyof NotifyPrefs, label: string, sub?: string) => (
    <label className="switch" key={k}>
      <input type="checkbox" checked={Boolean(p[k])} disabled={!prefs} onChange={(e) => change({ [k]: e.target.checked })} />
      <span className="grow">
        <span style={{ display: 'block' }}>{label}</span>
        {sub && <span className="small muted">{sub}</span>}
      </span>
    </label>
  )

  return (
    <Sheet title="Reminders" onClose={onClose}>
      <div className="stack">
        <p className="small muted">
          KATY can reach you outside the app: a short summary each evening, and a word when something needs you.
        </p>

        <div className="card stack">
          <div className="row">
            <Tile icon="bell" tone={state === 'on' ? 'gold' : undefined} />
            <div className="grow">
              <p style={{ fontWeight: 600 }}>This device</p>
              <p className="small muted">{mock ? 'Demo mode doesn’t send anything.' : state ? STATE_LINE[state] : 'Checking…'}</p>
            </div>
          </div>
          {mock ? null : state === 'off' ? (
            <button type="button" className="btn block" disabled={busy !== null} onClick={on}>
              <Glyph name="bell" size={18} />
              {busy === 'on' ? 'Turning on…' : 'Turn on for this device'}
            </button>
          ) : state === 'on' ? (
            <div className="grid-2">
              <button type="button" className="btn soft" disabled={busy !== null} onClick={() => test('push')}>
                {busy === 'push' ? 'Sending…' : 'Send a test'}
              </button>
              <button type="button" className="btn soft" disabled={busy !== null} onClick={off}>
                {busy === 'off' ? 'Turning off…' : 'Turn off here'}
              </button>
            </div>
          ) : state === 'install' ? (
            <p className="hint">
              On iPhone and iPad, reminders come to Manna on your Home Screen (iOS 16.4 or newer). In Safari, tap Share, then Add to
              Home Screen. Open Manna from there and come back here.
            </p>
          ) : state === 'blocked' ? (
            <p className="hint">Allow notifications for this site in the browser’s settings, then reopen this page.</p>
          ) : state === 'dev' ? (
            <p className="hint">Push needs the service worker, which the dev server leaves out. Try it with npm run build, then npm run preview.</p>
          ) : state === 'unsupported' ? (
            <p className="hint">Try Chrome on Android or a computer, or Safari from the Home Screen on iPhone.</p>
          ) : null}
        </div>

        <p className="eyebrow" style={{ padding: '0 6px' }}>Each evening</p>
        <div className="card stack">
          {toggle('digest', 'A summary of the day', 'What you spent, what’s left for the month, and tomorrow’s bills.')}
          {p.digest && (
            <>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="rm-hour">At</label>
                  <select id="rm-hour" value={p.digest_hour} onChange={(e) => change({ digest_hour: Number(e.target.value) })}>
                    {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="rm-week">The week’s on</label>
                  <select id="rm-week" value={p.weekly_day} onChange={(e) => change({ weekly_day: Number(e.target.value) })}>
                    {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              <p className="hint">On {DAYS[p.weekly_day]}s it sums up the week instead, and on a month’s last day, the month with its tithe.</p>
            </>
          )}
        </div>

        <p className="eyebrow" style={{ padding: '0 6px' }}>When something needs you</p>
        <div className="card stack">
          {toggle('alerts', 'Alerts on your devices')}
          {(p.alerts || p.email_alerts) && (
            <>
              {toggle('alert_bills', 'Bills', 'The day before, on the day, and if it’s late')}
              {toggle('alert_budgets', 'Budgets', 'At 80%, and when one goes over')}
              {toggle('alert_loans', 'Loans and KATY’s notes', 'On the day they’re due')}
              {toggle('alert_cards', 'Cards', 'With less than a tenth of the limit left')}
            </>
          )}
          <p className="hint">Only between 8 AM and 10 PM, and each one once.</p>
        </div>

        <p className="eyebrow" style={{ padding: '0 6px' }}>By email</p>
        <div className="card stack">
          {email || mock ? (
            <>
              {toggle('email_digest', 'The week’s and month’s summary')}
              {toggle('email_alerts', 'Alerts too')}
              <p className="hint">{mock ? 'In demo mode nothing is sent.' : `To ${session?.user.email ?? 'your sign-in email'}.`}</p>
              {!mock && (p.email_digest || p.email_alerts) && (
                <button type="button" className="btn soft block" disabled={busy !== null} onClick={() => test('email')}>
                  <Glyph name="envelope" size={18} />
                  {busy === 'email' ? 'Sending…' : 'Send a test email'}
                </button>
              )}
            </>
          ) : (
            <p className="hint">Email isn’t set up on the server yet. Once it has an email key, you can get the week’s summary in your inbox.</p>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </Sheet>
  )
}
