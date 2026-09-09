"""Exercise plans that must never reach automatic apply."""

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest


SPEC = importlib.util.spec_from_file_location(
    "check_plan", Path(__file__).parents[1] / "scripts" / "check_plan.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def resource(actions, *, importing=False, project="bcrbk9-dev", mode="managed"):
    change = {"actions": actions, "after": {"project": project}}
    if importing:
        change["importing"] = {"id": "existing-resource"}
    return {"address": "google_storage_bucket.example", "mode": mode, "change": change}


def plan(*resources, **values):
    return {"format_version": "1.2", "complete": True, "resource_changes": list(resources), **values}


class PlanPolicyTests(unittest.TestCase):
    def test_import_only_adoption(self):
        MODULE.check_plan(plan(resource(["no-op"], importing=True), resource(["no-op"])))

    def test_adoption_cannot_change_any_resource(self):
        for action in ("create", "update", "delete"):
            with self.subTest(action=action), self.assertRaises(ValueError):
                MODULE.check_plan(plan(resource(["no-op"], importing=True), resource([action])))

    def test_imported_resource_must_match_live_configuration(self):
        with self.assertRaises(ValueError):
            MODULE.check_plan(plan(resource(["update"], importing=True)))

    def test_later_dev_create_update_and_noop_are_allowed(self):
        for action in ("create", "update", "no-op"):
            with self.subTest(action=action):
                MODULE.check_plan(plan(resource([action])))

    def test_deletion_replacement_and_forget_are_rejected(self):
        for actions in (["delete"], ["delete", "create"], ["create", "delete"], ["forget"]):
            with self.subTest(actions=actions), self.assertRaises(ValueError):
                MODULE.check_plan(plan(resource(actions)))

    def test_other_environments_are_rejected(self):
        for project in ("bcrbk9-test", "bcrbk9-prod", "bcrbk9-tools"):
            with self.subTest(project=project), self.assertRaises(ValueError):
                MODULE.check_plan(plan(resource(["update"], project=project)))

    def test_moving_from_another_project_is_rejected(self):
        item = resource(["update"])
        item["change"]["before"] = {"project": "bcrbk9-prod"}
        with self.assertRaises(ValueError):
            MODULE.check_plan(plan(item))

    def test_reads_do_not_prevent_import_only_adoption(self):
        MODULE.check_plan(plan(resource(["no-op"], importing=True), resource(["read"], mode="data")))

    def test_incomplete_or_errored_plan_is_rejected(self):
        for values in ({"complete": False}, {"errored": True}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                MODULE.check_plan(plan(**values))

    def test_empty_noop_plan_is_allowed(self):
        MODULE.check_plan(plan())

    def test_unknown_format_is_rejected(self):
        for version in (None, "", "2.0"):
            with self.subTest(version=version), self.assertRaises(ValueError):
                MODULE.check_plan(plan(format_version=version))

    def test_cli_reads_plan_from_standard_input(self):
        result = subprocess.run(
            [sys.executable, SPEC.origin],
            input=json.dumps(plan(resource(["no-op"], importing=True))),
            text=True, capture_output=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Import-only adoption verified.", result.stdout)

    def test_cli_rejects_invalid_or_unsafe_input(self):
        for value in ("", "not json", json.dumps(plan(resource(["delete"])))):
            with self.subTest(value=value):
                result = subprocess.run(
                    [sys.executable, SPEC.origin],
                    input=value, text=True, capture_output=True, check=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("Terraform plan rejected:", result.stderr)


if __name__ == "__main__":
    unittest.main()
