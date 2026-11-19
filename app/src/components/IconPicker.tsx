import { useEffect, useRef, useState } from 'react'
import { ICON_GROUPS } from './icons-more'
import { Glyph } from './Glyph'
import { useSwipe } from '../lib/swipe'

/**
 * Every icon Manna has, in groups: tap a group's name (or swipe the grid sideways) to move between them.
 * The picked icon plays its little animation.
 */
export function IconPicker({ value, onChange, label = 'Icon' }: { value: string; onChange: (icon: string) => void; label?: string }) {
  const [group, setGroup] = useState(() => Math.max(0, ICON_GROUPS.findIndex((g) => g.icons.includes(value))))
  const [dir, setDir] = useState<1 | -1>(1)
  const tabs = useRef<HTMLDivElement>(null)

  function show(i: number) {
    if (i < 0 || i >= ICON_GROUPS.length || i === group) return
    setDir(i > group ? 1 : -1)
    setGroup(i)
  }
  const swipe = useSwipe(() => show(group + 1), () => show(group - 1))

  // keep the open group's name in sight in the row of names
  useEffect(() => {
    const tab = tabs.current?.children[group] as HTMLElement | undefined
    tab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [group])

  return (
    <div className="icon-picker">
      <div className="icon-groups" role="tablist" aria-label={`${label} groups`} ref={tabs}>
        {ICON_GROUPS.map((g, i) => (
          <button key={g.title} type="button" role="tab" aria-selected={i === group} className="icon-group" onClick={() => show(i)}>
            {g.icons.includes(value) && <span className="icon-group-dot" aria-hidden="true" />}
            {g.title}
          </button>
        ))}
      </div>
      <div className={`icon-grid${dir < 0 ? ' back' : ''}`} key={group} role="group" aria-label={`${label}: ${ICON_GROUPS[group].title}`} {...swipe}>
        {ICON_GROUPS[group].icons.map((n) => (
          <button key={n} type="button" className="icon-pick" aria-pressed={value === n} aria-label={n} title={n} onClick={() => onChange(n)}>
            <Glyph name={n} size={24} />
          </button>
        ))}
      </div>
    </div>
  )
}
