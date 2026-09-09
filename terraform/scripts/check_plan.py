"""Check the saved DEV plan before an automatic Terraform apply."""

import json
import sys
from pathlib import Path


def check_plan(plan):
    if str(plan.get("format_version", "")).split(".")[0] != "1":
        raise ValueError("Unsupported or missing Terraform plan format.")
    if plan.get("errored") or plan.get("complete") is False:
        raise ValueError("Terraform must produce a complete, successful plan.")

    resources = [
        resource
        for resource in plan.get("resource_changes", [])
        if resource.get("mode") == "managed"
    ]
    adopting = any(resource["change"].get("importing") for resource in resources)
    for resource in resources:
        change = resource["change"]
        actions = change.get("actions")
        if actions not in (["no-op"], ["create"], ["update"]):
            raise ValueError(f"{resource['address']}: automatic deletion/replacement is not allowed.")
        if adopting and actions != ["no-op"]:
            raise ValueError(f"{resource['address']}: initial adoption must only import unchanged resources.")
        for values in (change.get("before"), change.get("after")):
            project = (values or {}).get("project")
            if project is not None and project != "bcrbk9-dev":
                raise ValueError(f"{resource['address']}: only bcrbk9-dev is allowed.")

    return "Import-only adoption verified." if adopting else "DEV plan contains no deletions or replacements."


if __name__ == "__main__":
    try:
        print(check_plan(json.loads(Path(sys.argv[1]).read_text())))
    except (ValueError, KeyError, TypeError, IndexError, OSError) as error:
        print(f"Terraform plan rejected: {error}", file=sys.stderr)
        sys.exit(1)
