"""Exercise the actual workflow gates without cloud credentials or deployments."""

import os
import json
from pathlib import Path
import re
import shlex
import subprocess
import sys
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
            self.assertEqual(set(job["needs"]), {"terraform", "changes"})
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

    def test_nonmain_push_requires_actual_application_changes(self):
        for filename, (job_name, _) in CALLERS.items():
            gate = load_workflow(filename)["jobs"][job_name]["if"]
            for branch in ("feature-example", "hotfix-example", "release-example"):
                for event in ("push", "workflow_dispatch"):
                    for result in ("success", "failure", "skipped", "cancelled"):
                        for changed in ("true", "false"):
                            with self.subTest(file=filename, branch=branch, event=event, result=result, changed=changed):
                                actual = evaluate_gate(
                                    gate,
                                    github=SimpleNamespace(event_name=event, ref=f"refs/heads/{branch}"),
                                    needs=SimpleNamespace(
                                        terraform=SimpleNamespace(result="skipped"),
                                        changes=SimpleNamespace(result=result, outputs=SimpleNamespace(application=changed)),
                                    ),
                                    cancelled=lambda: False,
                                )
                                self.assertEqual(actual, event == "workflow_dispatch" or (result == "success" and changed == "true"))

    def test_stack_ownership_and_shared_validation_lock(self):
        runner = load_workflow("strr-terraform.yaml")
        groups = {}
        for filename, (_, stack) in CALLERS.items():
            workflow = load_workflow(filename)
            caller = workflow["jobs"]["terraform"]
            self.assertEqual(caller["uses"], "./.github/workflows/strr-terraform.yaml")
            self.assertEqual(caller["with"]["stack"], stack)
            self.assertEqual(caller["with"]["action"], "apply")
            self.assertIn(f"terraform/{stack}/**", workflow["on"]["push"]["paths"])
            self.assertIn("terraform/scripts/**", workflow["on"]["push"]["paths"])
            self.assertIn(".github/workflows/strr-terraform.yaml", workflow["on"]["push"]["paths"])
            groups[filename] = runner["concurrency"]["group"].replace("${{ inputs.stack }}", stack)
        self.assertEqual(groups["strr-batch-validator-listener-cd.yaml"], groups["strr-batch-validator-job-cd.yaml"])
        self.assertEqual(len(set(groups.values())), 3)
        self.assertEqual(runner["concurrency"]["queue"], "max")
        self.assertEqual(runner["concurrency"]["cancel-in-progress"], "false")


class ApplicationChangesTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.repo = Path(self.temporary.name)
        self.git("init", "--quiet")

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, text=True).strip()

    def commit(self, path):
        file = self.repo / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(file.read_text() + "change\n" if file.exists() else "change\n")
        self.git("add", path)
        self.git("-c", "user.name=Workflow test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "test")
        return self.git("rev-parse", "HEAD")

    def check_changes(self, event, directories):
        event_file, output_file = self.repo / "event.json", self.repo / "output"
        event_file.write_text(json.dumps(event))
        output_file.write_text("")
        subprocess.run(
            [sys.executable, str(REPOSITORY / ".github/scripts/application_changes.py"), *directories],
            cwd=self.repo,
            env={**os.environ, "GITHUB_EVENT_PATH": str(event_file), "GITHUB_OUTPUT": str(output_file)},
            check=True,
            capture_output=True,
            text=True,
        )
        return output_file.read_text() == "application=true\n"

    def test_original_application_paths_and_infrastructure_only_pushes(self):
        previous = self.commit("README.md")
        for filename, (_, stack) in CALLERS.items():
            workflow = load_workflow(filename)
            changes = workflow["jobs"]["changes"]
            self.assertEqual(changes["steps"][0]["with"]["fetch-depth"], "0")
            directories = shlex.split(changes["steps"][1]["run"])[2:]
            original_paths = [path[:-3] for path in workflow["on"]["push"]["paths"] if path.endswith("/**") and not path.startswith("terraform/")]
            self.assertEqual(directories, original_paths)
            infrastructure = self.commit(f"terraform/{stack}/main.tf")
            self.assertFalse(self.check_changes({"before": previous, "after": infrastructure}, directories))
            for directory in directories:
                application = self.commit(f"{directory}/example.py")
                self.assertTrue(self.check_changes({"before": infrastructure, "after": application}, directories))
                infrastructure = application
            previous = infrastructure

    def test_new_branch_compares_all_pushed_commits(self):
        self.commit("README.md")
        application = self.commit("strr-api/example.py")
        infrastructure = self.commit("terraform/api/main.tf")
        event = {"before": "0" * 40, "after": infrastructure, "commits": [{"id": application}, {"id": infrastructure}]}
        self.assertTrue(self.check_changes(event, ["strr-api"]))
        self.assertFalse(self.check_changes(event, ["queue_services/strr-email"]))

    def test_first_push_to_empty_repository(self):
        first = self.commit("strr-api/example.py")
        event = {"before": "0" * 40, "after": first, "commits": [{"id": first}]}
        self.assertTrue(self.check_changes(event, ["strr-api"]))


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
            for action in ("plan", "apply", "destroy"):
                for branch, protected in (("main", "true"), ("main", "false"), ("Jacky/example", "true")):
                    with self.subTest(stack=stack, action=action, branch=branch, protected=protected):
                        result = subprocess.run(
                            ["bash", "-e", "-o", "pipefail", "-c", steps[0]["run"]],
                            env={
                                **os.environ,
                                "TF_STACK": stack,
                                "TF_ACTION": action,
                                "GITHUB_REF": f"refs/heads/{branch}",
                                "REF_PROTECTED": protected,
                            },
                            capture_output=True,
                            text=True,
                            check=False,
                        )
                        expected = (
                            stack in ("api", "email", "validation")
                            and action in ("plan", "apply")
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
        self.assertIn("python3 terraform/scripts/check_plan.py", check["run"])
        self.assertNotIn("continue-on-error", check)
        self.assertEqual(apply["if"], "inputs.action == 'apply'")
        self.assertTrue(apply["run"].endswith(" tfplan"))

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


if __name__ == "__main__":
    unittest.main()
