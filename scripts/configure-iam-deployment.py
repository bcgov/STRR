#!/usr/bin/env python3
"""Add STRR's non-secret IAM settings to the generated SRE deployment template."""

import argparse
import re
from pathlib import Path


def configure(app: Path) -> Path:
    """Use the same Cloud Deploy parameters as the instance and runtime identity."""
    templates = list((app / "devops/gcp/k8s").glob("*.template.yaml"))
    if len(templates) != 1:
        raise ValueError("Expected exactly one generated job or service template")
    template = templates[0]
    contents = template.read_text(encoding="utf-8")
    anchor = re.search(r"(?m)^([ \t]*)- name: DEPLOYMENT_PLATFORM\n", contents)
    if not anchor:
        raise ValueError("Generated template has no deployment environment anchor")
    indent = anchor.group(1)
    block = (
        f"{indent}- name: CLOUDSQL_INSTANCE_CONNECTION_NAME\n"
        f"{indent}  value: valuePlaceHolder # from-param: ${{cloudsql-instances}}\n"
        f"{indent}- name: DATABASE_USERNAME\n"
        f"{indent}  value: valuePlaceHolder # from-param: ${{database-iam-username}}\n"
    )
    existing = re.findall(
        r"name: (CLOUDSQL_INSTANCE_CONNECTION_NAME|DATABASE_USERNAME)\b", contents
    )
    if block in contents and len(existing) == 2:
        return template
    if existing:
        raise ValueError("Generated template already contains conflicting IAM settings")
    template.write_text(
        contents[: anchor.start()] + block + contents[anchor.start() :],
        encoding="utf-8",
    )
    return template


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "app", type=Path, help="Consumer directory, relative to the repository root"
    )
    args = parser.parse_args()
    configure(args.app)
