"""Render the reviewed probe and locked dependencies into a no-source build."""

import json
from pathlib import Path

DIRECTORY = Path(__file__).resolve().parent
IMAGE = "python:3.12.14-slim-bookworm@sha256:392307d22300de8b5986851a12d9176dfc0fc073e65bf6523ebd7dcbeb23564e"
HELPER = (
    "https://github.com/bcgov/sbc-connect-common/archive/"
    "395a3bdd402d918f2ba3df6d6cf26a629872a121.tar.gz"
    "#subdirectory=python/cloud-sql-connector"
)


def build_config():
    """Use checked-out files, with no runtime project, identity or SQL inputs."""
    requirements = (DIRECTORY / "requirements.txt").read_text()
    probe = (DIRECTORY / "probe.py").read_text()
    script = f"""#!/usr/bin/env bash
set -euo pipefail
cat > /tmp/requirements.txt <<'REQUIREMENTS'
{requirements}REQUIREMENTS
if ! python -m pip install --disable-pip-version-check --no-cache-dir \
  --require-hashes -r /tmp/requirements.txt >/dev/null 2>&1; then
  echo '{{"success":false,"errorStage":"dependency_install"}}'
  exit 1
fi
if ! python -m pip install --disable-pip-version-check --no-cache-dir \
  --no-deps --no-build-isolation '{HELPER}' >/dev/null 2>&1; then
  echo '{{"success":false,"errorStage":"helper_install"}}'
  exit 1
fi
python - <<'PROBE'
{probe}PROBE
"""
    return {
        "timeout": "600s",
        "options": {"logging": "CLOUD_LOGGING_ONLY"},
        "tags": ["strr-dev-iam-verification"],
        "steps": [{"name": IMAGE, "id": "dev-iam-catalog", "script": script}],
    }


if __name__ == "__main__":
    print(json.dumps(build_config()))
