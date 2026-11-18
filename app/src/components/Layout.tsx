import { useEffect, useLayoutEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Glyph } from './Glyph'
import { morph, settled } from '../lib/morph'

const tabs = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/activity', label: 'Activity', icon: 'activity' },
  null,
  { to: '/plan', label: 'Plan', icon: 'plan' },
  { to: '/owed', label: 'Owed', icon: 'owed' },
]

/** The add button's mark: the logo's four-pointed star standing in for a plus, with one gold flake. */
function StarPlus() {
  return (
    <svg className="star-plus" width={28} height={28} viewBox="0 0 24 24" aria-hidden="true">
      <path className="star-plus-star" d="M12 2.5Q13.3 10.7 21.5 12Q13.3 13.3 12 21.5Q10.7 13.3 2.5 12Q10.7 10.7 12 2.5Z" />
      <g className="star-plus-flake">
        <ellipse cx="19.4" cy="19" rx="1.6" ry="1.1" transform="rotate(-20 19.4 19)" />
      </g>
    </svg>
  )
}

/** True once the page is scrolled to its end (or is too short to scroll). */
function useAtEnd(pathname: string) {
  const [atEnd, setAtEnd] = useState(false)
  useEffect(() => {
    const check = () => setAtEnd(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4)
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    // pages grow when data arrives, without any scrolling
    const grow = new ResizeObserver(check)
    grow.observe(document.body)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      grow.disconnect()
    }
  }, [pathname])
  return atEnd
}

/**
 * App shell: the page, then the tab bar with the add button in the middle. While there's more page below,
 * the bar floats as a pill; at the end of the page it settles flat against the bottom edge.
 */
export function Layout() {
  const { pathname } = useLocation()
  const atEnd = useAtEnd(pathname)
  const nav = useNavigate()
  // coming back from New entry: the page is here, so the closing transition can run
  useLayoutEffect(() => settled(), [pathname])
  return (
    <div className="shell">
      <main className="content" key={pathname.split('/')[1]}>
        <Outlet />
      </main>
      <nav className={`nav${atEnd ? '' : ' is-docked'}`} aria-label="Main">
        {tabs.map((t) =>
          t ? (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
              <Glyph name={t.icon} size={22} />
              <span>{t.label}</span>
            </NavLink>
          ) : (
            <NavLink
              key="add"
              to="/add"
              className="nav-add"
              aria-label="Add an entry"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                e.preventDefault()
                const btn = e.currentTarget
                if (btn.classList.contains('is-going')) return
                // the star spins a quarter turn (it looks the same after, so it "lands") with a gold ring,
                // then the page opens out of the button
                btn.classList.add('is-going')
                const go = () => morph('open', () => nav('/add'), btn)
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) go()
                else window.setTimeout(go, 190)
                window.setTimeout(() => btn.classList.remove('is-going'), 900)
              }}
            >
              <StarPlus />
            </NavLink>
          ),
        )}
      </nav>
    </div>
  )
}
