"""Verify local and CI build contexts contain this checkout's shared package."""

import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_SCRIPT = REPO_ROOT / "scripts/prepare-python-build-context.py"
APP = Path("jobs/example-job")
SHARED = Path("shared/python/cloud-sql-connector")
STAGED_SHARED = Path("_shared/python/cloud-sql-connector")


class PythonBuildContextTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="strr build context ")
        self.addCleanup(temporary.cleanup)
        self.workspace = Path(temporary.name).resolve()
        self.repo = self.workspace / "checkout"
        self.repo.mkdir()
        self.destination = self.workspace / "build context"
        self.script = self.repo / "scripts" / BUILD_SCRIPT.name
        self.script.parent.mkdir()
        shutil.copyfile(BUILD_SCRIPT, self.script)
        self.git("init", "--quiet")
        self.git("config", "core.excludesFile", os.devnull)
        self.write(APP / "Dockerfile", "FROM python:3.12-slim\n")
        self.write(APP / "pyproject.toml", '[tool.poetry]\nname = "example-job"\n')
        self.write(APP / "src/job.py", 'REVISION = "original app"\n')
        self.write(
            SHARED / "pyproject.toml", '[tool.poetry]\nname = "cloud-sql-connector"\n'
        )
        self.write(
            SHARED / "src/cloud_sql_connector/__init__.py",
            'REVISION = "original shared"\n',
        )
        self.git("add", ".")

    def git(self, *arguments):
        return subprocess.run(
            ["git", *arguments],
            cwd=self.repo,
            check=True,
            capture_output=True,
            text=True,
        )

    def write(self, relative, content):
        target = self.repo / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(content, bytes):
            target.write_bytes(content)
        else:
            target.write_text(content)
        return target

    def stage(self, app=APP, *, cwd=None):
        return subprocess.run(
            [sys.executable, str(self.script), str(app), str(self.destination)],
            cwd=cwd or self.repo,
            capture_output=True,
            text=True,
        )

    def assert_stages_successfully(self, **kwargs):
        result = self.stage(**kwargs)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_stages_current_app_and_shared_source_from_the_same_checkout(self):
        app_source = self.write(APP / "src/job.py", 'REVISION = "current app"\n')
        shared_source = self.write(
            SHARED / "src/cloud_sql_connector/__init__.py",
            'REVISION = "current shared"\n',
        )
        binary = self.write(APP / "assets/payload.bin", b"\x00\xff\x10")
        executable = self.write(APP / "run.sh", "#!/bin/sh\nexec python -m job\n")
        executable.chmod(0o755)
        self.write(Path("jobs/another-job/src/job.py"), "UNRELATED = True\n")
        self.write(Path("gha-creds-root.json"), "synthetic authentication file")

        # CI invokes the helper with '.' from the application's working directory.
        self.assert_stages_successfully(app=Path("."), cwd=self.repo / APP)

        for source, staged in (
            (app_source, Path("src/job.py")),
            (shared_source, STAGED_SHARED / "src/cloud_sql_connector/__init__.py"),
            (binary, Path("assets/payload.bin")),
            (executable, Path("run.sh")),
        ):
            with self.subTest(staged=staged):
                self.assertEqual(
                    (self.destination / staged).read_bytes(), source.read_bytes()
                )
        self.assertTrue(
            stat.S_IMODE((self.destination / "run.sh").stat().st_mode) & stat.S_IXUSR
        )
        self.assertTrue((self.destination / "Dockerfile").is_file())
        self.assertFalse((self.destination / "jobs").exists())
        self.assertFalse((self.destination / ".git").exists())
        self.assertFalse((self.destination / "scripts").exists())
        self.assertFalse((self.destination / "gha-creds-root.json").exists())

    def test_includes_untracked_source_and_generated_deployment_files(self):
        expected = {
            APP / "src/new_module.py": Path("src/new_module.py"),
            APP / "cloudbuild.yaml": Path("cloudbuild.yaml"),
            APP / "clouddeploy.yaml": Path("clouddeploy.yaml"),
            APP / "skaffold.yaml": Path("skaffold.yaml"),
            SHARED
            / "src/cloud_sql_connector/new_module.py": (
                STAGED_SHARED / "src/cloud_sql_connector/new_module.py"
            ),
        }
        for source in expected:
            self.write(source, f"Generated contents for {source}\n")

        self.assert_stages_successfully()

        for source, staged in expected.items():
            with self.subTest(source=source):
                self.assertEqual(
                    (self.destination / staged).read_bytes(),
                    (self.repo / source).read_bytes(),
                )

    def test_omits_ignored_credentials_virtualenvs_and_caches(self):
        self.write(
            Path(".gitignore"),
            ".env\n.env.local\n.venv/\n__pycache__/\n.pytest_cache/\ngha-creds-*.json\n",
        )
        self.write(APP / ".gitignore", "local-only.json\n")
        ignored = (
            Path(".env"),
            Path(".env.local"),
            Path(".venv/lib/installed.py"),
            Path("src/__pycache__/cached.pyc"),
            Path(".pytest_cache/state"),
            Path("gha-creds-test.json"),
        )
        for parent in (APP, SHARED):
            for relative in ignored:
                self.write(parent / relative, "synthetic excluded contents")
        self.write(APP / "local-only.json", "synthetic excluded contents")

        self.assert_stages_successfully()

        for parent in (Path("."), STAGED_SHARED):
            for relative in ignored:
                with self.subTest(staged=parent / relative):
                    self.assertFalse((self.destination / parent / relative).exists())
        self.assertFalse((self.destination / "local-only.json").exists())
        self.assertTrue((self.destination / "src/job.py").exists())
        self.assertTrue((self.destination / STAGED_SHARED / "pyproject.toml").exists())

    def test_preserves_tracked_templates_even_when_matching_an_ignore_rule(self):
        self.write(APP / ".env.sample", "DATABASE_NAME=example\n")
        self.git("add", str(APP / ".env.sample"))
        self.write(Path(".gitignore"), ".env*\n")
        self.write(APP / ".env.local", "synthetic local credentials")

        self.assert_stages_successfully()

        self.assertEqual(
            (self.destination / ".env.sample").read_text(), "DATABASE_NAME=example\n"
        )
        self.assertFalse((self.destination / ".env.local").exists())

    def test_does_not_restore_tracked_files_deleted_from_the_checkout(self):
        (self.repo / APP / "src/job.py").unlink()
        (self.repo / SHARED / "src/cloud_sql_connector/__init__.py").unlink()

        self.assert_stages_successfully()

        self.assertFalse((self.destination / "src/job.py").exists())
        self.assertFalse(
            (
                self.destination / STAGED_SHARED / "src/cloud_sql_connector/__init__.py"
            ).exists()
        )

    def test_fails_if_the_shared_package_is_missing(self):
        (self.repo / SHARED / "pyproject.toml").unlink()

        result = self.stage()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("STRR shared Cloud SQL package is missing", result.stderr)
        self.assertFalse(self.destination.exists())

    def test_rejects_an_application_outside_the_checkout(self):
        outside = self.workspace / "other checkout" / "app"
        outside.mkdir(parents=True)
        (outside / "Dockerfile").write_text("FROM python:3.12-slim\n")

        result = self.stage(app=outside)

        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.destination.exists())


if __name__ == "__main__":
    unittest.main()
