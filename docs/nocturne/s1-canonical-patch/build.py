"""Apply version 21 (Settings, Configuration and Feature Setup, S1 r2, approved 26 Oct 2026) to the Currawong
Build Plan page, additively.

Usage: python3 -I build.py <saved artifact html> <out html>
Strips the platform-injected first and last lines (as for versions 18-20), edits STAGES and TASKS as data
(re-serialised in the page's own format, asserted to round-trip unchanged first), replaces task 227's prompt,
adds prompts for 230-235, appends additions to existing prompts, asserts every text replacement matches
exactly once, then validates: 235 tasks, unique ids, known stages, every dependency present, no cycles, one
prompt per task. It never publishes: publish <out html> with the Artifact tool
(url https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL) after reading the live page in full.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding='utf8').read().split('\n')
page = '\n'.join(lines[1:-1])
rec = json.load(open(os.path.join(HERE, 'records.json'), encoding='utf8'))
raw = open(os.path.join(HERE, 'prompts.txt'), encoding='utf8').read()
parts = re.split(r'^=== ([A-Za-z0-9_-]+) ===\n', raw, flags=re.M)
P = {parts[i]: parts[i + 1].rstrip('\n') for i in range(1, len(parts), 2)}
for k, v in P.items():
    assert '</script' not in v.lower(), k


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


NEW = [t['n'] for t in rec['tasks']]
ADDED = rec['added']
DEPS_ADD = {200: [233], 209: [230, 231]}


def stages(arr):
    f = next(s for s in arr if s['id'] == 'f')
    assert 'MS0' not in f['milestone'], 'already applied?'
    f['milestone'] = P['F_MS']
    fx = next(s for s in arr if s['id'] == 'fx')
    assert fx['milestone'].count(P['FX_MS_OLD']) == 1, 'fx milestone changed since v20'
    fx['milestone'] = fx['milestone'].replace(P['FX_MS_OLD'], P['FX_MS_NEW'])


def tasks(arr):
    by = {t['n']: t for t in arr}
    assert not any(n in by for n in NEW), 'already applied?'
    t227 = by[227]
    for key in ('t', 'what', 'why', 'files'):
        t227[key] = rec['task227'][key]
    for n, extra in DEPS_ADD.items():
        for d in extra:
            assert d not in by[n]['deps']
        by[n]['deps'] = by[n]['deps'] + extra
    for n in ADDED:
        by[n]['what'] = by[n]['what'] + ' Settings (S1) additions are in the prompt.'
    i = next(k for k, t in enumerate(arr) if t['n'] == 227)
    arr[i + 1:i + 1] = rec['tasks']


replace_array('STAGES', stages)
replace_array('TASKS', tasks)

# Task 227's prompt is replaced (the v20 text stays in docs/nocturne/e-canonical-patch/prompts.txt).
tag = '<script type="text/plain" id="p-227">'
assert page.count(tag) == 1
i = page.index(tag) + len(tag); j = page.index('</script>', i)
page = page[:i] + P['p-227'] + page[j:]
# Prompts for the new tasks, before the data section, in record order.
blocks = ''.join(f'<script type="text/plain" id="p-{n}">{P["p-" + str(n)]}</script>\n\n' for n in NEW)
once('<!-- ======================= DATA AND BEHAVIOUR', blocks + '<!-- ======================= DATA AND BEHAVIOUR')
# Additions to existing prompts, appended before each closing tag.
for n in ADDED:
    tag = f'<script type="text/plain" id="p-{n:02d}">'
    assert page.count(tag) == 1, tag
    i = page.index(tag); j = page.index('</script>', i)
    page = page[:j] + '\n\n' + P[f'ADD-{n}'] + page[j:]
# Text.
once('<p class="lede">229 tasks,', '<p class="lede">235 tasks,')
once('(215–229 are the newest)', '(230–235 are the newest)')
once('Updated on 26 October 2026 (version 20),', P['FOOTER'])
once('            <li>A failed payment never takes a public site offline.</li>',
     '            ' + P['DIRECTION'] + '\n            <li>A failed payment never takes a public site offline.</li>')
once("- Server-only modules import 'server-only'. Secrets never get a NEXT_PUBLIC_ prefix.\n",
     "- Server-only modules import 'server-only'. Secrets never get a NEXT_PUBLIC_ prefix.\n" + P['CONTEXT'] + '\n')
once('Ops mirrors what it needs and records what no provider knows.\n',
     'Ops mirrors what it needs and records what no provider knows.\n' + P['OPSCTX'] + '\n')

# Validate.
a, b = array_span('STAGES'); S = json.loads(page[a:b])
a, b = array_span('TASKS'); T = json.loads(page[a:b])
ns = [t['n'] for t in T]; sid = [s['id'] for s in S]
assert len(T) == 235 and len(set(ns)) == 235 and len(S) == 16 and len(set(sid)) == 16, (len(T), len(S))
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
print(f'ok: {len(T)} tasks, {len(S)} stages, {len(NEW)} new, {len(ADDED)} additions, no cycles -> {out}')
