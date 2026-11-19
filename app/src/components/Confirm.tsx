import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Mascot, type MascotAction } from './Mascot'

export type ConfirmOptions = {
  title: string
  /** a line under the title: what happens, what stays */
  body?: ReactNode
  /** the button that goes ahead: "Delete", "Revoke", "Forgive" */
  yes?: string
  no?: string
  /** red for something that can't be taken back; gold for a kind act */
  tone?: 'danger' | 'gold'
  mascot?: MascotAction
}
type Ask = ConfirmOptions & { resolve: (ok: boolean) => void }

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false)

/**
 * Manna's own "are you sure?", in place of the browser's confirm() box.
 * `if (!(await ask({ title: 'Delete this entry?' }))) return`
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null)
  const pending = useRef<Ask | null>(null)
  const open = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        pending.current?.resolve(false) // a second question replaces the first, which counts as "no"
        pending.current = { ...o, resolve }
        setAsk(pending.current)
      }),
    [],
  )
  const answer = useCallback((ok: boolean) => {
    pending.current?.resolve(ok)
    pending.current = null
    setAsk(null)
  }, [])
  return (
    <ConfirmContext.Provider value={open}>
      {children}
      {ask && <ConfirmDialog ask={ask} answer={answer} />}
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({ ask, answer }: { ask: Ask; answer: (ok: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    // Cancel takes focus, so a stray Enter never deletes anything
    ref.current?.querySelector<HTMLElement>('[data-no]')?.focus({ preventScroll: true })
    // captured on window first, so Escape answers this question without also closing the drawer underneath
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        e.preventDefault()
        answer(false)
      } else if (e.key === 'Tab') {
        // keep focus on the two buttons
        const btns = [...(ref.current?.querySelectorAll<HTMLElement>('button') ?? [])]
        const i = btns.indexOf(document.activeElement as HTMLElement)
        const next = btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length]
        if (next) {
          e.preventDefault()
          next.focus()
        }
      }
    }
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('keydown', key, true)
      prev?.focus?.({ preventScroll: true })
    }
  }, [answer])

  const tone = ask.tone ?? 'danger'
  return (
    <>
      <div className="sheet-backdrop confirm-backdrop" onClick={() => answer(false)} />
      <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={ask.body ? 'confirm-body' : undefined} ref={ref}>
        <Mascot action={ask.mascot ?? (tone === 'danger' ? 'worry' : 'give')} size={72} label="" />
        <h2 id="confirm-title">{ask.title}</h2>
        {ask.body && <p id="confirm-body" className="muted">{ask.body}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn soft" data-no onClick={() => answer(false)}>
            {ask.no ?? 'Cancel'}
          </button>
          <button type="button" className={`btn ${tone === 'danger' ? 'confirm-danger' : 'gold'}`} onClick={() => answer(true)}>
            {ask.yes ?? 'Delete'}
          </button>
        </div>
      </div>
    </>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
