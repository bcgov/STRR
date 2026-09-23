# DEV Cloud SQL IAM verification

This manual check uses the existing STRR GitHub → tools Cloud Build route to
verify the shared connector's IAM login for DEV `sa-api` and `sa-job`. It reads
only database identity, server/extension versions and catalog privileges. It
does not deploy, run product jobs, read business rows, change grants or execute
SQL writes. No TEST/PROD targets or arbitrary script/identity/ref inputs exist.

## Review and execution

The shared helper is pinned to the current sbc-connect-common #77 candidate
`395a3bdd402d918f2ba3df6d6cf26a629872a121`. Review that dependency and repin to its
official merge commit before merging this workflow. The connector module's
SHA-256 must be reviewed and updated if its source changes.

Review/merge this change through protected `main` before an authorized owner
manually runs **DEV Cloud SQL IAM verification** on `main`. Pull requests only
run offline unit checks with mocked cloud/database boundaries. The live job
requires the exact repository, protected main, manual event and existing `dev`
environment; it uses the existing WIF/GitHub identity and default build worker.
No new access or environment-protection setting is introduced. Do not run the
cloud step locally or from a feature branch to bypass these checks.

Before submission the workflow checks that the default worker is
`331250273634@cloudbuild.gserviceaccount.com`. The probe independently checks
its actual ADC identity/project and the helper source before impersonating
either fixed DEV runtime account for 600 seconds. A changed route fails closed.

`prepare_helper.py` builds the commit/hash-pinned first-party helper in the
validation job, which has no cloud credentials or OIDC permission. It uses the
locked build tool without dependency/build-isolation resolution and verifies
the connector module before installation. That job tests the wheel, then saves
it with a checksum manifest as an immutable artifact of this workflow run.

`make_build_config.py` checks that artifact's identity/checksum and embeds the
wheel, checked-out probe and hash-locked requirements in a no-source build. The
cloud job installs only wheels with mandatory hash checks; it does not execute
source-package build scripts. The Python image and Google actions are pinned
by digest/commit. No application source archive, secret mount, GCS upload or
deployment is involved.
The small build uses existing Cloud Build capacity and produces Cloud Logging
output. Dependency errors and exceptions are reported without raw diagnostics,
tokens, connection strings or tracebacks.

## Interpretation

Each connection explicitly starts a read-only transaction with a five-second
statement timeout, verifies current/session user and database, and rolls back.
The helper uses PUBLIC IP, matching the current #1764 mappings; this is not a
test of a future private-network route. The result reports `loginVerified`, server version, installed `postgis`/`anon`
catalog versions and schema/role/table/sequence privilege counts per identity.

`writeCatalogReady` conservatively requires the existing `readwrite` role,
public schema usage, at least one table, no missing SELECT/DML/sequence grants,
and no row-security tables. This is a catalog check, not an executed write or
proof of every function, trigger, future table or application workload. The
probe reports failure if either identity fails login, catalog checks or cleanup;
inspect the sanitized result to distinguish those cases. Current SRE desired
state gives DEV `sa-job` only `readonly`; SRE #400 still requires owner review.

This tests the installed shared helper, not final consumer images, missing DEV
vault fields, migrations, upgrade behavior or deployed app configuration. The
JSON explicitly reports `consumersVerified: false`. A passing result cannot by
itself authorize rollout or production-key removal.

## Local checks

Use Python 3.12 and install `requirements.txt` with
`pip --only-binary :all: --require-hashes`. Run `prepare_helper.py` with an empty
temporary wheel directory, then install that directory's `requirements.txt`
using `pip --only-binary :all: --no-index --no-deps --require-hashes`.
Run `python -m unittest discover -s verification/iam-dev -p 'test_*.py' -v`.
Rendering `make_build_config.py` with that wheel directory only prints JSON;
it does not submit a build. `helper-source.txt` pins the reviewed helper archive
and its SHA-256; update both after common #77 merges.
Regenerate the lock with `uv pip compile requirements.in --python-version 3.12
--python-platform x86_64-unknown-linux-gnu --generate-hashes --no-annotate
--no-header -o requirements.txt` and review the resolved versions/hashes.
