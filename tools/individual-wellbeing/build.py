#!/usr/bin/env python3
"""
Builds the Individual Wellbeing pages into public/individual-wellbeing/.

  python3 tools/individual-wellbeing/build.py

Edit source.html (in this folder), run this, then commit. Each address gets its
own page with its own title, description and share preview. Forms post to the
site's existing handler at /api/lead (src/worker.js).
"""
import json, os, re, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SITE_ORIGIN = "https://waios.com"
BASE = "/individual-wellbeing"
FORM_ENDPOINT = "/api/lead"
PRIVACY_URL = ""   # set to the privacy policy address once it exists; links stay hidden until then
OUT = os.path.join(REPO, "public", BASE.strip("/"))

src = open(os.path.join(HERE, "source.html"), encoding="utf-8").read()

SLUG = {"buffer": "build-a-cushion", "automate": "put-money-on-autopilot", "future": "care-for-your-future-self",
        "mindset": "know-your-money-story", "experiences": "buy-experiences", "anticipate": "create-distance-from-purchases",
        "others": "spend-on-others", "giving": "give-back", "time": "buy-back-time", "values": "spend-on-what-you-value"}
VIEW_PATH = {"start": "", "model": "ten-ways", "research": "research", "library": "resources",
             "workplaces": "workplaces", "checkin": "check-in", "finder": "gift-and-experience-finder"}

def path_for(v):
    if v in SLUG: return f"{BASE}/ten-ways/{SLUG[v]}"
    p = VIEW_PATH[v]
    return f"{BASE}/{p}" if p else f"{BASE}/"

def file_for(v):
    # Cloudflare serves /x from x.html, and /individual-wellbeing/ from index.html.
    p = path_for(v)
    return os.path.join(OUT, "index.html") if p.endswith("/") else os.path.join(REPO, "public", p.strip("/") + ".html")

META = {k: (t, d) for k, t, d in re.findall(r'(\w+): \["([^"]+)", "([^"]+)"\]', re.search(r"const META = (\{.*?\n\});", src, re.S).group(1))}
for p in json.loads(re.search(r"const PRINCIPLES = (\[.*?\n\]);", src, re.S).group(1)):
    META[p["id"]] = (f'{p["name"]}: one of ten ways to thrive with money', p.get("short") or p["what"])

def esc(x): return x.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
all_views = list(VIEW_PATH) + list(SLUG)
config_tag = "<script>window.SITE_CONFIG = " + json.dumps({"formEndpoint": FORM_ENDPOINT, "privacyUrl": PRIVACY_URL, "siteUrl": SITE_ORIGIN + BASE}) + ";</script>"

def page_for(v):
    title, desc = META.get(v, META["start"])
    url = SITE_ORIGIN + path_for(v)
    h = src
    h = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", h, count=1, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', h, count=1)
    h = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(title)}">', h, count=1)
    h = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(desc)}">', h, count=1)
    h = h.replace('<meta property="og:image" content="/individual-wellbeing/og-image.png">',
                  f'<meta property="og:image" content="{SITE_ORIGIN}{BASE}/og-image.png">\n<meta property="og:url" content="{url}">')
    h = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', h, count=1)
    h = re.sub(r'href="#(\w+)"', lambda m: f'href="{path_for(m.group(1))}"' if m.group(1) in all_views else m.group(0), h)
    return h.replace("</head>", config_tag + "\n</head>", 1)

# Start clean: remove earlier output.
if os.path.isdir(OUT): shutil.rmtree(OUT)
old = os.path.join(REPO, "public", "individual-wellbeing.html")
if os.path.exists(old): os.remove(old)
os.makedirs(OUT, exist_ok=True)
for v in all_views:
    f = file_for(v)
    os.makedirs(os.path.dirname(f), exist_ok=True)
    open(f, "w", encoding="utf-8").write(page_for(v))
shutil.copy(os.path.join(HERE, "og-image.png"), os.path.join(OUT, "og-image.png"))
open(os.path.join(OUT, "sitemap.xml"), "w").write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    "".join(f"  <url><loc>{SITE_ORIGIN}{path_for(v)}</loc></url>\n" for v in all_views) + "</urlset>\n")
print(f"Built {len(all_views)} pages into public/individual-wellbeing")
