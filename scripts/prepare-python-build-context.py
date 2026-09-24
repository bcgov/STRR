"""Stage one application and its STRR shared package for Docker or Cloud Build."""

import argparse
import shutil
import subprocess
from pathlib import Path


def prepare_context(app_directory: Path, destination: Path) -> None:
    repo_root = Path(__file__).resolve().parents[1]
    app_directory = app_directory.resolve().relative_to(repo_root)
    if not (repo_root / app_directory / "Dockerfile").is_file():
        raise FileNotFoundError("Application Dockerfile is missing")
    shared_directory = Path("shared/python/cloud-sql-connector")
    if not (repo_root / shared_directory / "pyproject.toml").is_file():
        raise FileNotFoundError("STRR shared Cloud SQL package is missing")

    files = subprocess.check_output(
        [
            "git",
            "ls-files",
            "-z",
            "--cached",
            "--others",
            "--exclude-standard",
            "--",
            str(app_directory),
            str(shared_directory),
        ],
        cwd=repo_root,
    ).decode().split("\0")
    for filename in filter(None, files):
        source = repo_root / filename
        if not source.is_file():
            continue
        relative = Path(filename)
        if relative.is_relative_to(shared_directory):
            target = destination / "_shared" / relative.relative_to("shared")
        else:
            target = destination / relative.relative_to(app_directory)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("app_directory", type=Path)
    parser.add_argument("destination", type=Path)
    arguments = parser.parse_args()
    prepare_context(arguments.app_directory, arguments.destination)
