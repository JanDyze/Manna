import raw from '../assets/manna-symbol.svg?raw'

// navy parts follow the text colour, so the symbol turns cream in dark mode; gold stays gold
const symbolHtml = raw.replace(/<title>.*?<\/title>/, '').replace(/fill="#1E2B45"/g, 'fill="currentColor"')

export function Symbol({ size = 26 }: { size?: number }) {
  return <span className="brand-mark" aria-hidden="true" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: symbolHtml }} />
}

/** The logo's symbol and the word, for page headers. */
export function Brand({ size = 26 }: { size?: number }) {
  return (
    <span className="brand">
      <Symbol size={size} />
      <span className="brand-word">Manna</span>
    </span>
  )
}
