"""Vendor project demos into the site.

Usage:  DEMO_SRC=~/src FFMPEG=ffmpeg python3 tools/build-demos.py

Expects the project repos checked out side by side under DEMO_SRC.

The originals are hotlinked GIFs in the project repos — 15.7MB in total, one
of them 439 frames / 35s. Nothing that heavy is going to load on a portfolio.

Animated demos become WebM (VP8), trimmed to a short loop; stills become WebP.
Every animation also gets a WebP poster, which is what a browser that cannot
decode VP8 shows instead.
"""
import io, os, subprocess, pathlib
from PIL import Image, ImageSequence

# Override with env vars; SRC is wherever the project repos are checked out.
FF  = os.environ.get('FFMPEG', 'ffmpeg')
SRC = pathlib.Path(os.environ.get('DEMO_SRC', os.path.expanduser('~/src')))
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'demos'

FPS = 14          # demo screencasts don't need more
MAX_SECONDS = 9   # a loop, not the whole session
ANIM_W = 720
STILL_W = 1280

ANIMATED = [
    ('quant-copilot', 'agent-run',   'agentic-quantitative-research-copilot/assets/02-agent-run.gif'),
    ('quant-copilot', 'landing',     'agentic-quantitative-research-copilot/assets/01-landing.gif'),
    ('quant-copilot', 'tool-stream', 'agentic-quantitative-research-copilot/assets/03-tool-stream.gif'),
    ('architech',     'city',        '-architech-/demo/demo.gif'),
    ('architech',     'city-2',      '-architech-/demo/demo2.gif'),
    ('congestion-rl', 'intersection','congestion-control-with-rl/congestion-control.gif'),
]

STILLS = [
    ('quant-copilot', 'hero',       'agentic-quantitative-research-copilot/assets/00-landing-hero.png'),
    ('logmind',       'dashboard',  'logmind---server-log-analyzer/assets/demo.png'),
    ('logmind',       'streamlit-1','logmind---server-log-analyzer/assets/Streamlit1.png'),
    ('logmind',       'streamlit-2','logmind---server-log-analyzer/assets/Streamlit2.png'),
    ('logmind',       'streamlit-3','logmind---server-log-analyzer/assets/Streamlit3.png'),
    ('architech',     'scene-road', '-architech-/demo/scene2_road_river.png'),
    ('architech',     'scene-park', '-architech-/demo/scene3_square_park.png'),
    ('resonance',     'poster',     'resonance/visualizations/summary_poster.png'),
    ('resonance',     'curves',     'resonance/visualizations/training_curves.png'),
]

def even(n):
    return n if n % 2 == 0 else n - 1

def fit(im, target_w):
    if im.width <= target_w:
        return im
    h = round(im.height * target_w / im.width)
    return im.resize((even(target_w), even(h)), Image.LANCZOS)

def save_webp(im, dest, quality=80):
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(dest, 'WEBP', quality=quality, method=5)
    return dest.stat().st_size

def encode_anim(src, dest_webm, dest_poster):
    im = Image.open(src)
    native_ms = im.info.get('duration') or 80
    # Keep every Nth frame so playback lands near FPS without re-timing.
    step = max(1, round((1000 / native_ms) / FPS))
    limit = int(MAX_SECONDS * FPS)

    frames = []
    for i, fr in enumerate(ImageSequence.Iterator(im)):
        if i % step:
            continue
        frames.append(fit(fr.convert('RGB'), ANIM_W))
        if len(frames) >= limit:
            break
    if not frames:
        raise RuntimeError(f'no frames decoded from {src}')

    save_webp(frames[0], dest_poster, quality=72)

    dest_webm.parent.mkdir(parents=True, exist_ok=True)
    p = subprocess.Popen(
        [FF, '-y', '-hide_banner', '-loglevel', 'error',
         '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', str(FPS), '-i', 'pipe:0',
         '-c:v', 'libvpx', '-b:v', '0', '-crf', '34', '-an',
         '-pix_fmt', 'yuv420p', '-deadline', 'good', '-cpu-used', '3',
         str(dest_webm)],
        stdin=subprocess.PIPE)
    # JPEG, not PNG: this ffmpeg build ships only the mjpeg and libvpx
    # decoders, so a piped PNG sequence produces no stream at all. q=92 keeps
    # the intermediate generation invisible under the VP8 encode that follows.
    for fr in frames:
        buf = io.BytesIO()
        fr.save(buf, 'JPEG', quality=92)
        p.stdin.write(buf.getvalue())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError(f'ffmpeg failed on {src}')
    return len(frames), dest_webm.stat().st_size

total_before = total_after = 0
print(f'{"asset":34} {"before":>9} {"after":>9}  frames')
print('-' * 66)

for proj, name, rel in ANIMATED:
    src = SRC / rel
    before = src.stat().st_size
    n, after = encode_anim(src, OUT/proj/f'{name}.webm', OUT/proj/f'{name}.webp')
    after += (OUT/proj/f'{name}.webp').stat().st_size
    total_before += before; total_after += after
    print(f'{proj+"/"+name:34} {before/1e6:8.2f}M {after/1e6:8.2f}M  {n}')

for proj, name, rel in STILLS:
    src = SRC / rel
    before = src.stat().st_size
    after = save_webp(fit(Image.open(src), STILL_W), OUT/proj/f'{name}.webp', 82)
    total_before += before; total_after += after
    print(f'{proj+"/"+name:34} {before/1e6:8.2f}M {after/1e6:8.2f}M')

print('-' * 66)
print(f'{"TOTAL":34} {total_before/1e6:8.2f}M {total_after/1e6:8.2f}M'
      f'   ({100*(1-total_after/total_before):.0f}% smaller)')
