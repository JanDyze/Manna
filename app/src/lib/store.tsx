import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Settings, TableName, Tables } from './types'
import { mock, mockData } from './mock'

export type Data = { settings: Settings } & { [T in TableName]: Tables[T][] }

const EMPTY: Data = {
  settings: { user_id: '', currency: 'PHP', tithe_percent: 10, onboarded_at: null },
  accounts: [],
  categories: [],
  budgets: [],
  people: [],
  debts: [],
  goals: [],
  goal_entries: [],
  recurring: [],
  transactions: [],
  notes: [],
  balance_checks: [],
}

// Postgres numeric arrives as a string from some clients; keep money as numbers everywhere.
const MONEY = ['opening_balance', 'amount', 'principal', 'target', 'tithe_percent', 'recorded', 'actual', 'credit_limit'] as const
function clean<T>(row: T): T {
  const r = { ...(row as Record<string, unknown>) }
  for (const k of MONEY) if (k in r && r[k] != null) r[k] = Number(r[k])
  return r as T
}

const ORDER: Partial<Record<TableName, [string, boolean]>> = {
  accounts: ['sort', true],
  categories: ['sort', true],
  transactions: ['occurred_on', false],
  recurring: ['next_due', true],
  goal_entries: ['occurred_on', false],
  notes: ['created_at', false],
  balance_checks: ['checked_on', false],
}

type Store = {
  data: Data
  loading: boolean
  error: string | null
  insert: <T extends TableName>(table: T, row: Partial<Tables[T]>) => Promise<Tables[T]>
  update: <T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>) => Promise<Tables[T]>
  remove: (table: TableName, id: string) => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
}

const StoreContext = createContext<Store | null>(null)

/**
 * Personal-scale data: load everything once and keep it in memory (like Might).
 * In mock mode (?mock) the data is made up and every change stays in memory.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => (mock ? mockData() : EMPTY))
  const [loading, setLoading] = useState(!mock)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (mock) return
    let alive = true
    ;(async () => {
      // first sign-in: a settings row, a Wallet, GCash and Bank, and starter categories
      const seed = await supabase.rpc('ensure_defaults')
      if (seed.error) throw new Error(seed.error.message)
      const tables = Object.keys(EMPTY).filter((k) => k !== 'settings') as TableName[]
      const results = await Promise.all([
        supabase.from('settings').select('user_id, currency, tithe_percent, onboarded_at').single(),
        ...tables.map((t) => {
          const q = supabase.from(t).select('*').limit(10000)
          const o = ORDER[t]
          return o ? q.order(o[0], { ascending: o[1] }) : q
        }),
      ])
      const failed = results.find((r) => r.error)
      if (failed?.error) throw new Error(failed.error.message)
      if (!alive) return
      const next = { ...EMPTY, settings: clean(results[0].data as Settings) } as Data
      tables.forEach((t, i) => {
        ;(next[t] as unknown[]) = ((results[i + 1].data ?? []) as unknown[]).map(clean)
      })
      setData(next)
    })()
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const put = useCallback(<T extends TableName>(table: T, row: Tables[T]) => {
    setData((d) => ({ ...d, [table]: [...(d[table] as Tables[T][]).filter((r) => r.id !== row.id), row] }))
  }, [])

  const insert = useCallback(
    async <T extends TableName>(table: T, row: Partial<Tables[T]>) => {
      if (mock) {
        const saved = { ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() } as unknown as Tables[T]
        put(table, saved)
        return saved
      }
      const { data: saved, error } = await supabase.from(table).insert(row as never).select('*').single()
      if (error) throw new Error(error.message)
      const r = clean(saved) as Tables[T]
      put(table, r)
      return r
    },
    [put],
  )

  const update = useCallback(
    async <T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>) => {
      if (mock) {
        const old = (dataRef.current[table] as Tables[T][]).find((r) => r.id === id)
        const saved = { ...old, ...patch, id } as Tables[T]
        put(table, saved)
        return saved
      }
      const { data: saved, error } = await supabase.from(table).update(patch as never).eq('id', id).select('*').single()
      if (error) throw new Error(error.message)
      const r = clean(saved) as Tables[T]
      put(table, r)
      return r
    },
    [put],
  )

  const remove = useCallback(async (table: TableName, id: string) => {
    if (!mock) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
    }
    setData((d) => ({ ...d, [table]: (d[table] as { id: string }[]).filter((r) => r.id !== id) }))
  }, [])

  const saveSettings = useCallback(async (patch: Partial<Settings>) => {
    if (!mock) {
      const { error } = await supabase.from('settings').update(patch).eq('user_id', dataRef.current.settings.user_id)
      if (error) throw new Error(error.message)
    }
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const value = useMemo(() => ({ data, loading, error, insert, update, remove, saveSettings }), [data, loading, error, insert, update, remove, saveSettings])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}

/** Lookup helpers that most screens need. */
export function useLookups() {
  const { data } = useStore()
  return useMemo(
    () => ({
      account: new Map(data.accounts.map((a) => [a.id, a])),
      category: new Map(data.categories.map((c) => [c.id, c])),
      person: new Map(data.people.map((p) => [p.id, p])),
      debt: new Map(data.debts.map((d) => [d.id, d])),
    }),
    [data.accounts, data.categories, data.people, data.debts],
  )
}
