import { NavLink, Navigate, useParams } from 'react-router-dom'
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
  if (!TABS.some((t) => t.key === tab)) return <Navigate to="/plan/budgets" replace />
  return (
    <div className="page">
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
      {tab === 'budgets' && <BudgetsTab />}
      {tab === 'bills' && <BillsTab />}
      {tab === 'goals' && <GoalsTab />}
    </div>
  )
}
