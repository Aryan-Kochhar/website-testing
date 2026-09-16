"""Build the moving demo clips from the project repos' GIFs.

Usage:  python tools/build-demos.py          (needs ffmpeg on PATH)
        FFMPEG=/path/to/ffmpeg python tools/build-demos.py

Stills and video posters are NOT built here — those are tools/vendor-stills.py,
which needs no ffmpeg. This script only produces the .webm clips.

What changed from the first version of this pipeline, and why:

  * It no longer caps width at 720. Three of these GIFs are 1200px native and
    one is 880px, so that cap was throwing away up to 40% of the width for
    nothing. Each clip is now encoded at its source resolution.

  * It no longer pipes JPEG frames. The old pipeline went
    GIF -> JPEG(q92) -> VP8(crf 34), which is two lossy generations stacked on
    top of a GIF's 256-colour palette. Frames now go to ffmpeg as raw RGB, so
    the only lossy step is the final encode.

  * VP9 instead of VP8, at a lower crf. Roughly half the bitrate for the same
    quality, and supported everywhere that matters (Safari 14.1+). The poster
    covers anything older.

  * No frame decimation. The sources run at 12.5-14.3fps already; dropping
    every other frame to hit a target made them stutter for no real saving.
"""
import io
import os
import pathlib
import shutil
import subprocess
import sys

from PIL import Image, ImageSequence

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from _repo import fetch, even  # noqa: E402

FF = os.environ.get('FFMPEG', 'ffmpeg')
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'demos'

MAX_SECONDS = 9      # a loop, not the whole session
MAX_WIDTH = 1280     # only ever downscales; every source here is at or under
CRF = 30             # VP9: lower is better, 30 is visually clean for screencasts

ANIMATED = [
    ('quant-copilot', 'agent-run',    'Agentic-Quantitative-Research-Copilot', 'assets/02-agent-run.gif'),
    ('quant-copilot', 'landing',      'Agentic-Quantitative-Research-Copilot', 'assets/01-landing.gif'),
    ('quant-copilot', 'tool-stream',  'Agentic-Quantitative-Research-Copilot', 'assets/03-tool-stream.gif'),
    ('architech',     'city',         '-ArchiTech-', 'demo/demo.gif'),
    ('architech',     'city-2',       '-ArchiTech-', 'demo/demo2.gif'),
    ('congestion-rl', 'intersection', 'Congestion-Control-With-RL', 'congestion-control.gif'),
]


def load_frames(data):
    """Decode a GIF to a list of same-sized RGB frames, plus its frame delay."""
    im = Image.open(io.BytesIO(data))
    delay_ms = im.info.get('duration') or 70
    fps = 1000.0 / delay_ms
    limit = int(MAX_SECONDS * fps)

    frames = []
    for i, raw in enumerate(ImageSequence.Iterator(im)):
        if i >= limit:
            break
        frame = raw.convert('RGB')
        if frame.width > MAX_WIDTH:
            h = round(frame.height * MAX_WIDTH / frame.width)
            frame = frame.resize((even(MAX_WIDTH), even(h)), Image.LANCZOS)
        elif frame.width % 2 or frame.height % 2:
            frame = frame.resize((even(frame.width), even(frame.height)), Image.LANCZOS)
        frames.append(frame)

    if not frames:
        raise RuntimeError('no frames decoded')
    return frames, fps


def encode(frames, fps, dest):
    w, h = frames[0].size
    dest.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        FF, '-y', '-hide_banner', '-loglevel', 'error',
        # Raw RGB in: unambiguous, and no intermediate codec to lose detail to.
        '-f', 'rawvideo', '-pix_fmt', 'rgb24',
        '-s', f'{w}x{h}', '-framerate', f'{fps:.4f}', '-i', 'pipe:0',
        '-c:v', 'libvpx-vp9', '-crf', str(CRF), '-b:v', '0',
        '-row-mt', '1', '-cpu-used', '2', '-an',
        '-pix_fmt', 'yuv420p',
        str(dest),
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for frame in frames:
            proc.stdin.write(frame.tobytes())
        proc.stdin.close()
    except BrokenPipeError:
        # ffmpeg died early — its stderr explains why, so fall through to wait.
        pass

    err = proc.stderr.read().decode('utf-8', 'ignore').strip()
    if proc.wait() != 0:
        raise RuntimeError(err or f'ffmpeg exited {proc.returncode}')
    return dest.stat().st_size


def main():
    if not shutil.which(FF) and not os.path.exists(FF):
        print(f'ffmpeg not found (looked for {FF!r}).')
        print('Install it with:  winget install Gyan.FFmpeg')
        print('then open a new terminal so PATH picks it up.')
        return 1

    total_before = total_after = 0
    failures = []

    print(f'{"asset":30} {"gif":>9} {"webm":>9} {"was":>9}  dimensions   frames')
    print('-' * 80)

    for proj, name, repo, path in ANIMATED:
        dest = OUT / proj / f'{name}.webm'
        was = dest.stat().st_size if dest.exists() else 0
        try:
            data = fetch(repo, path)
            frames, fps = load_frames(data)
            size = encode(frames, fps, dest)
        except Exception as exc:
            failures.append((f'{proj}/{name}', str(exc)))
            print(f'{proj + "/" + name:30} {"—":>9} {"FAILED":>9}  {exc}')
            continue

        total_before += len(data)
        total_after += size
        w, h = frames[0].size
        print(f'{proj + "/" + name:30} {len(data)/1e6:8.2f}M {size/1e6:8.2f}M '
              f'{was/1e6:8.2f}M  {w}x{h:<8} {len(frames)}')

    print('-' * 80)
    print(f'{"TOTAL":30} {total_before/1e6:8.2f}M {total_after/1e6:8.2f}M')
    print('\nPosters are built separately: python tools/vendor-stills.py')

    if failures:
        print(f'\n{len(failures)} failed:')
        for name, err in failures:
            print(f'  {name}: {err}')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
