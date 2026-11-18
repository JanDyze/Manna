"""Manna's own icon set: 24×24, rounded 1.8 strokes in the text colour, with a gold accent like the logo.
Each icon has one small animation that plays once when it becomes active, is pressed, or is hovered.
Outputs: the app's icon module and stylesheet, and a preview page."""
import json, os

ICONS = {}   # name -> (markup, [(selector, keyframes, duration, origin, delay)])

def icon(name, markup, *anims):
    ICONS[name] = (markup.strip(), list(anims))

# ---------- navigation ----------
icon('today', '''
<path class="ic-a door" d="M12 12.6 15.3 19.5H8.7Z"/>
<path d="M3.3 19.5 12 5.2l8.7 14.3Z"/>
<path d="M12 5.2 10.7 3M12 5.2 13.3 3"/>
<path d="M2 19.5h20"/>
''', ('.door', 'ic-door', .7, '12px 19.5px', 0), ('', 'ic-bounce', .7, '12px 19.5px', 0))

icon('activity', '''
<path d="M6.8 6.5v11M17.2 6.5v11"/>
<rect x="4.4" y="3.6" width="15.2" height="2.9" rx="1.45"/>
<rect x="4.4" y="17.5" width="15.2" height="2.9" rx="1.45"/>
<path class="ic-a" d="M2.3 5.05a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0ZM2.3 18.95a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0ZM19.2 5.05a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0ZM19.2 18.95a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0 -2.5 0Z"/>
<path class="ln" pathLength="1" d="M9.5 9.6h5"/>
<path class="ln" pathLength="1" d="M9.5 12h5"/>
<path class="ln" pathLength="1" d="M9.5 14.4h3"/>
''', ('.ln:nth-of-type(3)', 'ic-draw', .35, None, 0), ('.ln:nth-of-type(4)', 'ic-draw', .35, None, .12), ('.ln:nth-of-type(5)', 'ic-draw', .3, None, .24))

icon('plan', '''
<circle cx="12" cy="12" r="8.6"/>
<path class="ic-a needle" d="M12 5.6 13.5 10.5 18.4 12 13.5 13.5 12 18.4 10.5 13.5 5.6 12 10.5 10.5Z"/>
''', ('.needle', 'ic-turn', .8, '12px 12px', 0))

icon('owed', '''
<circle cx="5.4" cy="8.2" r="2.3"/>
<path d="M1.8 18.6c.2-2.8 1.6-4.4 3.6-4.4 1 0 1.8.3 2.4.9"/>
<circle cx="18.6" cy="8.2" r="2.3"/>
<path d="M22.2 18.6c-.2-2.8-1.6-4.4-3.6-4.4-1 0-1.8.3-2.4.9"/>
<g class="coin"><circle class="ic-af" cx="12" cy="13.2" r="3.4"/><path d="M12 11.6v3.2" stroke-width="1.5"/></g>
''', ('.coin', 'ic-flip', .8, '12px 13.2px', 0))

# settings: a gear with the logo's star of provision at its heart; the gear turns one tooth and the star twinkles
icon('gear', '''
<path class="cog" d="M10.19 4.72 L10.58 2.51 L13.42 2.51 L13.81 4.72 L15.86 5.57 L17.71 4.28 L19.72 6.29 L18.43 8.14 L19.28 10.19 L21.49 10.58 L21.49 13.42 L19.28 13.81 L18.43 15.86 L19.72 17.71 L17.71 19.72 L15.86 18.43 L13.81 19.28 L13.42 21.49 L10.58 21.49 L10.19 19.28 L8.14 18.43 L6.29 19.72 L4.28 17.71 L5.57 15.86 L4.72 13.81 L2.51 13.42 L2.51 10.58 L4.72 10.19 L5.57 8.14 L4.28 6.29 L6.29 4.28 L8.14 5.57Z"/>
<path class="ic-a spark" d="M12 8.2 Q12.6 11.4 15.8 12 Q12.6 12.6 12 15.8 Q11.4 12.6 8.2 12 Q11.4 11.4 12 8.2Z"/>
''', ('.cog', 'ic-cog', .7, '12px 12px', 0), ('.spark', 'ic-twinkle', .7, '12px 12px', .1))

