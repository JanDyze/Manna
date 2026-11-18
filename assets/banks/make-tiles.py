import asyncio, re, json, os, base64, io
from PIL import Image
import numpy as np
from playwright.async_api import async_playwright
# how each brand becomes a square tile: which part of the logo, and the tile's background
SPEC = {
 'bdo':         ('whole', '#ffffff'),
 'bpi':         ('whole', '#ffffff'),
 'metrobank':   ('left',  '#ffffff'),
 'landbank':    ('top',   '#ffffff'),
 'unionbank':   ('left',  '#ffffff'),
 'securitybank':('left',  '#ffffff'),
 'pnb':         ('left',  '#ffffff'),
 'rcbc':        ('whole', '#ffffff'),
 'chinabank':   ('left',  '#ffffff'),
 'gcash':       ('left',  '#ffffff'),
 'maya':        ('whole', '#111111'),
 'gotyme':      ('left',  '#ffffff'),
 'seabank':     ('left',  '#ffffff'),
 'cimb':        ('left',  '#ffffff'),
 'maribank':    ('whole', '#ffffff'),
 'wise':        ('mark',  '#9FE870'),
}
def clean(svg):
    svg = re.sub(r'<\?xml[^>]*\?>', '', svg)
    svg = re.sub(r'<!--.*?-->', '', svg, flags=re.S)
    svg = re.sub(r'<!DOCTYPE[^>]*>', '', svg)
    svg = re.sub(r'<metadata.*?</metadata>', '', svg, flags=re.S)
    svg = re.sub(r'<sodipodi:namedview.*?(/>|</sodipodi:namedview>)', '', svg, flags=re.S)
    return svg.strip()
def root_box(svg):
    m = re.search(r'<svg\b[^>]*>', svg, flags=re.S); tag = m.group(0)
    vb = re.search(r'viewBox="([^"]+)"', tag)
    if vb: return [float(x) for x in re.split(r'[ ,]+', vb.group(1).strip())]
    w = float(re.search(r'\swidth="([\d.]+)', tag).group(1)); h = float(re.search(r'\sheight="([\d.]+)', tag).group(1))
    return [0, 0, w, h]
def segments(profile, gap):
    on = profile > 0; segs=[]; i=0; n=len(on)
    while i<n:
        if on[i]:
            j=i
            while j<n and on[j]: j+=1
            segs.append([i,j]); i=j
        else: i+=1
    # merge segments separated by less than `gap`
    merged=[]
    for s in segs:
        if merged and s[0]-merged[-1][1] < gap: merged[-1][1]=s[1]
        else: merged.append(s)
    return merged
async def main():
    os.makedirs('tiles', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1400,'height':900})
        report = {}
        for key,(mode,bg) in SPEC.items():
            src = 'raw/wise-simpleicons.svg' if key=='wise' else f'raw/{key}.svg'
            svg = clean(open(src).read())
            if key=='wise': svg = svg.replace('<svg ', '<svg fill="#163300" ', 1)
            x0,y0,vw,vh = root_box(svg)
            W = 1200; H = round(W*vh/vw)
            if H > 800: H = 800; W = round(H*vw/vh)
            open('_one.html','w').write(f'<body style="margin:0;background:transparent"><img id=i src="file://{os.path.abspath(src) if key!="wise" else os.path.abspath("_wise.svg")}" style="width:{W}px;height:{H}px;display:block"></body>')
            if key=='wise': open('_wise.svg','w').write(svg)
            await pg.goto('file://'+os.path.abspath('_one.html')); await pg.wait_for_timeout(150)
            png = await pg.locator('#i').screenshot(omit_background=True)
            a = np.array(Image.open(io.BytesIO(png)).convert('RGBA'))[:,:,3]
            ys, xs = np.nonzero(a > 20)
            bx0,bx1,by0,by1 = xs.min(), xs.max()+1, ys.min(), ys.max()+1
            if mode=='left':
                segs = segments((a[by0:by1] > 20).sum(axis=0), gap=int(W*0.02))
                bx0, bx1 = segs[0]
                sub = a[:, bx0:bx1]; yy = np.nonzero((sub>20).any(axis=1))[0]; by0,by1 = yy.min(), yy.max()+1
            elif mode=='top':
                segs = segments((a[:, bx0:bx1] > 20).sum(axis=1), gap=int(H*0.04))
                by0, by1 = segs[0]
                sub = a[by0:by1]; xx = np.nonzero((sub>20).any(axis=0))[0]; bx0,bx1 = xx.min(), xx.max()+1
            sx = vw/a.shape[1]; sy = vh/a.shape[0]
            cx, cy, cw, ch = x0+bx0*sx, y0+by0*sy, (bx1-bx0)*sx, (by1-by0)*sy
            # square tile: 64 units, the logo fitted inside with breathing room
            pad = 10 if mode in ('whole',) and cw/ch > 1.6 else 12
            inner = 64 - 2*pad
            body = re.sub(r'<svg\b[^>]*>', '', svg, count=1, flags=re.S)
            body = body[:body.rfind('</svg>')]
            nsdecl = ' '.join(sorted(set(d for d in re.findall(r'xmlns:\w+="[^"]+"', svg) if not d.startswith('xmlns:xlink='))))
            tile = (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" {nsdecl} viewBox="0 0 64 64">'
                    f'<rect width="64" height="64" rx="16" fill="{bg}"/>'
                    f'<svg x="{pad}" y="{pad}" width="{inner}" height="{inner}" viewBox="{cx:.2f} {cy:.2f} {cw:.2f} {ch:.2f}" preserveAspectRatio="xMidYMid meet" overflow="hidden">{body}</svg></svg>')
            if key=='wise': tile = tile.replace('<svg x=', '<svg fill="#163300" x=',1)
            open(f'tiles/{key}.svg','w').write(tile)
            report[key] = (mode, round(cw/ch,2), len(tile))
        print(json.dumps(report))
        await b.close()
asyncio.run(main())
