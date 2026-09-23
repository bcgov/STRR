"""Render the reviewed probe and locked dependencies into a no-source build."""

import base64
import hashlib
import json
from pathlib import Path
import sys

import prepare_helper
import probe

DIRECTORY = Path(__file__).resolve().parent
IMAGE = "python:3.12.14-slim-bookworm@sha256:392307d22300de8b5986851a12d9176dfc0fc073e65bf6523ebd7dcbeb23564e"


def build_config(wheel_directory):
    """Use checked-out files, with no runtime project, identity or SQL inputs."""
    requirements = (DIRECTORY / "requirements.txt").read_text()
    probe_source = (DIRECTORY / "probe.py").read_text()
    manifest = json.loads((wheel_directory / "manifest.json").read_text())
    if manifest["filename"] != prepare_helper.FILENAME or manifest["helperCommit"] != probe.HELPER_COMMIT:
        raise ValueError("unexpected_helper_manifest")
    wheel = (wheel_directory / prepare_helper.FILENAME).read_bytes()
    digest = hashlib.sha256(wheel).hexdigest()
    if digest != manifest["sha256"]:
        raise ValueError("helper_wheel_hash_mismatch")
    encoded = base64.b64encode(wheel).decode("ascii")
    script = f"""#!/usr/bin/env bash
set -euo pipefail
cat > /tmp/requirements.txt <<'REQUIREMENTS'
{requirements}REQUIREMENTS
if ! python -m pip install --disable-pip-version-check --no-cache-dir --only-binary :all: \
  --require-hashes -r /tmp/requirements.txt >/dev/null 2>&1; then
  echo '{{"success":false,"errorStage":"dependency_install"}}'
  exit 1
fi
python - <<'WHEEL'
import base64
from pathlib import Path
Path('/tmp/{prepare_helper.FILENAME}').write_bytes(base64.b64decode('{encoded}'))
Path('/tmp/helper-requirements.txt').write_text(
    'cloud-sql-connector @ file:///tmp/{prepare_helper.FILENAME} --hash=sha256:{digest}\\n')
WHEEL
if ! python -m pip install --disable-pip-version-check --no-cache-dir --only-binary :all: \
  --no-index --no-deps --require-hashes -r /tmp/helper-requirements.txt >/dev/null 2>&1; then
  echo '{{"success":false,"errorStage":"helper_install"}}'
  exit 1
fi
python - <<'PROBE'
{probe_source}PROBE
"""
    return {
        "timeout": "600s",
        "options": {"logging": "CLOUD_LOGGING_ONLY"},
        "tags": ["strr-dev-iam-verification"],
        "steps": [{"name": IMAGE, "id": "dev-iam-catalog", "script": script}],
    }


if __name__ == "__main__":
    print(json.dumps(build_config(Path(sys.argv[1]))))
