"""Fetching source assets out of the project repos.

Shared by vendor-stills.py (all still images, including video posters) and
build-demos.py (the moving clips). Neither needs a local checkout.

The repos do not agree on a default branch name — Resonance's is `final` —
and the unauthenticated GitHub API allows only 60 calls an hour. When that
runs out the lookup fails silently, everything falls back to `main`, and every
fetch 404s against a branch that does not exist. So: ask the API once, always
keep fallbacks, and remember whichever branch actually served a file.
"""
import json
import urllib.error
import urllib.request

OWNER = 'Aryan-Kochhar'
CANDIDATE_BRANCHES = ('main', 'master', 'final')

_known = {}


def _api_default_branch(repo):
    try:
        with urllib.request.urlopen(f'https://api.github.com/repos/{OWNER}/{repo}', timeout=20) as r:
            return json.load(r).get('default_branch')
    except Exception:
        return None


def _branch_order(repo):
    if repo in _known:
        return [_known[repo]]
    order = []
    api = _api_default_branch(repo)
    if api:
        order.append(api)
    for c in CANDIDATE_BRANCHES:
        if c not in order:
            order.append(c)
    return order


def fetch(repo, path, timeout=120):
    """Raw bytes of one file, trying each plausible branch in turn."""
    last = None
    for branch in _branch_order(repo):
        url = f'https://raw.githubusercontent.com/{OWNER}/{repo}/{branch}/{path}'
        try:
            with urllib.request.urlopen(url, timeout=timeout) as r:
                data = r.read()
            _known[repo] = branch
            return data
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise
            last = exc
    raise last or RuntimeError(f'could not fetch {repo}/{path}')


def even(n):
    """VP9 with yuv420p needs both dimensions divisible by two."""
    return n if n % 2 == 0 else n - 1