icon('plus', '''<path class="pl" d="M12 5v14M5 12h14"/>''', ('.pl', 'ic-turn90', .45, '12px 12px', 0))

# ---------- spending ----------
icon('food', '''
<path class="steam" d="M9.6 7.2c-1-1 .9-2-.1-3.4"/>
<path class="steam" d="M14.4 7.2c-1-1 .9-2-.1-3.4"/>
<path class="ic-a" d="M6.2 11.5a5.8 3.3 0 0 1 11.6 0Z"/>
<path d="M3.4 11.5h17.2a8.6 8.6 0 0 1-17.2 0Z"/>
<path d="M9 20.1h6"/>
''', ('.steam:nth-of-type(1)', 'ic-steam', .9, None, 0), ('.steam:nth-of-type(2)', 'ic-steam', .9, None, .18))

icon('transport', '''
<path d="M3 16.2V9.6A1.7 1.7 0 0 1 4.7 7.9H16l3.6 3.6c.9.6 1.4 1.3 1.4 2.2v2.5Z"/>
<path d="M3 11.6h16.6M8.2 7.9v3.7M13 7.9v3.7"/>
<path d="M5 7.9V6.4h10v1.5"/>
<circle class="ic-af" cx="7.2" cy="16.6" r="1.9"/>
<circle class="ic-af" cx="16.6" cy="16.6" r="1.9"/>
''', ('', 'ic-chug', .8, '12px 18px', 0))

icon('bolt', '''<path class="ic-af bolt" d="M13.6 2.6 5.2 13.4h6l-1 8 8.6-10.9h-6Z"/>''', ('.bolt', 'ic-flicker', .7, '12px 12px', 0))

icon('home', '''
<path d="M3.4 11.2 12 4.2l8.6 7"/>
<path d="M5.6 9.6V20h12.8V9.6"/>
<rect class="ic-a door" x="10" y="13.6" width="4" height="6.4" rx="1"/>
''', ('.door', 'ic-glow', .8, None, 0), ('', 'ic-bounce', .6, '12px 20px', 0))

icon('basket', '''
<circle class="ic-af fruit" cx="9.4" cy="8.3" r="2.2"/>
<circle class="ic-af fruit" cx="14.4" cy="8.6" r="1.9"/>
<path d="M3 10.6h18l-1.7 7.8a2 2 0 0 1-2 1.6H6.7a2 2 0 0 1-2-1.6Z"/>
<path d="M8.5 13.6v3.4M12 13.6v3.4M15.5 13.6v3.4"/>
''', ('.fruit:nth-of-type(1)', 'ic-hop', .65, None, 0), ('.fruit:nth-of-type(2)', 'ic-hop', .65, None, .12))

icon('heart', '''
<path class="ic-af beat" d="M12 20.2s-7.6-4.6-7.6-10.1A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.6 2.6c0 5.5-7.6 10.1-7.6 10.1Z"/>
''', ('.beat', 'ic-beat', .9, '12px 13px', 0))

icon('people', '''
<circle cx="9" cy="7.4" r="2.9"/>
<path d="M3.4 20c.3-3.7 2.5-6 5.6-6s5.3 2.3 5.6 6"/>
<g class="kid"><circle class="ic-af" cx="17.4" cy="11.4" r="2"/>
<path d="M14.4 20c.2-2.4 1.3-4 3-4s2.8 1.6 3 4"/></g>
''', ('.kid', 'ic-hop', .65, None, 0))

icon('bag', '''
<g class="bag"><path d="M9 8.2V6.6a3 3 0 0 1 6 0v1.6"/>
<path d="M5.2 8.2h13.6l-1 11.8H6.2Z"/>
<path class="ic-a" d="M5.6 11.6h12.8l-.17 2H5.77Z"/></g>
''', ('.bag', 'ic-swing', .9, '12px 4px', 0))

