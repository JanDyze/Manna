// Photos: receipts on entries, pictures on notes. A photo is shrunk on the phone first (about 1280px, JPEG),
// then kept in the private `manna-receipts` bucket under the person's own folder. In demo mode it stays in
// memory for the session.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { mock } from './mock'

/** A photo picked or taken, ready to show, send to KATY, or upload. */
export type Photo = {
  blob: Blob
  url: string
  base64: string
  type: 'image/jpeg'
  /** the picture as picked, full size: reading a receipt on the phone wants more detail than 1280px keeps */
  source?: Blob
}

const MAX = 1280

/** Shrink a picked image to a sensible size. Phones take 12MP pictures; a receipt reads fine at 1280px. */
export async function shrink(file: Blob): Promise<Photo> {
  const bitmap = await loadImage(file)
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // transparent PNGs become white, not black
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ('close' in bitmap) bitmap.close()
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Couldn’t read that picture.'))), 'image/jpeg', 0.82))
  const base64 = await new Promise<string>((ok) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result).split(',')[1] ?? '')
    r.readAsDataURL(blob)
  })
  return { blob, url: URL.createObjectURL(blob), base64, type: 'image/jpeg', source: file }
}

export async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap honours the photo's EXIF rotation, so a portrait receipt stays upright
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall back below (older Safari, HEIC) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } catch {
    throw new Error('Couldn’t open that picture. Try a JPEG or PNG.')
  }
}

// demo mode keeps pictures here, keyed by a made-up path
const memory = new Map<string, string>()

/** Upload a photo into the person's folder; returns the stored path. */
export async function uploadPhoto(userId: string, photo: Photo): Promise<string> {
  const name = `${userId || 'me'}/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}.jpg`
  if (mock) {
    memory.set(name, photo.url)
    return name
  }
  const { error } = await supabase.storage.from('manna-receipts').upload(name, photo.blob, { contentType: photo.type, cacheControl: '31536000', upsert: false })
  if (error) throw new Error(`Couldn’t keep the photo: ${error.message}`)
  return name
}

/** Remove a stored photo (best effort: a leftover file is harmless). */
export async function removePhoto(path: string | null | undefined) {
  if (!path) return
  if (mock) return void memory.delete(path)
  await supabase.storage.from('manna-receipts').remove([path]).catch(() => undefined)
}

// signed links last an hour; reuse them while they're fresh
const links = new Map<string, { url: string; until: number }>()

export async function photoUrl(path: string): Promise<string | null> {
  if (mock) return memory.get(path) ?? null
  const hit = links.get(path)
  if (hit && hit.until > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from('manna-receipts').createSignedUrl(path, 3600)
  if (error || !data) return null
  links.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}

/** The viewable link for a stored photo, once it's ready. */
export function usePhotoUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    if (path) void photoUrl(path).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [path])
  return url
}
