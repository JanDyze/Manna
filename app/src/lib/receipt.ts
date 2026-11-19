// Reading a receipt on the phone itself, no Claude needed. Tesseract (OCR compiled to WebAssembly) turns the
// photo into text inside the browser; the picture never leaves the device, only the engine and its English
// data are downloaded the first time (then kept by the browser). Rules then work out what kind of receipt it is
// (a supermarket slip, a GCash screen, a Meralco bill…) and use that kind's own rules to pick out the total,
// the store, the date, how it was paid and the category. It's used in the demo and whenever Claude isn't set
// up or can't be reached. As always, nothing is saved until the person checks the entry.
import { today } from './dates'
import type { Data } from './store'
import { loadImage, type Photo } from './photos'

export type ReadReceipt = {
  /** which kind of receipt the rules took it for */
  type: string
  /** the total paid, or null when none could be found */
  total: number | null
  /** true when the total came from a labelled line (TOTAL, AMOUNT DUE…), not a best guess */
  sure: boolean
  /** a short note for the entry, like "Puregold groceries" */
  note: string | null
  date: string | null
  account_id: string | null
  kind: 'expense' | 'giving'
  category_id: string | null
  text: string
}

// one engine per session, started on the first photo
type Engine = {
  recognize: (img: Blob) => Promise<{ data: { text: string } }>
  setParameters: (p: Record<string, string>) => Promise<unknown>
}
let engine: Promise<Engine> | null = null
function getEngine(): Promise<Engine> {
  if (!engine) {
    engine = import('tesseract.js').then(async ({ createWorker }) => {
      const worker = (await createWorker('eng')) as unknown as Engine
      // a receipt is one column of lines in different sizes (mode 4); keep the spaces that line prices up
      await worker.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' })
      return worker
    })
    engine.catch(() => (engine = null))
  }
  return engine
}

/** Thrown when the OCR engine itself couldn't start (usually: offline the first time). */
export class ReaderUnavailable extends Error {}

/** The text on a photo, read on the device. */
export async function ocr(photo: Photo): Promise<string> {
  const worker = await getEngine().catch((e) => {
    throw new ReaderUnavailable(String((e as Error)?.message ?? e))
  })
  const { data } = await worker.recognize(await forReading(photo))
  return data.text ?? ''
}

// Getting a phone photo ready for Tesseract, which wants black letters about 20–40px tall on a white page:
//   1. find the receipt: the paper is the bright part of the picture; the table around it confuses Tesseract
//      into finding no text at all, so it's cut away
//   2. read from the full photo, not the 1280px copy, with the receipt's width at about 1500px
//   3. ink or paper, pixel by pixel, against the brightness around it (an adaptive threshold), so faded
//      thermal print, shadows and uneven light all come out as clean black on white
const READ_WIDTH = 1500
const READ_MAX = 4500

function greyOf(ctx: CanvasRenderingContext2D, w: number, h: number): Uint8ClampedArray {
  const px = ctx.getImageData(0, 0, w, h).data
  const grey = new Uint8ClampedArray(w * h)
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) grey[j] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000
  return grey
}

/** The brightness that best splits a picture in two (Otsu). */
function otsu(grey: Uint8ClampedArray): number {
  const hist = new Float64Array(256)
  for (const v of grey) hist[v]++
  let sum = 0
  for (let v = 0; v < 256; v++) sum += v * hist[v]
  let below = 0, sumBelow = 0, best = 0, cut = 128
  for (let v = 0; v < 256; v++) {
    below += hist[v]
    if (!below || below === grey.length) continue
    sumBelow += v * hist[v]
    const above = grey.length - below
    const between = below * above * (sumBelow / below - (sum - sumBelow) / above) ** 2
    if (between > best) (best = between), (cut = v)
  }
  return cut
}