icon('spark', '''
<path class="ic-af st" d="M11 4.2 12.8 10.2 18.8 12 12.8 13.8 11 19.8 9.2 13.8 3.2 12 9.2 10.2Z"/>
<path class="tw" d="M18.6 3.4v3.2M17 5h3.2"/>
''', ('.st', 'ic-twinkle', .8, '11px 12px', 0), ('.tw', 'ic-glint', .8, '18.6px 5px', .15))

icon('repeat', '''
<g class="rp"><path d="M4.6 11.2a7.5 7.5 0 0 1 13-4.7l1.6 1.6M19.4 12.8a7.5 7.5 0 0 1-13 4.7l-1.6-1.6"/>
<path d="M19.2 3.8v4.3h-4.3M4.8 20.2v-4.3h4.3"/></g>
<circle class="ic-a" cx="12" cy="12" r="1.9"/>
''', ('.rp', 'ic-spin', .8, '12px 12px', 0))

icon('dot', '''
<circle class="d1" cx="6" cy="12" r="1.5" fill="currentColor" stroke="none"/>
<circle class="ic-a d2" cx="12" cy="12" r="1.7"/>
<circle class="d3" cx="18" cy="12" r="1.5" fill="currentColor" stroke="none"/>
''', ('.d1', 'ic-hop', .55, None, 0), ('.d2', 'ic-hop', .55, None, .1), ('.d3', 'ic-hop', .55, None, .2))

icon('coffee', '''
<path class="steam" d="M9 6.6c-.9-.9.8-1.8-.1-3"/>
<path class="steam" d="M12.6 6.6c-.9-.9.8-1.8-.1-3"/>
<path class="ic-a" d="M5.6 9.6h10.8v1.7H5.6Z"/>
<path d="M5 9h12v5.4A4.6 4.6 0 0 1 12.4 19H9.6A4.6 4.6 0 0 1 5 14.4Z"/>
<path d="M17 10.6h1.4a2.2 2.2 0 0 1 0 4.4H17M4 21h14"/>
''', ('.steam:nth-of-type(1)', 'ic-steam', .9, None, 0), ('.steam:nth-of-type(2)', 'ic-steam', .9, None, .18))

# ---------- income ----------
icon('briefcase', '''
<path d="M9 7.6V6.2A2 2 0 0 1 11 4.2h2a2 2 0 0 1 2 2v1.4"/>
<rect x="3" y="7.6" width="18" height="12.2" rx="2.4"/>
<path d="M3 12.6h7.4M13.6 12.6H21"/>
<rect class="ic-af clasp" x="10.4" y="11.2" width="3.2" height="2.9" rx=".8"/>
''', ('', 'ic-bounce', .6, '12px 20px', 0), ('.clasp', 'ic-pop', .6, '12px 12.6px', .05))

icon('tool', '''
<g class="hm"><path d="M13.2 10.8 4.4 19.6"/>
<g transform="rotate(45 15.6 8.4)"><rect class="ic-af" x="11.1" y="6.3" width="9" height="4.2" rx="1.1"/></g></g>
''', ('.hm', 'ic-strike', .7, '4.4px 19.6px', 0))

icon('gift', '''
<rect x="4.2" y="10.4" width="15.6" height="9.6" rx="1.5"/>
<path d="M12 10.4V20"/>
<g class="lid"><rect x="3" y="7" width="18" height="3.4" rx="1"/>
<path class="ic-af" d="M12 7c-1.4-2.9-4.9-2.9-4.4-.7.4 1 4.4.7 4.4.7Zm0 0c1.4-2.9 4.9-2.9 4.4-.7-.4 1-4.4.7-4.4.7Z"/></g>
''', ('.lid', 'ic-lid', .75, '12px 10px', 0))

