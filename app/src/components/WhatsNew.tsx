import { useCallback, useEffect, useState } from 'react'
import { fromISODate } from '../lib/dates'
import { APP_VERSION, markVersionSeen, unseenReleases, useUpdateReady, type Release } from '../lib/version'
import { Sheet } from './Sheet'
import { Mascot } from './Mascot'
import { Glyph } from './Glyph'
import { Tile } from './Bits'

const shortDate = (s: string) => fromISODate(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

/** The notes for one or more releases, newest first. */
export function WhatsNewSheet({ releases, onClose }: { releases: Release[]; onClose: () => void }) {
  return (
    <Sheet title="What’s new" onClose={onClose}>
      <div className="news-hello">
        <Mascot action="cheer" size={64} label="" />
        <p className="hand">{releases.length > 1 || releases[0]?.version !== APP_VERSION ? 'Here’s what changed' : releases[0].title}</p>
      </div>
      <div className="news">
        {releases.map((r) => (
          <section key={r.version} className="news-release">
            <div className="news-head">
              <span className={`pill${r.version === APP_VERSION ? ' gold' : ''}`}>v{r.version}</span>
              <span className="tiny faint">{shortDate(r.date)}</span>
            </div>
            {(releases.length > 1 || r.version !== APP_VERSION) && <p className="news-title">{r.title}</p>}
            <ul className="list news-notes">
              {r.notes.map((n) => (
                <li key={n.text}>
                  <Tile icon={n.icon} size={18} />
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <button className="btn block" onClick={onClose}>Lovely</button>
    </Sheet>
  )
}

/**
 * Lives beside the pages: tells the person once about what changed since they last opened Manna on this
 * device, and offers a refresh when a newer copy has been deployed while the app was open.
 */
export function Updates() {
  const [news] = useState(unseenReleases)
  const [showNews, setShowNews] = useState(false)
  const updateReady = useUpdateReady()
  const [dismissed, setDismissed] = useState(false)

  // wait for the logo's entrance to finish before bringing up the sheet
  useEffect(() => {
    if (!news.length) return
    const t = window.setTimeout(() => setShowNews(true), 2400)
    return () => window.clearTimeout(t)
  }, [news])

  const closeNews = useCallback(() => {
    markVersionSeen()
    setShowNews(false)
  }, [])

  return (
    <>
      {showNews && <WhatsNewSheet releases={news} onClose={closeNews} />}
      {updateReady && !dismissed && (
        <div className="update-bar" role="status">
          <Glyph name="spark" size={18} />
          <span className="grow">A new Manna is ready</span>
          <button className="btn sm" onClick={() => location.reload()}>Refresh</button>
          <button className="icon-btn" aria-label="Later" onClick={() => setDismissed(true)}>
            <Glyph name="close" size={18} />
          </button>
        </div>
      )}
    </>
  )
}
