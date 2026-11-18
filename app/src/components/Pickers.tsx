import type { Account, Category } from '../lib/types'
import { Glyph } from './Glyph'
import { AccountMark } from './Bits'
import { peso } from '../lib/money'

export function CategoryGrid({ categories, value, onChange }: { categories: Category[]; value: string | null; onChange: (id: string) => void }) {
  return (
    <div className="cat-grid" role="group" aria-label="Category">
      {categories.map((c) => (
        <button type="button" key={c.id} className="cat-btn" aria-pressed={value === c.id} onClick={() => onChange(c.id)}>
          <Glyph name={c.icon} size={22} />
          <span>{c.name}</span>
        </button>
      ))}
    </div>
  )
}

export function AccountChips({ accounts, value, onChange, balances, label }: { accounts: Account[]; value: string | null; onChange: (id: string) => void; balances?: Map<string, number>; label: string }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {accounts.map((a) => (
        <button type="button" key={a.id} className="chip" aria-pressed={value === a.id} onClick={() => onChange(a.id)}>
          <AccountMark name={a.name} kind={a.kind} size={18} />
          {a.name}
          {balances && <span className="num" style={{ opacity: 0.7 }}>{peso(balances.get(a.id) ?? 0)}</span>}
        </button>
      ))}
    </div>
  )
}

/** A money field: shows ₱, takes decimals, opens the number keypad on phones. */
export function MoneyField({ id, label, value, onChange, required, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; required?: boolean; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span className="muted" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>₱</span>
        <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} required={required} style={{ paddingLeft: 30 }} placeholder="0" />
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}