# ---------- giving ----------
icon('wheat', '''
<g class="stalk"><path d="M12 21.2V7.6"/>
<path class="ic-af" d="M12 8.2c-2.4-.5-3.6-2.2-3.4-4.4 2.4.5 3.6 2.2 3.4 4.4Z"/>
<path class="ic-af" d="M12 8.2c2.4-.5 3.6-2.2 3.4-4.4-2.4.5-3.6 2.2-3.4 4.4Z"/>
<path class="ic-af" d="M12 12.6c-2.5-.4-3.9-2-3.9-4.3 2.5.4 3.9 2 3.9 4.3Z"/>
<path class="ic-af" d="M12 12.6c2.5-.4 3.9-2 3.9-4.3-2.5.4-3.9 2-3.9 4.3Z"/>
<path class="ic-af" d="M12 17c-2.5-.4-3.9-2-3.9-4.3 2.5.4 3.9 2 3.9 4.3Z"/>
<path class="ic-af" d="M12 17c2.5-.4 3.9-2 3.9-4.3-2.5.4-3.9 2-3.9 4.3Z"/></g>
''', ('.stalk', 'ic-sway', 1, '12px 21px', 0))

icon('envelope', '''
<path class="ic-af lift" d="M12 12.2s-2.7-1.7-2.7-3.5a1.5 1.5 0 0 1 2.7-.9 1.5 1.5 0 0 1 2.7.9c0 1.8-2.7 3.5-2.7 3.5Z"/>
<rect x="3" y="7.8" width="18" height="12" rx="2"/>
<path d="M3.6 9 12 14.4 20.4 9"/>
''', ('.lift', 'ic-rise', .9, '12px 10px', 0))

icon('globe', '''
<circle cx="12" cy="12.6" r="8.2"/>
<ellipse class="mer" cx="12" cy="12.6" rx="3.5" ry="8.2"/>
<path d="M3.8 12.6h16.4"/>
<path class="ic-af pin" d="M18 2.6a2.3 2.3 0 0 1 2.3 2.3c0 1.7-2.3 3.8-2.3 3.8s-2.3-2.1-2.3-3.8A2.3 2.3 0 0 1 18 2.6Z"/>
''', ('.mer', 'ic-meridian', .9, '12px 12.6px', 0), ('.pin', 'ic-hop', .6, None, .1))

icon('hands', '''
<path class="ic-af lift" d="M14.2 10.6s-3.2-2-3.2-4.3a1.75 1.75 0 0 1 3.2-1 1.75 1.75 0 0 1 3.2 1c0 2.3-3.2 4.3-3.2 4.3Z"/>
<path d="M3 14.2v6"/>
<path d="M3 15.6h3l4.4 2.2c.8.4 1.8.3 2.5-.2l6.4-4.3a1.45 1.45 0 0 0-1.6-2.4l-4.1 2.5H10.4"/>
<path d="M6 15.6c1.2-1.3 2.4-1.9 3.6-1.9h3a1.2 1.2 0 0 1 0 2.4H10"/>
''', ('.lift', 'ic-rise', .9, '14.2px 8px', 0))

# ---------- accounts ----------
icon('wallet', '''
<path d="M18.6 7.6V5.8a1.8 1.8 0 0 0-1.8-1.8H5.6A2.6 2.6 0 0 0 3 6.6"/>
<path d="M3 6.6v11a2.4 2.4 0 0 0 2.4 2.4h13.4a1.8 1.8 0 0 0 1.8-1.8V9.4a1.8 1.8 0 0 0-1.8-1.8H5.6A2.6 2.6 0 0 1 3 6.6"/>
<path d="M20.6 11.4h-3.4a2 2 0 0 0 0 4h3.4"/>
<circle class="ic-af coin" cx="17.2" cy="13.4" r="1"/>
''', ('', 'ic-bounce', .6, '12px 20px', 0), ('.coin', 'ic-pop', .5, '17.2px 13.4px', .1))

icon('phone', '''
<g class="ph"><rect x="6.4" y="2.6" width="11.2" height="18.8" rx="2.6"/>
<path d="M10.6 18.4h2.8"/>
<circle class="ic-af" cx="12" cy="10.2" r="2.7"/>
</g>
''', ('.ph', 'ic-buzz', .6, '12px 12px', 0))

icon('bank', '''
<path class="ic-af roof" d="M3 9.4 12 4.2l9 5.2Z"/>
<path d="M5.8 12v5.4M10 12v5.4M14 12v5.4M18.2 12v5.4"/>
<path d="M3.4 20.2h17.2"/>
''', ('.roof', 'ic-hop', .6, None, 0))

