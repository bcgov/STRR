"""Compare one PDF dependency in the same image; never contact external resources."""

import hashlib
import json
import os
from pathlib import Path
import sys
import tomllib
from importlib.metadata import distributions, version

import pydyf
from weasyprint import HTML

mode = sys.argv[1]
assert mode in {'baseline', 'control'}
assert sys.version_info[:2] == (3, 12)
assert os.getuid() != 0
assert 'VERSION_CODENAME=bookworm' in Path('/etc/os-release').read_text()
assert version('weasyprint') == '62.3'
expected_pydyf = '0.12.1' if mode == 'baseline' else '0.11.0'
assert version('pydyf') == expected_pydyf
assert hasattr(pydyf.Stream, 'transform') is (mode == 'control')
assert pydyf.__file__.startswith('/pdf-control/') is (mode == 'control')

lock_bytes = Path('/code/poetry.lock').read_bytes()
locked = {item['name']: item['version'] for item in tomllib.loads(lock_bytes.decode())['package']}
assert locked['weasyprint'] == '62.3' and locked['pydyf'] == '0.12.1'
package_names = {item.metadata['Name'] for item in distributions()}
other_packages = sorted((name, version(name)) for name in package_names if name.lower() != 'pydyf')
digest = lambda data: hashlib.sha256(data).hexdigest()
html = '<h1>STRR synthetic PDF check</h1><p>Upgraded rendering library.</p>'
result = {
    'mode': mode, 'python': sys.version.split()[0], 'weasyprint': version('weasyprint'),
    'pydyf': version('pydyf'), 'pydyfSource': pydyf.__file__,
    'hasTransform': hasattr(pydyf.Stream, 'transform'),
    'lockSha256': digest(lock_bytes), 'htmlSha256': digest(html.encode()),
    'otherPackagesSha256': digest(json.dumps(other_packages).encode()),
    'otherPackageCount': len(other_packages), 'network': 'disabled by Docker',
}
try:
    pdf = HTML(string=html).write_pdf()
except AttributeError as error:
    assert mode == 'baseline' and str(error) == "'super' object has no attribute 'transform'", str(error)
    result.update(render='expected-transform-failure', error=str(error))
else:
    assert mode == 'control', 'Unchanged locked baseline unexpectedly rendered successfully'
    assert pdf.startswith(b'%PDF-') and b'%%EOF' in pdf[-20:] and len(pdf) > 1000
    result.update(render='passed', pdfBytes=len(pdf), pdfSha256=digest(pdf))
print(json.dumps(result))
