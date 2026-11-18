// Verses (KJV, public domain; checked word for word against the KJV text, with "LORD" as printed where the
// Hebrew has God's name) and the little things the mascot says.
import type { MascotAction } from '../components/Mascot'

export const VERSES: { text: string; ref: string }[] = [
  { text: 'Give us this day our daily bread.', ref: 'Matthew 6:11' },
  { text: 'He that gathered much had nothing over, and he that gathered little had no lack.', ref: 'Exodus 16:18' },
  { text: 'Moreover it is required in stewards, that a man be found faithful.', ref: '1 Corinthians 4:2' },
  { text: 'Every good gift and every perfect gift is from above.', ref: 'James 1:17' },
  { text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.', ref: 'Philippians 4:19' },
  { text: 'For where your treasure is, there will your heart be also.', ref: 'Matthew 6:21' },
  { text: 'God loveth a cheerful giver.', ref: '2 Corinthians 9:7' },
  { text: 'Owe no man any thing, but to love one another.', ref: 'Romans 13:8' },
  { text: 'There is treasure to be desired and oil in the dwelling of the wise.', ref: 'Proverbs 21:20' },
  { text: 'He that is faithful in that which is least is faithful also in much.', ref: 'Luke 16:10' },
  { text: 'Honour the LORD with thy substance, and with the firstfruits of all thine increase.', ref: 'Proverbs 3:9' },
  { text: 'Be thou diligent to know the state of thy flocks, and look well to thy herds.', ref: 'Proverbs 27:23' },
  { text: 'Which of you, intending to build a tower, sitteth not down first, and counteth the cost?', ref: 'Luke 14:28' },
  { text: 'The blessing of the LORD, it maketh rich, and he addeth no sorrow with it.', ref: 'Proverbs 10:22' },
  { text: 'They are new every morning: great is thy faithfulness.', ref: 'Lamentations 3:23' },
  // (Matthew 6:34 "take no thought for the morrow" was here; in a budgeting app it reads like "don't plan",
  // when Jesus means "don't be anxious". Verse 33, the heart of the passage, says it without the confusion.)
  { text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', ref: 'Matthew 6:33' },
]

/** One verse per calendar day, the same all day. */
export function verseOfTheDay(day: string) {
  let h = 0
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return VERSES[h % VERSES.length]
}

export type Mood = { action: MascotAction; line: string }

export type MoodInput = {
  hour: number
  name: string | null
  overBudget: boolean
  hasBudget: boolean
  billSoon: { title: string; days: number } | null
  titheDone: boolean
  titheDue: number
  incomeToday: boolean
  firstRun: boolean
  /** a note KATY was asked to bring up today */
  noteToday?: { person: string | null; body: string } | null
  /** month's end, and the balances haven't been checked yet */
  checkDue?: boolean
}

/** What the mascot does and says on Today. The first matching situation wins. */
export function mood(m: MoodInput): Mood {
  const hi = m.name ? `, ${m.name}` : ''
  if (m.firstRun) return { action: 'wave', line: `Welcome${hi}! Log what you spend and I'll keep count with you.` }
  if (m.hour >= 22 || m.hour < 5) return { action: 'sleep', line: 'Rest well. Tomorrow there will be manna again.' }
  if (m.billSoon && m.billSoon.days <= 0) return { action: 'alert', line: `${m.billSoon.title} is due ${m.billSoon.days < 0 ? 'and late' : 'today'}.` }
  if (m.noteToday) return { action: 'think', line: m.noteToday.person ? `Remember ${m.noteToday.person}? I kept a note for today.` : 'I kept a note for you today.' }
  if (m.checkDue) return { action: 'nod', line: 'Month’s end! Let’s count what you have and close the month.' }
  if (m.overBudget) return { action: 'worry', line: 'We went over this month. Let’s go gently until it turns.' }
  if (m.incomeToday) return { action: 'cheer', line: 'Provision came in today. Praise God!' }
  if (m.billSoon && m.billSoon.days <= 3) return { action: 'alert', line: `${m.billSoon.title} is due in ${m.billSoon.days === 1 ? 'a day' : `${m.billSoon.days} days`}.` }
  if (m.titheDone) return { action: 'give', line: 'Firstfruits set apart this month. Cheerful giving!' }
  if (m.titheDue > 0) return { action: 'think', line: 'Your tithe for this month is still to give.' }
  if (!m.hasBudget) return { action: 'think', line: 'Set a budget in Plan, and I’ll show you a daily portion.' }
  if (m.hour < 11) return { action: 'wave', line: `Good morning${hi}! Fresh manna on the ground today.` }
  return { action: 'idle', line: 'Gather what you need today. There’s enough.' }
}