icon('card', '''
<g class="cd"><rect x="2.6" y="5.6" width="18.8" height="12.8" rx="2.4"/>
<path d="M2.6 9.6h18.8"/>
<rect class="ic-af" x="5.6" y="12.6" width="4" height="3" rx=".8"/></g>
''', ('.cd', 'ic-slide', .6, None, 0))

icon('piggy', '''
<path d="M8.6 3.6h6.8M8 6h8"/>
<path d="M8 6c-1.5 1-2.2 2.6-2.2 4.2v7.2a3 3 0 0 0 3 3h6.4a3 3 0 0 0 3-3v-7.2c0-1.6-.7-3.2-2.2-4.2"/>
<path class="ic-a lvl" d="M6.8 12.6h10.4v4.8a2 2 0 0 1-2 2H8.8a2 2 0 0 1-2-2Z"/>
''', ('.lvl', 'ic-fill', .8, '12px 19.4px', 0))
ICONS['jar'] = ICONS['piggy']

# ---------- goals ----------
icon('shield', '''
<path class="ic-a" d="M12 18.8s5.6-2.7 5.6-7.1V7l-5.6-1.9L6.4 7v4.7c0 4.4 5.6 7.1 5.6 7.1Z" opacity=".35"/>
<path d="M12 21s7.6-3.6 7.6-9.5V5.6L12 3 4.4 5.6v5.9C4.4 17.4 12 21 12 21Z"/>
<path class="chk" pathLength="1" d="m8.8 11.9 2.3 2.3 4.2-4.6"/>
''', ('.chk', 'ic-draw', .5, None, .05))

icon('laptop', '''
<rect x="4.4" y="4.8" width="15.2" height="10.6" rx="1.6"/>
<rect class="ic-a scr" x="6.6" y="7" width="10.8" height="6.2" rx=".6"/>
<path d="M2.4 19.2h19.2l-1.6-3.8H4Z"/>
''', ('.scr', 'ic-glow', .8, None, 0))

icon('plane', '''
<path class="ic-af fly" d="M10.6 13.4 3.2 11l1.4-1.4 7.4.6 3.8-3.8c1-1 2.6-1.6 3.3-.9.7.7.1 2.3-.9 3.3l-3.8 3.8.6 7.4L13.6 21Z"/>
''', ('.fly', 'ic-fly', .8, None, 0))

icon('school', '''
<path d="M2.4 9.2 12 4.6l9.6 4.6-9.6 4.6Z"/>
<path d="M6.4 11.2v4.6c3.1 2.5 8.1 2.5 11.2 0v-4.6"/>
<g class="tassel"><path d="M21.6 9.2v4.6"/><circle class="ic-af" cx="21.6" cy="14.6" r="1.1"/></g>
''', ('.tassel', 'ic-sway', .9, '21.6px 9.2px', 0))

