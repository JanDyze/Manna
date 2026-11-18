// Icons: Manna's own animated set (icons.ts, icons.css) first, then plain stroke icons for UI basics.
import { ICON_MARKUP } from './icons'

const PATHS: Record<string, string> = {
  "home": "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  "list": "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  "plan": "M9.2 4.5v2.4C7.6 7.6 6.8 9 6.8 10.8V18a2.5 2.5 0 0 0 2.5 2.5h5.4a2.5 2.5 0 0 0 2.5-2.5v-7.2c0-1.8-.8-3.2-2.4-3.9V4.5M8.2 4.5h7.6M6.8 13.6h10.4",
  "people": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  "plus": "M12 5v14M5 12h14",
  "gear": "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  "back": "M15 18l-6-6 6-6",
  "fwd": "M9 18l6-6-6-6",
  "close": "M18 6L6 18M6 6l12 12",
  "sound": "M4 9.5h3.5L12 6v12l-4.5-3.5H4z M15.5 9.2a4 4 0 0 1 0 5.6 M18.2 6.6a7.6 7.6 0 0 1 0 10.8",
  "mute": "M4 9.5h3.5L12 6v12l-4.5-3.5H4z M16 9.5l5 5 M21 9.5l-5 5",
  "eye": "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 1 0 0-5.6z",
  "eye-off": "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 1 0 0-5.6z M4 4l16 16",
  "send": "M4.5 11.5L20 4l-6.5 16-2.6-6.9z M10.9 13.1L20 4",
  "mic": "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5.5 11.5a6.5 6.5 0 0 0 13 0 M12 18v3",
  "camera": "M4 8h3l1.6-2.4A1.5 1.5 0 0 1 9.9 5h4.2a1.5 1.5 0 0 1 1.3.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 16.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 1 0 0 6.8z",
  "receipt": "M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z M9 8h6 M9 11.5h6 M9 15h3.5",
  "image": "M4 4h16v16H4z M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18 M15.5 9a1.5 1.5 0 1 0 0-.01",
  "check": "M20 6L9 17l-5-5",
  "search": "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  "calendar": "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  "food": "M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7",
  "transport": "M5 17h14M6 17v2.5M18 17v2.5M4 17v-4l2-6h12l2 6v4M4 13h16M7.5 15h.01M16.5 15h.01",
  "bolt": "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "basket": "M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "heart": "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z",
  "bag": "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  "spark": "M12 3l2.6 5.6 5.9.9-4.3 4.1 1 5.9L12 16.7l-5.2 2.8 1-5.9L3.5 9.5l5.9-.9z",
  "repeat": "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3",
  "dot": "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "briefcase": "M4 7h16v13H4zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16",
  "tool": "M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 6.3-6.3-1.6-1.6L8.4 16.4l-3-3 6.3-6.3L10 5.5l1.3-1.3a4 4 0 0 0 3.4 2.1z",
  "gift": "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  "wheat": "M12 22V9M12 9c-2-1-3-3-3-6 2 1 3 3 3 6zM12 9c2-1 3-3 3-6-2 1-3 3-3 6zM12 14c-2.2-.6-4-2.2-4-4.5 2.2.6 4 2.2 4 4.5zM12 14c2.2-.6 4-2.2 4-4.5-2.2.6-4 2.2-4 4.5zM12 19c-2.2-.6-4-2.2-4-4.5 2.2.6 4 2.2 4 4.5zM12 19c2.2-.6 4-2.2 4-4.5-2.2.6-4 2.2-4 4.5z",
  "envelope": "M3 6h18v13H3zM3 6l9 7 9-7",
  "globe": "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
  "jar": "M8 3h8M7 6h10M7 6c-1.5 1-2 2.5-2 4v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-8c0-1.5-.5-3-2-4M9 13h6",
  "wallet": "M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7M16 14h.01",
  "bank": "M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8",
  "phone": "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
  "card": "M2 5h20v14H2zM2 10h20M6 15h4",
  "swap": "M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4",
  "message": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  "up": "M7 17L17 7M9 7h8v8",
  "down": "M17 7L7 17M15 17H7V9",
  "pen": "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  "sun": "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  "logout": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  "tag": "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01",
  "percent": "M19 5L5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  "mail": "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  "flag": "M4 22V4M4 4h13l-2 4 2 4H4",
  "shield": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "laptop": "M4 5h16v10H4zM2 19h20",
  "plane": "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
  "down-chevron": "M6 9l6 6 6-6",
  "trash": "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  "more": "M5 12h.01M12 12h.01M19 12h.01",
  "home2": "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  "book": "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM20 17v4H6.5A2.5 2.5 0 0 1 4 18.5",
  "bell": "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  "moon": "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  "monitor": "M3 4h18v12H3zM8 20h8M12 16v4",
  "info": "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
  "user": "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  "piggy": "M19 9c1.5 0 2 1 2 2v2h-2l-1 3h-2v2h-3v-2H9v2H6v-2.5C4.5 14.5 4 13 4 11c0-3.5 3-6 7-6 1.3 0 2.6.3 3.6.8L17 5v3c.8.3 1.5.6 2 1zM15 10h.01",
  "cart": "M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "school": "M22 9L12 4 2 9l10 5 10-5zM6 11v5c3 2 9 2 12 0v-5",
  "paw": "M12 13c-2.5 0-5 2.5-5 5 0 1.5 1 2 2.5 2s1.8-.7 2.5-.7 1 .7 2.5.7 2.5-.5 2.5-2c0-2.5-2.5-5-5-5zM6 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM14.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  "coffee": "M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v3M10 2v3M14 2v3",
}

export const GLYPHS = Object.keys(PATHS)

/** Icons a category or goal can use, in the order the pickers show them. */
export const PICKABLE = ['food', 'coffee', 'transport', 'bolt', 'home', 'basket', 'heart', 'people', 'bag', 'spark', 'repeat', 'school', 'phone', 'gift', 'plane', 'laptop', 'shield', 'piggy', 'briefcase', 'tool', 'wheat', 'envelope', 'globe', 'hands', 'wallet', 'bank', 'card', 'dot']

export function Glyph({ name, size = 20, stroke = 1.8, className }: { name: string; size?: number; stroke?: number; className?: string }) {
  const own = ICON_MARKUP[name]
  const cls = `ic ic-${name}${className ? ` ${className}` : ''}`
  if (own)
    return (
      <svg className={cls} width={size} height={size} viewBox="0 0 24 24" strokeWidth={stroke} aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<g class="ic-body">${own}</g>` }} />
    )
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.dot} />
    </svg>
  )
}
