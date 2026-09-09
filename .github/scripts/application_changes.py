"""Keep infrastructure-only pushes out of application promotion workflows."""

import json
import os
from pathlib import Path
import subprocess
import sys


def git(*args, **kwargs):
    return subprocess.check_output(["git", *args], text=True, **kwargs).strip()


def application_changed(event, directories):
    before, after = event["before"], event["after"]
    if before == "0" * 40:
        # A new branch has no previous tip. Compare all commits in the push.
        first = event["commits"][0]["id"] if event.get("commits") else after
        parents = git("rev-list", "--parents", "-n", "1", first).split()
        before = parents[1] if len(parents) > 1 else git("hash-object", "-t", "tree", "--stdin", input="")
    paths = git("diff", "--name-only", "--no-renames", "-z", before, after, "--").split("\0")
    return any(path.startswith(f"{directory.rstrip('/')}/") for path in paths for directory in directories)


if __name__ == "__main__":
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    changed = application_changed(event, sys.argv[1:])
    with Path(os.environ["GITHUB_OUTPUT"]).open("a") as output:
        output.write(f"application={str(changed).lower()}\n")
