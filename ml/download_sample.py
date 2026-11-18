"""Download a small, reproducible research subset of the public MARIDA archive."""
import concurrent.futures
import json
from pathlib import Path
import urllib.request

BASE = 'https://data.source.coop/ntua/marida/'
ROOT = Path(__file__).resolve().parent / 'datasets' / 'marida-sample'
LIMITS = {'train': 16, 'val': 8, 'test': 10}

def read(url):
    with urllib.request.urlopen(url, timeout=90) as response:
        return response.read()

def download(item):
    split, patch = item
    scene = patch.rsplit('_', 1)[0]
    root = ROOT / split / ('S2_' + scene)
    root.mkdir(parents=True, exist_ok=True)
    for suffix in ('.tif', '_cl.tif', '_conf.tif'):
        name = 'S2_' + patch + suffix
        dest = root / name
        if not dest.exists():
            data = read(BASE + 'patches/S2_' + scene + '/' + name)
            dest.write_bytes(data)
    return split + '/' + patch

def main():
    mapping = json.loads(read(BASE + 'labels_mapping.txt'))
    chosen = {}
    for split, limit in LIMITS.items():
        patches = read(BASE + 'splits/' + split + '_X.txt').decode().split()
        groups = {}
        for patch in sorted(patches):
            if mapping['S2_' + patch + '.tif'][0] == 1:
                groups.setdefault(patch.rsplit('_', 1)[0], patch)
        # Positive-scene enrichment makes this a feasibility subset, not an operational benchmark.
        groups = dict(list(groups.items())[:limit])
        if len(groups) != limit:
            raise RuntimeError('Not enough positive scenes in ' + split)
        chosen[split] = list(groups.values())
        # Include an additional patch from each scene with no debris label where available.
        for scene in groups:
            alternatives = [p for p in patches if p.rsplit('_', 1)[0] == scene and not mapping['S2_' + p + '.tif'][0]]
            if alternatives:
                chosen[split].append(sorted(alternatives)[0])
    scenes = [{p.rsplit('_', 1)[0] for p in v} for v in chosen.values()]
    if any(scenes[i] & scenes[j] for i in range(3) for j in range(i + 1, 3)):
        raise RuntimeError('Scene leakage between splits')
    ROOT.mkdir(parents=True, exist_ok=True)
    (ROOT / 'manifest.json').write_text(json.dumps({'source':BASE,'selection':'first debris-labelled patch and, where available, one other patch per positive scene; sorted by ID','splits':chosen},indent=2),encoding='utf8')
    tasks = [(split, patch) for split, patches in chosen.items() for patch in patches]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for done in pool.map(download, tasks):
            print('Downloaded', done, flush=True)
    print('Complete:', len(tasks), 'patches', flush=True)

if __name__ == '__main__':
    main()
