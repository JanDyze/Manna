import raw from '../assets/manna-logo-animated.svg?raw'

// Navy parts follow the text colour (cream at night); the gold stays gold.
const html = raw
  .replace(/<title>.*?<\/title>/, '')
  .replace(/style="color: #1E2B45"/, 'style="color: currentColor"')
  .replace(/fill="#1E2B45"/g, 'fill="currentColor"')
const stillHtml = html.replace('class="manna-logo"', 'class="manna-logo is-still"')

/** The logo shimmering in: the star twinkles into being, then the curve and the name follow. `still` shows it at rest. */
export function LogoAnimated({ width = 180, still = false }: { width?: number; still?: boolean }) {
  return <span className="logo-anim" role="img" aria-label="Manna" style={{ width }} dangerouslySetInnerHTML={{ __html: still ? stillHtml : html }} />
}
