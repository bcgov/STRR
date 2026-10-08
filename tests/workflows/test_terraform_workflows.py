"""Exercise the actual workflow gates without cloud credentials or deployments."""

import os
import json
from pathlib import Path
import re
import subprocess
import tempfile
from types import SimpleNamespace
import unittest

import yaml


REPOSITORY = Path(__file__).resolve().parents[2]
WORKFLOWS = REPOSITORY / ".github" / "workflows"
CALLERS = {
    "strr-api-cd.yaml": ("strr-api-cd", "api"),
    "strr-email-cd.yaml": ("strr-email-cd", "email"),
    "strr-batch-validator-listener-cd.yaml": ("batch-permit-listener-cd", "validation"),
    "strr-batch-validator-job-cd.yaml": ("batch-permit-job-cd", "validation"),
}


def load_workflow(filename):
    # BaseLoader preserves GitHub's `on` key instead of treating it as YAML 1.1 true.
    return yaml.load((WORKFLOWS / filename).read_text(), Loader=yaml.BaseLoader)


def evaluate_gate(expression, **contexts):
    """Evaluate the boolean subset used in the checked-in GitHub expressions."""
    expression = " ".join(expression.split())
    expression = expression.replace("&&", " and ").replace("||", " or ")
    expression = expression.replace("!cancelled()", "not cancelled()")
    return bool(eval(expression, {"__builtins__": {}}, contexts))


class DeploymentGatesTest(unittest.TestCase):
    def test_only_protected_main_dev_runs_terraform(self):
        for filename in CALLERS:
            gate = load_workflow(filename)["jobs"]["terraform"]["if"]
            for protected in (False, True):
                for branch in ("main", "feature-example", "hotfix-example", "release-example", "Jacky/example"):
                    for event, target in (
                        ("push", ""),
                        ("workflow_dispatch", "dev"),
                        ("workflow_dispatch", "test"),
                        ("workflow_dispatch", "uat"),
                        ("workflow_dispatch", "sandbox"),
                        ("workflow_dispatch", "prod"),
                        ("workflow_dispatch", ""),
                        ("pull_request", "dev"),
                    ):
                        with self.subTest(file=filename, protected=protected, branch=branch, event=event, target=target):
                            actual = evaluate_gate(
                                gate,
                                github=SimpleNamespace(
                                    ref_protected=protected,
                                    ref=f"refs/heads/{branch}",
                                    event_name=event,
                                ),
                                inputs=SimpleNamespace(target=target),
                            )
                            expected = (
                                protected
                                and branch == "main"
                                and (event, target) in (("push", ""), ("workflow_dispatch", "dev"))
                            )
                            self.assertEqual(actual, expected)

    def test_deployment_requires_success_or_intentional_skip(self):
        for filename, (job_name, _) in CALLERS.items():
            job = load_workflow(filename)["jobs"][job_name]
            self.assertEqual(job["needs"], "terraform")
            for result in ("success", "skipped", "failure", "cancelled"):
                for cancelled in (False, True):
                    with self.subTest(file=filename, result=result, cancelled=cancelled):
                        actual = evaluate_gate(
                            job["if"],
                            needs=SimpleNamespace(terraform=SimpleNamespace(result=result)),
                            github=SimpleNamespace(event_name="push", ref="refs/heads/main"),
                            cancelled=lambda: cancelled,
                        )
                        self.assertEqual(actual, not cancelled and result in ("success", "skipped"))

    def test_infrastructure_pushes_only_use_the_main_terraform_workflow(self):
        runner = load_workflow("strr-terraform.yaml")
        self.assertEqual(runner["on"]["push"]["branches"], ["main"])
        self.assertIn("terraform/**", runner["on"]["push"]["paths"])
        for filename in CALLERS:
            workflow = load_workflow(filename)
            self.assertNotIn("changes", workflow["jobs"])
            self.assertFalse(any(path.startswith("terraform/") for path in workflow["on"]["push"]["paths"]))
            self.assertEqual(workflow["on"]["push"]["branches"], ["main", "feature*", "hotfix*", "release*"])

    def test_existing_workflow_edits_still_trigger_application_deployments(self):
        for filename in ("strr-email-cd.yaml", "strr-batch-validator-job-cd.yaml"):
            self.assertIn(f".github/workflows/{filename}", load_workflow(filename)["on"]["push"]["paths"])

    def test_stack_ownership_and_shared_validation_lock(self):
        runner = load_workflow("strr-terraform.yaml")["jobs"]["terraform"]
        groups = {}
        for filename, (_, stack) in CALLERS.items():
            workflow = load_workflow(filename)
            caller = workflow["jobs"]["terraform"]
            self.assertEqual(caller["uses"], "./.github/workflows/strr-terraform.yaml")
            self.assertEqual(caller["with"]["stack"], stack)
            self.assertEqual(caller["with"]["action"], "apply")
            groups[filename] = runner["concurrency"]["group"].replace("${{ matrix.stack }}", stack)
        self.assertEqual(groups["strr-batch-validator-listener-cd.yaml"], groups["strr-batch-validator-job-cd.yaml"])
        self.assertEqual(len(set(groups.values())), 3)
        self.assertEqual(runner["concurrency"]["queue"], "max")
        self.assertEqual(runner["concurrency"]["cancel-in-progress"], "false")


