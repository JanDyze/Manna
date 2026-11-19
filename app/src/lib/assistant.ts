// Talking to the mascot. Claude does the understanding (supabase/functions/manna-mascot). A small rule-based
// reader on the device stands in for it in demo mode, when the function has no key yet, or when it can't be
// reached (offline). Either way nothing is saved until the person confirms each entry.
import { supabase } from './supabase'
import { mock } from './mock'
import { addDays, today } from './dates'
import { addDebt } from './actions'
import type { Data } from './store'
import type { useStore } from './store'
import type { Tx } from './types'
import { uploadPhoto, type Photo } from './photos'
import { readReceipt, ReaderUnavailable, type ReadReceipt } from './receipt'

export type EntryKind = 'expense' | 'income' | 'giving' | 'transfer' | 'lend' | 'borrow' | 'note'
export type Entry = {
  kind: EntryKind
  /** for a note: money mentioned, if any (0 when none) */
  amount: number
  /** empty for a note */
  account_id: string
  to_account_id?: string
  category_id?: string
  person?: string
  note?: string
  occurred_on: string
  /** notes only: the day to bring it up again */
  remind_on?: string | null
  /** a photo to keep with it: the receipt it was read from, or one added on a note */
  photo?: Photo
}
export type Turn = { role: 'user' | 'assistant'; text: string; entries?: Entry[] }

/** Kinds a receipt photo belongs with. */
const WITH_PHOTO: EntryKind[] = ['expense', 'income', 'giving', 'note']

// set once the mascot function answers that it isn't there or has no key, so later messages don't wait on it
let claudeOff = false

/** Send a message (and maybe a photo of a receipt); get a reply and proposed entries. Without Claude (the demo,
 *  no key, or no connection) the phone reads it: rules for typed words, on-device OCR for photos. */
export async function ask(message: string, history: Turn[], data: Data, photo?: Photo): Promise<{ reply: string; entries: Entry[] }> {
  let out: { reply: string; entries: Entry[] }
  if (mock || claudeOff) out = await readLocally(message, data, photo)
  else {
    try {
      out = await askClaude(message, history, data, photo)
    } catch (e) {
      console.warn('KATY: Claude unavailable, reading on the phone instead.', e)
      out = await readLocally(message, data, photo)
    }
  }
  // the receipt goes along with what it was read into
  if (photo) out.entries = out.entries.map((e) => (WITH_PHOTO.includes(e.kind) ? { ...e, photo } : e))
  return out
}

async function askClaude(message: string, history: Turn[], data: Data, photo?: Photo): Promise<{ reply: string; entries: Entry[] }> {
  const context = {
    today: today(),
    tithePercent: data.settings.tithe_percent,
    accounts: data.accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name, kind: a.kind })),
    categories: data.categories.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    people: data.people.map((p) => ({ name: p.name })),
    // KATY's memory: the notes still open, so she can answer about them
    notes: data.notes.filter((n) => !n.done_at).map((n) => ({ body: n.body, person: n.person, amount: n.amount, remind_on: n.remind_on, saved_on: n.created_at?.slice(0, 10) ?? null })),
  }
  const { data: out, error } = await supabase.functions.invoke('manna-mascot', {
    body: { message, history: history.map((t) => ({ role: t.role, text: t.text })), context, image: photo ? { media_type: photo.type, data: photo.base64 } : undefined },
  })
  if (error) {
    const res = (error as { context?: Response }).context
    // not deployed, or deployed without a key: stop asking it this session
    if (res?.status === 404 || res?.status === 503) claudeOff = true
    // the function's own message is friendlier than the transport error
    const detail = await res?.json?.().catch(() => null)
    throw new Error(detail?.error ?? 'I couldn’t reach my thinking just now.')
  }
  return { reply: out.reply ?? '', entries: (out.entries ?? []).map((e: Entry) => fill(e, data)) }
}

/** Give an entry a category when it has none, so it always saves cleanly. */
function fill(e: Entry, data: Data): Entry {
  if (['expense', 'income', 'giving'].includes(e.kind) && !e.category_id) {
    const other = data.categories.find((c) => c.kind === e.kind && !c.archived && c.name === 'Other') ?? data.categories.find((c) => c.kind === e.kind && !c.archived)
    return { ...e, category_id: other?.id }
  }
  return e
}

// one upload per photo, even when a receipt becomes two entries
const uploaded = new WeakMap<Photo, Promise<string>>()
export function keepPhoto(userId: string, photo: Photo): Promise<string> {
  let path = uploaded.get(photo)
  if (!path) {
    path = uploadPhoto(userId, photo)
    path.catch(() => uploaded.delete(photo))
    uploaded.set(photo, path)
  }
  return path
}

