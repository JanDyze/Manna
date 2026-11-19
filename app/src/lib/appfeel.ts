// Makes Manna behave like an app on the phone rather than a web page (the styles live in index.css):
//   - a long press never brings up the browser's menu (open in new tab, copy link, save image…)
//   - links and pictures can't be dragged out of the page
//   - html.is-scrolled is on once the page has moved, so headers that stay at the top can show their edge
// Text fields keep their normal menus, so copy and paste still work while typing.

const FIELDS = 'input, textarea, [contenteditable="true"], .selectable'

export function feelLikeAnApp() {
  const touch = window.matchMedia('(pointer: coarse)')
  document.addEventListener('contextmenu', (e) => {
    if (touch.matches && !(e.target instanceof Element && e.target.closest(FIELDS))) e.preventDefault()
  })
  document.addEventListener('dragstart', (e) => {
    if (e.target instanceof Element && e.target.closest('a, img, svg')) e.preventDefault()
  })

  const root = document.documentElement
  let on = false
  const scrolled = () => {
    const now = window.scrollY > 2
    if (now !== on) root.classList.toggle('is-scrolled', (on = now))
  }
  window.addEventListener('scroll', scrolled, { passive: true })
  scrolled()
}
