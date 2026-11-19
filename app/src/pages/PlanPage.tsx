import { useState } from 'react'
import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useSwipe } from '../lib/swipe'
import { BudgetsTab } from './plan/BudgetsTab'
import { BillsTab } from './plan/BillsTab'
import { GoalsTab } from './plan/GoalsTab'

const TABS = [
  { key: 'budgets', label: 'Budgets' },
  { key: 'bills', label: 'Bills' },
  { key: 'goals', label: 'Goals' },
] as const

/** Plan: what you mean to spend (budgets), what comes back each month (bills), what you're saving for (goals). */
export function PlanPage() {
  const { tab } = useParams()
  const nav = useNavigate()
  const ix = TABS.findIndex((t) => t.key === tab)
  // which way the last change went, so the new tab slides in from that side
  const [seen, setSeen] = useState(ix)
  const [dir, setDir] = useState<1 | -1>(1)
  if (ix !== seen) {
    setDir(ix < seen ? -1 : 1)
    setSeen(ix)
  }
  const to = (i: number) => nav(`/plan/${TABS[i].key}`, { replace: true })
  const swipe = useSwipe(ix < TABS.length - 1 ? () => to(ix + 1) : undefined, ix > 0 ? () => to(ix - 1) : undefined)
  if (ix < 0) return <Navigate to="/plan/budgets" replace />
  return (
    <div className="page plan-page" {...swipe}>
      <header className="page-head">
        <div className="topbar">
          <h1>Plan</h1>
        </div>
        <nav className="seg" aria-label="Plan sections">
          {TABS.map((t) => (
            <NavLink key={t.key} to={`/plan/${t.key}`} replace className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className={`tab-pane${dir < 0 ? ' back' : ''}`} key={tab}>
        {tab === 'budgets' && <BudgetsTab />}
        {tab === 'bills' && <BillsTab />}
        {tab === 'goals' && <GoalsTab />}
      </div>
    </div>
  )
}
