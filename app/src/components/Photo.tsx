import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { shrink, usePhotoUrl, type Photo } from '../lib/photos'
import { Glyph } from './Glyph'

/**
 * A button that opens the phone's picker: take a picture or choose one from the gallery (the phone offers both).
 * The picture comes back already shrunk.
 */
export function PickPhoto({ onPick, onError, className, children, label }: { onPick: (p: Photo) => void; onError?: (msg: string) => void; className?: string; children: ReactNode; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  async function picked(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      onPick(await shrink(file))
    } catch (e) {
      onError?.((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <>
      <button type="button" className={className} aria-label={label} disabled={busy} aria-busy={busy} onClick={() => input.current?.click()}>
        {children}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => picked(e.target.files?.[0])} />
    </>
  )
}

/** A small square photo; tap to see it full screen. Takes a fresh photo's link or a stored photo's path. */
export function Thumb({ src, path, size = 56, onRemove, label = 'Receipt photo' }: { src?: string | null; path?: string | null; size?: number; onRemove?: () => void; label?: string }) {
  const stored = usePhotoUrl(src ? null : path)
  const url = src ?? stored
  const [open, setOpen] = useState(false)
  return (
    <span className="thumb" style={{ width: size, height: size }}>
      <button type="button" className="thumb-open" onClick={() => url && setOpen(true)} aria-label={`View ${label.toLowerCase()}`} disabled={!url}>
        {url ? <img src={url} alt="" /> : <Glyph name="receipt" size={Math.round(size * 0.4)} />}
      </button>
      {onRemove && (
        <button type="button" className="thumb-x" aria-label={`Remove ${label.toLowerCase()}`} onClick={onRemove}>
          <Glyph name="close" size={12} stroke={2.6} />
        </button>
      )}
      {open && url && <Viewer url={url} label={label} onClose={() => setOpen(false)} />}
    </span>
  )
}

function Viewer({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [onClose])
  return createPortal(
    <div className="viewer" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <img src={url} alt={label} />
      <button type="button" className="icon-btn viewer-x" aria-label="Close" onClick={onClose}>
        <Glyph name="close" size={24} />
      </button>
    </div>,
    document.body,
  )
}
