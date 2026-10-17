"""Local, dependency-light source validation; not a replacement for a Vite build."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures: list[str] = []

# Resolve only local imports, e.g. import ... from './lib/insights.js'.
for source in list((ROOT / 'src').rglob('*.js')) + list((ROOT / 'src').rglob('*.jsx')):
    text = source.read_text(encoding='utf-8')
    for relative in re.findall(r"(?:from\s+|import\s*)['\"](\.{1,2}/[^'\"]+)['\"]", text):
        if not (source.parent / relative).resolve().is_file():
            failures.append(f'{source.relative_to(ROOT)}: missing {relative}')

# Prevent broken relative Markdown links (ignore website URLs and #anchors).
for source in [ROOT / 'README.md', ROOT / 'START_HERE.md', *((ROOT / 'docs').glob('*.md'))]:
    content = source.read_text(encoding='utf-8')
    for address in re.findall(r"\]\(([^)]+)\)", content):
        if address.startswith(('http:', 'https:', '#', 'mailto:')):
            continue
        dest = address.split('#')[0]
        if dest and not (source.parent / dest).exists():
            failures.append(f'{source.relative_to(ROOT)}: broken Markdown link {address}')

# Compilation / import syntax for backend files without executing any network calls.
for source in (ROOT / 'server').rglob('*.py'):
    try:
        compile(source.read_text(encoding='utf-8'), str(source), 'exec')
    except SyntaxError as exc:
        failures.append(f'{source.relative_to(ROOT)}: {exc}')

print(f'Source reference check: {"PASS" if not failures else "FAIL"}')
if failures:
    print('\n'.join(failures))
    sys.exit(1)