KEYFRAMES = '''
@keyframes ic-bounce { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-2.4px) scale(.98, 1.03); } 55% { transform: translateY(0) scale(1.03, .97); } 72% { transform: translateY(-.8px); } }
@keyframes ic-door { 0% { transform: scaleY(1); } 30% { transform: scaleY(.2); } 70% { transform: scaleY(1.12); } 100% { transform: scaleY(1); } }
@keyframes ic-draw { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: 0; } }
@keyframes ic-turn { 0% { transform: rotate(0); } 60% { transform: rotate(100deg) scale(1.12); } 80% { transform: rotate(85deg); } 100% { transform: rotate(90deg); } }
@keyframes ic-cog { 0% { transform: rotate(0); } 75% { transform: rotate(52deg); } 100% { transform: rotate(45deg); } }
@keyframes ic-turn90 { 0% { transform: rotate(0); } 70% { transform: rotate(100deg); } 100% { transform: rotate(90deg); } }
@keyframes ic-flip { 0%, 100% { transform: translateY(0) scaleX(1); } 25% { transform: translateY(-2.6px) scaleX(.1); } 50% { transform: translateY(-3.2px) scaleX(1); } 75% { transform: translateY(-1.4px) scaleX(.1); } }
@keyframes ic-steam { 0% { opacity: 0; transform: translateY(2px); } 35% { opacity: 1; } 100% { opacity: 1; transform: translateY(0); } }
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
@keyframes ic-strike { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-22deg); } 50% { transform: rotate(6deg); } 68% { transform: rotate(-3deg); } }
@keyframes ic-lid { 0%, 100% { transform: translateY(0) rotate(0); } 35% { transform: translateY(-3.4px) rotate(-10deg); } 60% { transform: translateY(-.6px) rotate(3deg); } 80% { transform: translateY(0) rotate(-1deg); } }
@keyframes ic-sway { 0%, 100% { transform: rotate(0); } 22% { transform: rotate(-9deg); } 52% { transform: rotate(7deg); } 78% { transform: rotate(-3deg); } }
@keyframes ic-rise { 0%, 100% { transform: translateY(0) scale(1); } 40% { transform: translateY(-4.5px) scale(1.2); } 70% { transform: translateY(-3.5px) scale(1.1); } }
@keyframes ic-meridian { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(.15); } }
@keyframes ic-buzz { 0%, 70%, 100% { transform: rotate(0); } 10% { transform: rotate(8deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(6deg); } 40% { transform: rotate(-5deg); } 50% { transform: rotate(3deg); } 60% { transform: rotate(-1deg); } }
@keyframes ic-slide { 0%, 100% { transform: translateX(0); } 40% { transform: translateX(3px); } 70% { transform: translateX(-1px); } }
@keyframes ic-fill { 0% { transform: scaleY(.2); } 70% { transform: scaleY(1.12); } 100% { transform: scaleY(1); } }
@keyframes ic-fly { 0%, 100% { transform: translate(0, 0); } 40% { transform: translate(2.6px, -2.6px); } 65% { transform: translate(-1px, 1px); } }
'''

# Plays once when an icon's control becomes active or pressed, on hover (mouse), or on .ic-play / .ic-loop.
TRIGGERS = [".nav-tab.active", ".cat-btn[aria-pressed='true']", ".chip[aria-pressed='true']", ".ic-play"]
HOVER = ['a:hover', 'button:hover']

def rules():
    base, hover = [], []
    for name, (_, anims) in ICONS.items():
        if name == 'jar':
            continue
        for sel, kf, dur, origin, delay in anims:
            part = f' {sel}' if sel else ''
            target_static = f'.ic-{name}{part}' if sel else f'.ic-{name} > .ic-body'
            origin_css = f'transform-origin: {origin};' if origin else 'transform-box: fill-box; transform-origin: center;'
            base.append(f'{target_static} {{ {origin_css} }}')
            anim = f'animation: {kf} {dur}s cubic-bezier(.3,.7,.4,1) {delay}s both;'
            if kf == 'ic-draw':
                base.append(f'{target_static} {{ stroke-dasharray: 1 1.01; }}')
                anim = f'animation: {kf} {dur}s ease-out {delay}s backwards;'
            trig = ', '.join(f'{t} {target_static}' for t in TRIGGERS)
            base.append(f':is({", ".join(TRIGGERS)}) {target_static} {{ {anim} }}'.replace(':is(' + ", ".join(TRIGGERS) + ') ', ':is(' + ", ".join(TRIGGERS) + ') '))
            hover.append(f':is({", ".join(HOVER)}) {target_static} {{ {anim} }}')
    # 'jar' shares piggy's drawing and motion
    for line in list(base) + list(hover):
        pass
    return base, hover

base, hover = rules()
css = f'''/* Manna icons: generated by icons/gen.py. Each icon plays its little animation once when its control
   becomes active or pressed, when hovered with a mouse, or when it has the .ic-play class. */
.ic {{ fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; overflow: visible; flex: none; }}
.ic .ic-a {{ fill: var(--ic-accent, #e0a544); stroke: none; }}
.ic .ic-af {{ fill: var(--ic-accent, #e0a544); }}
.ic .ic-body {{ transform-origin: 12px 20px; }}
{chr(10).join(base)}
@media (hover: hover) {{
{chr(10).join('  ' + h for h in hover)}
}}
{KEYFRAMES}
@media (prefers-reduced-motion: reduce) {{ .ic, .ic * {{ animation: none !important; }} }}
'''
css = css.replace('.ic-jar', '.ic-piggy')

