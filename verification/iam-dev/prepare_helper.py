"""Build the hash-pinned first-party helper in the job without cloud credentials."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

import probe

FILENAME = "cloud_sql_connector-0.2.3-py3-none-any.whl"


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--require-hashes",
            "--no-deps",
            "--no-build-isolation",
            "-r",
            str(Path(__file__).with_name("helper-source.txt")),
            "--wheel-dir",
            str(directory),
        ],
        check=True,
    )
    wheel = directory / FILENAME
    with zipfile.ZipFile(wheel) as archive:
        module = archive.read("cloud_sql_connector/connector.py")
    if hashlib.sha256(module).hexdigest() != probe.HELPER_SHA256:
        raise ValueError("helper_source_mismatch")
    digest = hashlib.sha256(wheel.read_bytes()).hexdigest()
    (directory / "manifest.json").write_text(
        json.dumps({"filename": FILENAME, "sha256": digest, "helperCommit": probe.HELPER_COMMIT}) + "\n"
    )
    (directory / "requirements.txt").write_text(
        f"cloud-sql-connector @ {wheel.resolve().as_uri()} --hash=sha256:{digest}\n"
    )


if __name__ == "__main__":
    prepare(Path(sys.argv[1]))