/** Save one confirmed entry. */
export async function save(s: ReturnType<typeof useStore>, e: Entry) {
  const photo = e.photo && WITH_PHOTO.includes(e.kind) ? await keepPhoto(s.data.settings.user_id, e.photo) : null
  if (e.kind === 'note')
    return s.insert('notes', { body: (e.note ?? '').trim(), person: e.person?.trim() || null, amount: e.amount > 0 ? e.amount : null, remind_on: e.remind_on || null, done_at: null, image_path: photo })
  if (e.kind === 'lend' || e.kind === 'borrow') {
    return addDebt(s, {
      personName: e.person ?? 'Someone',
      direction: e.kind === 'lend' ? 'owed_to_me' : 'i_owe',
      title: e.note?.trim() || (e.kind === 'lend' ? 'Loan' : 'Borrowed'),
      principal: e.amount,
      startedOn: e.occurred_on,
      dueOn: null,
      note: null,
      accountId: e.account_id,
    })
  }
  return s.insert('transactions', {
    kind: e.kind,
    amount: Math.round(e.amount * 100) / 100,
    occurred_on: e.occurred_on,
    account_id: e.account_id,
    to_account_id: e.kind === 'transfer' ? e.to_account_id ?? null : null,
    category_id: e.kind === 'transfer' ? null : e.category_id ?? null,
    debt_id: null,
    recurring_id: null,
    note: e.note?.trim() || null,
    receipt_path: photo,
  } as Partial<Tx>)
}

// ---------------- demo mode: a small reader for everyday phrases ----------------

const WORDS: [string, RegExp][] = [
  ['Food', /\b(lunch|dinner|breakfast|merienda|snack|ulam|coffee|kape|jollibee|mcdo|food|eat|kain|milk ?tea)\b/i],
  ['Transport', /\b(grab|jeep|jeepney|tricycle|trike|bus|mrt|lrt|pamasahe|fare|taxi|angkas|gas|gasoline|parking|toll)\b/i],
  ['Bills', /\b(meralco|electric|electricity|kuryente|water|tubig|internet|wifi|pldt|globe|converge|load|bill)\b/i],
  ['Rent', /\b(rent|upa)\b/i],
  ['Groceries', /\b(grocer(y|ies)|palengke|market|puregold|sm)\b/i],
  ['Health', /\b(medicine|gamot|doctor|clinic|hospital|pharmacy|mercury|vitamins?)\b/i],
  ['Shopping', /\b(shop(ping)?|shopee|lazada|clothes|shoes|damit)\b/i],
  ['Subscriptions', /\b(netflix|spotify|youtube|icloud|subscription)\b/i],
  ['Fun', /\b(movie|sine|games?|concert|gala)\b/i],
  ['Family', /\b(family|nanay|tatay|mama|papa|kapatid|padala)\b/i],
]

export function amountIn(s: string): { amount: number; rest: string } | null {
  const m = s.match(/(?:₱|php|p)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?\b/i)
  if (!m) return null
  const amount = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)
  return amount > 0 ? { amount, rest: s.replace(m[0], ' ') } : null
}

