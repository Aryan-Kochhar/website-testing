"""Re-vendor the demo STILLS straight from the project repos.

Usage:  python tools/vendor-stills.py

Unlike tools/build-demos.py this needs no local checkouts and no ffmpeg — it
pulls each source over HTTPS from raw.githubusercontent and re-encodes with
Pillow. Only stills: the animations are GIF-sourced and their ceiling is set
by the GIF, not by the encoder (see build-demos.py).

Why this exists: the first pass squeezed these far too hard. summary_poster
went 3,415 KB -> 143 KB and 00-landing-hero 228 KB -> 29 KB at WebP q82 with a
1280px cap, which is soft on any HiDPI screen when the detail page shows them
at ~780 CSS px. This uses q92 and a 1600px cap, and picks up six images that
were never vendored at all.
"""
import io
import json
import pathlib
import sys
import urllib.request

from PIL import Image

OWNER = 'Aryan-Kochhar'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'demos'

MAX_W = 1600
QUALITY = 92

# (project, out-name, repo, path-in-repo)
STILLS = [
    ('quant-copilot', 'hero',          'Agentic-Quantitative-Research-Copilot', 'assets/00-landing-hero.png'),

    ('logmind',       'dashboard',     'LogMind---Server-Log-Analyzer', 'assets/demo.png'),
    ('logmind',       'streamlit-1',   'LogMind---Server-Log-Analyzer', 'assets/Streamlit1.png'),
    ('logmind',       'streamlit-2',   'LogMind---Server-Log-Analyzer', 'assets/Streamlit2.png'),
    ('logmind',       'streamlit-3',   'LogMind---Server-Log-Analyzer', 'assets/Streamlit3.png'),

    ('architech',     'scene-road',    '-ArchiTech-', 'demo/scene2_road_river.png'),
    ('architech',     'scene-park',    '-ArchiTech-', 'demo/scene3_square_park.png'),
    ('architech',     'scene-harbour', '-ArchiTech-', 'demo/scene1_harbour.jpeg'),   # never vendored
    ('architech',     'scene-water',   '-ArchiTech-', 'demo/scene4_water_surround.png'),  # never vendored

    ('resonance',     'poster',        'Resonance', 'visualizations/summary_poster.png'),
    ('resonance',     'curves',        'Resonance', 'visualizations/training_curves.png'),
    ('resonance',     'heatmap-0',     'Resonance', 'visualizations/heatmaps_sample0.png'),   # never vendored
    ('resonance',     'spectral',      'Resonance', 'visualizations/spectral_sample0.png'),   # never vendored
    ('resonance',     'ber',           'Resonance', 'visualizations/ber_vs_snr.png'),         # never vendored
]

_branches = {}


def default_branch(repo):
    """Repos here are a mix of main and master, so ask rather than guess."""
    if repo in _branches:
        return _branches[repo]
    url = f'https://api.github.com/repos/{OWNER}/{repo}'
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            _branches[repo] = json.load(r).get('default_branch', 'main')
    except Exception:
        _branches[repo] = 'main'
    return _branches[repo]


def fetch(repo, path):
    branch = default_branch(repo)
    url = f'https://raw.githubusercontent.com/{OWNER}/{repo}/{branch}/{path}'
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def even(n):
    return n if n % 2 == 0 else n - 1


def fit(im, target_w):
    # Only ever downscale, and keep both dimensions even — some encoders
    # further down the line reject odd sizes.
    if im.width <= target_w:
        return im.resize((even(im.width), even(im.height)), Image.LANCZOS)
    h = round(im.height * target_w / im.width)
    return im.resize((even(target_w), even(h)), Image.LANCZOS)


def main():
    total_before = total_after = 0
    failures = []

    print(f'{"asset":34} {"source":>10} {"webp":>10}  dimensions')
    print('-' * 74)

    for proj, name, repo, path in STILLS:
        dest = OUT / proj / f'{name}.webp'
        try:
            raw = fetch(repo, path)
            im = Image.open(io.BytesIO(raw))
            im = fit(im.convert('RGB'), MAX_W)
            dest.parent.mkdir(parents=True, exist_ok=True)
            im.save(dest, 'WEBP', quality=QUALITY, method=6)
        except Exception as exc:
            failures.append((f'{proj}/{name}', str(exc)))
            print(f'{proj + "/" + name:34} {"—":>10} {"FAILED":>10}  {exc}')
            continue

        after = dest.stat().st_size
        total_before += len(raw)
        total_after += after
        print(f'{proj + "/" + name:34} {len(raw)/1e6:9.2f}M {after/1e6:9.2f}M  {im.width}x{im.height}')

    print('-' * 74)
    if total_before:
        print(f'{"TOTAL":34} {total_before/1e6:9.2f}M {total_after/1e6:9.2f}M')

    if failures:
        print(f'\n{len(failures)} failed:')
        for name, err in failures:
            print(f'  {name}: {err}')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
