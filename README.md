# Manna — faithful money journal

A mobile-first web app (installable PWA) for tracking spending, budgets, bills, giving and loans, to be a faithful steward of God's provision. It's built the same way as Might, and it shares the same database and logins.

- `app/`: Vite + React + TypeScript frontend
- the database: Manna's migration lives with Might's in `../MigraineTracker/supabase/` (one shared OneDyze stack for every app)
- `assets/`: logo and mascot sources (`logo/README.md` has the logo's meaning and colours; `mascot/mascot-actions.html` previews the mascot's 10 actions)

## The theme: morning in the camp (Exodus 16)

The Today screen is a living scene of the Israelite camp in the wilderness:

- **Manna on the sand is this month's budget.** The ground starts covered, and flakes are gathered up as you spend. Over budget, the ground is bare and cracked and the sun burns hot.
- **The sky follows the clock, minute by minute:** night, dawn with the morning star (the logo's star), midday, sunset, dusk, then night again with the moon, stars and glowing tents. The sun and moon cross on arcs.
- **Manna falls with the dew in the night** (Numbers 11:9), and in the morning it lies glistening on the ground (Exodus 16:13–14). Clouds gather when spending runs ahead of an even pace through the month. In December a parol hangs on a tent.
- **The palms are Elim's** (Exodus 15:27). The layers drift apart a little as you scroll.
- **The golden pot of manna** (Hebrews 9:4) was laid up before the LORD so later generations would remember His provision (Exodus 16:32–34). Here it stands for your savings, provision laid up wisely (Proverbs 21:20). It fills as your goals grow, and tapping it opens Goals.
- **Quail come in at evening** (Exodus 16:13) when income arrived in the last few days. They take a few quick beats, then glide, and they cross only now and then.
- **The mascot is KATY: Keeper of All Thy Yield.** The name also nods to *katiwala*, Tagalog for steward, the one entrusted with someone else's goods. She has the warmth of a caring ate. KATY reacts:
  - it waves in the morning;
  - it looks alert when a bill is due within 3 days, or today, or is late;
  - it worries when you're over budget;
  - it cheers on payday;
  - it shows a heart once the tithe is given;
  - it sleeps after 10 pm.

Its line in the speech bubble says why.

## First run

A new user goes through a short setup: welcome, then:
1. where their money is (with starting balances);
2. which categories they spend on (all ticked by default);
3. a monthly plan (Food, Transport, Bills and Groceries come pre-filled);
4. their tithe (10% by default);
5. done.

KATY talks you through each step:: the words type out in a speech bubble with soft kalimba notes on a five-note scale (made in the browser, no audio files) while her mouth moves; the speaker button mutes it. Every step starts filled in, so tapping Continue is enough, and Skip keeps the defaults. Settings → "Walk through setup again" reopens it to edit.
The finished time is saved in `settings.onboarded_at`. Anyone who already has entries is treated as set up.

## Talking to KATY (Claude)

Tap KATY or "Tell KATY" on Today and say what happened in plain words (Taglish works):
"lunch 180 gcash, meralco 1,800 from bank, lent 500 to Ana". Claude turns it into entries. Each one shows as a card you
can change, and nothing is saved until you tap Save. There's a mic button where the browser supports speech.

The Anthropic key never goes in the app. It lives with the Edge Function `manna-mascot`
(`MigraineTracker/supabase/functions/manna-mascot/index.ts`), which uses `claude-haiku-5-5` by default (set `MANNA_MODEL` to change it).

- **Local:** copy `MigraineTracker/supabase/functions/.env.example` to `.env` (it's git-ignored) and put your key in it.
  Then from `MigraineTracker` run `npx supabase functions serve` while the stack is up.
- **Cloud:** `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then `npx supabase functions deploy manna-mascot`.

In demo mode (`?mock`), a small rule-based reader stands in for Claude, so you can try the chat without a key.

## Try it now (no database needed)

```sh
cd app
npm install
npm run dev -- --host
```

Open http://localhost:5181/?mock for sample data. Nothing is saved in this mode.

- `?mock=over` shows an over-budget month.
- `?mock=new` shows a first-time user, starting at setup.
- Add `&hour=6`, `&hour=18.6` or `&hour=23` to see the scene at any time; fractions work.
- `?mock=off` leaves demo mode.

## The database: one stack for every app

Manna shares the OneDyze Supabase project with Might (and Kept), so it also shares Might's local stack.
Its tables live in their own `manna` schema; logins are shared, so sign in with your Might account.

- Migrations in `MigraineTracker/supabase/migrations/`: `20261117000000_manna_schema.sql`, `20261118000000_manna_onboarding.sql`, `20261118000100_manna_no_bank_default.sql`, `20261118000200_manna_notes.sql`, `20261118000300_manna_balance_checks.sql`, `20261118000400_manna_receipts.sql`, `20261118000500_manna_connector_keys.sql`
- `MigraineTracker/supabase/config.toml` exposes `manna` and allows Manna's dev address (port 5181) for sign-in redirects
- `app/.env.local` points at the same local API and key as Might

### Local (Might's Docker stack)

```sh
cd MigraineTracker
npx supabase migration up      # adds the manna schema; Might's data stays
npx supabase stop
npx supabase start             # restart so the API serves the new schema
cd ../Manna/app
npm install
npm run dev -- --host          # http://localhost:5181
```

### Cloud (OneDyze)

From `MigraineTracker`, `npx supabase db push` now sends Manna's migration too (it only creates the
`manna` schema; nothing of Might's or Kept's changes). Then, in the dashboard:

1. Project Settings → Data API → Exposed schemas: add `manna` (keep the others).
2. Authentication → URL Configuration: add Manna's address under Redirect URLs (and as a Google origin if you use Google sign-in).
3. Put the cloud URL and anon key in Manna's deploy settings.

| Table | What it holds |
|---|---|
| `settings` | Currency and tithe percentage (one row per user) |
| `accounts` | Wallet, GCash, bank, card, savings; each with a starting balance |
| `categories` | Expense, income and giving categories |
| `budgets` | A monthly limit per expense category |
| `recurring` | Bills and regular income, with the next due date |
| `transactions` | Every movement of money: expense, income, giving, transfer, loan money out or in |
| `people` | The people in your loans |
| `debts` | Each loan: who, which way, how much, due when |
| `goals` | Savings goals |
| `goal_entries` | Money put into or taken out of a goal |
| `notes` | KATY's notes |
| `balance_checks` | Month-end checks |
| `connector_keys` | Links that let Claude reach your Manna (hashed, revocable) |

Every row belongs to one user and only they can read or change it (row-level security). A trigger also
stops a row from pointing at someone else's account or category. The first sign-in runs
`manna.ensure_defaults()`, which creates a Wallet and a GCash account and starter categories (setup then asks which bank you use).

## Manna in Claude (MCP)

Manna is also an MCP server, so Claude itself (claude.ai, the desktop and mobile apps) can read and record your Manna:
"how much is left for food this month?", "who still owes me?", "paid Meralco 1,850 from BDO", "Ana paid back 500".
It's the Edge Function `manna-mcp` (`MigraineTracker/supabase/functions/manna-mcp/`), stateless Streamable HTTP, with no extra packages.

**Connecting:** Settings → Claude → "Make a link for Claude" gives a private link,
`https://<project>.supabase.co/functions/v1/manna-mcp/mk_…`. In Claude, Settings → Connectors → Add custom connector,
name it Manna and paste the link. The `mk_` key in the link says whose Manna it is: only its SHA-256 hash is stored
(`manna.connector_keys`), it's shown once, and it can be revoked from the same screen (it stops working within a minute).
Up to 5 links at once. The key also works as `Authorization: Bearer mk_…` for clients that send headers.

**Tools.** Reading: `overview` (start here: balances, this month, tithe, bills due, loans, goals, notes due), `get_setup`
(account and category names), `list_entries` (filters, totals, `truncated`), `spending_report` (a month by category vs budget
and last month), `list_bills`, `list_loans`, `list_goals`, `list_notes`. Recording: `add_entry`, `update_entry`, `pay_bill`,
`record_loan`, `record_loan_payment`, `add_to_goal`, `add_note`, `update_note`. Nothing deletes; a wrong entry is corrected
with `update_entry` or removed in the app. The server's instructions tell Claude to confirm implied entries and report back
exactly what it saved.

**How it stays one person's:** the function runs with the service role, and every read and write is pinned to the key's
owner by `user_id`; the same-owner triggers still refuse a row pointing at someone else's account or category.
The money maths (`money.ts`) is a port of `app/src/lib/money.ts` and `dates.ts`, so Claude sees the same figures as the
app; change both together. "Today" is Philippine time (`MANNA_TZ`, default `Asia/Manila`).

**Deploying (cloud):**

```sh
cd MigraineTracker
npx supabase db push                                       # adds connector_keys
npx supabase functions deploy manna-mcp --no-verify-jwt    # Claude sends no Supabase login; the key is the login
```

`config.toml` already sets `verify_jwt = false` for `manna-mcp`. No secret to set: Supabase gives the function its URL and service key.

**Trying it locally:** `npx supabase migration up`, then `npx supabase functions serve`, make a link in the local app
(it'll point at `http://127.0.0.1:54321/…`). Claude on the web can't reach your machine, so test with the MCP Inspector
(`npx @modelcontextprotocol/inspector`, transport "Streamable HTTP", paste the link) or Claude Desktop through
`npx mcp-remote <link>`.

## Deploy

The same as Might: Cloudflare Workers static assets.

1. `cd app && npm run build && npx wrangler deploy`
2. Or connect the repo in Cloudflare with these settings:
   - root `app`
   - build command `npm run build`
   - output directory `dist`
   - environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `NODE_VERSION=22`

The PWA works offline for opening the app, but saving needs a connection.

## What's where

| Screen | File |
|---|---|
| Today (the camp scene, balances, spending, tithe, bills, owed) | `app/src/pages/TodayPage.tsx`, `app/src/components/Scene.tsx` |
| Add or edit an entry | `app/src/pages/AddPage.tsx` |
| Activity, by day, with filters and search | `app/src/pages/ActivityPage.tsx` |
| Plan: budgets, bills, goals | `app/src/pages/PlanPage.tsx`, `app/src/pages/plan/` |
| Owed and loan detail | `app/src/pages/OwedPage.tsx`, `app/src/pages/DebtPage.tsx` |
| Settings: accounts, tithe, categories, theme | `app/src/pages/SettingsPage.tsx` |
| First-run setup | `app/src/pages/OnboardingPage.tsx` |
| Talking to the mascot | `app/src/components/MascotChat.tsx`, `app/src/lib/assistant.ts`, `../MigraineTracker/supabase/functions/manna-mascot/` |
| Manna in Claude (MCP server, connector links) | `../MigraineTracker/supabase/functions/manna-mcp/`, `app/src/components/ConnectClaude.tsx` |
| What the mascot does and says; verses | `app/src/lib/words.ts` |
| Money maths | `app/src/lib/money.ts` |
| Data loading and saving (and demo data) | `app/src/lib/store.tsx`, `app/src/lib/mock.ts` |

## Bank and e-wallet logos

Accounts named after a bank or e-wallet (BDO, BPI, Metrobank, Landbank, UnionBank, Security Bank, PNB, RCBC, China Bank, GCash, Maya, GoTyme, SeaBank, CIMB, MariBank, Wise) show that brand's logo, and setup offers them as chips. The tiles live in `app/src/assets/banks/` (list in `app/src/lib/banks.ts`); `assets/banks/` keeps the originals, their sources and the script that makes the tiles. The logos are their owners' trademarks, used only to label your own accounts.

## Receipt photos

Snap a receipt and KATY fills in the entry.

- **Quick capture:** the camera button beside "Tell KATY" on Today, the camera in KATY's chat, or "Scan a receipt" on the Add page. The phone offers both the camera and the gallery.
- **What happens:** the photo is shrunk on the phone (about 1280px JPEG), and KATY (Claude, through `manna-mascot`) reads the total actually paid, the store, the date and the payment method. She proposes one entry; nothing is saved until you check it. On the Add page she fills the form in instead.
- **Where it's kept:** the private Storage bucket `manna-receipts`, in your own folder (`<user id>/…`). Storage policies only let you read or change your own folder (migration `20261118000400_manna_receipts.sql`). The path is on `transactions.receipt_path`; notes can carry a photo too (`notes.image_path`).
- **Seeing it later:** entries with a receipt show a small receipt mark in Activity. Open the entry to see, replace or remove the photo. Deleting the entry deletes the photo.
- **Demo mode:** KATY can't read pictures there, so she keeps the photo and asks you to type the total.
- **Needs** `ANTHROPIC_API_KEY` set for the function, the same as chatting with KATY.

## KATY's notes

Tell KATY "take note…" (or tap + on the notes page) to keep something in mind without moving money: "Jonathan asked if I could help with his father's medicine; not yet." Notes can name a person, an amount and a day to bring it up. They show on Today under "KATY remembers", KATY's bubble mentions them on their day, and Claude reads the open ones so you can ask "what did Jonathan ask?". Table: `notes` (`20261118000200_manna_notes.sql`).

## Month-end check

In the last days of a month (and the first days of the next) Today shows "Close November". The check (also in Settings) asks what each account really holds, shows the difference from the record per account, and lets you record it as spending you forgot to log, money in you forgot to log, or leave it with a note. Below it is the month's plan against actual, category by category. Past checks are kept. Table: `balance_checks` (`20261118000300_manna_balance_checks.sql`).

## Scripture

Every verse in the app is the King James Version (public domain), checked word for word against the KJV text, with "LORD" in capitals where the printed KJV has it. Each one is used in keeping with its context; `app/src/lib/words.ts` lists them.