// "take note", "remember", or someone asking for something: a note, not money moving
const NOTE_WORDS = /\b(take (a )?note|note (that|this|down)|note:|remember( that)?|paalala|tandaan|is asking|was asking|asked (me|if)|nagtatanong|humihingi|wants to borrow|won'?t give yet|not yet)\b/i
const ASK_NOTES = /\b(what|any|show|list)\b.*\b(notes?|remember|reminders?|pending|asked)\b|\bwhat did \w+ (ask|want|say)\b/i
const NOT_NAMES = new Set([
  'I', 'KATY', 'Katy', 'Take', 'Note', 'Remember', 'Please', 'Pls', 'Paalala', 'Tandaan', 'Hi', 'Hello', 'The', 'My', 'Not', 'But', 'And', 'So', 'He', 'She', 'They', 'We', 'It', 'This', 'That',
  // words that often start a note
  'Need', 'Buy', 'Pay', 'Remind', 'Ask', 'Call', 'Tell', 'Check', 'Give', 'Send', 'Get', 'Plan', 'Save', 'Pray', 'Think', 'Talk', 'Maybe', 'If', 'When', 'Next', 'Before', 'After', 'Don', 'Do', 'Should', 'Will', 'Can', 'Could', 'Wait', 'Wala', 'Bayad', 'Bili', 'Utang',
  // days and months
  'Today', 'Tomorrow', 'Yesterday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
  'Christmas', 'Payday', 'GCash', 'Maya', 'BDO', 'BPI',
])

export function personIn(text: string, data: Data): string | null {
  const known = data.people.find((p) => new RegExp(`\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text))
  if (known) return known.name
  const titled = text.match(/\b(Ate|Kuya|Tita|Tito|Lola|Lolo|Pastor|Bro\.?|Sis\.?)\s+[A-Z][a-z]+/)
  if (titled) return titled[0]
  for (const w of text.match(/\b[A-Z][a-z]+\b/g) ?? []) if (!NOT_NAMES.has(w)) return w
  return null
}

function remindOn(text: string): string | null {
  if (/\b(tomorrow|bukas)\b/i.test(text)) return addDays(today(), 1)
  if (/\bnext week\b/i.test(text)) return addDays(today(), 7)
  const n = text.match(/\bin (\d{1,2}) days?\b/i)
  return n ? addDays(today(), Number(n[1])) : null
}

async function readLocally(message: string, data: Data, photo?: Photo): Promise<{ reply: string; entries: Entry[] }> {
  // a photo with no amount typed: read the receipt here on the phone
  if (photo && !amountIn(message)) return readPhoto(message, data, photo)
  return readWords(message, data)
}

async function readPhoto(message: string, data: Data, photo: Photo): Promise<{ reply: string; entries: Entry[] }> {
  const cash = data.accounts.find((a) => a.kind === 'cash' && !a.archived) ?? data.accounts.find((a) => !a.archived)
  const other = data.categories.find((c) => c.kind === 'expense' && !c.archived && c.name === 'Other')
  const hit = WORDS.find(([, re]) => re.test(message))
  const typed = hit && data.categories.find((c) => c.kind === 'expense' && !c.archived && c.name === hit[0])
  // couldn't get a total: keep the photo (and whatever else was read) on an entry and let them type the amount
  const blank = (reply: string, r?: ReadReceipt): { reply: string; entries: Entry[] } => {
    const account = r?.account_id ?? cash?.id
    return {
      reply,
      entries: account
        ? [{ kind: r?.kind ?? 'expense', amount: 0, account_id: account, category_id: typed?.id ?? r?.category_id ?? other?.id, note: message.trim() || r?.note || 'Receipt', occurred_on: r?.date ?? today() }]
        : [],
    }
  }
  let r: ReadReceipt
  try {
    r = await readReceipt(photo, data)
  } catch (err) {
    console.warn('KATY: reading the photo failed', err)
    return blank(
      err instanceof ReaderUnavailable
        ? 'I couldn’t start my photo reader. It needs the internet the first time. I kept the photo; type the total and tap Save.'
        : 'Something went wrong reading that picture. I kept the photo; type the total and tap Save.',
    )
  }
  if (!r.total)
    return blank(
      r.text.trim().length < 15
        ? 'I couldn’t see any writing on that one. Try again closer, flat and in good light, or type the total and tap Save.'
        : 'I read the receipt but couldn’t find the total. I filled in what I could; type the total and tap Save.',
      r,
    )
  const e: Entry = {
    kind: r.kind,
    amount: r.total,
    account_id: r.account_id ?? cash?.id ?? '',
    // what they typed with the photo ("groceries") beats the guess
    category_id: typed?.id ?? r.category_id ?? undefined,
    note: message.trim() || r.note || 'Receipt',
    occurred_on: r.date ?? today(),
  }
  return {
    reply: r.sure
      ? `Read on your phone: looks like a ${r.type.toLowerCase()}. Check the total and tap Save.`
      : 'I couldn’t find a TOTAL line, so this total is my best guess. Please check it before saving.',
    entries: [e],
  }
}

function readWords(message: string, data: Data): { reply: string; entries: Entry[] } {
  // questions about what KATY remembers
  if (ASK_NOTES.test(message)) {
    const who = personIn(message.replace(/^\s*\w+/, ''), data)
    const open = data.notes.filter((n) => !n.done_at && (!who || (n.person ?? '').toLowerCase().includes(who.toLowerCase()) || n.body.toLowerCase().includes(who.toLowerCase())))
    if (!open.length) return { reply: who ? `I don’t have anything noted about ${who}.` : 'No open notes. Tell me anything you want me to remember.', entries: [] }
    return { reply: `Here’s what I’m keeping for you:\n${open.slice(0, 5).map((n) => `• ${n.body}`).join('\n')}`, entries: [] }
  }
  // something to remember rather than money moving
  if (NOTE_WORDS.test(message)) {
    const body = message
      .replace(/^\s*(katy[,!.:]?\s*)?(please\s+|pls\s+)?(take (a )?note( that| of)?|note( that| this| down)?:?|remember( that)?|paalala:?|tandaan:?)\s*/i, '')
      .trim()
    const text = body ? body[0].toUpperCase() + body.slice(1) : message
    const money = amountIn(message)
    return {
      reply: 'I’ll remember that. Check the note and tap Save.',
      entries: [{ kind: 'note', note: text, person: personIn(message, data) ?? undefined, amount: money?.amount ?? 0, account_id: '', occurred_on: today(), remind_on: remindOn(message) }],
    }
  }
  const accounts = data.accounts.filter((a) => !a.archived)
  const cats = data.categories.filter((c) => !c.archived)
  const cash = accounts.find((a) => a.kind === 'cash') ?? accounts[0]
  const findAccount = (s: string) => accounts.filter((a) => new RegExp(`\\b${a.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s))
  const cat = (kind: string, name: string) => cats.find((c) => c.kind === kind && c.name === name)?.id ?? cats.find((c) => c.kind === kind && c.name === 'Other')?.id

  const entries: Entry[] = []
  for (const raw of message.split(/,(?!\d)|[;\n]|\band\b|\bsaka\b/i)) {
    const chunk = raw.trim()
    const found = amountIn(chunk)
    if (!found || !cash) continue
    const on = /\b(yesterday|kahapon)\b/i.test(chunk) ? addDays(today(), -1) : today()
    const named = findAccount(chunk)
    let words = found.rest
    for (const a of named) words = words.replace(new RegExp(a.name, 'i'), ' ')
    const note = words
      .replace(/\b(yesterday|kahapon|today|from|to|via|using|sa|for|paid|spent|bought|got|received|lent|borrowed|transfer(red)?|moved?|i|my)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const label = note ? note[0].toUpperCase() + note.slice(1) : undefined
    const base = { amount: found.amount, account_id: named[0]?.id ?? cash.id, occurred_on: on }

    const who = (re: RegExp) => chunk.match(re)?.[1]
    const lend = /\b(lent|pinahiram|pautang)\b/i.test(chunk) ? [chunk, who(/\b(?:to|kay|si)\s+([A-Z][\w-]+)/) ?? 'Someone'] : null
    const borrow = /\b(borrowed|utang ko|nangutang ako)\b/i.test(chunk) ? [chunk, who(/\b(?:from|kay)\s+([A-Z][\w-]+)/) ?? 'Someone'] : null
    if (lend) entries.push({ ...base, kind: 'lend', person: lend[1], note: `Loan to ${lend[1]}` })
    else if (borrow) entries.push({ ...base, kind: 'borrow', person: borrow[1], note: `Borrowed from ${borrow[1]}` })
    else if (/\b(transfer|moved?|cash ?in|withdr[ae]w)\b/i.test(chunk) && named.length >= 2)
      entries.push({ ...base, kind: 'transfer', account_id: named[0].id, to_account_id: named[1].id, note: label })
    else if (/\b(tithes?|ikapu|offering|handog|missions?|donat\w*)\b/i.test(chunk)) {
      const name = /\bmissions?\b/i.test(chunk) ? 'Missions' : /\b(offering|handog)\b/i.test(chunk) ? 'Offering' : /\bdonat/i.test(chunk) ? 'Helping others' : 'Tithe'
      entries.push({ ...base, kind: 'giving', category_id: cat('giving', name), note: label })
    } else if (/\b(salary|sweldo|payday|received|got paid|income|bonus|freelance|gift from)\b/i.test(chunk)) {
      const name = /\b(salary|sweldo|payday)\b/i.test(chunk) ? 'Salary' : /\bfreelance|side\b/i.test(chunk) ? 'Side work' : /\bgift\b/i.test(chunk) ? 'Gift' : 'Other'
      const bank = named[0] ?? accounts.find((a) => a.kind === 'bank') ?? cash
      entries.push({ ...base, kind: 'income', account_id: bank.id, category_id: cat('income', name), note: label })
    } else {
      const hit = WORDS.find(([, re]) => re.test(chunk))
      entries.push({ ...base, kind: 'expense', category_id: cat('expense', hit?.[0] ?? 'Other'), note: label })
    }
  }

  const reply = entries.length
    ? entries.length === 1
      ? 'Got it. Check this and tap Save.'
      : `Got ${entries.length} things. Check them and save what’s right.`
    : /\b(hi|hello|hey|kumusta|musta)\b/i.test(message)
      ? 'Hi, I’m KATY! Tell me what you spent or received, like “lunch 180 GCash” or “sweldo 25k BDO”.'
      : 'I didn’t find an amount there. Try something like “grab 230” or “tithe 2,500 from BDO”.'
  return { reply, entries }
}
