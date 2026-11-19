// Reminders: push notifications on this device (Web Push through public/sw.js) and what the person wants sent,
// to every device and by email (manna.notify_settings). The sending is done by the `manna-notify` Edge Function
// (MigraineTracker/supabase/functions/manna-notify), which pg_cron calls every hour.
import { supabase } from './supabase'
import { mock } from './mock'

export type NotifyPrefs = {
  digest: boolean
  digest_hour: number
  weekly_day: number
  alerts: boolean
  alert_bills: boolean
  alert_budgets: boolean
  alert_loans: boolean
  alert_cards: boolean
  email_digest: boolean
  email_alerts: boolean
}

/** The same defaults as the table (and manna-notify's compose.ts). */
export const DEFAULT_NOTIFY: NotifyPrefs = {
  digest: true, digest_hour: 21, weekly_day: 0,
  alerts: true, alert_bills: true, alert_budgets: true, alert_loans: true, alert_cards: true,
  email_digest: false, email_alerts: false,
}

const COLUMNS = Object.keys(DEFAULT_NOTIFY).join(', ')

export async function loadNotifyPrefs(): Promise<NotifyPrefs> {
  if (mock) return { ...DEFAULT_NOTIFY }
  const { data, error } = await supabase.from('notify_settings').select(COLUMNS).maybeSingle()
  if (error) throw new Error(error.message)
  return { ...DEFAULT_NOTIFY, ...((data ?? {}) as Partial<NotifyPrefs>) }
}

export async function saveNotifyPrefs(userId: string, patch: Partial<NotifyPrefs>): Promise<void> {
  if (mock) return
  const { error } = await supabase
    .from('notify_settings')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------- the server

type Config = { publicKey: string | null; email: boolean }
let config: Promise<Config> | null = null

/** The key to subscribe with, and whether the server can send email. */
export function notifyConfig(): Promise<Config> {
  if (mock) return Promise.resolve({ publicKey: null, email: false })
  config ??= call<Config>({ action: 'config' }).catch((e) => {
    config = null
    throw e
  })
  return config
}

/** Ask manna-notify for something; its error message (in KATY's words) becomes the thrown one. */
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manna-notify', { body })
  if (error) {
    const res = (error as { context?: Response }).context
    const said = res && typeof res.json === 'function' ? await res.json().then((j: { error?: string }) => j.error, () => null) : null
    throw new Error(said || 'Manna couldn’t reach the reminders service. Check your connection and try again.')
  }
  return data as T
}

/** Send today's summary now: to this person's phones, or the week's to their inbox. */
export function sendTest(channel: 'push' | 'email') {
  return call<{ sent: number; devices?: number; to?: string }>({ action: 'test', channel })
}

// ---------------------------------------------------------------- this device

export type PushState =
  | 'on' // this device gets reminders
  | 'off' // it could; not turned on
  | 'blocked' // the person (or the browser) said no to notifications
  | 'install' // iPhone/iPad: only from the Home Screen app
  | 'dev' // the dev server has no service worker
  | 'unsupported'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function pushState(): Promise<PushState> {
  // Safari only offers push to a web app added to the Home Screen (iOS 16.4 and later)
  if (isIOS() && !standalone()) return 'install'
  if (!supported()) return 'unsupported'
  if (!import.meta.env.PROD) return 'dev'
  if (Notification.permission === 'denied') return 'blocked'
  return Notification.permission === 'granted' && (await currentSubscription()) ? 'on' : 'off'
}

function fromB64u(s: string): Uint8Array<ArrayBuffer> {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false
  const x = new Uint8Array(a)
  return x.every((v, i) => v === b[i])
}

function deviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad'
  if (/Android/.test(ua)) return 'Android phone'
  if (/Windows/.test(ua)) return 'Windows computer'
  if (/Macintosh/.test(ua)) return 'Mac'
  return 'This device'
}

async function save(sub: PushSubscription) {
  const j = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys?.p256dh,
    p_auth: j.keys?.auth,
    p_device: deviceName(),
  })
  if (error) throw new Error(error.message.replace(/^manna: /, ''))
}

/** Ask for permission, subscribe this device and tell the server where to reach it. */
export async function turnOnPush(): Promise<void> {
  const { publicKey } = await notifyConfig()
  if (!publicKey) throw new Error('Reminders aren’t set up on the server yet (it needs its VAPID keys).')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? 'Notifications are blocked for Manna. Allow them in the browser’s site settings, then try again.' : 'Allow notifications to get reminders.')
  }
  const key = fromB64u(publicKey)
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  // one made with another key (the server's keys changed) can't be reused
  if (sub && !sameKey(sub.options.applicationServerKey, key)) {
    await sub.unsubscribe()
    sub = null
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  await save(sub)
}

/** Stop reminders on this device (the others keep theirs). */
export async function turnOffPush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  if (!mock) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/**
 * On opening the app: keep the server's copy of this device's push address current (browsers change them now
 * and then), under whoever is signed in now.
 */
export async function syncPush(): Promise<void> {
  if (mock || !import.meta.env.PROD || !supported() || Notification.permission !== 'granted') return
  const sub = await currentSubscription()
  if (sub) await save(sub).catch(() => {})
}
