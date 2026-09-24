"""Validate IAM injection into generated SRE job and service templates."""

import re
import runpy
import tempfile
import unittest
from pathlib import Path

from test_gcp_iam_vaults import (
    MIGRATED_GCP_VAULTS,
    REPO_ROOT,
    _active_env_mappings,
    _clouddeploy_values,
)

configure = runpy.run_path(str(REPO_ROOT / "scripts/configure-iam-deployment.py"))[
    "configure"
]
IAM_PARAMETERS = {
    "CLOUDSQL_INSTANCE_CONNECTION_NAME": "cloudsql-instances",
    "DATABASE_USERNAME": "database-iam-username",
}

# Minimal fixtures retain the SRE templates' two actual container nesting levels.
TEMPLATES = {
    "job": """apiVersion: run.googleapis.com/v1
kind: Job
spec:
  template:
    spec:
      template:
        spec:
          containers:
          - image: image-placeholder
            env:
            - name: DEPLOYMENT_PLATFORM
              value: GCP
            - name: DEPLOYMENT_ENV
              value: development # from-param: ${deploy-env}
""",
    "service": """apiVersion: serving.knative.dev/v1
kind: Service
spec:
  template:
    spec:
      containers:
      - image: image-placeholder
        env:
        - name: DEPLOYMENT_PLATFORM
          value: GCP
        - name: DEPLOYMENT_ENV
          value: development # from-param: ${deploy-env}
""",
}


class ConfigureIamDeploymentTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.app = Path(self.temp.name)
        self.templates = self.app / "devops/gcp/k8s"
        self.templates.mkdir(parents=True)

    def write_template(self, kind, contents=None):
        template = self.templates / f"{kind}.template.yaml"
        template.write_text(contents if contents is not None else TEMPLATES[kind])
        return template

    def test_all_fifty_targets_use_the_correct_parameter_in_each_environment(self):
        for vault_file in MIGRATED_GCP_VAULTS:
            kind = "job" if vault_file.startswith("jobs/") else "service"
            with self.subTest(vault_file=vault_file):
                for old_template in self.templates.glob("*.template.yaml"):
                    old_template.unlink()
                template = self.write_template(kind)
                self.assertEqual(configure(self.app), template)
                output = template.read_text()
                indent = " " * (12 if kind == "job" else 8)
                for variable, parameter in IAM_PARAMETERS.items():
                    matches = re.findall(
                        rf"^{indent}- name: {variable}\n{indent}  value: ([^\n]+)$",
                        output,
                        re.MULTILINE,
                    )
                    self.assertEqual(
                        matches, [f"valuePlaceHolder # from-param: ${{{parameter}}}"]
                    )
                    values = _clouddeploy_values(vault_file, parameter)
                    self.assertEqual(len(values), 5)
                    self.assertTrue(all(values))
                # SRE's generate_manifest appends vault env to this existing list.
                # Disjoint names prevent it introducing an override or duplicate.
                self.assertFalse(
                    IAM_PARAMETERS.keys() & _active_env_mappings(vault_file).keys()
                )
                self.assertIn("value: development # from-param: ${deploy-env}", output)
                self.assertIn("image: image-placeholder", output)

    def test_injection_is_idempotent_for_both_template_kinds(self):
        for kind in TEMPLATES:
            with self.subTest(kind=kind):
                for old_template in self.templates.glob("*.template.yaml"):
                    old_template.unlink()
                template = self.write_template(kind)
                configure(self.app)
                first_result = template.read_bytes()
                configure(self.app)
                self.assertEqual(template.read_bytes(), first_result)
                for variable in IAM_PARAMETERS:
                    self.assertEqual(
                        template.read_text().count(f"- name: {variable}\n"), 1
                    )

    def test_conflicting_or_duplicate_iam_values_fail_without_mutation(self):
        for variable in IAM_PARAMETERS:
            for already_configured in (False, True):
                with self.subTest(
                    variable=variable, already_configured=already_configured
                ):
                    template = self.write_template("job")
                    if already_configured:
                        configure(self.app)
                    conflict = (
                        template.read_text()
                        + f"            - name: {variable}\n              value: stale-value\n"
                    )
                    template.write_text(conflict)
                    with self.assertRaisesRegex(ValueError, "conflicting"):
                        configure(self.app)
                    self.assertEqual(template.read_text(), conflict)

    def test_missing_environment_anchor_fails_without_mutation(self):
        template = self.write_template("job", "kind: Job\n")
        with self.assertRaisesRegex(ValueError, "anchor"):
            configure(self.app)
        self.assertEqual(template.read_text(), "kind: Job\n")

    def test_missing_or_ambiguous_templates_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "exactly one"):
            configure(self.app)
        templates = [self.write_template(kind) for kind in TEMPLATES]
        originals = [template.read_bytes() for template in templates]
        with self.assertRaisesRegex(ValueError, "exactly one"):
            configure(self.app)
        self.assertEqual([template.read_bytes() for template in templates], originals)


if __name__ == "__main__":
    unittest.main()