class TerraformRunnerTest(unittest.TestCase):
    def test_terraform_paths_and_variable_files_exist(self):
        runner = load_workflow("strr-terraform.yaml")["jobs"]["terraform"]
        ci = load_workflow("strr-terraform-ci.yaml")["jobs"]["configuration"]
        for stack in ci["strategy"]["matrix"]["stack"]:
            directory = ci["defaults"]["run"]["working-directory"].replace("${{ matrix.stack }}", stack)
            root = REPOSITORY / directory
            self.assertTrue(root.is_dir(), root)
            self.assertTrue((root / "tests").is_dir(), root)
            for job in (runner, ci):
                for step in job["steps"]:
                    for directory in re.findall(r'-chdir="([^"]+)"', step.get("run", "")):
                        self.assertEqual(REPOSITORY / directory.replace("$TF_STACK", stack), root)
                    for filename in re.findall(r"-var-file[= ]([^\s]+)", step.get("run", "")):
                        self.assertTrue((root / filename).is_file(), root / filename)

    def test_input_validation_and_apply_branch_guard(self):
        steps = load_workflow("strr-terraform.yaml")["jobs"]["terraform"]["steps"]
        self.assertEqual(steps[0]["name"], "Validate inputs and apply branch")
        for stack in ("api", "email", "validation", "../api", "", "api; echo unexpected"):
            for action in ("plan", "apply", "bootstrap", "destroy"):
                for branch, protected in (("main", "true"), ("main", "false"), ("Jacky/example", "true")):
                    with self.subTest(stack=stack, action=action, branch=branch, protected=protected):
                        result = subprocess.run(
                            ["bash", "-e", "-o", "pipefail", "-c", steps[0]["run"]],
                            env={
                                **os.environ,
                                "TF_STACK": stack,
                                "TF_ACTION": action,
                                "GITHUB_EVENT_NAME": "workflow_dispatch",
                                "GITHUB_REF": f"refs/heads/{branch}",
                                "REF_PROTECTED": protected,
                            },
                            capture_output=True,
                            text=True,
                            check=False,
                        )
                        expected = (
                            stack in ("api", "email", "validation")
                            and action in ("plan", "apply", "bootstrap")
                            and (action == "plan" or (branch == "main" and protected == "true"))
                        )
                        self.assertEqual(result.returncode == 0, expected, result.stderr)

    def test_plan_policy_gates_the_saved_plan_apply(self):
        steps = load_workflow("strr-terraform.yaml")["jobs"]["terraform"]["steps"]
        names = [step["name"] for step in steps]
        plan = steps[names.index("Terraform plan")]
        check = steps[names.index("Check plan safety")]
        apply = steps[names.index("Terraform apply")]
        self.assertLess(names.index("Terraform plan"), names.index("Check plan safety"))
        self.assertLess(names.index("Check plan safety"), names.index("Terraform apply"))
        self.assertIn("-out=tfplan", plan["run"])
        self.assertIn("show -json tfplan", check["run"])
        self.assertIn("jq -e", check["run"])
        self.assertNotIn("continue-on-error", check)
        self.assertEqual(apply["if"], "env.TF_ACTION != 'plan'")
        self.assertTrue(apply["run"].endswith(" tfplan"))

    def test_bootstrap_is_manual_and_replans_before_apply(self):
        steps = load_workflow("strr-terraform.yaml")["jobs"]["terraform"]["steps"]
        names = [step["name"] for step in steps]
        bootstrap = steps[names.index("Import existing resources")]
        self.assertEqual(bootstrap["if"], "env.TF_ACTION == 'bootstrap'")
        self.assertLess(names.index("Import existing resources"), names.index("Check plan safety"))
        self.assertIn("-detailed-exitcode", steps[-1]["run"])
        for event in ("push", "pull_request", "workflow_call"):
            result = subprocess.run(
                ["bash", "-e", "-o", "pipefail", "-c", steps[0]["run"]],
                env={**os.environ, "TF_STACK": "api", "TF_ACTION": "bootstrap",
                     "GITHUB_EVENT_NAME": event, "GITHUB_REF": "refs/heads/main", "REF_PROTECTED": "true"},
                capture_output=True, text=True,
            )
            self.assertNotEqual(result.returncode, 0)

    def test_pr_checks_have_no_cloud_authentication(self):
        workflow = load_workflow("strr-terraform-ci.yaml")
        self.assertIn("pull_request", workflow["on"])
        self.assertNotIn("pull_request_target", workflow["on"])
        self.assertEqual(workflow["permissions"], {"contents": "read"})
        for job in workflow["jobs"].values():
            self.assertNotIn("environment", job)
            self.assertNotIn("permissions", job)
            for step in job["steps"]:
                self.assertNotIn("google-github-actions/auth", step.get("uses", ""))
                self.assertNotIn("upload-artifact", step.get("uses", ""))


class BootstrapSafetyTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        terraform = self.directory / "terraform"
        terraform.write_text("""#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
root = Path(os.environ['RUNNER_TEMP'])
args = sys.argv[2:]
with (root / 'calls.jsonl').open('a') as output:
    output.write(json.dumps(args) + '\\n')
if args[0] == 'show':
    print((root / 'plan.json').read_text())
if args[0] == 'import' and os.environ.get('FAIL_IMPORT') == 'true':
    sys.exit(1)
""")
        terraform.chmod(0o700)
        self.steps = {step["name"]: step for step in load_workflow("strr-terraform.yaml")["jobs"]["terraform"]["steps"]}

    def run_step(self, name, resources, action="bootstrap", fail_import=False, **metadata):
        plan = {"format_version": "1.2", "complete": True, "resource_changes": resources, **metadata}
        (self.directory / "plan.json").write_text(json.dumps(plan))
        return subprocess.run(
            ["bash", "-e", "-o", "pipefail", "-c", self.steps[name]["run"]],
            env={**os.environ, "PATH": f"{self.directory}:{os.environ['PATH']}", "RUNNER_TEMP": str(self.directory),
                 "TF_STACK": "api", "TF_ACTION": action, "FAIL_IMPORT": str(fail_import).lower()},
            capture_output=True, text=True,
        )

    @staticmethod
    def resource(actions, importing=False, project="bcrbk9-dev", **changes):
        before = {"project": project, "logging": [], "versioning": [], "lifecycle_rule": [], "name": "existing-bucket"}
        item = {"address": "google_storage_bucket.example", "type": "google_storage_bucket", "mode": "managed",
                "change": {"actions": actions, "before": before, "after": {**before, **changes}}}
        if importing:
            item["change"]["importing"] = {"id": "projects/bcrbk9-dev/topics/example roles/pubsub.publisher serviceAccount:example"}
        return item

    def test_bootstrap_import_preserves_ids_and_never_applies_the_preimport_plan(self):
        item = self.resource(["update"], importing=True, versioning=[{"enabled": True}])
        result = self.run_step("Import existing resources", [item])
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line) for line in (self.directory / "calls.jsonl").read_text().splitlines()]
        self.assertEqual([call[0] for call in calls], ["show", "import", "plan"])
        self.assertEqual(calls[1][-2:], [item["address"], item["change"]["importing"]["id"]])
        self.assertIn("-lock-timeout=5m", calls[1])
        self.assertIn("-out=tfplan", calls[2])

    def test_partial_import_failure_stops_without_replanning_or_applying(self):
        result = self.run_step("Import existing resources", [self.resource(["no-op"], importing=True)], fail_import=True)
        self.assertNotEqual(result.returncode, 0)
        calls = [json.loads(line)[0] for line in (self.directory / "calls.jsonl").read_text().splitlines()]
        self.assertEqual(calls, ["show", "import"])

    def test_bootstrap_retry_skips_resources_already_in_state(self):
        result = self.run_step("Import existing resources", [self.resource(["no-op"])])
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = [json.loads(line)[0] for line in (self.directory / "calls.jsonl").read_text().splitlines()]
        self.assertEqual(calls, ["show", "plan"])

    def test_bootstrap_rejects_incomplete_and_other_environment_plans_before_import(self):
        for project, complete in (("bcrbk9-prod", True), ("bcrbk9-dev", False)):
            with self.subTest(project=project, complete=complete):
                (self.directory / "calls.jsonl").write_text("")
                result = self.run_step("Import existing resources", [self.resource(["no-op"], importing=True, project=project)], complete=complete)
                self.assertNotEqual(result.returncode, 0)
                calls = [json.loads(line)[0] for line in (self.directory / "calls.jsonl").read_text().splitlines()]
                self.assertEqual(calls, ["show"])

    def test_bootstrap_only_allows_bucket_security_changes(self):
        for changes in ({"logging": [{"log_bucket": "logs"}]}, {"versioning": [{"enabled": True}]},
                        {"lifecycle_rule": [{"action": {"type": "Delete"}, "condition": {"with_state": "ARCHIVED"}}]}):
            with self.subTest(changes=changes):
                result = self.run_step("Check plan safety", [self.resource(["update"], **changes)])
                self.assertEqual(result.returncode, 0, result.stderr)
        for item in (self.resource(["update"], name="different-bucket"), self.resource(["create"]),
                     {**self.resource(["update"]), "type": "google_pubsub_subscription"}):
            self.assertNotEqual(self.run_step("Check plan safety", [item]).returncode, 0)

    def test_apply_rejects_imports_deletions_replacements_and_other_projects(self):
        unsafe = [self.resource(actions) for actions in (["delete"], ["delete", "create"], ["create", "delete"], ["forget"])]
        unsafe += [self.resource(["no-op"], importing=True), self.resource(["update"], project="bcrbk9-test")]
        for action in ("apply", "bootstrap"):
            for item in unsafe:
                with self.subTest(action=action, item=item):
                    self.assertNotEqual(self.run_step("Check plan safety", [item], action=action).returncode, 0)

    def test_normal_dev_plans_and_noops_are_allowed(self):
        for action in (["create"], ["update"], ["no-op"]):
            self.assertEqual(self.run_step("Check plan safety", [self.resource(action)], action="apply").returncode, 0)
        self.assertEqual(self.run_step("Check plan safety", []).returncode, 0)

    def test_plan_must_be_complete_successful_and_supported(self):
        for metadata in ({"complete": False}, {"errored": True}, {"format_version": "2.0"}, {"format_version": None}):
            self.assertNotEqual(self.run_step("Check plan safety", [], **metadata).returncode, 0)


if __name__ == "__main__":
    unittest.main()