APP = '/home/claude/manna/app/src'
markup = {n: m for n, (m, _) in ICONS.items()}
open(f'{APP}/components/icons.ts', 'w').write(
    '// Manna\'s own icons (generated by icons/gen.py): inner SVG markup for a 24×24 viewBox.\n'
    '// Parts with class ic-a / ic-af are gold accents; icons.css animates the named parts.\n'
    f'export const ICON_MARKUP: Record<string, string> = {json.dumps(markup, indent=2)}\n')
open(f'{APP}/icons.css', 'w').write(css)

# preview page: every icon at 48px; each plays every few seconds, and plays on hover
groups = [('Navigation', ['today', 'activity', 'plus', 'plan', 'owed', 'gear']),
          ('Spending', ['food', 'coffee', 'transport', 'bolt', 'home', 'basket', 'heart', 'people', 'bag', 'spark', 'repeat', 'dot']),
          ('Income', ['briefcase', 'tool', 'gift']), ('Giving', ['wheat', 'envelope', 'globe', 'hands']),
          ('Accounts', ['wallet', 'phone', 'bank', 'card', 'piggy']), ('Goals', ['shield', 'laptop', 'plane', 'school'])]
cells = ''
for title, names in groups:
    cells += f'<h2>{title}</h2><div class="grid">' + ''.join(
        f'<button type="button" class="cell"><svg class="ic ic-{n}" viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">{"<g class=ic-body>" if any(a[0]=="" for a in ICONS[n][1]) else ""}{markup[n]}{"</g>" if any(a[0]=="" for a in ICONS[n][1]) else ""}</svg><span>{n}</span></button>' for n in names) + '</div>'
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manna icons</title><style>
body {{ margin: 0; font-family: system-ui, sans-serif; background: #fbf7ef; color: #1e2b45; }}
main {{ max-width: 920px; margin: 0 auto; padding: 24px 18px 48px; }}
h1 {{ font-size: 24px; margin: 0 0 4px; }} p {{ margin: 0 0 18px; color: #5d6476; }}
h2 {{ font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: #5d6476; margin: 22px 0 10px; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }}
.cell {{ display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 6px 12px; border-radius: 18px; border: 1px solid #ebe1cd; background: #fffdf8; font: inherit; font-size: 12px; color: #5d6476; cursor: pointer; }}
.cell svg {{ color: #1e2b45; }}
.dark {{ background: #111a2b; }} .dark .cell {{ background: #18233a; border-color: #26324c; color: #aeb4c2; }} .dark .cell svg {{ color: #f3ecdd; }} .dark h2, .dark p, .dark h1 {{ color: #f3ecdd; }}
label {{ display: inline-flex; gap: 8px; align-items: center; margin-bottom: 8px; }}
{css}
</style></head><body><main>
<h1>Manna icons</h1><p>Our own set: rounded navy strokes with a gold accent, like the logo. Each one plays a little animation when it's tapped, selected or hovered; here they also play on their own every few seconds.</p>
<label><input type="checkbox" id="dk"> Night</label>
{cells}
</main><script>
const cells=[...document.querySelectorAll('.cell')];
cells.forEach((c,i)=>{{ c.addEventListener('click',()=>{{c.classList.remove('ic-play'); void c.offsetWidth; c.classList.add('ic-play')}}); }});
let k=0; setInterval(()=>{{ cells.forEach((c,i)=>{{ if((i+k)%3===0){{ c.classList.remove('ic-play'); void c.offsetWidth; c.classList.add('ic-play'); }} }}); k++; }}, 1400);
document.getElementById('dk').addEventListener('change',e=>document.body.classList.toggle('dark',e.target.checked));
</script></body></html>'''
os.makedirs('/mnt/user-data/outputs/icons', exist_ok=True)
open('/mnt/user-data/outputs/icons/manna-icons.html', 'w').write(page)
print(len(ICONS), 'icons')
