import { useEffect, useState, type FormEvent } from 'react'
import { configured, enabledProviders, supabase } from '../lib/supabase'
import { Scene } from '../components/Scene'
import { Mascot } from '../components/Mascot'
import { Brand } from '../components/Logo'

/** Sign in or sign up. Logins are shared with Might and the owner's other apps. */
export function AuthPage() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [google, setGoogle] = useState(false)
  const hour = new Date().getHours()

  useEffect(() => {
    enabledProviders().then((p) => setGoogle(Boolean(p.google)))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNote(null)
    setBusy(true)
    const res =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() }, emailRedirectTo: location.origin } })
    setBusy(false)
    if (res.error) return setError(res.error.message)
    if (mode === 'up' && !res.data.session) setNote('Check your email to confirm, then sign in.')
  }

  return (
    <div className="auth">
      <Scene hour={hour >= 21 || hour < 5 ? hour : 6.4} manna={0.85} dry={false} jar={null} quail={false}>
        <div className="scene-top">
          <div className="scene-greet"><Brand size={26} /></div>
        </div>
        <Mascot action={hour >= 22 || hour < 5 ? 'sleep' : 'wave'} size={124} />
        <p className="bubble">Every morning, enough for the day.</p>
      </Scene>
      <div className="auth-body">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600 }}>{mode === 'in' ? 'Welcome back' : 'Start keeping track'}</h1>
          <p className="muted">A faithful steward’s money journal: spending, budgets, bills, giving and loans.</p>
        </div>
        {!configured ? (
          <p className="card quiet small">
            This copy isn’t connected to a database yet (see the README). You can still look around with sample data.
          </p>
        ) : (
          <>
            {google && (
              <>
                <button className="btn soft block" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })}>
                  Continue with Google
                </button>
                <p className="or">or</p>
              </>
            )}
            <form onSubmit={submit}>
              {mode === 'up' && (
                <div className="field">
                  <label htmlFor="name">Your name</label>
                  <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              {note && <p className="small good" role="status">{note}</p>}
              <button className="btn block" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
            </form>
            <button className="link" style={{ alignSelf: 'center' }} onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
              {mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}
            </button>
            <p className="small muted" style={{ textAlign: 'center' }}>Already use Might? Sign in with the same account.</p>
          </>
        )}
        <a className="btn soft block" href="/?mock">Try it with sample data</a>
      </div>
    </div>
  )
}
