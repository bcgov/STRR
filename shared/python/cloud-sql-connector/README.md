# STRR Cloud SQL connector

The shared Python database connection utility for STRR jobs and queue services.
Consumers install this package from this repository using a Poetry path dependency;
no separately published package or shared-library PR is needed.

## Usage

```python
from cloud_sql_connector import sqlalchemy_settings_from_env

database_uri, engine_options = sqlalchemy_settings_from_env()
```

Pass the returned URI and engine options to SQLAlchemy (or Flask-SQLAlchemy).
The utility creates its Google Cloud SQL connector only when a database connection
is requested and uses lazy token refresh.

Cloud Run jobs (`CLOUD_RUN_JOB`) and services (`K_SERVICE`) always use IAM.
Setting `CLOUDSQL_INSTANCE_CONNECTION_NAME` also enables IAM locally. IAM requires:

- `CLOUDSQL_INSTANCE_CONNECTION_NAME`: `project:region:instance`.
- `DATABASE_NAME`: the target database.
- `DATABASE_USERNAME`: the IAM database username of the runtime identity.
- `CLOUDSQL_IP_TYPE`: optional `PUBLIC` (default) or `PRIVATE`.

Missing required IAM settings raise an error instead of falling back to a password.
IAM mode ignores legacy `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT`,
and `DATABASE_UNIX_SOCKET` values. The runtime identity still needs Cloud SQL IAM
access and the database privileges required by the application.

Outside IAM mode, local development and tests use the normal `DATABASE_*` password
settings. `database_uri_from_env()` also supports alternate variable names for test
databases. `sqlalchemy_settings_from_env(iam_username_env="...")` selects another
IAM username variable when needed.

## Development

From this directory:

```bash
poetry install
poetry run pytest
poetry build --format wheel
```

The unit tests require no Google credentials or live database.

## Building and deploying consumers

From the repository root, build a consumer with its shared source:

```bash
make -C jobs/auto-approval build
make -C queue_services/strr-email build
```

Each build stages the application and this package from the same checkout.
For custom Docker options, prepare a context first:

```bash
context=$(mktemp -d)
python3 scripts/prepare-python-build-context.py jobs/auto-approval "$context"
docker build "$context"
```

CI and CD use the same staging helper. A direct `docker build .` in an application
directory does not include the shared package. Changes here trigger all ten
database consumers' workflows.

The STRR deployment workflows add the instance connection name and IAM username
from each application's Cloud Deploy parameters. These non-secret values do not
require new 1Password fields. The database name and application secrets continue
to use their existing vault mappings.

Use a full deployment (`redeploy=false`) to deploy the IAM image and replace the
legacy password environment. The old environment-only redeploy path is rejected
because it can retain old credentials and a pre-IAM image. Existing protected
branches and deployment environment approvals still apply.

This code does not create database users, grant database roles, or apply
Terraform. Before rollout, verify that the attached `sa-job` identity (or
`sa-api` for the two database queue services) can log in through IAM and perform
the required database writes. A green build or a job that processes no records
does not establish those permissions.

## Read-only IAM smoke check

Use `scripts/verify-cloud-sql-iam.py` to verify an IAM login through this checkout's
shared utility and inspect PostgreSQL catalog privileges. It uses existing
Application Default Credentials (ADC); `DATABASE_USERNAME` must match that
credential's existing IAM database user. The command does not impersonate another
identity or change permissions.

From this package directory, after `poetry install`:

```bash
export CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-dev:northamerica-northeast1:strr-db-dev"
export DATABASE_NAME="strr-db"
export DATABASE_USERNAME="your-existing-iam-database-user"

poetry run python ../../../scripts/verify-cloud-sql-iam.py
poetry run python ../../../scripts/verify-cloud-sql-iam.py \
  --check-role sa-job@bcrbk9-dev.iam \
  --check-role sa-api@bcrbk9-dev.iam \
  --require-writes
```

The three IAM settings are mandatory, even outside Cloud Run. Legacy database
password settings cannot select a fallback connection. JSON output reports the
actual login identity, expected identity match, database, read-only transaction,
inventory counts, and missing effective privileges. Error output includes the
exception class, without its potentially sensitive message or connection URL.

The default schema is `public`; use `--schema NAME` for another application schema.
Without `--check-role`, the command inspects the logged-in identity. Repeated
`--check-role` options select other catalog principals without logging in as them.
`--require-writes` applies only to those selected principals and requires schema
`USAGE`, table `SELECT`/`INSERT`/`UPDATE`/`DELETE`, and sequence `USAGE`. Any empty
schema, table, or sequence inventory fails that gate. Ordinary and partitioned
tables are included; views are not.

Exit status is zero when the login identity/database match and inspection
succeeds, one for connection or verification failures (including a failed write
gate or missing role), and two for missing IAM configuration or invalid arguments.
Every database query runs in an explicitly read-only transaction. The command
reads catalogs, not application rows, and executes no grants or application DML.
Catalog privilege checks do **not** prove another principal's IAM login, actual
writes, row-level security behavior, or permission for future database objects.

The focused tests use fake connections and need no credentials:

```bash
# From the repository root:
python3 -m unittest discover -s tests/deployment -p test_verify_cloud_sql_iam.py
```

### Smoke-check container

Build the standalone verifier from the repository root:

```bash
docker build --platform linux/amd64 -f scripts/iam-smoke/Dockerfile \
  -t strr-iam-smoke:local .
docker run --rm strr-iam-smoke:local
```

The local run without IAM settings exits with status 2. The Dockerfile-specific
ignore file allows only the verifier, shared utility source, metadata, licenses,
and lockfile into the build context. The image installs locked main dependencies
using wheels, runs as a non-root user, and has no business application entrypoint.

The default command is `--require-writes`. An authorized DEV Cloud Run smoke job
can use this image with its attached runtime service account and the three IAM
environment variables above. ADC then uses that runtime identity; no credential
file is needed in the image. A missing write privilege produces exit status 1
with catalog evidence, while the database transaction remains read-only. Deploy
and execute it as a separate temporary job, then remove that job after testing.

## Attribution

Adapted from the BC Registries
[`sbc-connect-common` Cloud SQL connector](https://github.com/bcgov/sbc-connect-common/tree/395a3bdd402d918f2ba3df6d6cf26a629872a121/python/cloud-sql-connector).
The upstream source copyright and Apache 2.0 notices, package license notice below,
and repository license in `LICENSE` are retained. `LICENSE-APACHE` contains the
Apache 2.0 license text referenced by the source files.

## License

Copyright © 2025 Province of British Columbia

Licensed under the BSD 3 Clause License, (the "License"); you may not use this file except in compliance with the License. The template for the license can be found here https://opensource.org/license/bsd-3-clause/

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
