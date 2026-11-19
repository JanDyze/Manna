// Banks and e-wallets people in the Philippines use, with their logos as small square tiles.
// The tiles are made from each brand's own logo (assets/banks/, sources in assets/banks/SOURCES.md);
// the logos are their owners' trademarks and are shown only to label the person's own accounts.
import type { AccountKind } from './types'
import bdo from '../assets/banks/bdo.svg'
import bpi from '../assets/banks/bpi.svg'
import metrobank from '../assets/banks/metrobank.svg'
import landbank from '../assets/banks/landbank.svg'
import unionbank from '../assets/banks/unionbank.svg'
import securitybank from '../assets/banks/securitybank.svg'
import pnb from '../assets/banks/pnb.svg'
import rcbc from '../assets/banks/rcbc.svg'
import chinabank from '../assets/banks/chinabank.svg'
import gcash from '../assets/banks/gcash.svg'
import maya from '../assets/banks/maya.svg'
import gotyme from '../assets/banks/gotyme.svg'
import seabank from '../assets/banks/seabank.svg'
import cimb from '../assets/banks/cimb.svg'
import maribank from '../assets/banks/maribank.svg'
import wise from '../assets/banks/wise.svg'
import atome from '../assets/banks/atome.svg'
import spaylater from '../assets/banks/spaylater.svg'

export type Brand = { key: string; name: string; kind: AccountKind; logo: string; match: RegExp }

export const BRANDS: Brand[] = [
  { key: 'bdo', name: 'BDO', kind: 'bank', logo: bdo, match: /\bbdo\b|banco de oro/i },
  { key: 'bpi', name: 'BPI', kind: 'bank', logo: bpi, match: /\bbpi\b|bank of the philippine islands/i },
  { key: 'metrobank', name: 'Metrobank', kind: 'bank', logo: metrobank, match: /metro ?bank/i },
  { key: 'landbank', name: 'Landbank', kind: 'bank', logo: landbank, match: /land ?bank/i },
  { key: 'unionbank', name: 'UnionBank', kind: 'bank', logo: unionbank, match: /union ?bank/i },
  { key: 'securitybank', name: 'Security Bank', kind: 'bank', logo: securitybank, match: /security ?bank/i },
  { key: 'pnb', name: 'PNB', kind: 'bank', logo: pnb, match: /\bpnb\b|philippine national bank/i },
  { key: 'rcbc', name: 'RCBC', kind: 'bank', logo: rcbc, match: /\brcbc\b/i },
  { key: 'chinabank', name: 'China Bank', kind: 'bank', logo: chinabank, match: /china ?bank/i },
  { key: 'gcash', name: 'GCash', kind: 'ewallet', logo: gcash, match: /g ?cash/i },
  { key: 'maya', name: 'Maya', kind: 'ewallet', logo: maya, match: /\bmaya\b|paymaya/i },
  { key: 'gotyme', name: 'GoTyme', kind: 'bank', logo: gotyme, match: /go ?tyme/i },
  { key: 'seabank', name: 'SeaBank', kind: 'bank', logo: seabank, match: /sea ?bank/i },
  { key: 'cimb', name: 'CIMB', kind: 'bank', logo: cimb, match: /\bcimb\b/i },
  { key: 'maribank', name: 'MariBank', kind: 'bank', logo: maribank, match: /mari ?bank/i },
  { key: 'wise', name: 'Wise', kind: 'ewallet', logo: wise, match: /\bwise\b/i },
  { key: 'atome', name: 'Atome', kind: 'card', logo: atome, match: /\batome\b/i },
  { key: 'spaylater', name: 'SPayLater', kind: 'card', logo: spaylater, match: /s ?pay ?later|shopee ?pay ?later/i },
]

/** The brand an account is named after, if any ("BDO Savings" → BDO). */
export function brandFor(name: string): Brand | undefined {
  return BRANDS.find((b) => b.match.test(name))
}