/** Where the paper is, as a share of the picture: rows and columns that are mostly bright. */
function paperBox(grey: Uint8ClampedArray, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const cut = otsu(grey)
  const rows = new Float64Array(h)
  const cols = new Float64Array(w)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (grey[y * w + x] > cut) (rows[y]++, cols[x]++)
  // the longest run of rows (columns) that are at least 40% paper
  const run = (a: Float64Array, len: number, other: number) => {
    let best = [0, len], start = -1
    for (let i = 0; i <= len; i++) {
      const on = i < len && a[i] >= 0.4 * other
      if (on && start < 0) start = i
      if (!on && start >= 0) {
        if (i - start > best[1] - best[0] || best[1] - best[0] === len) best = [start, i]
        start = -1
      }
    }
    return best
  }
  const [y0, y1] = run(rows, h, w)
  const [x0, x1] = run(cols, w, h)
  // too small to be the receipt, or bright from edge to edge (a screenshot, or a receipt filling the frame,
  // where a dark band is an app's header, not the table): keep the whole picture
  if ((x1 - x0) * (y1 - y0) < 0.12 * w * h || (x0 < 0.03 * w && x1 > 0.97 * w)) return { x: 0, y: 0, w: 1, h: 1 }
  const m = 0.01
  return { x: Math.max(0, x0 / w - m), y: Math.max(0, y0 / h - m), w: Math.min(1, (x1 - x0) / w + 2 * m), h: Math.min(1, (y1 - y0) / h + 2 * m) }
}

async function forReading(photo: Photo): Promise<Blob> {
  try {
    const img = await loadImage(photo.source ?? photo.blob)
    const iw = img.width
    const ih = img.height

    // 1. find the paper on a small copy
    const small = Math.min(1, 400 / Math.max(iw, ih))
    const sw = Math.max(1, Math.round(iw * small))
    const sh = Math.max(1, Math.round(ih * small))
    const probe = document.createElement('canvas')
    probe.width = sw
    probe.height = sh
    const pctx = probe.getContext('2d', { willReadFrequently: true })!
    pctx.drawImage(img, 0, 0, sw, sh)
    const box = paperBox(greyOf(pctx, sw, sh), sw, sh)
    const cx = box.x * iw, cy = box.y * ih, cw = box.w * iw, ch = box.h * ih

    // 2. the receipt alone, at reading size
    const scale = Math.min(READ_WIDTH / Math.min(cw, ch), READ_MAX / Math.max(cw, ch), 2.5)
    const w = Math.round(cw * scale)
    const h = Math.round(ch * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, w, h)
    if ('close' in img) img.close()

    const grey = greyOf(ctx, w, h)
    // white writing on a dark or coloured band (an app's header, a shop's banner): turn those rows over first,
    // so the letters are dark on light like the rest of the page
    const light = otsu(grey)
    for (let y = 0; y < h; y++) {
      let sum = 0
      for (let x = 0; x < w; x++) sum += grey[y * w + x]
      if (sum / w < light) for (let x = 0; x < w; x++) grey[y * w + x] = 255 - grey[y * w + x]
    }

    // 3. adaptive threshold (Bradley): darker than the neighbourhood's average by enough is ink
    const sums = new Float64Array((w + 1) * (h + 1))
    for (let y = 0; y < h; y++) {
      let row = 0
      for (let x = 0; x < w; x++) {
        row += grey[y * w + x]
        sums[(y + 1) * (w + 1) + x + 1] = sums[y * (w + 1) + x + 1] + row
      }
    }
    const r = Math.max(8, Math.round(Math.min(w, h) / 40))
    const out = ctx.createImageData(w, h)
    const px = out.data
    for (let y = 0; y < h; y++) {
      const ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1)
      for (let x = 0; x < w; x++) {
        const xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1)
        const area = (yb - ya) * (xb - xa)
        const total = sums[yb * (w + 1) + xb] - sums[ya * (w + 1) + xb] - sums[yb * (w + 1) + xa] + sums[ya * (w + 1) + xa]
        const v = grey[y * w + x] * area < total * 0.88 ? 0 : 255
        const i = (y * w + x) * 4
        px[i] = px[i + 1] = px[i + 2] = v
        px[i + 3] = 255
      }
    }
    ctx.putImageData(out, 0, 0)
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('no canvas'))), 'image/png'))
  } catch {
    // anything odd about the picture: let Tesseract try the stored copy as it is
    return photo.blob
  }
}

