"""Extract actual diagnostics without replacing xcodebuild's exit status."""
from pathlib import Path
print('### iOS diagnostics')
found = False
for path in sorted(Path('ios/results').glob('*.log')):
    for line in path.read_text(errors='replace').splitlines():
        if any(term in line.lower() for term in ('error:', 'failed', 'timed out', 'could not resolve')):
            print(f'- {path.name}: {line[:800]}')
            found = True
if not found:
    print('No compiler diagnostic captured. Inspect job setup, dependency resolution and simulator logs.')
