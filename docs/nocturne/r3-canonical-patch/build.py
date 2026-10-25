"""Apply revision 3 (approved 25 Oct 2026) to the Currawong Build Plan page, additively.

Usage: python3 -I build.py <saved artifact html> <out html>
Strips the platform-injected first and last lines (as for version 18), asserts every replacement
matches exactly once, and validates the data. It never publishes; publish <out html> with the
Artifact tool (url https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL) after reading the page.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding='utf8').read().split('\n')
page = '\n'.join(lines[1:-1])
rec = json.load(open(os.path.join(HERE, 'records.json'), encoding='utf8'))
raw = open(os.path.join(HERE, 'prompts.txt'), encoding='utf8').read()
parts = re.split(r'^=== ([A-Za-z0-9-]+) ===\n', raw, flags=re.M)
P = {parts[i]: parts[i + 1].rstrip('\n') for i in range(1, len(parts), 2)}

def once(old, new):
    global page
    assert page.count(old) == 1, f'{page.count(old)}x: {old[:70]!r}'
    page = page.replace(old, new)

def js(obj, indent='    '):
    body = json.dumps(obj, indent=2, ensure_ascii=False)
    return '\n'.join(indent + l for l in body.split('\n'))

# 1. Stages: f after "now" (before q0), fx before p3.
st = {s['id']: s for s in rec['stages']}
once('    {\n      "id": "q0",', js(st['f']) + ',\n    {\n      "id": "q0",')
once('    {\n      "id": "p3",', js(st['fx']) + ',\n    {\n      "id": "p3",')
# 2. Tasks 187-214 before task 87 (the version 18 insertion point).
once('    {\n      "n": 87,', ',\n'.join(js(t) for t in rec['tasks']) + ',\n    {\n      "n": 87,')
# 3. Prompts before the data section.
blocks = ''.join(f'<script type="text/plain" id="p-{t["n"]}">{P["p-" + str(t["n"])]}</script>\n\n' for t in rec['tasks'])
once('<!-- ======================= DATA AND BEHAVIOUR', blocks + '<!-- ======================= DATA AND BEHAVIOUR')
# 4. Additions to existing prompts (appended before each closing tag) and task summaries.
for n in (11, 31, 32, 64, 77, 128, 180):
    tag = f'<script type="text/plain" id="p-{n:02d}">' if n < 100 else f'<script type="text/plain" id="p-{n}">'
    assert page.count(tag) == 1, tag
    i = page.index(tag); j = page.index('</script>', i)
    page = page[:j] + '\n\n' + P[f'ADD-{n}'] + page[j:]
    m = re.search(r'(\{\n      "n": %d,\n(?:.*\n)*?      "what": ")(.*?)(",\n)' % n, page)
    assert m, n
    page = page[:m.start(2)] + m.group(2) + ' Revision 3 additions are in the prompt.' + page[m.end(2):]
# 5. Text updates.
once('<p class="lede">186 tasks,', '<p class="lede">214 tasks,')
once('(181–186 are the newest)', '(187–214 are the newest)')
once('home page JavaScript at most 200 KB gzipped (tests/e2e/performance.spec.ts; do not raise JS_BUDGET_KB)',
     'home page JavaScript within JS_BUDGET_KB, about 220 KB gzipped with almost no headroom (tests/e2e/performance.spec.ts; do not raise it)')
once('You are working in currawong-ops, Currawong Creative\'s private agency dashboard.',
     'You are working in nocturne-foundation (planned earlier as currawong-ops), Currawong Creative\'s Foundation app: one Next.js app that runs locally first (version 0, no sign-in, credentials in .env.local) and is hosted later with the rules below.')
once('<code>currawong-ops</code> repo.', '<code>nocturne-foundation</code> repo (planned earlier as <code>currawong-ops</code>).')
m = re.search(r'(<li>Hybrid architecture:[^<]*)(</li>)', page); assert m
page = page[:m.end(1)] + ' Revised 25 October 2026: Foundation starts as one local Next.js app (stage FX), hosted later.' + page[m.end(1):]
m = re.search(r'(<li>A Sanity organisation per client[^<]*)(</li>)', page); assert m
page = page[:m.end(1)] + ' From 25 October 2026: clients start as Contributors and Currawong publishes their drafts (tasks 205–206) until a hardened self-service gate exists (tasks 190, 196, 214).' + page[m.end(1):]
once('Updated on 24 October 2026 (version 18),',
     'Updated on 25 October 2026 (version 19), after the Nocturne revision 3 planning review (docs/nocturne/ in the template repo): added stage F, verified foundations (tasks 187–198, 205, 206, 212–214: a verification marker, JSON-LD tests, a daily health workflow, a client-editable field registry, agency review of Contributor drafts, content contract v2 for services and locations, section contract v2, and a hardened self-service publish gate built only when a client needs it), stage FX, the Nocturne Foundation app (tasks 199–202, 207–211: scripted provisioning, then one local Next.js app, then Search Health), and tasks 197, 203 and 204 in P3 (site recipes, the Cloudflare experiment and a mobile proof, each when triggered). Tasks 11, 31, 32, 64, 77, 128 and 180 gained additions (plan safety, Contributor clients, the marker and timings). Task 42 is carried by tasks 199 and 211, and task 52 by tasks 202 and 210. The approved direction now has clients as Contributors and Foundation as a local-first app; the Ops context describes nocturne-foundation. Every earlier task, status and note kept. Earlier, on 24 October 2026 (version 18),')

# 6. Validate.
data = page[page.index('<!-- ======================= DATA AND BEHAVIOUR'):]
def grab(name):
    i = data.index(f'var {name} = [') + len(f'var {name} = '); d = 0; q = None; esc = False
    for k in range(i, len(data)):
        c = data[k]
        if q:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == q: q = None
        elif c in '"\'': q = c
        elif c == '[': d += 1
        elif c == ']':
            d -= 1
            if d == 0: return json.loads(data[i:k + 1])
S, T = grab('STAGES'), grab('TASKS')
ids = sorted(t['n'] for t in T); sids = {s['id'] for s in S}
assert ids == list(range(1, 215)), 'ids not 1..214'
assert all(t['s'] in sids for t in T), 'unknown stage'
assert all(d in ids for t in T for d in t['deps']), 'dangling dep'
pids = {int(p) for p in re.findall(r'<script type="text/plain" id="p-(\d+)">', page)}
assert pids == set(ids), 'prompt mismatch'
script = data[data.index('<script>') + len('<script>'):data.index('</script>', data.index('<script>'))]
open(out + '.data.js', 'w', encoding='utf8').write(script)
open(out, 'w', encoding='utf8').write(page)
print(f'OK: {len(S)} stages, {len(T)} tasks, {len(pids)} prompts -> {out}')
