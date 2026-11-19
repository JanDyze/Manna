import { brandFor } from '../lib/banks'
import type { Account, Category, Tx } from '../lib/types'
import { peso } from '../lib/money'
import { Glyph } from './Glyph'

export const ACCOUNT_ICON: Record<Account['kind'], string> = { cash: 'wallet', bank: 'bank', ewallet: 'phone', card: 'card', savings: 'piggy' }
export const ACCOUNT_KIND_LABEL: Record<Account['kind'], string> = { cash: 'Cash', bank: 'Bank', ewallet: 'E-wallet', card: 'Card / pay later', savings: 'Savings' }

export function Bar({ pct, tone, thick, label }: { pct: number; tone?: 'gold' | 'good' | 'bad'; thick?: boolean; label?: string }) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <div className={`bar${thick ? ' thick' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className={tone} style={{ width: `${w}%` }} />
    </div>
  )
}

/** The tone a budget bar takes: fine, nearly there, or over. */
export const budgetTone = (pct: number) => (pct > 100 ? 'bad' : pct >= 85 ? 'gold' : undefined)

export function TxAmount({ tx }: { tx: Tx }) {
  const cls = { income: 'in', debt_in: 'in', giving: 'give', transfer: 'move', expense: '', debt_out: '' }[tx.kind]
  const sign = { income: '+', debt_in: '+', giving: '−', expense: '−', debt_out: '−', transfer: '' }[tx.kind]
  return <span className={`amount ${cls}`}>{sign}{peso(tx.amount)}</span>
}

export function txIcon(tx: Tx, cat?: Category): string {
  if (tx.kind === 'transfer') return 'swap'
  if (tx.kind === 'debt_in') return 'down'
  if (tx.kind === 'debt_out') return 'up'
  return cat?.icon ?? 'dot'
}

export function txTile(tx: Tx): string {
  if (tx.kind === 'income' || tx.kind === 'debt_in') return 'tile good'
  if (tx.kind === 'giving') return 'tile gold'
  return 'tile'
}

export function Tile({ icon, tone, size = 20 }: { icon: string; tone?: string; size?: number }) {
  return (
    <span className={`tile${tone ? ` ${tone}` : ''}`}>
      <Glyph name={icon} size={size} />
    </span>
  )
}

/** An account's picture: its bank's or e-wallet's logo when it's named after one, otherwise the kind's icon. */
export function AccountMark({ name, kind, size = 20, tile = false }: { name: string; kind: Account['kind']; size?: number; tile?: boolean }) {
  const brand = brandFor(name)
  if (brand) return <img className={tile ? 'tile brand-tile' : 'brand-mark'} src={brand.logo} alt="" width={tile ? undefined : size} height={tile ? undefined : size} />
  return tile ? <Tile icon={ACCOUNT_ICON[kind]} size={size} /> : <Glyph name={ACCOUNT_ICON[kind]} size={size} />
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
