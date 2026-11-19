import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { StoreProvider, useStore } from './lib/store'
import { mock } from './lib/mock'
import { Layout } from './components/Layout'
import { Mascot } from './components/Mascot'
import { LogoAnimated } from './components/LogoAnimated'
import { ToastProvider } from './components/Toast'
import { Updates } from './components/WhatsNew'
import { AuthPage } from './pages/AuthPage'
import { TodayPage } from './pages/TodayPage'
import { AddPage } from './pages/AddPage'
import { ActivityPage } from './pages/ActivityPage'
import { PlanPage } from './pages/PlanPage'
import { OwedPage } from './pages/OwedPage'
import { DebtPage } from './pages/DebtPage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { NotesPage } from './pages/NotesPage'
import { CheckPage } from './pages/CheckPage'

function Gate() {
  const { session, loading } = useAuth()
  if (mock)
    return (
      <>
        <p className="mock-badge" title="Made-up data. Nothing you do here is saved.">
          sample data · <a href="/?mock=off">exit</a>
        </p>
        <StoreProvider key="mock">
          <Ready />
        </StoreProvider>
      </>
    )
  if (loading) return <Splash />
  if (!session) return <AuthPage />
  return (
    // keyed by user so switching accounts never shows the previous user's data
    <StoreProvider key={session.user.id}>
      <Ready />
    </StoreProvider>
  )
}

/** While data is still loading after the intro, the logo simply rests. */
function Splash() {
  return (
    <div className="splash" aria-busy="true">
      <LogoAnimated width={170} still />
    </div>
  )
}

/**
 * The logo's entrance, once each time the app opens. It sits over everything for as long as the animation
 * runs (whether or not the data is ready) and then fades away.
 */
const INTRO_MS = 2200
function Intro() {
  const [stage, setStage] = useState<'on' | 'leaving' | 'gone'>(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'gone' : 'on',
  )
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const a = window.setTimeout(() => setStage('leaving'), INTRO_MS)
    const b = window.setTimeout(() => setStage('gone'), INTRO_MS + 400)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [])
  if (stage === 'gone') return null
  return (
    <div className={`splash splash-intro${stage === 'leaving' ? ' is-leaving' : ''}`} aria-hidden="true">
      <LogoAnimated width={170} />
    </div>
  )
}

function Ready() {
  const { loading, error, data } = useStore()
  if (loading) return <Splash />
  if (error)
    return (
      <div className="page" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 80 }}>
        <Mascot action="worry" size={110} />
        <p style={{ fontWeight: 600 }}>Couldn’t load your data</p>
        <p className="small muted">{error}</p>
        <button className="btn soft" onClick={() => location.reload()}>Try again</button>
      </div>
    )
  // first run: set up before anything else (the defaults are already there, so Skip is safe)
  if (!data.settings.onboarded_at) return <OnboardingPage />
  return (
    <>
    <Routes>
      <Route path="/welcome" element={<OnboardingPage again />} />
      <Route path="/add" element={<AddPage />} />
      <Route path="/add/:id" element={<AddPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/notes" element={<NotesPage />} />
      <Route path="/check" element={<CheckPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/plan" element={<Navigate to="/plan/budgets" replace />} />
        <Route path="/plan/:tab" element={<PlanPage />} />
        <Route path="/owed" element={<OwedPage />} />
        <Route path="/owed/:id" element={<DebtPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Updates />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastProvider>
          <Gate />
          <Intro />
        </ToastProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}
