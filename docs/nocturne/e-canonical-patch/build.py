"""Apply version 20 (Design Engine and Content Intelligence r2, approved 26 Oct 2026) to the Currawong
Build Plan page, additively.

Usage: python3 -I build.py <saved artifact html> <out html>
Strips the platform-injected first and last lines (as for versions 18 and 19), edits STAGES and TASKS as
data (re-serialised in the page's own format, asserted to round-trip unchanged first), asserts every text
replacement matches exactly once, then validates the result: 229 tasks, unique ids, known stages, every
dependency present, no cycles, one prompt per task. It never publishes: publish <out html> with the
Artifact tool (url https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL) after reading the live page in full.
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


def array_span(name):
    """Start and end of `var NAME = [...]`, string-aware bracket matching."""
    start = page.index(f'var {name} = [') + len(f'var {name} = ')
    depth, in_str, esc = 0, False, False
    for j in range(start, len(page)):
        c = page[j]
        if in_str:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': in_str = False
        elif c == '"': in_str = True
        elif c == '[': depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0: return start, j + 1
    raise AssertionError(name)


def dump(arr):
    return '\n  '.join(json.dumps(arr, indent=2, ensure_ascii=False).split('\n'))


def replace_array(name, mutate):
    global page
    a, b = array_span(name)
    arr = json.loads(page[a:b])
    assert dump(arr) == page[a:b], f'{name} does not round-trip; refusing to re-serialise'
    mutate(arr)
    page = page[:a] + dump(arr) + page[b:]


ADDED = sorted(int(k[4:]) for k in P if k.startswith('ADD-'))
RESTAGE = {193: 'de', 213: 'de', 194: 'de', 188: 'ci', 191: 'ci', 192: 'ci', 212: 'ci', 195: 'ci'}
DEPS = {193: [205, 218, 219], 194: [168, 218], 192: [191, 222], 195: [188, 223],
        202: [201, 226], 210: [202, 224], 208: [201, 227], 209: [201, 189, 227]}
F_MILESTONE = ('MV: every launch verified (marker, health checks, configuration readiness through task 227). '
               'MP: safe publishing (Contributor review now, the hardened gate when needed). '
               'Design Engine and Content Intelligence milestones are in stages DE and CI.')
MS = (' MS: Settings and Configuration Manager: guided feature setup, readiness, secure provider-side '
      'configuration and deployment-aware updates, built on task 227; its tasks are specified once task 201 exists.')


def stages(arr):
    ids = [s['id'] for s in arr]
    assert 'de' not in ids and 'ci' not in ids, 'already applied?'
    f = next(s for s in arr if s['id'] == 'f'); f['milestone'] = F_MILESTONE
    fx = next(s for s in arr if s['id'] == 'fx'); fx['milestone'] += MS
    i = ids.index('f')
    arr[i + 1:i + 1] = rec['stages']


def tasks(arr):
    by = {t['n']: t for t in arr}
    assert not any(t['n'] in by for t in rec['tasks']), 'already applied?'
    for n, s in RESTAGE.items():
        assert by[n]['s'] == 'f', (n, by[n]['s']); by[n]['s'] = s
    for n, d in DEPS.items():
        by[n]['deps'] = d
    for n in ADDED:
        by[n]['what'] = by[n]['what'] + ' E-series additions are in the prompt.'
    i = next(k for k, t in enumerate(arr) if t['n'] == 87)
    arr[i:i] = rec['tasks']


replace_array('STAGES', stages)
replace_array('TASKS', tasks)

# Prompts for the new tasks, before the data section.
blocks = ''.join(f'<script type="text/plain" id="p-{t["n"]}">{P["p-" + str(t["n"])]}</script>\n\n' for t in rec['tasks'])
once('<!-- ======================= DATA AND BEHAVIOUR', blocks + '<!-- ======================= DATA AND BEHAVIOUR')
# Additions to existing prompts, appended before each closing tag.
for n in ADDED:
    tag = f'<script type="text/plain" id="p-{n:02d}">'
    assert page.count(tag) == 1, tag
    i = page.index(tag); j = page.index('</script>', i)
    page = page[:j] + '\n\n' + P[f'ADD-{n}'] + page[j:]
# Text.
once('<p class="lede">214 tasks,', '<p class="lede">229 tasks,')
once('(187–214 are the newest)', '(215–229 are the newest)')
once('Updated on 25 October 2026 (version 19),', P['FOOTER'])
once('            <li>A failed payment never takes a public site offline.</li>',
     '            ' + P['DIRECTION'] + '\n            <li>A failed payment never takes a public site offline.</li>')
once('keep content readable without JavaScript.\n\nEDITING PRINCIPLE',
     'keep content readable without JavaScript.\n' + P['CONTEXT'] + '\n\nEDITING PRINCIPLE')

# Validate.
a, b = array_span('STAGES'); S = json.loads(page[a:b])
a, b = array_span('TASKS'); T = json.loads(page[a:b])
ns = [t['n'] for t in T]; sid = [s['id'] for s in S]
assert len(T) == 229 and len(set(ns)) == 229 and len(S) == 16 and len(set(sid)) == 16, (len(T), len(S))
g = {t['n']: t['deps'] for t in T}
for t in T:
    assert t['s'] in sid, t['n']
    assert all(d in g and d != t['n'] for d in t['deps']), t['n']
    pid = f'p-{t["n"]:02d}'
    assert page.count(f'<script type="text/plain" id="{pid}">') == 1, pid
seen, stack = set(), set()
def visit(n):
    assert n not in stack, f'cycle at {n}'
    if n in seen: return
    stack.add(n); [visit(d) for d in g[n]]; stack.discard(n); seen.add(n)
for n in g: visit(n)
open(out, 'w', encoding='utf8').write(page)
code = re.findall(r'<script(?![^>]*type="text/plain")[^>]*>(.*?)</script>', page, flags=re.S)
open(out + '.data.js', 'w', encoding='utf8').write('\n;\n'.join(code))
print(f'ok: {len(T)} tasks, {len(S)} stages, {len(ADDED)} additions, no cycles -> {out}')
