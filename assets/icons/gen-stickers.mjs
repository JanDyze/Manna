// Manna's sticker icons: more of the same family as gen-icons.py (24×24, rounded 1.8 strokes in the text
// colour, a gold accent), each with one little animation of its own. Also decides how every icon, old and
// new, is grouped in the icon picker.
//
//   node assets/icons/gen-stickers.mjs
//
// Writes app/src/components/icons-more.ts, app/src/icons-more.css and assets/icons/manna-stickers.html.
// Classes inside the markup: ic-a = gold fill, no stroke · ic-af = gold fill with the outline · ic-s = gold stroke.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const APP = join(here, '../../app/src')

/** name -> [markup, [selector, keyframes, seconds, transform-origin | null, delay][]] */
const ICONS = {}
const icon = (name, markup, ...anims) => (ICONS[name] = [markup.trim(), anims])

// ---------- food & drink ----------
icon('rice', `
<path class="ic-a" d="M6 11.5c.6-2.6 3-4.2 6-4.2s5.4 1.6 6 4.2Z"/>
<path d="M3.6 11.5h16.8a8.4 7.4 0 0 1-16.8 0Z"/>
<path d="M9.4 20.4h5.2"/>
<g class="sticks"><path d="M13.6 3.4 19.6 9.6M16.2 2.4l4.2 6.6"/></g>
`, ['.sticks', 'ic-sway', 0.8, '20px 9px', 0], ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('noodles', `
<g class="lift"><path d="M10 11c-.8-1.2.8-2-.1-3.3S10.7 5.4 10 4.2M13.4 11c-.8-1.2.8-2-.1-3.3s.8-2.3.1-3.5"/></g>
<path class="ic-a" d="M4.4 11.5h15.2l-.5 1.8H4.9Z"/>
<path d="M3.6 11.5h16.8a8.4 7.4 0 0 1-16.8 0Z"/>
<path d="M9.4 20.4h5.2"/>
`, ['.lift', 'ic-hop', 0.7, null, 0])

icon('burger', `
<path class="top" d="M4.4 10.2a7.6 5.6 0 0 1 15.2 0Z"/>
<rect class="ic-af" x="3.6" y="12" width="16.8" height="2.6" rx="1.3"/>
<path d="M4.4 16.4h15.2v1.2a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2Z"/>
`, ['.top', 'ic-hop', 0.65, null, 0])

icon('pizza', `
<circle class="ic-a" cx="10" cy="9.6" r="1.4"/><circle class="ic-a" cx="14.2" cy="10.6" r="1.2"/><circle class="ic-a" cx="12" cy="14.4" r="1.1"/>
<path d="M12 21.2 3.6 5.6a17 17 0 0 1 16.8 0Z"/>
<path d="M4.8 7.8a15 15 0 0 1 14.4 0"/>
`, ['', 'ic-swing', 0.8, '12px 21px', 0])

icon('hotcoffee', `
<path class="steam" d="M10.2 4.4c-.8-.8.7-1.6-.1-2.8"/>
<path class="steam" d="M13.8 4.4c-.8-.8.7-1.6-.1-2.8"/>
<path class="ic-a" d="M7.45 11.6h9.1l-.42 4.6H7.87Z"/>
<path d="M7 8h10l-1.2 12.2a1.4 1.4 0 0 1-1.4 1.2H9.6a1.4 1.4 0 0 1-1.4-1.2ZM6.2 8h11.6l-.6-2.2H6.8Z"/>
`, ['.steam:nth-of-type(1)', 'ic-steam', 0.9, null, 0], ['.steam:nth-of-type(2)', 'ic-steam', 0.9, null, 0.18])

icon('icedcoffee', `
<path class="ic-a fill" d="M7.6 12.8h8.8l-.82 7.1a1 1 0 0 1-1 .9H9.42a1 1 0 0 1-1-.9Z"/>
<rect class="ice" x="8.7" y="10" width="2.7" height="2.7" rx=".6" transform="rotate(-14 10.05 11.35)"/>
<rect class="ice" x="12.4" y="10.6" width="2.5" height="2.5" rx=".6" transform="rotate(16 13.65 11.85)"/>
<path d="M6.8 8.4h10.4l-1.3 11.6a1.6 1.6 0 0 1-1.6 1.4H9.7a1.6 1.6 0 0 1-1.6-1.4ZM6.2 8.4c0-1.1.8-1.8 2-1.8h7.6c1.2 0 2 .7 2 1.8Z"/>
<path class="straw" d="M13.4 6.6 15 1.8h2.2"/>
`, ['.ice:nth-of-type(1)', 'ic-hop', 0.6, null, 0], ['.ice:nth-of-type(2)', 'ic-hop', 0.6, null, 0.12], ['.fill', 'ic-fill', 0.8, '12px 20.8px', 0])

icon('milktea', `
<path d="M6.4 8.2h11.2l-1.4 11.6a1.6 1.6 0 0 1-1.6 1.4H9.4a1.6 1.6 0 0 1-1.6-1.4Z"/>
<path d="M5.4 8.2h13.2M7.4 8.2a4.6 3 0 0 1 9.2 0"/>
<path d="M12.8 5.4 14.6 1.8"/>
<circle class="ic-a pearl" cx="9.8" cy="18" r="1.05"/><circle class="ic-a pearl" cx="12.4" cy="18.4" r="1.05"/><circle class="ic-a pearl" cx="14.2" cy="16.4" r="1.05"/>
`, ['.pearl:nth-of-type(1)', 'ic-hop', 0.55, null, 0], ['.pearl:nth-of-type(2)', 'ic-hop', 0.55, null, 0.1], ['.pearl:nth-of-type(3)', 'ic-hop', 0.55, null, 0.2])

icon('icecream', `
<path d="M7.8 11.4 12 21.2l4.2-9.8M9.2 14.6h5.6"/>
<path class="ic-af scoop" d="M7.6 11.4a4.4 4.4 0 1 1 8.8 0Z"/>
<circle cx="12" cy="5.4" r="1" fill="currentColor" stroke="none"/>
`, ['.scoop', 'ic-sway', 0.8, '12px 11.4px', 0])

icon('cake', `
<rect x="4" y="12" width="16" height="8.4" rx="1.6"/>
<path class="ic-a" d="M4 12h16v2.4c-1.3 0-1.3 1.4-2.7 1.4S16 14.4 14.7 14.4 13.3 15.8 12 15.8s-1.4-1.4-2.7-1.4S8 15.8 6.7 15.8 5.3 14.4 4 14.4Z"/>
<path d="M12 12V8.2"/>
<path class="ic-af flame" d="M12 3.2c1.3 1.2 1.4 2.6 0 3.6-1.4-1-1.3-2.4 0-3.6Z"/>
`, ['.flame', 'ic-flicker', 0.7, '12px 7px', 0])

icon('bread', `
<path d="M5 11.2a3.4 3.4 0 0 1 .8-6.6h12.4a3.4 3.4 0 0 1 .8 6.6V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"/>
<path class="ic-a" d="M8 12.2h8v4.8a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1Z"/>
`, ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('apple', `
<path class="ic-af" d="M12 7.6c-2-1.4-6.6-1-6.6 4.2 0 4 2.6 8.4 4.8 8.4 1 0 1.2-.5 1.8-.5s.8.5 1.8.5c2.2 0 4.8-4.4 4.8-8.4 0-5.2-4.6-5.6-6.6-4.2Z"/>
<path d="M12 7.6c0-1.6.4-3 1.6-4"/>
<path class="leaf" d="M13.4 5.4c1.4-1.6 3.4-1.6 4.2-.8-.8 1.6-2.8 1.8-4.2.8Z"/>
`, ['.leaf', 'ic-sway', 0.8, '13.4px 5.4px', 0], ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('drink', `
<path class="ic-a fill" d="M6.9 11h10.2l-.9 8.4a1 1 0 0 1-1 .9H8.8a1 1 0 0 1-1-.9Z"/>
<path d="M6 5.4h12l-1.6 14.2a1.6 1.6 0 0 1-1.6 1.4H9.2a1.6 1.6 0 0 1-1.6-1.4Z"/>
<path d="M13.2 13 15.8 2.6h2.4"/>
`, ['.fill', 'ic-fill', 0.8, '12px 20.3px', 0])

icon('egg', `
<path d="M8.4 4.4c3-1.6 6.2-.4 7.6 1.8 1.6 2.4 4.6 2.4 4.6 6.2 0 4.4-4.2 7.6-8.6 7.6-5 0-8.6-3-8.6-7 0-3.6 2.4-7 5-8.6Z"/>
<circle class="ic-af yolk" cx="11.6" cy="12" r="3"/>
`, ['.yolk', 'ic-pop', 0.6, '11.6px 12px', 0])

icon('fish', `
<path class="ic-a" d="M10 8.2c1-1.6 2.6-2.2 4-2-1 .8-1.4 1.8-1.4 2.6Z"/>
<path d="M3 12c3-4.4 9.6-5.6 14 0-4.4 5.6-11 4.4-14 0Z"/>
<path class="ic-af tail" d="M17 12l4-3.4v6.8Z"/>
<circle cx="7.4" cy="11.2" r=".95" fill="currentColor" stroke="none"/>
`, ['.tail', 'ic-swing', 0.8, '17px 12px', 0], ['', 'ic-chug', 0.8, '12px 12px', 0])

icon('cart', `
<g class="box"><rect class="ic-af" x="9" y="7.8" width="3.8" height="3.8" rx=".6"/><rect class="ic-af" x="13.6" y="8.8" width="3.2" height="2.8" rx=".6"/></g>
<path d="M2.6 4h2.6l2.2 11h10.4l2-7.6H6.2"/>
<circle cx="9" cy="19" r="1.4"/><circle cx="16.6" cy="19" r="1.4"/>
`, ['.box', 'ic-hop', 0.6, null, 0.1], ['', 'ic-chug', 0.8, '12px 18px', 0])

// ---------- getting around ----------
icon('jeep', `
<path d="M2.6 16V9.4A1.4 1.4 0 0 1 4 8h12.4l2.6 3.4h1a1.4 1.4 0 0 1 1.4 1.4V16Z"/>
<path d="M4 8V6.2h12.8V8M5.4 11h3.2M10.6 11h3.6"/>
<path class="ic-a" d="M15.2 4.4l1.4-2 .6 2.2Z"/>
<circle class="ic-af" cx="7" cy="16.6" r="1.9"/><circle class="ic-af" cx="17" cy="16.6" r="1.9"/>
`, ['', 'ic-chug', 0.8, '12px 18px', 0])

icon('bus', `
<rect class="ic-a" x="6.6" y="5.8" width="10.8" height="4.6" rx="1"/>
<rect x="4.4" y="3.4" width="15.2" height="14.2" rx="2.6"/>
<path d="M7.6 14.2h.01M16.4 14.2h.01M7 17.6v2.4M17 17.6v2.4"/>
`, ['', 'ic-chug', 0.8, '12px 20px', 0])

icon('motor', `
<path class="ic-a" d="M4.6 11.4c0-1.3.7-2.2 1.9-2.2h.5c.5 0 .9.3 1.1.7l.3.6h3.6a.95.95 0 0 1 0 1.9H4.6Z"/>
<path d="M2.8 15.2c-.3-2.4.9-3.8 3-3.8h5.6l1.2 3.4h1.6M8.6 15.2h5.8"/>
<path d="M14.4 15.2 16 9c.4-1.2 1.6-1.7 2.7-1 1.3.9 2 2.8 2 4.8v2.4"/>
<path d="M16.5 8.3 17.3 4l2-.6M15 6.2h2.4"/>
<circle class="ic-a" cx="19" cy="10.6" r=".9"/>
<circle class="ic-af" cx="5.8" cy="17.4" r="2.3"/><circle class="ic-af" cx="18.6" cy="17.4" r="2.3"/>
`, ['', 'ic-chug', 0.8, '12px 19px', 0])

icon('bike', `
<circle cx="5.6" cy="16.4" r="3.2"/><circle cx="18.4" cy="16.4" r="3.2"/>
<path d="M5.6 16.4 9.4 9h6.2l2.8 7.4M9.4 9l3.4 7.4H5.6M15.6 9l-1-2.6h2.2M7.8 6.6h3"/>
<circle class="ic-a" cx="12.8" cy="16.4" r="1.3"/>
`, ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('car', `
<rect class="ic-a sign" x="10" y="3.4" width="4" height="2.2" rx=".6"/>
<path d="M3 16.4v-3.2c0-.9.5-1.6 1.3-1.9l1.6-3.4A2 2 0 0 1 7.7 6.8h8.6a2 2 0 0 1 1.8 1.1l1.6 3.4c.8.3 1.3 1 1.3 1.9v3.2Z"/>
<path d="M5 11.4h14"/>
<circle class="ic-af" cx="7.4" cy="16.6" r="1.8"/><circle class="ic-af" cx="16.6" cy="16.6" r="1.8"/>
`, ['.sign', 'ic-glow', 0.8, null, 0], ['', 'ic-chug', 0.8, '12px 18px', 0])

icon('train', `
<rect class="ic-a" x="7.2" y="5.2" width="9.6" height="3.8" rx=".8"/>
<rect x="5" y="3" width="14" height="14.4" rx="3"/>
<path d="M5 11h14M8.6 14.2h.01M15.4 14.2h.01M8 17.4 5.6 21M16 17.4 18.4 21"/>
`, ['', 'ic-chug', 0.8, '12px 20px', 0])

icon('boat', `
<rect class="ic-af" x="9.4" y="6.2" width="2.8" height="4.2" rx=".6"/>
<path d="M6.6 14.6v-4.2h9v4.2"/>
<path d="M3 14.6h18l-2.4 4.2H5.4Z"/>
<path class="wave" d="M2.6 21.4c1.6-1 3-1 4.6 0s3 1 4.6 0 3-1 4.6 0 3 1 4.6 0"/>
`, ['', 'ic-rock', 1, '12px 18px', 0], ['.wave', 'ic-slide', 1, null, 0])

icon('fuel', `
<rect class="ic-a scr" x="6" y="5.8" width="6" height="4" rx=".8"/>
<rect x="4" y="3.6" width="10" height="16.6" rx="1.6"/>
<path d="M2.8 20.2h12.4M14 8.4h2.2a1.6 1.6 0 0 1 1.6 1.6v6.6a1.4 1.4 0 0 0 2.8 0V8.6l-2.2-2.4"/>
`, ['.scr', 'ic-glow', 0.8, null, 0], ['', 'ic-bounce', 0.6, '12px 20px', 0])

// ---------- home & bills ----------
icon('water', `
<path class="ic-af drop" d="M12 3.2s-6 6.4-6 10.8a6 6 0 0 0 12 0C18 9.6 12 3.2 12 3.2Z"/>
<path d="M9.4 14.2a2.8 2.8 0 0 0 2 2.6"/>
`, ['', 'ic-drip', 0.8, '12px 20px', 0])

icon('wifi', `
<path class="w3" d="M2.8 9.2a13 13 0 0 1 18.4 0"/>
<path class="w2" d="M5.8 12.4a8.6 8.6 0 0 1 12.4 0"/>
<path class="w1" d="M8.8 15.6a4.2 4.2 0 0 1 6.4 0"/>
<circle class="ic-a w0" cx="12" cy="19" r="1.6"/>
`, ['.w0', 'ic-glow', 0.6, null, 0], ['.w1', 'ic-glow', 0.6, null, 0.1], ['.w2', 'ic-glow', 0.6, null, 0.2], ['.w3', 'ic-glow', 0.6, null, 0.3])

icon('flame', `
<path class="ic-af flame" d="M12 21c-3.6 0-6.2-2.6-6.2-6 0-3.8 3.4-5.6 3.8-9.6 2.4 1.4 3.8 3.6 3.8 5.6.8-.6 1.4-1.6 1.6-2.6 1.6 1.4 3.2 3.6 3.2 6.6 0 3.4-2.6 6-6.2 6Z"/>
<path d="M12 18.4c-1.4 0-2.4-1-2.4-2.4 0-1.4 1.2-2.2 1.6-3.6 1.6 1 3.2 2.2 3.2 3.6 0 1.4-1 2.4-2.4 2.4Z"/>
`, ['.flame', 'ic-flicker', 0.8, '12px 21px', 0])

icon('bulb', `
<circle class="ic-a glow" cx="12" cy="10" r="2.6"/>
<path d="M9 17.4c0-2-3-3.6-3-7.4a6 6 0 0 1 12 0c0 3.8-3 5.4-3 7.4M9 17.4h6M9.8 20.4h4.4"/>
<path class="rays" d="M12 1.2v.8M4.2 3.8l.6.6M19.8 3.8l-.6.6M1.6 10h.8M21.6 10h.8"/>
`, ['.glow', 'ic-pop', 0.6, '12px 10px', 0], ['.rays', 'ic-glint', 0.7, '12px 6px', 0.1])

icon('plug', `
<path d="M9 2.8v4M15 2.8v4M6.4 6.8h11.2v3.6a5.6 5.6 0 0 1-11.2 0ZM12 16v5.2"/>
<path class="ic-a zap" d="M12.8 8.4 10.4 11.8h2.2l-1 2.8 2.6-3.6H12Z"/>
`, ['.zap', 'ic-flicker', 0.7, '12px 11.4px', 0])

icon('key', `
<g class="key"><circle cx="7.8" cy="15.8" r="4.2"/><path d="M10.8 12.8 19.8 3.8M16.4 7.2l2.6 2.6M14.2 9.4l1.8 1.8"/><circle class="ic-a" cx="7.8" cy="15.8" r="1.6"/></g>
`, ['.key', 'ic-turnkey', 0.8, '7.8px 15.8px', 0])

icon('sofa', `
<rect class="ic-a" x="7.4" y="11.6" width="9.2" height="2.8" rx="1"/>
<path d="M4.6 11V8.4A2.4 2.4 0 0 1 7 6h10a2.4 2.4 0 0 1 2.4 2.4V11"/>
<path d="M3 13a2 2 0 0 1 4 0v1.6h10V13a2 2 0 0 1 4 0v4.4H3ZM5 17.4v2M19 17.4v2"/>
`, ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('laundry', `
<rect x="4" y="2.8" width="16" height="18.4" rx="2.4"/>
<path d="M4 7h16M7 5h.01M9.6 5h.01"/>
<circle cx="12" cy="14" r="4.6"/>
<path class="ic-a slosh" d="M8.4 14.4c1.2-.8 2.4.8 3.6 0s2.4-.8 3.6 0a3.6 3.6 0 0 1-7.2 0Z"/>
`, ['.slosh', 'ic-spin360', 0.9, '12px 14px', 0])

icon('fan', `
<circle cx="12" cy="9.4" r="6.6"/>
<g class="bl"><path class="ic-af" d="M12 9.4c-.6-2.8.4-5 2.2-5s1.4 3.4-2.2 5ZM12 9.4c2.7 1 4.2 3 3.2 4.6s-3.6-.6-3.2-4.6ZM12 9.4c-2.2 1.8-4.8 2-5.6-.2s2.4-2.8 5.6.2Z"/></g>
<path d="M12 16v4.4M8.4 20.6h7.2"/>
`, ['.bl', 'ic-spin360', 0.9, '12px 9.4px', 0])

icon('tv', `
<rect class="ic-a scr" x="5.2" y="8.6" width="13.6" height="8" rx=".8" opacity=".55"/>
<rect x="3" y="6.4" width="18" height="12.4" rx="2"/>
<path class="ant" d="M8.6 2.6 12 6.4l3.4-3.8"/>
<path d="M8.4 21.2h7.2"/>
`, ['.scr', 'ic-glow', 0.8, null, 0], ['.ant', 'ic-sway', 0.8, '12px 6.4px', 0])

icon('paid', `
<path d="M6 2.8h12v18.4l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4Z"/>
<path d="M9 7h6M9 10h6"/>
<path class="ic-s chk" pathLength="1" d="m9.2 14.4 1.9 1.9 3.8-4"/>
`, ['.chk', 'ic-draw', 0.5, null, 0.05])

icon('box', `
<path class="ic-a" d="M7.6 4.9 16 9.3v2.6l-2 1V10.4L5.6 6Z"/>
<path d="M12 2.8 20.4 7.2v9.6L12 21.2 3.6 16.8V7.2ZM3.6 7.2 12 11.6l8.4-4.4M12 11.6v9.6"/>
`, ['', 'ic-hop', 0.6, '12px 20px', 0])

icon('date', `
<rect class="ic-a day" x="13" y="12.6" width="4" height="4" rx="1"/>
<rect x="3.4" y="4.6" width="17.2" height="16" rx="2.4"/>
<path d="M3.4 9.4h17.2M8 2.8v3.6M16 2.8v3.6"/>
`, ['.day', 'ic-pop', 0.6, '15px 14.6px', 0])

// ---------- shopping & care ----------
icon('shirt', `
<path class="ic-a" d="M7.8 12.2h8.4v2.4H7.8Z"/>
<path d="M8.6 3.6 4 6.2l1.8 4 2-.8v11h8.4v-11l2 .8 1.8-4-4.6-2.6c-.5 1.6-1.9 2.6-3.4 2.6S9.1 5.2 8.6 3.6Z"/>
`, ['', 'ic-swing', 0.9, '12px 4px', 0])

icon('shoe', `
<path d="M2.8 17.2V9.6c0-.6.5-1 1-1h3.4l1 2.2 3-1 3.2 3.4 4.2 1A3 3 0 0 1 21.2 17v.2ZM10.6 12.4l1.2-1M12.8 14.2l1.2-1"/>
<path class="ic-af" d="M2.8 17.2h18.4v1.4a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1Z"/>
`, ['', 'ic-hop', 0.6, '12px 20px', 0])

icon('tag', `
<g class="tg"><path d="M3.2 12.4V4.2a1 1 0 0 1 1-1h8.2l8.4 8.4a1.4 1.4 0 0 1 0 2l-6.8 6.8a1.4 1.4 0 0 1-2 0Z"/>
<circle class="ic-af" cx="7.8" cy="7.8" r="1.6"/></g>
`, ['.tg', 'ic-swing', 0.9, '7.8px 7.8px', 0])

icon('scissors', `
<g class="b1"><circle cx="6" cy="6.4" r="2.8"/><path d="M8.4 7.8 20.4 17"/></g>
<g class="b2"><circle cx="6" cy="17.6" r="2.8"/><path d="M8.4 16.2 20.4 7"/></g>
<circle class="ic-a" cx="13.4" cy="12" r="1.1"/>
`, ['.b1', 'ic-snipa', 0.6, '13.4px 12px', 0], ['.b2', 'ic-snipb', 0.6, '13.4px 12px', 0])

icon('beauty', `
<rect x="7.4" y="12.6" width="9.2" height="8.6" rx="1.4"/>
<path d="M8.8 12.6V9.8h6.4v2.8"/>
<path class="ic-af up" d="M9.8 9.8V5.6l4.4-2.4v6.6Z"/>
`, ['.up', 'ic-hop', 0.6, null, 0])

icon('gem', `
<path class="ic-a" d="M7.8 9h8.4L12 20.4Z"/>
<path d="M6.6 4h10.8l3.4 5L12 20.4 3.2 9ZM3.2 9h17.6M9 4 7.8 9M15 4l1.2 5"/>
<path class="tw" d="M20 1.6v2.6M18.7 2.9h2.6"/>
`, ['', 'ic-bounce', 0.6, '12px 20px', 0], ['.tw', 'ic-glint', 0.8, '20px 2.9px', 0.15])

// ---------- health & family ----------
icon('pill', `
<g class="pl"><g transform="rotate(-45 12 12)"><rect x="4" y="8.6" width="16" height="6.8" rx="3.4"/><path class="ic-a" d="M12 8.6h4.6a3.4 3.4 0 0 1 0 6.8H12Z"/></g></g>
`, ['.pl', 'ic-buzz', 0.6, '12px 12px', 0])

icon('health', `
<rect x="3" y="6.8" width="18" height="13.4" rx="2.4"/>
<path d="M9 6.8V5a1.4 1.4 0 0 1 1.4-1.4h3.2A1.4 1.4 0 0 1 15 5v1.8"/>
<path class="ic-a cross" d="M10.6 9.8h2.8v2.6H16v2.8h-2.6v2.6h-2.8v-2.6H8v-2.8h2.6Z"/>
`, ['.cross', 'ic-beat', 0.9, '12px 13.8px', 0])

icon('tooth', `
<path d="M12 6.2c-1.6-1.4-3.2-1.8-4.6-1.6C4.8 5 4 7.6 4.6 10c.4 1.6 1 2.4 1.4 4.6.4 2.6.8 5.6 2.4 5.6 1.4 0 1.6-2.4 2-4 .3-1 .9-1.6 1.6-1.6s1.3.6 1.6 1.6c.4 1.6.6 4 2 4 1.6 0 2-3 2.4-5.6.4-2.2 1-3 1.4-4.6.6-2.4-.2-5-2.8-5.4-1.4-.2-3 .2-4.6 1.6Z"/>
<path class="ic-a tw" d="M19.4 1.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z"/>
`, ['.tw', 'ic-glint', 0.8, '19.4px 3.6px', 0], ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('baby', `
<path class="ic-a fill" d="M9.4 14h5.2v4.8a.8.8 0 0 1-.8.8h-3.6a.8.8 0 0 1-.8-.8Z"/>
<rect x="7.6" y="9" width="8.8" height="12" rx="2.4"/>
<path d="M8.6 9V7.4h6.8V9M7.6 12.4h2M7.6 15.2h1.4"/>
<path class="ic-af" d="M10.2 7.4C10.2 4 11 2.8 12 2.8s1.8 1.2 1.8 4.6Z"/>
`, ['.fill', 'ic-fill', 0.8, '12px 19.6px', 0])

icon('paw', `
<path class="ic-af" d="M12 12.4c-2.6 0-5.4 3-5.4 5.4 0 1.6 1.2 2.4 2.6 2.4 1.2 0 1.8-.6 2.8-.6s1.6.6 2.8.6c1.4 0 2.6-.8 2.6-2.4 0-2.4-2.8-5.4-5.4-5.4Z"/>
<ellipse class="toe" cx="5.2" cy="10.8" rx="1.6" ry="2"/><ellipse class="toe" cx="9" cy="6.6" rx="1.7" ry="2.2"/><ellipse class="toe" cx="15" cy="6.6" rx="1.7" ry="2.2"/><ellipse class="toe" cx="18.8" cy="10.8" rx="1.6" ry="2"/>
`, ['.toe:nth-of-type(1)', 'ic-hop', 0.5, null, 0], ['.toe:nth-of-type(2)', 'ic-hop', 0.5, null, 0.08], ['.toe:nth-of-type(3)', 'ic-hop', 0.5, null, 0.16], ['.toe:nth-of-type(4)', 'ic-hop', 0.5, null, 0.24])

icon('gym', `
<g class="db"><path d="M6.6 12h10.8M2.2 10v4M21.8 10v4"/>
<rect class="ic-af" x="3.6" y="7.4" width="3" height="9.2" rx="1"/><rect class="ic-af" x="17.4" y="7.4" width="3" height="9.2" rx="1"/></g>
`, ['.db', 'ic-launch', 0.8, '12px 12px', 0])

icon('family', `
<circle cx="7.4" cy="6.4" r="2.4"/><circle cx="16.6" cy="6.4" r="2.4"/>
<path d="M3 19.6c0-4 1.8-6.8 4.4-6.8 1.4 0 2.6.8 3.4 2.2M21 19.6c0-4-1.8-6.8-4.4-6.8-1.4 0-2.6.8-3.4 2.2"/>
<g class="kid"><circle class="ic-af" cx="12" cy="14.2" r="1.9"/><path d="M9.4 21c.2-2 1.2-3.4 2.6-3.4s2.4 1.4 2.6 3.4"/></g>
`, ['.kid', 'ic-hop', 0.65, null, 0])

// ---------- fun ----------
icon('game', `
<path d="M7.4 7.4h9.2a4.6 4.6 0 0 1 4.4 3.4l1 4a2.6 2.6 0 0 1-4.6 2.2L16 15.4H8l-1.4 1.6A2.6 2.6 0 0 1 2 14.8l1-4a4.6 4.6 0 0 1 4.4-3.4ZM7.6 10v3.2M6 11.6h3.2"/>
<circle class="ic-a btn1" cx="15.4" cy="10.6" r="1.05"/><circle class="ic-a btn2" cx="17.4" cy="12.6" r="1.05"/>
`, ['', 'ic-buzz', 0.6, '12px 12px', 0], ['.btn1', 'ic-pop', 0.5, '15.4px 10.6px', 0.1], ['.btn2', 'ic-pop', 0.5, '17.4px 12.6px', 0.2])

icon('music', `
<path d="M9 17.6V5.4l10-2.2v12.2M9 9.4l10-2.2"/>
<ellipse class="ic-af" cx="6.6" cy="17.8" rx="2.6" ry="2.2"/><ellipse class="ic-af" cx="16.6" cy="15.6" rx="2.6" ry="2.2"/>
`, ['', 'ic-sway', 0.9, '12px 20px', 0])

icon('movie', `
<rect x="3" y="9.4" width="18" height="11" rx="1.6"/>
<g class="clap"><path d="M3.4 9.4 2.8 6.4 19.6 3l.6 3Z"/><path class="ic-a" d="M6.6 5.7l2 2.7 2.4-.5-2-2.7ZM12.2 4.6l2 2.7 2.4-.5-2-2.7Z"/></g>
`, ['.clap', 'ic-clap', 0.6, '3.4px 9.4px', 0])

icon('ticket', `
<path d="M3 8.4V6.6A1.6 1.6 0 0 1 4.6 5h14.8A1.6 1.6 0 0 1 21 6.6v1.8a3.6 3.6 0 0 0 0 7.2v1.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.4v-1.8a3.6 3.6 0 0 0 0-7.2ZM15 5v1.4M15 9.4v1.4M15 13.2v1.4M15 17.6V19"/>
<path class="ic-a st" d="M9 8.4l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z"/>
`, ['', 'ic-swing', 0.8, '12px 12px', 0], ['.st', 'ic-pop', 0.5, '9px 11.4px', 0.1])

icon('book', `
<path class="ic-a page" d="M12 6.4c1.6-1.2 3.8-1.8 6.6-1.8v3c-2.6 0-4.8.6-6.6 1.8Z"/>
<path d="M12 6.4C10 4.8 7 4.2 3.4 4.6v13.6c3.6-.4 6.6.2 8.6 1.8 2-1.6 5-2.2 8.6-1.8V4.6C17 4.2 14 4.8 12 6.4ZM12 6.4V20"/>
`, ['.page', 'ic-meridian', 0.8, '12px 12px', 0])

icon('snap', `
<path d="M4 7.6h3l1.6-2.4h6.8L17 7.6h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"/>
<circle cx="12" cy="13.4" r="3.6"/>
<circle class="ic-a" cx="12" cy="13.4" r="1.6"/>
<circle class="ic-a flash" cx="17.6" cy="10.2" r="1"/>
`, ['.flash', 'ic-glint', 0.7, '17.6px 10.2px', 0], ['', 'ic-bounce', 0.6, '12px 20px', 0])

icon('ball', `
<g class="bl"><circle class="ic-af" cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4v17.2M5.8 6a8.6 8.6 0 0 1 0 12M18.2 6a8.6 8.6 0 0 0 0 12"/></g>
`, ['.bl', 'ic-hop', 0.65, null, 0])

icon('party', `
<path class="ic-af" d="M3.4 20.6 7.6 9.4l7 7Z"/>
<path class="cf" d="M12.4 3.2l.4 2.2"/><path class="cf" d="M18.2 4.4l-1.6 1.6"/><path class="cf" d="M20.8 10l-2.2.4"/>
<circle class="ic-a cf" cx="15.6" cy="8.6" r="1"/>
`, ['.cf:nth-of-type(2)', 'ic-burst', 0.6, null, 0], ['.cf:nth-of-type(3)', 'ic-burst', 0.6, null, 0.08], ['.cf:nth-of-type(4)', 'ic-burst', 0.6, null, 0.16], ['circle.cf', 'ic-burst', 0.6, null, 0.04])

icon('balloon', `
<g class="bal"><path class="ic-af" d="M12 15.4c-3.2 0-5.6-3-5.6-6.4a5.6 5.6 0 0 1 11.2 0c0 3.4-2.4 6.4-5.6 6.4Z"/>
<path d="M11 16.6h2l-1-1.2Z"/><path d="M12 16.6c-1.4 1.4 1.4 2.6 0 4.6"/></g>
`, ['.bal', 'ic-float', 1, '12px 21px', 0])

icon('crown', `
<path class="ic-af cr" d="M3.6 8.4 7.6 12 12 5.4 16.4 12l4-3.6-1.6 10H5.2Z"/>
<path d="M5.2 20.6h13.6"/>
`, ['.cr', 'ic-pop', 0.6, '12px 18.4px', 0])

icon('trophy', `
<path class="ic-a shine" d="M9 5.2h6v4a3 3 0 0 1-6 0Z"/>
<path d="M7.4 3.6h9.2v5.6a4.6 4.6 0 0 1-9.2 0ZM7.4 5.4H4.6v1.2a3.2 3.2 0 0 0 3 3.2M16.6 5.4h2.8v1.2a3.2 3.2 0 0 1-3 3.2M12 13.8v3.4M8.4 20.4h7.2l-.6-3.2H9Z"/>
`, ['', 'ic-bounce', 0.6, '12px 20px', 0], ['.shine', 'ic-glow', 0.8, null, 0.1])

icon('target', `
<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="5"/>
<circle class="ic-a" cx="12" cy="12" r="1.8"/>
<g class="arrow"><path d="M12 12 19.6 4.4M16.4 4.2l3.2.2.2 3.2"/></g>
`, ['.arrow', 'ic-thunk', 0.6, null, 0])

icon('rocket', `
<g class="rk"><path d="M12 2.8c3.2 2 4.6 5.4 4.2 9.8l-1.8 3.4H9.6l-1.8-3.4C7.4 8.2 8.8 4.8 12 2.8Z"/><circle cx="12" cy="9" r="1.6"/>
<path d="M7.8 12.6 5.2 15l1.2 2.6 3.2-1.6M16.2 12.6l2.6 2.4-1.2 2.6-3.2-1.6"/>
<path class="ic-af fl" d="M10.4 17.6h3.2c0 2-.8 3.2-1.6 3.8-.8-.6-1.6-1.8-1.6-3.8Z"/></g>
`, ['.rk', 'ic-launch', 0.9, '12px 12px', 0])

icon('megaphone', `
<g class="mg"><path d="M4 9.8h3.4L16 5v14l-8.6-4.8H4a1 1 0 0 1-1-1v-2.4a1 1 0 0 1 1-1ZM7.4 14.2l1.2 5.4h2.2l-.8-4.2"/></g>
<path class="ic-s wv" d="M19 9.4a3.6 3.6 0 0 1 0 5.2"/>
`, ['.mg', 'ic-buzz', 0.6, '10px 12px', 0], ['.wv', 'ic-glint', 0.6, '19px 12px', 0.1])

// ---------- faith & giving ----------
icon('church', `
<path class="ic-a door" d="M10.6 20.4v-3a1.4 1.4 0 0 1 2.8 0v3Z"/>
<path d="M12 2.6v4M10.4 4.2h3.2M7.6 11 12 6.6l4.4 4.4M8.4 10.2v10.2h7.2V10.2M8.4 13.4 4 15.6v4.8h4.4M15.6 13.4l4.4 2.2v4.8h-4.4"/>
`, ['.door', 'ic-glow', 0.8, null, 0], ['', 'ic-bounce', 0.6, '12px 20.4px', 0])

icon('cross', `
<path class="ic-af cr" d="M10.6 2.8h2.8v5h5v2.8h-5v10.6h-2.8V10.6h-5V7.8h5Z"/>
<path class="rays" d="M4.4 3.6l1.4 1.4M19.6 3.6 18.2 5M2.8 12.4h1.6M19.6 12.4h1.6"/>
`, ['.rays', 'ic-glint', 0.8, '12px 9px', 0], ['.cr', 'ic-glow', 0.8, null, 0.05])

icon('candle', `
<rect x="8.6" y="10" width="6.8" height="10.8" rx="1.2"/>
<path d="M12 10V8.2M10.6 10v2.4"/>
<path class="ic-af flame" d="M12 2.6c1.6 1.6 1.8 3.4 0 5-1.8-1.6-1.6-3.4 0-5Z"/>
`, ['.flame', 'ic-flicker', 0.8, '12px 8px', 0])

icon('bible', `
<path d="M5.6 19.4V5a2 2 0 0 1 2-2h11v14.4H7.6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h11"/>
<path class="ic-a cr" d="M11.4 5.8h1.6v2h2v1.6h-2v4h-1.6v-4h-2V7.8h2Z"/>
`, ['', 'ic-bounce', 0.6, '12px 21px', 0], ['.cr', 'ic-glow', 0.8, null, 0.1])

icon('dove', `
<path class="wing" d="M10.2 11.8c-.4-3.8 1.6-6.8 6-8.4.4 4-1.4 7-4.8 8.8"/>
<path class="ic-af" d="M3.2 11.4 5 10.6c.6-.8 1.4-1.2 2.4-1.2 1.4 0 2.2.8 3 1.6l4 1.2c2 .6 3.8.4 6.2-.8-.8 2.4-2.4 4-4.6 4.6-1.6 2.4-4.4 3.4-7.2 2.6-2.4-.7-3.8-2.8-3.8-5.2Z"/>
<circle cx="7" cy="11.6" r=".9" fill="currentColor" stroke="none"/>
`, ['.wing', 'ic-flap', 0.6, '11px 12px', 0], ['', 'ic-float', 1, '12px 20px', 0])

icon('pray', `
<path class="ic-a" d="M7.4 19.2h9.2v2H7.4Z"/>
<path d="M12 3.6c-1 0-1.6.9-1.8 2L9 12.4l-3.2 3.4a1.2 1.2 0 0 0 .2 1.8l2.4 1.6H12ZM12 3.6c1 0 1.6.9 1.8 2L15 12.4l3.2 3.4a1.2 1.2 0 0 1-.2 1.8l-2.4 1.6H12Z"/>
<path class="ic-s rays" d="M5.6 5.4l1.2 1.2M18.4 5.4l-1.2 1.2M3.8 10h1.6M18.6 10h1.6"/>
`, ['.rays', 'ic-glint', 0.8, '12px 8px', 0], ['', 'ic-bounce', 0.6, '12px 21px', 0])

// ---------- money ----------
icon('coins', `
<path d="M6 6v3.4c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V6M6 9.4v3.4c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V9.4M6 12.8v3.4c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4v-3.4"/>
<g class="top"><ellipse class="ic-af" cx="12" cy="6" rx="6" ry="2.4"/></g>
`, ['.top', 'ic-toss', 0.9, '12px 6px', 0])

icon('cash', `
<g class="bill"><rect x="2.6" y="6" width="18.8" height="12" rx="2"/><circle class="ic-af" cx="12" cy="12" r="2.8"/><path d="M5.8 9v.01M18.2 15v.01"/></g>
`, ['.bill', 'ic-wave', 0.8, '12px 12px', 0])

icon('growth', `
<path d="M3.6 3.6v16.8h16.8"/>
<path class="ic-s ln" pathLength="1" d="m6.6 15.4 4-4.4 3.2 2.8 5.4-6.6"/>
<path class="ic-s hd" d="M15.4 7.2h3.8V11"/>
`, ['.ln', 'ic-draw', 0.6, null, 0], ['.hd', 'ic-pop', 0.5, '19.2px 7.2px', 0.45])

icon('percent', `
<path d="M18.6 5.4 5.4 18.6"/>
<circle class="ic-af p" cx="7" cy="7" r="2.4"/><circle class="ic-af p" cx="17" cy="17" r="2.4"/>
`, ['.p:nth-of-type(1)', 'ic-pop', 0.5, null, 0], ['.p:nth-of-type(2)', 'ic-pop', 0.5, null, 0.12])

icon('safe', `
<rect x="3" y="3.6" width="18" height="15.6" rx="2"/>
<path d="M6 19.2v1.6M18 19.2v1.6"/>
<g class="dial"><circle cx="11" cy="11.4" r="3.6"/><path d="M11 7.8v1.4M11 13.6V15M7.4 11.4h1.4M13.2 11.4h1.4"/></g>
<rect class="ic-a" x="17" y="8.4" width="1.8" height="6" rx=".9"/>
`, ['.dial', 'ic-spin', 0.8, '11px 11.4px', 0])

icon('calc', `
<rect class="ic-a scr" x="7.4" y="5.2" width="9.2" height="3.6" rx=".8"/>
<rect x="5" y="2.8" width="14" height="18.4" rx="2.2"/>
<path d="M8.6 12.4h.01M12 12.4h.01M15.4 12.4h.01M8.6 15.4h.01M12 15.4h.01M15.4 15.4h.01M8.6 18.4h.01M12 18.4h.01M15.4 18.4h.01"/>
`, ['.scr', 'ic-glow', 0.8, null, 0])

icon('hourglass', `
<g class="hg"><path class="ic-a" d="M9.4 6.6h5.2c-.6 1-2.6 2.2-2.6 3-0-.8-2-2-2.6-3ZM8.8 19.4c.4-1.6 3.2-2.4 3.2-3.6 0 1.2 2.8 2 3.2 3.6Z"/>
<path d="M6.4 2.8h11.2M6.4 21.2h11.2M7.6 2.8v2.8c0 2.4 4.4 4 4.4 6.4s-4.4 4-4.4 6.4v2.8M16.4 2.8v2.8c0 2.4-4.4 4-4.4 6.4s4.4 4 4.4 6.4v2.8"/></g>
`, ['.hg', 'ic-spin360', 0.9, '12px 12px', 0])

icon('clock', `
<circle cx="12" cy="12" r="8.6"/>
<path class="mn" d="M12 12V6.4"/>
<path d="M12 12l3.4 2"/>
<circle class="ic-a" cx="12" cy="12" r="1.4"/>
`, ['.mn', 'ic-spin360', 0.9, '12px 12px', 0])

icon('bell', `
<g class="bl"><path d="M6 16.6V11a6 6 0 0 1 12 0v5.6l1.6 1.8H4.4ZM12 3v2"/><path class="ic-af" d="M10 20.4a2 2 0 0 0 4 0Z"/></g>
`, ['.bl', 'ic-buzz', 0.7, '12px 3px', 0])

icon('lock', `
<rect x="4.6" y="10.4" width="14.8" height="10.6" rx="2"/>
<path class="sh" d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8"/>
<path class="ic-a" d="M12 13.4a1.6 1.6 0 0 1 .8 3v1.8h-1.6v-1.8a1.6 1.6 0 0 1 .8-3Z"/>
`, ['.sh', 'ic-hop', 0.6, null, 0])

icon('star', `
<path class="ic-af st" d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z"/>
`, ['.st', 'ic-pop', 0.6, '12px 12px', 0])

// ---------- nature ----------
icon('sun', `
<circle class="ic-af" cx="12" cy="12" r="4"/>
<g class="rays"><path d="M12 2.6v2M12 19.4v2M2.6 12h2M19.4 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M5.4 18.6l1.4-1.4M17.2 6.8l1.4-1.4"/></g>
`, ['.rays', 'ic-twinkle', 0.8, '12px 12px', 0])

icon('moon', `
<path class="ic-af mn" d="M19.4 14.6A8 8 0 0 1 9.4 4.6a8 8 0 1 0 10 10Z"/>
<path class="tw" d="M17 3.4v2.4M15.8 4.6h2.4"/>
`, ['.mn', 'ic-sway', 0.9, '12px 12px', 0], ['.tw', 'ic-glint', 0.8, '17px 4.6px', 0.1])

icon('cloud', `
<circle class="ic-af sn" cx="16.4" cy="6.4" r="2.6"/>
<path class="cl" d="M7 18.4a4.4 4.4 0 0 1-.6-8.8 5.8 5.8 0 0 1 11.2 1.4 3.8 3.8 0 0 1 .4 7.4Z"/>
`, ['.cl', 'ic-slide', 0.9, null, 0], ['.sn', 'ic-rise', 0.9, '16.4px 6.4px', 0.1])

icon('umbrella', `
<g class="um"><path class="ic-af" d="M12 3.4a8.6 8.6 0 0 1 8.6 8.6H3.4A8.6 8.6 0 0 1 12 3.4Z"/><path d="M12 12v6.6a2 2 0 0 0 4 0"/></g>
`, ['.um', 'ic-sway', 0.9, '12px 20px', 0])

icon('plant', `
<path d="M7 14.4h10l-1.2 6H8.2ZM12 14.4V8.6"/>
<path class="ic-af l1" d="M12 10.6C9 10.8 6.8 9 6.6 5.8c3 0 5.2 1.6 5.4 4.8Z"/>
<path class="ic-af l2" d="M12 8.6c.2-3 2.4-4.8 5.4-4.8-.2 3.2-2.4 5-5.4 4.8Z"/>
`, ['.l1', 'ic-sway', 0.9, '12px 10.6px', 0], ['.l2', 'ic-sway', 0.9, '12px 8.6px', 0.1])

icon('sprout', `
<g class="gr"><path d="M12 20.4v-8"/>
<path class="ic-af" d="M12 14c-3.6 0-6-2.4-6-6 3.6 0 6 2.4 6 6Z"/>
<path class="ic-af" d="M12 12.4c0-3.2 2-5.2 5.2-5.2 0 3.2-2 5.2-5.2 5.2Z"/></g>
<path d="M4 20.4h16"/>
`, ['.gr', 'ic-fill', 0.8, '12px 20.4px', 0])

icon('rainbow', `
<path class="ic-s r" pathLength="1" d="M3 17.6a9 9 0 0 1 18 0"/>
<path class="r" pathLength="1" d="M6.2 17.6a5.8 5.8 0 0 1 11.6 0"/>
<path class="ic-s r" pathLength="1" d="M9.4 17.6a2.6 2.6 0 0 1 5.2 0"/>
`, ['.r:nth-of-type(3)', 'ic-draw', 0.4, null, 0], ['.r:nth-of-type(2)', 'ic-draw', 0.45, null, 0.1], ['.r:nth-of-type(1)', 'ic-draw', 0.5, null, 0.2])

icon('mountain', `
<circle class="ic-af sn" cx="17.4" cy="5.6" r="1.8"/>
<path d="M2.4 19.6 9 8.4l4 6.6 2.6-3.8 6 8.4Z"/>
<path class="ic-a" d="M9 8.4l2 3.4-1.2-.8-.8 1-.8-1-1.2.8Z"/>
`, ['.sn', 'ic-rise', 0.9, '17.4px 5.6px', 0])

icon('beach', `
<path d="M12.4 21c0-4.4-.6-8-2.4-11M3.4 21h17.2"/>
<g class="fr"><path d="M10 10c-1.8-2.4-4.6-3-6.6-1.6M10 10c.4-3 2.6-4.8 5.4-4.6M10 10c2.6-1 5.6 0 6.8 2.4M10 10c-2.6-.2-4.6 1.4-5 4"/></g>
<circle class="ic-af" cx="11.2" cy="11.6" r="1.2"/>
`, ['.fr', 'ic-sway', 0.9, '10px 10px', 0])

// ---------- everyday ----------
icon('smile', `
<circle class="ic-af" cx="12" cy="12" r="8.6"/>
<circle class="eye" cx="9" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle class="eye" cx="15" cy="10" r="1.1" fill="currentColor" stroke="none"/>
<path d="M8.4 14a4.4 4.4 0 0 0 7.2 0"/>
`, ['.eye', 'ic-blink', 0.5, null, 0.1], ['', 'ic-bounce', 0.6, '12px 20.6px', 0])

icon('chat', `
<path d="M4 5.6A2 2 0 0 1 6 3.6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6.4L7 20.4v-3.8H6a2 2 0 0 1-2-2Z"/>
<circle class="ic-a dt" cx="8.6" cy="10.1" r="1.1"/><circle class="ic-a dt" cx="12" cy="10.1" r="1.1"/><circle class="ic-a dt" cx="15.4" cy="10.1" r="1.1"/>
`, ['.dt:nth-of-type(1)', 'ic-hop', 0.5, null, 0], ['.dt:nth-of-type(2)', 'ic-hop', 0.5, null, 0.1], ['.dt:nth-of-type(3)', 'ic-hop', 0.5, null, 0.2])

icon('pin', `
<path d="M12 21.2s-6.6-6-6.6-11.2a6.6 6.6 0 0 1 13.2 0c0 5.2-6.6 11.2-6.6 11.2Z"/>
<circle class="ic-af" cx="12" cy="10" r="2.4"/>
`, ['', 'ic-hop', 0.6, '12px 21px', 0])

icon('flag', `
<path d="M5 21V3.6"/>
<path class="ic-af fg" d="M5 4.4c2.4-1.4 4.6-.6 7 .6s4.6 1.8 7 .4v8c-2.4 1.4-4.6.8-7-.4s-4.6-2-7-.6Z"/>
`, ['.fg', 'ic-wave', 0.8, '5px 9px', 0])

icon('thumbs', `
<rect class="ic-a" x="3.4" y="10.4" width="3.6" height="10" rx="1"/>
<path d="M7 10.4v10H4.4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM7 10.4 10.6 3.4a2.2 2.2 0 0 1 2.4 2.4l-.6 3.6h5.6a2 2 0 0 1 2 2.4l-1.4 6.8a2 2 0 0 1-2 1.6H7"/>
`, ['', 'ic-pop', 0.6, '7px 20px', 0])

icon('sparkles', `
<path class="ic-af s" d="M10 3.6l1.4 4.4 4.4 1.4-4.4 1.4L10 15.2l-1.4-4.4-4.4-1.4 4.4-1.4Z"/>
<path class="s" d="M18 12.4l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>
<path class="ic-a s" d="M6 16.4l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z"/>
`, ['.s:nth-of-type(1)', 'ic-glint', 0.7, null, 0], ['.s:nth-of-type(2)', 'ic-glint', 0.7, null, 0.12], ['.s:nth-of-type(3)', 'ic-glint', 0.7, null, 0.24])

// keyframes this set adds (gen-icons.py's are already in icons.css and are shared)
const KEYFRAMES = `
@keyframes ic-spin360 { 0% { transform: rotate(0); } 85% { transform: rotate(372deg); } 100% { transform: rotate(360deg); } }
@keyframes ic-rock { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 55% { transform: rotate(5deg); } 80% { transform: rotate(-2deg); } }
@keyframes ic-drip { 0%, 100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-2px) scale(.94, 1.08); } 60% { transform: translateY(0) scale(1.08, .92); } 80% { transform: scale(.98, 1.02); } }
@keyframes ic-float { 0%, 100% { transform: translateY(0) rotate(0); } 35% { transform: translateY(-2.6px) rotate(-5deg); } 70% { transform: translateY(-1px) rotate(4deg); } }
@keyframes ic-wave { 0%, 100% { transform: skewY(0) scaleY(1); } 25% { transform: skewY(-7deg) scaleY(1.04); } 55% { transform: skewY(5deg) scaleY(.97); } 80% { transform: skewY(-2deg); } }
@keyframes ic-blink { 0%, 100% { transform: scaleY(1); } 40% { transform: scaleY(.1); } }
@keyframes ic-burst { 0% { opacity: 0; transform: scale(.2); } 55% { opacity: 1; transform: scale(1.35); } 100% { opacity: 1; transform: scale(1); } }
@keyframes ic-snipa { 0%, 100% { transform: rotate(0); } 40% { transform: rotate(-12deg); } }
@keyframes ic-snipb { 0%, 100% { transform: rotate(0); } 40% { transform: rotate(12deg); } }
@keyframes ic-clap { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-16deg); } 55% { transform: rotate(2deg); } 75% { transform: rotate(-4deg); } }
@keyframes ic-thunk { 0% { transform: translate(5px, -5px); opacity: 0; } 50% { transform: translate(-.8px, .8px); opacity: 1; } 70% { transform: translate(.5px, -.5px); } 100% { transform: translate(0, 0); } }
@keyframes ic-flap { 0%, 100% { transform: scaleY(1); } 25% { transform: scaleY(.35); } 50% { transform: scaleY(1.1); } 75% { transform: scaleY(.6); } }
@keyframes ic-launch { 0%, 100% { transform: translateY(0); } 20% { transform: translateY(1px) scale(1.04, .94); } 55% { transform: translateY(-3.6px); } 80% { transform: translateY(.4px); } }
@keyframes ic-turnkey { 0%, 100% { transform: rotate(0); } 40% { transform: rotate(-28deg); } 70% { transform: rotate(4deg); } }
`

// ---------- the icon picker's groups: the original set and this one together ----------
export const GROUPS = [
  ['Food & drink', ['food', 'rice', 'noodles', 'burger', 'pizza', 'bread', 'egg', 'fish', 'apple', 'cake', 'icecream', 'coffee', 'hotcoffee', 'icedcoffee', 'milktea', 'drink', 'basket', 'cart']],
  ['Getting around', ['transport', 'jeep', 'bus', 'motor', 'bike', 'car', 'train', 'boat', 'plane', 'fuel', 'pin']],
  ['Home & bills', ['home', 'bolt', 'water', 'wifi', 'flame', 'bulb', 'plug', 'phone', 'tv', 'key', 'sofa', 'laundry', 'fan', 'paid', 'date', 'repeat', 'tool']],
  ['Shopping & care', ['bag', 'shirt', 'shoe', 'tag', 'box', 'beauty', 'scissors', 'gem', 'gift']],
  ['Health & family', ['heart', 'health', 'pill', 'tooth', 'gym', 'people', 'family', 'baby', 'paw', 'school', 'book']],
  ['Fun', ['game', 'music', 'movie', 'ticket', 'snap', 'ball', 'party', 'balloon', 'beach', 'mountain', 'laptop']],
  ['Faith & giving', ['wheat', 'church', 'cross', 'bible', 'pray', 'dove', 'candle', 'hands', 'envelope', 'globe']],
  ['Money', ['wallet', 'coins', 'cash', 'card', 'bank', 'piggy', 'jar', 'safe', 'growth', 'percent', 'calc', 'briefcase', 'shield', 'lock']],
  ['Moments', ['spark', 'sparkles', 'star', 'crown', 'trophy', 'target', 'rocket', 'sprout', 'plant', 'sun', 'moon', 'cloud', 'umbrella', 'rainbow', 'smile', 'thumbs', 'chat', 'megaphone', 'bell', 'clock', 'hourglass', 'flag', 'dot']],
]

// every new icon must be in a group, and no name twice
const grouped = GROUPS.flatMap(([, names]) => names)
for (const n of Object.keys(ICONS)) if (!grouped.includes(n)) throw new Error(`${n} is in no group`)
const dupes = grouped.filter((n, i) => grouped.indexOf(n) !== i)
if (dupes.length) throw new Error(`in two groups: ${dupes}`)

// ---------- write ----------
const TRIGGERS = [".nav-tab.active", ".cat-btn[aria-pressed='true']", ".chip[aria-pressed='true']", ".icon-pick[aria-pressed='true']", '.ic-play']
const HOVER = ['a:hover', 'button:hover']
const base = []
const hover = []
for (const [name, [, anims]] of Object.entries(ICONS)) {
  for (const [sel, kf, dur, origin, delay] of anims) {
    const target = sel ? `.ic-${name} ${sel}` : `.ic-${name} > .ic-body`
    base.push(`${target} { ${origin ? `transform-origin: ${origin};` : 'transform-box: fill-box; transform-origin: center;'} }`)
    let anim = `animation: ${kf} ${dur}s cubic-bezier(.3,.7,.4,1) ${delay}s both;`
    if (kf === 'ic-draw') {
      base.push(`${target} { stroke-dasharray: 1 1.01; }`)
      anim = `animation: ${kf} ${dur}s ease-out ${delay}s backwards;`
    }
    base.push(`:is(${TRIGGERS.join(', ')}) ${target} { ${anim} }`)
    hover.push(`  :is(${HOVER.join(', ')}) ${target} { ${anim} }`)
  }
}
const css = `/* Manna sticker icons: generated by assets/icons/gen-stickers.mjs (don't edit by hand). The same family as
   icons.css, whose keyframes these share; each plays once when its control is active, pressed or hovered. */
.ic .ic-s { stroke: var(--ic-accent, #e0a544); }
${base.join('\n')}
@media (hover: hover) {
${hover.join('\n')}
}
${KEYFRAMES.trim()}
`
writeFileSync(join(APP, 'icons-more.css'), css)

const markup = Object.fromEntries(Object.entries(ICONS).map(([n, [m]]) => [n, m]))
writeFileSync(
  join(APP, 'components/icons-more.ts'),
  `// Manna's sticker icons (generated by assets/icons/gen-stickers.mjs; don't edit by hand): inner SVG markup for a
// 24×24 viewBox, the same family as icons.ts. icons-more.css animates the named parts.
export const MORE_MARKUP: Record<string, string> = ${JSON.stringify(markup, null, 2)}

/** Every icon a category or goal can wear, grouped the way the icon picker shows them. */
export const ICON_GROUPS: { title: string; icons: string[] }[] = ${JSON.stringify(GROUPS.map(([title, icons]) => ({ title, icons })), null, 2)}
`,
)

// ---------- preview page: the new set at 48px, playing in turn ----------
const animated = (n) => ICONS[n][1].some((a) => a[0] === '')
const cells = GROUPS.map(([title, names]) => {
  const mine = names.filter((n) => ICONS[n])
  if (!mine.length) return ''
  return `<h2>${title}</h2><div class="grid">${mine
    .map((n) => `<button type="button" class="cell"><svg class="ic ic-${n}" viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">${animated(n) ? '<g class="ic-body">' : ''}${markup[n]}${animated(n) ? '</g>' : ''}</svg><span>${n}</span></button>`)
    .join('')}</div>`
}).join('')
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manna stickers</title><style>
body { margin: 0; font-family: system-ui, sans-serif; background: #fbf7ef; color: #1e2b45; }
main { max-width: 920px; margin: 0 auto; padding: 24px 18px 48px; }
h1 { font-size: 24px; margin: 0 0 4px; } p { margin: 0 0 18px; color: #5d6476; }
h2 { font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: #5d6476; margin: 22px 0 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 6px 12px; border-radius: 18px; border: 1px solid #ebe1cd; background: #fffdf8; font: inherit; font-size: 12px; color: #5d6476; cursor: pointer; }
.cell svg { color: #1e2b45; }
.dark { background: #111a2b; } .dark .cell { background: #18233a; border-color: #26324c; color: #aeb4c2; } .dark .cell svg { color: #f3ecdd; } .dark h2, .dark p, .dark h1 { color: #f3ecdd; }
label { display: inline-flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.ic { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; overflow: visible; flex: none; }
.ic .ic-a { fill: var(--ic-accent, #e0a544); stroke: none; }
.ic .ic-af { fill: var(--ic-accent, #e0a544); }
@keyframes ic-bounce { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-2.4px) scale(.98, 1.03); } 55% { transform: translateY(0) scale(1.03, .97); } 72% { transform: translateY(-.8px); } }
@keyframes ic-draw { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: 0; } }
@keyframes ic-toss { 0%, 100% { transform: translateY(0) scaleY(1); } 14% { transform: translateY(.8px) scaleY(.85); } 34% { transform: translateY(-3.8px) scaleY(.1); } 50% { transform: translateY(-4.4px) scaleY(1); } 66% { transform: translateY(-2.6px) scaleY(.1); } 84% { transform: translateY(.4px) scaleY(1); } }
@keyframes ic-chug { 0%, 100% { transform: translate(0, 0); } 20% { transform: translate(.6px, -1.4px); } 40% { transform: translate(1.2px, 0); } 60% { transform: translate(1px, -.8px); } 80% { transform: translate(.4px, 0); } }
@keyframes ic-flicker { 0%, 100% { opacity: 1; transform: scale(1); } 15% { opacity: .35; } 28% { opacity: 1; transform: scale(1.14); } 42% { opacity: .6; } 56% { opacity: 1; transform: scale(1); } }
@keyframes ic-glow { 0% { opacity: 1; } 30% { opacity: .25; } 100% { opacity: 1; } }
@keyframes ic-hop { 0%, 100% { transform: translateY(0); } 35% { transform: translateY(-2.8px); } 60% { transform: translateY(0); } 78% { transform: translateY(-.8px); } }
@keyframes ic-beat { 0%, 60%, 100% { transform: scale(1); } 15% { transform: scale(1.18); } 30% { transform: scale(.96); } 45% { transform: scale(1.1); } }
@keyframes ic-swing { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-12deg); } 45% { transform: rotate(9deg); } 68% { transform: rotate(-5deg); } 85% { transform: rotate(2deg); } }
@keyframes ic-twinkle { 0% { transform: rotate(0) scale(1); } 50% { transform: rotate(45deg) scale(1.15); } 100% { transform: rotate(90deg) scale(1); } }
@keyframes ic-glint { 0%, 100% { opacity: 1; transform: scale(1); } 40% { opacity: .2; transform: scale(.4); } 70% { opacity: 1; transform: scale(1.25); } }
@keyframes ic-spin { 0% { transform: rotate(0); } 80% { transform: rotate(195deg); } 100% { transform: rotate(180deg); } }
@keyframes ic-pop { 0%, 100% { transform: scale(1); } 35% { transform: scale(1.3); } 65% { transform: scale(.92); } }
@keyframes ic-sway { 0%, 100% { transform: rotate(0); } 22% { transform: rotate(-9deg); } 52% { transform: rotate(7deg); } 78% { transform: rotate(-3deg); } }
@keyframes ic-rise { 0%, 100% { transform: translateY(0) scale(1); } 40% { transform: translateY(-4.5px) scale(1.2); } 70% { transform: translateY(-3.5px) scale(1.1); } }
@keyframes ic-meridian { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.15); } }
@keyframes ic-buzz { 0%, 70%, 100% { transform: rotate(0); } 10% { transform: rotate(8deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(6deg); } 40% { transform: rotate(-5deg); } 50% { transform: rotate(3deg); } 60% { transform: rotate(-1deg); } }
@keyframes ic-slide { 0%, 100% { transform: translateX(0); } 40% { transform: translateX(3px); } 70% { transform: translateX(-1px); } }
@keyframes ic-fill { 0% { transform: scaleY(.2); } 70% { transform: scaleY(1.12); } 100% { transform: scaleY(1); } }
${css}
</style></head><body><main>
<h1>Manna stickers</h1><p>${Object.keys(ICONS).length} more icons in Manna's family: navy strokes, a gold accent, and a little move each. Tap one to play it; they also take turns on their own.</p>
<label><input type="checkbox" id="dk"> Night</label>
${cells}
</main><script>
const cells=[...document.querySelectorAll('.cell')];
const play=c=>{c.classList.remove('ic-play'); void c.offsetWidth; c.classList.add('ic-play')};
cells.forEach(c=>c.addEventListener('click',()=>play(c)));
let k=0; setInterval(()=>{ cells.forEach((c,i)=>{ if((i+k)%4===0) play(c) }); k++; }, 1300);
document.getElementById('dk').addEventListener('change',e=>document.body.classList.toggle('dark',e.target.checked));
</script></body></html>`
mkdirSync(here, { recursive: true })
writeFileSync(join(here, 'manna-stickers.html'), page)
console.log(Object.keys(ICONS).length, 'new icons,', grouped.length, 'in the picker')
