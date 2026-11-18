import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False when the env vars are missing; the app then only runs in mock mode (?mock). */
export const configured = Boolean(url && key)

// The OneDyze project is shared by several apps; Manna's tables live in their own `manna` schema.
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing-key', {
  db: { schema: 'manna' },
})

/** Which OAuth providers are switched on in Supabase (so buttons only appear when they'll work). */
export async function enabledProviders(): Promise<Record<string, boolean>> {
  if (!configured) return {}
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } })
    if (!res.ok) return {}
    const settings = (await res.json()) as { external?: Record<string, boolean> }
    return settings.external ?? {}
  } catch {
    return {}
  }
}
