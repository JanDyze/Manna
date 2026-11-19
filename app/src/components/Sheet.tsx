import { useEffect, useRef, type ReactNode } from 'react'

/** A bottom sheet for small forms. Escape or a tap outside closes it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button')
    first?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', key)
      prev?.focus?.({ preventScroll: true })
    }
  }, [onClose])
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="sheet-grip" />
        <h2>{title}</h2>
        {children}
      </div>
    </>
  )
}