/** Read a receipt photo and work out what it was. */
export async function readReceipt(photo: Photo, data: Data): Promise<ReadReceipt> {
  return parseReceipt(await ocr(photo), data)
}

// ---------------- reading amounts, dates and names ----------------

// 1,234.50 · 1234.50 · 1234,50 (OCR often swaps the point for a comma) · ₱500 · PHP 500
// (1.234,50 too, but a dot groups thousands only before comma-cents, so "24.019 L" stays litres; a space never
// groups thousands, or "EGGS 12 120.50" would read as 12,120.50)
const MONEY = /(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d{1,3}(?:,\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2})(?!\d)|(?:₱|\bphp\b|\bp(?=\s?\d))\s?(\d+)(?![\d.,])/gi

export function moneyIn(line: string): number[] {
  const out: number[] = []
  for (const m of line.matchAll(MONEY)) {
    let s = (m[1] ?? m[2]).replace(/\s/g, '')
    // a trailing ",50" is cents; other commas group thousands
    s = /,\d{1,2}$/.test(s) ? s.replace(/\.(?=\d{3})/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '') : s.replace(/,/g, '')
    const n = Number(s)
    if (n > 0 && n < 10_000_000) out.push(n)
  }
  return out
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n: number) => String(n).padStart(2, '0')

function isoDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000) return null
  const iso = `${y}-${pad(m)}-${pad(d)}`
  // a date in the future is a misread (or a due date)
  return iso <= today() ? iso : null
}

function dateIn(line: string): string | null {
  let m: RegExpMatchArray | null
  // 2026-11-19 · 2026/11/19
  if ((m = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/))) return isoDate(+m[1], +m[2], +m[3])
  // Nov 19, 2026 · November 19 2026
  if ((m = line.match(/\b([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{2,4})\b/i)) && MONTHS.includes(m[1].toLowerCase()))
    return isoDate(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2])
  // 19 Nov 2026 · 19-Nov-26
  if ((m = line.match(/\b(\d{1,2})[\s-]([a-z]{3})[a-z]*[\s,-]+(\d{2,4})\b/i)) && MONTHS.includes(m[2].toLowerCase()))
    return isoDate(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1])
  // 11/19/2026 · 11-19-26 (month first, as Philippine receipts print it; day first when the month can't be)
  if ((m = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/))) {
    const [a, b, y] = [+m[1], +m[2], +m[3]]
    return a > 12 ? isoDate(y, b, a) : isoDate(y, a, b)
  }
  return null
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// RECEIPTS SHOUT; notes read better in title case ("St. Luke's", not "St. Luke'S")
const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s.\-&(])(\w)/g, (_, a, c) => a + c.toUpperCase()) : s)
// "Puregold Price Club Inc." → "Puregold Price Club"
const clean = (s: string) => titleCase(s.replace(/[^\w&'.*\- ]/g, ' ').replace(/\s+/g, ' ').trim()).replace(/[\s,]+(inc|corp(oration)?|co|ltd|company|enterprises?)\.?$/i, '')

// ---------------- the kinds of receipt ----------------

type Rule = {
  type: string
  /** what gives this kind away; the kind with the most signs wins */
  signs: RegExp[]
  /** the line the total is on, strongest wording first */
  totals: RegExp[]
  /** lines that mention a total but aren't what was paid */
  notTotal?: RegExp
  /** dates on lines like these are the wrong date (due dates, permits) */
  notDate?: RegExp
  /** the default category's name, or a choice made from the text */
  category: string | ((text: string) => string)
  kind?: 'expense' | 'giving'
  /** how it was paid, when the kind itself says (a GCash screen is GCash) */
  account?: (text: string) => RegExp | null
  /** a note for the entry; by default the shop's name from the top of the slip */
  note?: (lines: string[], text: string) => string | null
  /** what to add after the shop's name, like "groceries" */
  noun?: string
}

// common to every kind
const NOT_TOTAL = /\b(sub ?-?total|total (items?|qty|quantity|pcs|discount|savings|vat|tax)|no\.? of items|items? (sold|purchased)|vat(able)?( sales)?|vat-exempt|zero-rated|tax|less|discount|savings|points?|item count|cash|change|tender(ed)?)\b/i
const NOT_DATE = /\b(due|expir\w*|valid|until|permit|ptu|accredit\w*|issued|birth|since|effective|period|from|to:)\b/i
// money that's never the bill: cash handed over, change, paperwork numbers
const NOT_PAID = /\b(cash|change|tender(ed)?|sukli|bayad|rounding|balance|points?|vat|tax|tin|sn|min|ptu|permit|acct|account|ref|trans(action)?|discount|less)\b/i

const SHOPS: [string, RegExp][] = [
  ['Groceries', /\b(puregold|savemore|save more|robinsons (supermarket|easymart)|waltermart|walter mart|hypermarket|supermarket|grocer(y|ies)|alfamart|landers|s ?& ?r|metro mart|shopwise|ultra mega|palengke|market)\b/i],
  ['Food', /\b(jollibee|mcdonald'?s|mcdo|mang inasal|chowking|greenwich|kfc|starbucks|coffee|cafe|caf[eé]|bakery|bakeshop|restaurant|resto|grill|eatery|pizza|burger|milk ?tea|kitchen|7-?eleven|ministop|lawson|goldilocks|red ribbon|dine|take ?out|grabfood|foodpanda)\b/i],
  ['Health', /\b(mercury drug|watsons|southstar|rose pharmacy|the generics|tgp|generika|pharmacy|drug ?store|botika|clinic|hospital|medical|laboratory|diagnostic|dental)\b/i],
  ['Transport', /\b(petron|shell|caltex|seaoil|phoenix|cleanfuel|unioil|gasoline|diesel|unleaded|fuel|parking|toll|autosweep|easytrip|angkas|joyride|grabcar|grab ride)\b/i],
  ['Bills', /\b(meralco|maynilad|manila water|pldt|globe|smart|converge|sky ?cable|dito|electric|water district|bayad center)\b/i],
  ['Shopping', /\b(uniqlo|h&m|penshoppe|bench|department store|sm store|robinsons department|ace hardware|wilcon|handyman|national book ?store|miniso|daiso|shopee|lazada)\b/i],
  ['Fun', /\b(cinema|movie|timezone|ticket|concert)\b/i],
]
const shopCategory = (text: string) => SHOPS.find(([, re]) => re.test(text))?.[0] ?? 'Other'

// "Sent to JUAN D." / "Paid to Meralco" / "Merchant: X"
function payee(lines: string[]): string | null {
  for (const [i, line] of lines.entries()) {
    const m = line.match(/\b(?:sent to|send to|paid to|pay to|transfer(?:red)? to|recipient|receiver|merchant|biller|to account name|account name)\s*:?\s*(.*)$/i)
    if (!m) continue
    const name = clean(m[1] || lines[i + 1] || '')
    if (/[a-z]{2}/i.test(name)) return name.slice(0, 40)
  }
  return null
}

export const RULES: Rule[] = [
  {
    type: 'GCash / Maya',
    signs: [/\bg-?cash\b/i, /\b(pay)?maya\b/i, /\bref(erence)?\.?\s*(no|number|#)/i, /\b(express send|send money|you (have )?(sent|paid)|successfully (sent|paid)|payment successful|sent via|scan to pay|qr ph)\b/i],
    totals: [/\b(total amount sent|total amount paid|amount sent|you (have )?(sent|paid)|total amount|total)\b/i, /\bamount\b/i],
    notTotal: /\b(fee|service fee|balance|available|cashback|voucher)\b/i,
    category: shopCategory,
    account: (t) => (/\bmaya\b/i.test(t) ? /maya/i : /g-?cash/i),
    note: (lines, t) => {
      const who = payee(lines)
      const via = /\bmaya\b/i.test(t) && !/\bg-?cash\b/i.test(t) ? 'Maya' : 'GCash'
      return who ? `${via} to ${who}` : `${via} payment`
    },
  },
  {
    type: 'Bank transfer',
    signs: [/\b(instapay|pesonet|fund transfer|transfer (successful|confirmation|details)|online banking|bills payment confirmation)\b/i, /\b(bdo|bpi|metrobank|landbank|unionbank|security ?bank|rcbc|pnb|chinabank|eastwest|gotyme|seabank|cimb)\b/i, /\b(source account|from account|destination|beneficiary)\b/i],
    totals: [/\b(transfer amount|total amount|amount paid|amount)\b/i, /\btotal\b/i],
    notTotal: /\b(fee|service charge|balance|available)\b/i,
    category: shopCategory,
    account: (t) => {
      const bank = t.match(/\b(bdo|bpi|metrobank|landbank|unionbank|security ?bank|rcbc|pnb|chinabank|eastwest|gotyme|seabank|cimb)\b/i)?.[0]
      return bank ? new RegExp(escape(bank), 'i') : null
    },
    note: (lines) => {
      const who = payee(lines)
      return who ? `Transfer to ${who}` : 'Bank transfer'
    },
  },
  {
    type: 'Utility bill',
    signs: [/\b(meralco|maynilad|manila water|pldt|globe|smart|converge|sky ?cable|dito|primewater|water district)\b/i, /\b(statement of account|billing (period|statement|summary)|bill(ing)? date|current (bill|charges)|previous (balance|reading)|kwh|cu\.? ?m|meter)\b/i, /\b(account (no|number)|can|service id)\b/i],
    totals: [/\b(total amount due|amount due|amount to pay|total current (bill|charges)|amount paid)\b/i, /\b(total|current charges)\b/i],
    notTotal: /\b(previous|overdue|unpaid|past due|deposit|kwh|reading)\b/i,
    notDate: /\b(due|period|from|to|reading|next|disconnect\w*)\b/i,
    category: 'Bills',
    note: (_lines, t) => {
      const who = t.match(/\b(meralco|maynilad|manila water|pldt|globe|smart|converge|sky ?cable|dito|primewater)\b/i)?.[0]
      return who ? `${titleCase(who)} bill` : 'Utility bill'
    },
  },
  {
    type: 'Food delivery / ride',
    signs: [/\b(grab|grabfood|grabcar|foodpanda|lalamove|angkas|joyride|move ?it|transportify)\b/i, /\b(delivery fee|small order fee|rider|driver|booking (id|code)|order (no|#|id)|pick-?up|drop-?off|trip)\b/i, /\b(e-?receipt|thanks for (riding|ordering))\b/i],
    totals: [/\b(total paid|you paid|amount paid|total \(?incl|grand total|total charged)\b/i, /\btotal\b/i],
    notTotal: /\b(subtotal|promo|discount|voucher|savings)\b/i,
    category: (t) => (/\b(grabcar|grab ride|angkas|joyride|move ?it|trip|pick-?up|drop-?off|fare|lalamove)\b/i.test(t) && !/\b(grabfood|foodpanda|restaurant|meal)\b/i.test(t) ? 'Transport' : 'Food'),
    note: (_lines, t) => {
      // the specific service ("GrabCar") over the company printed above it ("Grab")
      const app = t.match(/\b(grabfood|grabcar|grabexpress|foodpanda|lalamove|angkas|joyride|move ?it)\b/i)?.[0] ?? t.match(/\bgrab\b/i)?.[0]
      return app ? app[0].toUpperCase() + app.slice(1).toLowerCase().replace(/^rab(\w)/, (_, c) => `rab${c.toUpperCase()}`) : null
    },
  },
  {
    type: 'Online shop',
    signs: [/\b(shopee|lazada|tiktok shop|zalora|temu|shein)\b/i, /\b(order total|merchandise subtotal|shipping (fee|subtotal)|total payment|order (id|no|#))\b/i],
    totals: [/\b(order total|total payment|total paid|amount paid|grand total)\b/i, /\btotal\b/i],
    notTotal: /\b(merchandise subtotal|shipping|voucher|coins|discount|subtotal)\b/i,
    category: 'Shopping',
    note: (_lines, t) => {
      const shop = t.match(/\b(shopee|lazada|tiktok shop|zalora|temu|shein)\b/i)?.[0]
      return shop ? `${titleCase(shop)} order` : 'Online order'
    },
  },
  {
    type: 'Fuel',
    signs: [/\b(petron|shell|caltex|seaoil|phoenix|cleanfuel|unioil|jetti|total ?energies)\b/i, /\b(liters?|litres?|ltrs?|pump|nozzle|unleaded|diesel|premium|xcs|blaze|v-?power|fuelsave|gasoline)\b/i, /\b(price\s*\/\s*l|php\/l|\/ltr)\b/i],
    totals: [/\b(amount due|total amount|total sale|grand total|amount)\b/i, /\btotal\b/i],
    notTotal: /\b(liters?|litres?|ltrs?|price|per|\/l|php\/l|pump|volume)\b/i,
    category: 'Transport',
    noun: 'fuel',
  },
  {
    type: 'Pharmacy',
    signs: [/\b(mercury drug|watsons|southstar|rose pharmacy|the generics|tgp|generika|pharmacy|drug ?store|botika)\b/i, /\b(\d+\s?mg|tablet|tab|capsule|cap|syrup|rx|generic|branded)\b/i, /\b(senior|pwd|osca|sc\/pwd)\b/i],
    totals: [/\b(amount due|total amount due|net amount|grand total)\b/i, /\btotal\b/i],
    notTotal: /\b(senior|pwd|sc\/pwd|osca|discount|vat-?exempt|less)\b/i,
    category: 'Health',
    noun: 'medicine',
  },
  {
    type: 'Hospital / clinic',
    signs: [/\b(hospital|clinic|medical (center|city)|diagnostic|laboratory|dental|doctor|dr\.|physician|consultation)\b/i, /\b(patient|philhealth|hmo|admission|out-?patient|check-?up|professional fee|pf)\b/i],
    totals: [/\b(amount due|patient'?s? share|balance due|net amount|amount paid|total amount due)\b/i, /\btotal\b/i],
    notTotal: /\b(philhealth|hmo|coverage|discount|gross|senior|pwd)\b/i,
    category: 'Health',
  },
  {
    type: 'Restaurant',
    signs: [/\b(server|waiter|table\s*(no|#)?|guests?|pax|covers?|dine[- ]?in)\b/i, /\b(service charge|s\.?c\.?\s*\d+%|tip|gratuity)\b/i, /\b(restaurant|resto|grill|bistro|kitchen|eatery|cafe|caf[eé]|samgyup|bar)\b/i],
    totals: [/\b(amount due|total due|grand total|total amount|balance due)\b/i, /\btotal\b/i],
    notTotal: /\b(service charge|tip|gratuity|food total|beverage total|guests?)\b/i,
    category: 'Food',
  },
  {
    type: 'Fast food / café',
    signs: [/\b(jollibee|mcdonald'?s|mcdo|mang inasal|chowking|greenwich|kfc|starbucks|tim hortons|coffee bean|bo'?s coffee|dunkin|7-?eleven|ministop|lawson|goldilocks|red ribbon|potato corner|shakey'?s|army navy|burger king|wendy'?s|pizza hut|yellow cab)\b/i, /\b(take ?out|dine ?in|order (no|#)|crew|combo|value meal|drink|fries|burger|chicken|coffee|latte|frappe)\b/i],
    totals: [/\b(amount due|total due|grand total|total amount)\b/i, /\btotal\b/i],
    category: 'Food',
  },
  {
    type: 'Supermarket',
    signs: [SHOPS[0][1], /\b(items? (sold|purchased)|no\.? of items|loyalty|smac|sm advantage|perks|points (earned|balance)|kg|grams?|pcs)\b/i],
    totals: [/\b(amount due|total amount due|grand total|total sales|net total|total amount)\b/i, /\btotal\b/i],
    category: 'Groceries',
    noun: 'groceries',
  },
  {
    type: 'Parking / toll',
    signs: [/\b(parking|toll(way)?|nlex|slex|skyway|cavitex|tplex|star tollway|autosweep|easytrip|rfid)\b/i, /\b(time[- ]?in|time[- ]?out|plate (no|number)|entry|exit|class \d|vehicle|duration)\b/i],
    totals: [/\b(parking fee|toll fee|amount due|amount paid|total|fee|amount)\b/i],
    notTotal: /\b(balance|load|rfid balance)\b/i,
    category: 'Transport',
    note: (_lines, t) => (/\btoll|nlex|slex|skyway|cavitex|tplex/i.test(t) ? 'Toll' : 'Parking'),
  },
  {
    type: 'Church / giving',
    signs: [/\b(church|parish|chapel|ministr(y|ies)|fellowship|diocese|congregation)\b/i, /\b(tithes?|ikapu|offering|handog|love gift|mission(s)?|pledge|donation|donor)\b/i],
    totals: [/\b(total|amount|tithes?|offering|love gift|donation)\b/i],
    kind: 'giving',
    // a tithe envelope often has an offering line too; the tithe is the main gift
    category: (t) => (/\b(tithes?|ikapu)\b/i.test(t) ? 'Tithe' : /\bmission/i.test(t) ? 'Missions' : /\b(offering|handog|love gift)\b/i.test(t) ? 'Offering' : /\b(donation|donor)\b/i.test(t) ? 'Helping others' : 'Tithe'),
  },
  {
    type: 'Acknowledgement receipt',
    signs: [/\b(acknowledg(e)?ment receipt|received from|the sum of|in payment of|as payment for|collection receipt|provisional receipt)\b/i, /\b(pesos|only|signature|received by)\b/i],
    totals: [/\b(the sum of|amount received|amount paid|total|amount|p\s?\d)\b/i],
    category: shopCategory,
    note: (lines) => {
      for (const line of lines) {
        const m = line.match(/\b(?:in payment of|as payment for|for)\s*:?\s*(.+)$/i)
        if (m && /[a-z]{3}/i.test(m[1])) return clean(m[1]).slice(0, 40)
      }
      return null
    },
  },
  // anything else: a plain BIR sales invoice or official receipt
  {
    type: 'Store receipt',
    signs: [],
    totals: [/\b(total amount due|amount due|grand total|total due|amount payable|net amount due|total sales? amount|net total|total amount)\b/i, /\b(total|tota1|totai|ttl)\b/i],
    category: shopCategory,
  },
]

// ---------------- putting it together ----------------

function pickRule(text: string): Rule {
  let best = RULES[RULES.length - 1]
  let score = 0
  for (const rule of RULES) {
    const s = rule.signs.filter((re) => re.test(text)).length
    if (s > score) {
      best = rule
      score = s
    }
  }
  return best
}

function findTotal(lines: string[], rule: Rule): { total: number | null; sure: boolean } {
  for (const tier of rule.totals) {
    const found: number[] = []
    lines.forEach((line, i) => {
      if (!tier.test(line) || NOT_TOTAL.test(line.replace(tier, ' ')) || rule.notTotal?.test(line)) return
      // the amount is on the same line, or printed just under the label
      const here = moneyIn(line.replace(/\b\d+(\.\d+)?\s?%/g, ' '))
      const next = here.length ? here : moneyIn(lines[i + 1] ?? '')
      if (next.length) found.push(next[next.length - 1])
    })
    if (found.length) return { total: Math.max(...found), sure: true }
  }
  // no labelled line (a sari-sari slip, a torn receipt): the item prices, one per line, are what's left
  const items = lines
    .filter((l) => !NOT_PAID.test(l) && !rule.notTotal?.test(l))
    .map((l) => moneyIn(l).pop())
    .filter((n): n is number => n !== undefined)
  if (!items.length) return { total: null, sure: false }
  const biggest = Math.max(...items)
  const rest = items.reduce((a, b) => a + b, 0) - biggest
  // an unlabelled total is the one amount that equals the others added up; otherwise add the items
  const total = Math.abs(biggest - rest) < 0.01 || items.length === 1 ? biggest : Math.round((rest + biggest) * 100) / 100
  // more than the cash handed over can't be right
  const cash = Math.max(0, ...lines.filter((l) => /\b(cash|tender(ed)?|bayad)\b/i.test(l)).flatMap(moneyIn))
  return { total: cash && total > cash ? biggest : total, sure: false }
}

function findDate(lines: string[], rule: Rule): string | null {
  const skip = (l: string) => NOT_DATE.test(l) || rule.notDate?.test(l)
  // a labelled date first ("Date: 11/19/2026", "Bill date"), then any date not on a due-date line
  for (const line of lines) if (/\b(date|petsa|issued on|transaction)\b/i.test(line) && !/\b(due|issued:?\s*\d|permit|ptu|accredit)/i.test(line) && !rule.notDate?.test(line.replace(/\b(bill|statement|transaction) date\b/i, ''))) {
    const d = dateIn(line)
    if (d) return d
  }
  for (const line of lines) if (!skip(line)) {
    const d = dateIn(line)
    if (d) return d
  }
  return null
}

// lines near the top that are the shop's name, not its paperwork
const NOT_STORE = /\b(receipt|invoice|official|tin|vat|reg|non-?vat|address|tel|phone|mobile|www|\.com|branch|cashier|terminal|pos|date|time|sn|min|ptu|accred|permit|owned|operated|welcome|thank)\b|^\W*$|\d{4,}/i

function findStore(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const letters = (line.match(/[a-z]/gi) ?? []).length
    if (letters < 3 || letters / line.length < 0.6 || NOT_STORE.test(line)) continue
    return clean(line).slice(0, 40)
  }
  return null
}

// how it was paid → which of their accounts
const PAID_WITH: [RegExp, (a: Data['accounts'][number]) => boolean][] = [
  [/\bg-?cash\b/i, (a) => /g-?cash/i.test(a.name) || a.kind === 'ewallet'],
  [/\b(pay)?maya\b/i, (a) => /maya/i.test(a.name) || a.kind === 'ewallet'],
  [/\b(visa|master ?card|mastercard|credit card|amex|jcb|atome|spaylater|billease)\b/i, (a) => a.kind === 'card'],
  [/\b(debit|bdo|bpi|metrobank|landbank|unionbank|security ?bank|rcbc|pnb|chinabank|eastwest|gotyme|seabank)\b/i, (a) => a.kind === 'bank'],
]

function findAccount(text: string, rule: Rule, data: Data): string | null {
  const open = data.accounts.filter((a) => !a.archived)
  const told = rule.account?.(text)
  const byRule = told && open.find((a) => told.test(a.name))
  if (byRule) return byRule.id
  // an account named on the slip ("BDO", "GCash") wins
  const named = open.find((a) => a.name.length >= 3 && new RegExp(`\\b${escape(a.name)}\\b`, 'i').test(text))
  if (named) return named.id
  for (const [re, fits] of PAID_WITH) {
    const hit = re.test(text) && open.find(fits)
    if (hit) return hit.id
  }
  return (open.find((a) => a.kind === 'cash') ?? open[0])?.id ?? null
}

function findCategory(text: string, rule: Rule, data: Data): { kind: 'expense' | 'giving'; category_id: string | null } {
  const kind = rule.kind ?? 'expense'
  const cats = data.categories.filter((c) => !c.archived && c.kind === kind)
  const named = (name: string) => cats.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id
  const want = typeof rule.category === 'function' ? rule.category(text) : rule.category
  // their own category named on the slip beats a guess from the shop
  const own = kind === 'expense' && want === 'Other' ? cats.find((c) => c.name.length >= 4 && c.name !== 'Other' && new RegExp(`\\b${escape(c.name)}\\b`, 'i').test(text)) : null
  return { kind, category_id: own?.id ?? named(want) ?? named('Other') ?? cats[0]?.id ?? null }
}

export function parseReceipt(text: string, data: Data): ReadReceipt {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rule = pickRule(text)
  const { total, sure } = findTotal(lines, rule)
  const shop = findStore(lines)
  const note = rule.note?.(lines, text) ?? (shop ? (rule.noun ? `${shop} ${rule.noun}` : shop) : null)
  return { type: rule.type, total, sure, note, date: findDate(lines, rule), account_id: findAccount(text, rule, data), ...findCategory(text, rule, data), text }
}
